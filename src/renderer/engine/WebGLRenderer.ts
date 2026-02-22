/**
 * Lumora Studio Pro — WebGL Image Renderer
 * 
 * GPU-accelerated image rendering with real-time 
 * color and tone adjustments using WebGL2 shaders.
 * 
 * Supports: Basic adjustments, HSL per-channel, Color Grading,
 * Tone Curve (via LUT), Detail simulation, Effects, Calibration
 */

export class WebGLImageRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | WebGLRenderingContext | null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private curveTexture: WebGLTexture | null = null;
  private imageLoaded: boolean = false;
  private imageWidth: number = 0;
  private imageHeight: number = 0;

  // ─── Mask compositing infrastructure ──────────────
  private vertexBuffer: WebGLBuffer | null = null;
  private blendProgram: WebGLProgram | null = null;
  private drawProgram: WebGLProgram | null = null;
  private fboPool: Array<{ fbo: WebGLFramebuffer; tex: WebGLTexture }> = [];
  private fboWidth = 0;
  private fboHeight = 0;

  /** Vertex shader — passes through coordinates */
  private static VERTEX_SHADER = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `;

  /** Fragment shader — applies all image adjustments */
  private static FRAGMENT_SHADER = `
    precision highp float;
    varying vec2 v_texCoord;
    uniform sampler2D u_image;
    uniform sampler2D u_curveLUT;
    
    // ─── Basic ─────────────────────────────────────
    uniform float u_exposure;
    uniform float u_contrast;
    uniform float u_highlights;
    uniform float u_shadows;
    uniform float u_whites;
    uniform float u_blacks;
    uniform float u_temperature;
    uniform float u_tint;
    uniform float u_vibrance;
    uniform float u_saturation;
    uniform float u_clarity;
    uniform float u_dehaze;
    uniform float u_texture;
    
    // ─── Vignette ──────────────────────────────────
    uniform float u_vignetteAmount;
    uniform float u_vignetteMidpoint;
    uniform float u_vignetteRoundness;
    uniform float u_vignetteFeather;
    
    // ─── Grain ─────────────────────────────────────
    uniform float u_grainAmount;
    uniform float u_grainSize;
    
    // ─── HSL (8 colors × 3 channels) ──────────────
    // Order: red, orange, yellow, green, aqua, blue, purple, magenta
    uniform float u_hslHue[8];
    uniform float u_hslSat[8];
    uniform float u_hslLum[8];
    
    // ─── Color Grading ─────────────────────────────
    uniform float u_cgShadowsHue;
    uniform float u_cgShadowsSat;
    uniform float u_cgMidtonesHue;
    uniform float u_cgMidtonesSat;
    uniform float u_cgHighlightsHue;
    uniform float u_cgHighlightsSat;
    uniform float u_cgBlending;
    uniform float u_cgBalance;
    
    // ─── Calibration ───────────────────────────────
    uniform float u_calShadowsTint;
    uniform float u_calRedHue;
    uniform float u_calRedSat;
    uniform float u_calGreenHue;
    uniform float u_calGreenSat;
    uniform float u_calBlueHue;
    uniform float u_calBlueSat;
    
    // ─── Tone Curve control ────────────────────────
    uniform float u_curveEnabled;
    
    // ─── Sharpening ────────────────────────────────
    uniform float u_sharpenAmount;
    uniform float u_sharpenRadius;
    uniform vec2 u_texelSize;
    
    // ═══════════════════════════════════════════════
    // Color space conversions
    // ═══════════════════════════════════════════════
    
    vec3 rgb2hsl(vec3 c) {
      float maxC = max(max(c.r, c.g), c.b);
      float minC = min(min(c.r, c.g), c.b);
      float l = (maxC + minC) * 0.5;
      float s = 0.0;
      float h = 0.0;
      
      if (maxC != minC) {
        float d = maxC - minC;
        s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);
        
        if (maxC == c.r) h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
        else if (maxC == c.g) h = (c.b - c.r) / d + 2.0;
        else h = (c.r - c.g) / d + 4.0;
        h /= 6.0;
      }
      return vec3(h, s, l);
    }
    
    float hue2rgb(float p, float q, float t) {
      if (t < 0.0) t += 1.0;
      if (t > 1.0) t -= 1.0;
      if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
      if (t < 0.5) return q;
      if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
      return p;
    }
    
    vec3 hsl2rgb(vec3 c) {
      if (c.y == 0.0) return vec3(c.z);
      float q = c.z < 0.5 ? c.z * (1.0 + c.y) : c.z + c.y - c.z * c.y;
      float p = 2.0 * c.z - q;
      return vec3(
        hue2rgb(p, q, c.x + 1.0/3.0),
        hue2rgb(p, q, c.x),
        hue2rgb(p, q, c.x - 1.0/3.0)
      );
    }
    
    float luminance(vec3 c) {
      return dot(c, vec3(0.2126, 0.7152, 0.0722));
    }
    
    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    // ═══════════════════════════════════════════════
    // Determine HSL color index weight (0-7)
    // Maps hue angle to 8 color bands with soft transitions
    // NOTE: Uses if-else chain instead of array indexing because
    // GLSL ES 1.0 forbids non-constant array indices (ANGLE enforces this)
    // ═══════════════════════════════════════════════
    float getColorWeight(float hue, int colorIdx) {
      // Color centers: red=0, orange=30, yellow=60, green=120, aqua=180, blue=240, purple=280, magenta=320
      float center;
      if (colorIdx == 0) center = 0.0;        // red
      else if (colorIdx == 1) center = 30.0;   // orange
      else if (colorIdx == 2) center = 60.0;   // yellow
      else if (colorIdx == 3) center = 120.0;  // green
      else if (colorIdx == 4) center = 180.0;  // aqua
      else if (colorIdx == 5) center = 240.0;  // blue
      else if (colorIdx == 6) center = 280.0;  // purple
      else center = 320.0;                     // magenta
      
      float hDeg = hue * 360.0;
      float width = 30.0; // transition width
      
      float dist = abs(hDeg - center);
      if (dist > 180.0) dist = 360.0 - dist;
      
      return smoothstep(width, 0.0, dist);
    }
    
    // ═══════════════════════════════════════════════
    // Main
    // ═══════════════════════════════════════════════
    
    void main() {
      vec4 texColor = texture2D(u_image, v_texCoord);
      vec3 color = texColor.rgb;
      
      // ─── Exposure ─────────────────────────────────
      color *= pow(2.0, u_exposure);
      
      // ─── Contrast ─────────────────────────────────
      float contrastFactor = (259.0 * (u_contrast + 255.0)) / (255.0 * (259.0 - u_contrast));
      color = clamp((color - 0.5) * contrastFactor + 0.5, 0.0, 1.0);
      
      // ─── Temperature & Tint ───────────────────────
      float tempShift = u_temperature * 0.0004;
      color.r += tempShift;
      color.b -= tempShift;
      float tintShift = u_tint * 0.0003;
      color.g += tintShift;
      color.r -= tintShift * 0.5;
      
      // ─── Highlights, Shadows, Whites, Blacks ──────
      float lum = luminance(color);
      float highlightMask = smoothstep(0.5, 1.0, lum);
      float shadowMask = 1.0 - smoothstep(0.0, 0.5, lum);
      float whiteMask = smoothstep(0.75, 1.0, lum);
      float blackMask = 1.0 - smoothstep(0.0, 0.25, lum);
      
      color += u_highlights * 0.01 * highlightMask;
      color += u_shadows * 0.01 * shadowMask;
      color += u_whites * 0.01 * whiteMask;
      color += u_blacks * 0.01 * blackMask;
      
      // ─── Tone Curve (via 1D LUT texture) ──────────
      if (u_curveEnabled > 0.5) {
        color.r = texture2D(u_curveLUT, vec2(clamp(color.r, 0.0, 1.0), 0.25)).r;
        color.g = texture2D(u_curveLUT, vec2(clamp(color.g, 0.0, 1.0), 0.25)).g;
        color.b = texture2D(u_curveLUT, vec2(clamp(color.b, 0.0, 1.0), 0.25)).b;
      }
      
      // ─── HSL Per-Channel Adjustments ──────────────
      vec3 hsl = rgb2hsl(clamp(color, 0.0, 1.0));
      float hueShift = 0.0;
      float satShift = 0.0;
      float lumShift = 0.0;
      
      for (int i = 0; i < 8; i++) {
        float w = getColorWeight(hsl.x, i);
        hueShift += u_hslHue[i] * w;
        satShift += u_hslSat[i] * w;
        lumShift += u_hslLum[i] * w;
      }
      
      hsl.x = fract(hsl.x + hueShift / 360.0);
      hsl.y = clamp(hsl.y + satShift * 0.01, 0.0, 1.0);
      hsl.z = clamp(hsl.z + lumShift * 0.01, 0.0, 1.0);
      
      // ─── Vibrance (selective saturation) ──────────
      float vibranceBoost = u_vibrance * 0.01 * (1.0 - hsl.y);
      hsl.y = clamp(hsl.y + vibranceBoost, 0.0, 1.0);
      
      // ─── Saturation ──────────────────────────────
      hsl.y = clamp(hsl.y * (1.0 + u_saturation * 0.01), 0.0, 1.0);
      color = hsl2rgb(hsl);
      
      // ─── Color Grading (3-Way) ────────────────────
      float cgLum = luminance(color);
      float balance = u_cgBalance * 0.01;
      float shadowW = smoothstep(0.5 + balance * 0.25, 0.0, cgLum);
      float highlightW = smoothstep(0.5 - balance * 0.25, 1.0, cgLum);
      float midtoneW = 1.0 - shadowW - highlightW;
      midtoneW = max(midtoneW, 0.0);
      
      float blend = u_cgBlending * 0.01;
      
      // Apply color grading tints
      if (u_cgShadowsSat > 0.0) {
        vec3 shadowColor = hsl2rgb(vec3(u_cgShadowsHue / 360.0, 1.0, 0.5));
        color = mix(color, color * shadowColor * 2.0, shadowW * u_cgShadowsSat * 0.01 * blend);
      }
      if (u_cgMidtonesSat > 0.0) {
        vec3 midColor = hsl2rgb(vec3(u_cgMidtonesHue / 360.0, 1.0, 0.5));
        color = mix(color, color * midColor * 2.0, midtoneW * u_cgMidtonesSat * 0.01 * blend);
      }
      if (u_cgHighlightsSat > 0.0) {
        vec3 highColor = hsl2rgb(vec3(u_cgHighlightsHue / 360.0, 1.0, 0.5));
        color = mix(color, color * highColor * 2.0, highlightW * u_cgHighlightsSat * 0.01 * blend);
      }
      
      // ─── Calibration ─────────────────────────────
      // Shadows tint (green-magenta shift in shadows)
      float calShadowMask = 1.0 - smoothstep(0.0, 0.5, luminance(color));
      color.g += u_calShadowsTint * 0.003 * calShadowMask;
      color.r -= u_calShadowsTint * 0.0015 * calShadowMask;
      
      // Primary hue/sat shifts
      color.r = clamp(color.r * (1.0 + u_calRedSat * 0.005) + u_calRedHue * 0.002, 0.0, 1.5);
      color.g = clamp(color.g * (1.0 + u_calGreenSat * 0.005) + u_calGreenHue * 0.002, 0.0, 1.5);
      color.b = clamp(color.b * (1.0 + u_calBlueSat * 0.005) + u_calBlueHue * 0.002, 0.0, 1.5);
      
      // ─── Dehaze ──────────────────────────────────
      float dehazeFactor = u_dehaze * 0.005;
      color = color * (1.0 + dehazeFactor) - dehazeFactor * 0.5;
      
      // ─── Clarity (midtone contrast) ───────────────
      float clarityLum = luminance(color);
      float clarityMask = 1.0 - abs(clarityLum - 0.5) * 2.0;
      color += u_clarity * 0.003 * clarityMask * (color - 0.5);
      
      // ─── Texture (fine detail enhancement) ────────
      // Simplified: subtle edge enhancement
      float textureLum = luminance(color);
      color += u_texture * 0.001 * (color - textureLum);
      
      // ─── Sharpening (unsharp mask approximation) ──
      if (u_sharpenAmount > 0.0) {
        vec3 blur = vec3(0.0);
        float r2 = u_sharpenRadius;
        blur += texture2D(u_image, v_texCoord + vec2(-r2, -r2) * u_texelSize).rgb;
        blur += texture2D(u_image, v_texCoord + vec2( 0.0, -r2) * u_texelSize).rgb;
        blur += texture2D(u_image, v_texCoord + vec2( r2, -r2) * u_texelSize).rgb;
        blur += texture2D(u_image, v_texCoord + vec2(-r2,  0.0) * u_texelSize).rgb;
        blur += texture2D(u_image, v_texCoord + vec2( r2,  0.0) * u_texelSize).rgb;
        blur += texture2D(u_image, v_texCoord + vec2(-r2,  r2) * u_texelSize).rgb;
        blur += texture2D(u_image, v_texCoord + vec2( 0.0,  r2) * u_texelSize).rgb;
        blur += texture2D(u_image, v_texCoord + vec2( r2,  r2) * u_texelSize).rgb;
        blur /= 8.0;
        vec3 detail = texColor.rgb - blur;
        color += detail * u_sharpenAmount * 0.01;
      }
      
      // ─── Vignette ────────────────────────────────
      if (u_vignetteAmount != 0.0) {
        vec2 center = v_texCoord - 0.5;
        float roundness = u_vignetteRoundness * 0.01;
        // Adjust aspect for roundness
        center.x *= mix(1.0, 1.414, 0.5 + roundness * 0.5);
        float dist = length(center) * 1.414;
        float midpt = u_vignetteMidpoint * 0.01;
        float feather = max(u_vignetteFeather * 0.01, 0.01);
        float vignette = smoothstep(midpt, midpt + feather, dist);
        color *= 1.0 + u_vignetteAmount * 0.01 * vignette * -1.0;
      }
      
      // ─── Grain ───────────────────────────────────
      if (u_grainAmount > 0.0) {
        float grainScale = max(1.0, u_grainSize * 0.1);
        vec2 grainCoord = floor(v_texCoord * 800.0 / grainScale) * grainScale;
        float grain = (rand(grainCoord) - 0.5) * u_grainAmount * 0.01;
        color += grain;
      }
      
      // Final clamp
      color = clamp(color, 0.0, 1.0);
      
      gl_FragColor = vec4(color, texColor.a);
    }
  `;

  /** Fallback fragment shader — basic adjustments only, guaranteed GLSL ES 1.0 compat */
  private static FALLBACK_FRAGMENT_SHADER = `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_image;
    
    uniform float u_exposure;
    uniform float u_contrast;
    uniform float u_highlights;
    uniform float u_shadows;
    uniform float u_whites;
    uniform float u_blacks;
    uniform float u_temperature;
    uniform float u_tint;
    uniform float u_vibrance;
    uniform float u_saturation;
    uniform float u_clarity;
    uniform float u_dehaze;
    
    float luminance(vec3 c) {
      return dot(c, vec3(0.2126, 0.7152, 0.0722));
    }
    
    void main() {
      vec4 texColor = texture2D(u_image, v_texCoord);
      vec3 color = texColor.rgb;
      
      // Exposure
      color *= pow(2.0, u_exposure);
      
      // Contrast
      float cf = (259.0 * (u_contrast + 255.0)) / (255.0 * (259.0 - u_contrast));
      color = clamp((color - 0.5) * cf + 0.5, 0.0, 1.0);
      
      // Temperature & Tint
      color.r += u_temperature * 0.0004;
      color.b -= u_temperature * 0.0004;
      color.g += u_tint * 0.0003;
      color.r -= u_tint * 0.00015;
      
      // Highlights, Shadows, Whites, Blacks
      float lum = luminance(color);
      color += u_highlights * 0.01 * smoothstep(0.5, 1.0, lum);
      color += u_shadows * 0.01 * (1.0 - smoothstep(0.0, 0.5, lum));
      color += u_whites * 0.01 * smoothstep(0.75, 1.0, lum);
      color += u_blacks * 0.01 * (1.0 - smoothstep(0.0, 0.25, lum));
      
      // Saturation (simple)
      float grey = luminance(color);
      color = mix(vec3(grey), color, 1.0 + u_saturation * 0.01);
      
      // Vibrance (selective saturation)
      float sat = max(max(color.r, color.g), color.b) - min(min(color.r, color.g), color.b);
      float vibFactor = u_vibrance * 0.01 * (1.0 - sat);
      color = mix(vec3(grey), color, 1.0 + vibFactor);
      
      // Dehaze
      color = color * (1.0 + u_dehaze * 0.005) - u_dehaze * 0.005 * 0.5;
      
      // Clarity (midtone contrast)
      float clarityMask = 1.0 - abs(lum - 0.5) * 2.0;
      color += u_clarity * 0.003 * clarityMask * (color - 0.5);
      
      color = clamp(color, 0.0, 1.0);
      gl_FragColor = vec4(color, texColor.a);
    }
  `;

  /** Fragment shader — blends two renders via a mask alpha texture */
  private static BLEND_FRAGMENT_SHADER = `
    precision highp float;
    varying vec2 v_texCoord;
    uniform sampler2D u_base;
    uniform sampler2D u_layer;
    uniform sampler2D u_mask;
    void main() {
      vec4 base  = texture2D(u_base,  v_texCoord);
      vec4 layer = texture2D(u_layer, v_texCoord);
      float alpha = texture2D(u_mask, v_texCoord).r;
      gl_FragColor = mix(base, layer, alpha);
    }
  `;

  /** Fragment shader — draws a single texture to screen */
  private static DRAW_FRAGMENT_SHADER = `
    precision highp float;
    varying vec2 v_texCoord;
    uniform sampler2D u_texture;
    void main() {
      gl_FragColor = texture2D(u_texture, v_texCoord);
    }
  `;

  /** Whether we're using the simplified fallback shader */
  private usingFallbackShader: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true }) || canvas.getContext('webgl', { preserveDrawingBuffer: true });

    if (!this.gl) {
      throw new Error('WebGL not supported');
    }

    this.initShaders();
    this.initGeometry();
  }

  /** Compile and link shaders — tries full shader first, then fallback */
  private initShaders(): void {
    const gl = this.gl!;

    const vertexShader = this.compileShader(gl.VERTEX_SHADER, WebGLImageRenderer.VERTEX_SHADER);
    if (!vertexShader) {
      console.error('[WebGL] Vertex shader compilation FAILED — renderer will not produce output');
      return;
    }

    // Try full-featured fragment shader first
    let fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, WebGLImageRenderer.FRAGMENT_SHADER);

    if (fragmentShader) {
      const prog = gl.createProgram()!;
      gl.attachShader(prog, vertexShader);
      gl.attachShader(prog, fragmentShader);
      gl.linkProgram(prog);

      if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        this.program = prog;
        gl.useProgram(this.program);
        this.usingFallbackShader = false;
        console.log('[WebGL] Full shaders compiled and linked successfully');
        return;
      }
      console.warn('[WebGL] Full shader link error:', gl.getProgramInfoLog(prog));
      gl.deleteProgram(prog);
    } else {
      console.warn('[WebGL] Full fragment shader failed, trying fallback...');
    }

    // Try fallback shader
    const vertexShader2 = this.compileShader(gl.VERTEX_SHADER, WebGLImageRenderer.VERTEX_SHADER);
    fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, WebGLImageRenderer.FALLBACK_FRAGMENT_SHADER);

    if (!vertexShader2 || !fragmentShader) {
      console.error('[WebGL] Fallback shader compilation also FAILED — no rendering possible');
      return;
    }

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vertexShader2);
    gl.attachShader(prog, fragmentShader);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[WebGL] Fallback shader link error:', gl.getProgramInfoLog(prog));
      this.program = null;
      return;
    }

    this.program = prog;
    gl.useProgram(this.program);
    this.usingFallbackShader = true;
    console.log('[WebGL] Using FALLBACK shader (basic adjustments only)');
  }

  /** Compile a single shader */
  private compileShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl!;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const typeName = type === gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT';
      console.error(`[WebGL] ${typeName} shader compile error:`, gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  /** Set up vertex geometry (full-screen quad) */
  private initGeometry(): void {
    const gl = this.gl!;
    if (!this.program) return;

    // Vertices: position (x, y) + texcoord (u, v)
    const vertices = new Float32Array([
      -1, -1,  0, 1,   // bottom-left
       1, -1,  1, 1,   // bottom-right
      -1,  1,  0, 0,   // top-left
       1,  1,  1, 0,   // top-right
    ]);

    const buffer = gl.createBuffer();
    this.vertexBuffer = buffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0);

    const texLoc = gl.getAttribLocation(this.program, 'a_texCoord');
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 16, 8);
  }

  /** Load an image as a WebGL texture */
  loadImage(img: HTMLImageElement): void {
    const gl = this.gl!;

    if (this.texture) gl.deleteTexture(this.texture);

    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

    const glErr = gl.getError();
    if (glErr !== gl.NO_ERROR) {
      console.error(`[WebGL] texImage2D error: ${glErr}`);
    }

    this.imageWidth = img.width;
    this.imageHeight = img.height;
    this.imageLoaded = true;

    console.log(`[WebGL] Image loaded as texture: ${img.width}×${img.height}`);

    // Initialize curve LUT texture
    this.initCurveLUT();
  }

  /** Initialize tone curve LUT (256x1 texture, RGBA for per-channel curves) */
  private initCurveLUT(): void {
    const gl = this.gl!;
    if (this.curveTexture) gl.deleteTexture(this.curveTexture);

    this.curveTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.curveTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Default identity curve (input = output)
    const data = new Uint8Array(256 * 4);
    for (let i = 0; i < 256; i++) {
      data[i * 4 + 0] = i; // R
      data[i * 4 + 1] = i; // G
      data[i * 4 + 2] = i; // B
      data[i * 4 + 3] = 255;
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  }

  /** Update the tone curve LUT from control points */
  private updateCurveLUT(points: Array<{ x: number; y: number }>): void {
    const gl = this.gl!;
    if (!this.curveTexture) return;

    // Interpolate a smooth curve through the control points
    const lut = new Uint8Array(256);

    if (!points || points.length < 2) {
      // Identity
      for (let i = 0; i < 256; i++) lut[i] = i;
    } else {
      // Sort by x
      const sorted = [...points].sort((a, b) => a.x - b.x);

      for (let i = 0; i < 256; i++) {
        const x = i / 255;
        // Find the two points surrounding x
        let lower = sorted[0];
        let upper = sorted[sorted.length - 1];

        for (let j = 0; j < sorted.length - 1; j++) {
          if (x >= sorted[j].x && x <= sorted[j + 1].x) {
            lower = sorted[j];
            upper = sorted[j + 1];
            break;
          }
        }

        // Lerp between points
        const range = upper.x - lower.x;
        const t = range > 0 ? (x - lower.x) / range : 0;
        // Smooth step for nicer curves
        const smooth = t * t * (3 - 2 * t);
        const y = lower.y + (upper.y - lower.y) * smooth;
        lut[i] = Math.max(0, Math.min(255, Math.round(y * 255)));
      }
    }

    // Write to texture (all channels get the same curve for now)
    const data = new Uint8Array(256 * 4);
    for (let i = 0; i < 256; i++) {
      data[i * 4 + 0] = lut[i];
      data[i * 4 + 1] = lut[i];
      data[i * 4 + 2] = lut[i];
      data[i * 4 + 3] = 255;
    }

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.curveTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  }

  /** Render the image with current edit parameters to screen */
  render(edits: any): void {
    const gl = this.gl;
    if (!gl) { console.warn('[WebGL] render: no GL context'); return; }
    if (!this.program) { console.warn('[WebGL] render: no shader program'); return; }
    if (!this.imageLoaded) { console.warn('[WebGL] render: no image loaded'); return; }
    if (gl.isContextLost()) { console.warn('[WebGL] render: context lost'); return; }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.renderWithEdits(edits);
  }

  /** Internal: render edits to whatever framebuffer + viewport is currently bound */
  private renderWithEdits(edits: any): void {
    const gl = this.gl!;
    if (!this.program || !this.imageLoaded) return;

    gl.clearColor(0.067, 0.067, 0.067, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    this.setupAttribs(this.program);

    // Bind image texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    this.setUniformi('u_image', 0);

    // ─── Basic adjustments ─────────────────────────
    this.setUniform('u_exposure', edits.exposure || 0);
    this.setUniform('u_contrast', (edits.contrast || 0) * 2.55);
    this.setUniform('u_highlights', edits.highlights || 0);
    this.setUniform('u_shadows', edits.shadows || 0);
    this.setUniform('u_whites', edits.whites || 0);
    this.setUniform('u_blacks', edits.blacks || 0);
    this.setUniform('u_temperature', edits.temperature || 0);
    this.setUniform('u_tint', edits.tint || 0);
    this.setUniform('u_vibrance', edits.vibrance || 0);
    this.setUniform('u_saturation', edits.saturation || 0);
    this.setUniform('u_clarity', edits.clarity || 0);
    this.setUniform('u_dehaze', edits.dehaze || 0);
    this.setUniform('u_texture', edits.texture || 0);

    // ─── Tone Curve LUT ────────────────────────────
    const curvePoints = edits.toneCurve?.points;
    const hasCustomCurve = curvePoints && curvePoints.length >= 2 &&
      curvePoints.some((p: any) => Math.abs(p.x - p.y) > 0.5);
    if (hasCustomCurve) {
      this.updateCurveLUT(curvePoints);
    }
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.curveTexture);
    this.setUniformi('u_curveLUT', 1);
    this.setUniform('u_curveEnabled', hasCustomCurve ? 1.0 : 0.0);

    // ─── HSL Per-Channel ───────────────────────────
    const hslColors = ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta'];
    const hslHue = new Float32Array(8);
    const hslSat = new Float32Array(8);
    const hslLum = new Float32Array(8);
    
    if (edits.hsl) {
      hslColors.forEach((color, i) => {
        hslHue[i] = edits.hsl[`${color}Hue`] || 0;
        hslSat[i] = edits.hsl[`${color}Sat`] || 0;
        hslLum[i] = edits.hsl[`${color}Lum`] || 0;
      });
    }
    
    this.setUniformArray('u_hslHue', hslHue);
    this.setUniformArray('u_hslSat', hslSat);
    this.setUniformArray('u_hslLum', hslLum);

    // ─── Color Grading ─────────────────────────────
    const cg = edits.colorGrading || {};
    this.setUniform('u_cgShadowsHue', cg.shadowsHue || 0);
    this.setUniform('u_cgShadowsSat', cg.shadowsSat || 0);
    this.setUniform('u_cgMidtonesHue', cg.midtonesHue || 0);
    this.setUniform('u_cgMidtonesSat', cg.midtonesSat || 0);
    this.setUniform('u_cgHighlightsHue', cg.highlightsHue || 0);
    this.setUniform('u_cgHighlightsSat', cg.highlightsSat || 0);
    this.setUniform('u_cgBlending', cg.blending ?? 50);
    this.setUniform('u_cgBalance', cg.balance || 0);

    // ─── Calibration ───────────────────────────────
    const cal = edits.calibration || {};
    this.setUniform('u_calShadowsTint', cal.shadowsTint || 0);
    this.setUniform('u_calRedHue', cal.redPrimary?.hue || 0);
    this.setUniform('u_calRedSat', cal.redPrimary?.saturation || 0);
    this.setUniform('u_calGreenHue', cal.greenPrimary?.hue || 0);
    this.setUniform('u_calGreenSat', cal.greenPrimary?.saturation || 0);
    this.setUniform('u_calBlueHue', cal.bluePrimary?.hue || 0);
    this.setUniform('u_calBlueSat', cal.bluePrimary?.saturation || 0);

    // ─── Detail (Sharpening) ───────────────────────
    this.setUniform('u_sharpenAmount', edits.sharpening?.amount || 0);
    this.setUniform('u_sharpenRadius', edits.sharpening?.radius || 1.0);
    this.setUniform2f('u_texelSize', 1.0 / this.imageWidth, 1.0 / this.imageHeight);

    // ─── Effects ───────────────────────────────────
    this.setUniform('u_vignetteAmount', edits.vignette?.amount || 0);
    this.setUniform('u_vignetteMidpoint', edits.vignette?.midpoint ?? 50);
    this.setUniform('u_vignetteRoundness', edits.vignette?.roundness || 0);
    this.setUniform('u_vignetteFeather', edits.vignette?.feather ?? 50);
    this.setUniform('u_grainAmount', edits.grain?.amount || 0);
    this.setUniform('u_grainSize', edits.grain?.size ?? 25);

    // Draw
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /** Set a float uniform value */
  private setUniform(name: string, value: number): void {
    const gl = this.gl!;
    if (!this.program) return;
    const location = gl.getUniformLocation(this.program, name);
    if (location !== null) {
      gl.uniform1f(location, value);
    }
  }

  /** Set an integer uniform value */
  private setUniformi(name: string, value: number): void {
    const gl = this.gl!;
    if (!this.program) return;
    const location = gl.getUniformLocation(this.program, name);
    if (location !== null) {
      gl.uniform1i(location, value);
    }
  }

  /** Set a vec2 uniform */
  private setUniform2f(name: string, x: number, y: number): void {
    const gl = this.gl!;
    if (!this.program) return;
    const location = gl.getUniformLocation(this.program, name);
    if (location !== null) {
      gl.uniform2f(location, x, y);
    }
  }

  /** Set a float array uniform */
  private setUniformArray(name: string, values: Float32Array): void {
    const gl = this.gl!;
    if (!this.program) return;
    const location = gl.getUniformLocation(this.program, name + '[0]');
    if (location !== null) {
      gl.uniform1fv(location, values);
    }
  }

  // ═══════════════════════════════════════════════════
  // Mask compositing — multi-pass FBO pipeline
  // ═══════════════════════════════════════════════════

  /** Bind vertex buffer & attributes for any shader program */
  private setupAttribs(program: WebGLProgram): void {
    const gl = this.gl!;
    if (!this.vertexBuffer) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

    const posLoc = gl.getAttribLocation(program, 'a_position');
    if (posLoc >= 0) {
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0);
    }
    const texLoc = gl.getAttribLocation(program, 'a_texCoord');
    if (texLoc >= 0) {
      gl.enableVertexAttribArray(texLoc);
      gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 16, 8);
    }
  }

  /** Lazily compile the blend program */
  private ensureBlendProgram(): void {
    if (this.blendProgram) return;
    const gl = this.gl!;
    const vs = this.compileShader(gl.VERTEX_SHADER, WebGLImageRenderer.VERTEX_SHADER);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, WebGLImageRenderer.BLEND_FRAGMENT_SHADER);
    if (!vs || !fs) return;
    this.blendProgram = gl.createProgram()!;
    gl.attachShader(this.blendProgram, vs);
    gl.attachShader(this.blendProgram, fs);
    gl.linkProgram(this.blendProgram);
    if (!gl.getProgramParameter(this.blendProgram, gl.LINK_STATUS)) {
      console.error('Blend shader link error:', gl.getProgramInfoLog(this.blendProgram));
      this.blendProgram = null;
    }
  }

  /** Lazily compile the draw-texture program */
  private ensureDrawProgram(): void {
    if (this.drawProgram) return;
    const gl = this.gl!;
    const vs = this.compileShader(gl.VERTEX_SHADER, WebGLImageRenderer.VERTEX_SHADER);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, WebGLImageRenderer.DRAW_FRAGMENT_SHADER);
    if (!vs || !fs) return;
    this.drawProgram = gl.createProgram()!;
    gl.attachShader(this.drawProgram, vs);
    gl.attachShader(this.drawProgram, fs);
    gl.linkProgram(this.drawProgram);
    if (!gl.getProgramParameter(this.drawProgram, gl.LINK_STATUS)) {
      console.error('Draw shader link error:', gl.getProgramInfoLog(this.drawProgram));
      this.drawProgram = null;
    }
  }

  /** Create one framebuffer object with its colour-attachment texture */
  private createFBO(w: number, h: number): { fbo: WebGLFramebuffer; tex: WebGLTexture } {
    const gl = this.gl!;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return { fbo, tex };
  }

  /** Ensure we have 3 FBOs at the current canvas dimensions */
  private ensureFBOs(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w === this.fboWidth && h === this.fboHeight && this.fboPool.length === 3) return;

    this.destroyFBOs();
    this.fboWidth = w;
    this.fboHeight = h;
    for (let i = 0; i < 3; i++) {
      this.fboPool.push(this.createFBO(w, h));
    }
  }

  /** Upload a canvas (mask alpha) as a WebGL texture */
  private createTextureFromCanvas(canvas: HTMLCanvasElement): WebGLTexture {
    const gl = this.gl!;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  /** Blend pass: mix(base, layer, maskAlpha) → currently bound FBO */
  private blendPass(baseTex: WebGLTexture, layerTex: WebGLTexture, maskTex: WebGLTexture): void {
    const gl = this.gl!;
    if (!this.blendProgram) return;

    gl.useProgram(this.blendProgram);
    this.setupAttribs(this.blendProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, baseTex);
    gl.uniform1i(gl.getUniformLocation(this.blendProgram, 'u_base'), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, layerTex);
    gl.uniform1i(gl.getUniformLocation(this.blendProgram, 'u_layer'), 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, maskTex);
    gl.uniform1i(gl.getUniformLocation(this.blendProgram, 'u_mask'), 2);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /** Draw a texture fullscreen to the currently bound target */
  private drawTexture(tex: WebGLTexture): void {
    const gl = this.gl!;
    if (!this.drawProgram) return;

    gl.useProgram(this.drawProgram);
    this.setupAttribs(this.drawProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(gl.getUniformLocation(this.drawProgram, 'u_texture'), 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /** Create combined edits (global + mask adjustment deltas) */
  private combineEdits(global: any, maskAdj: any): any {
    const combined = JSON.parse(JSON.stringify(global));
    const add = (key: string) => {
      if (maskAdj[key]) combined[key] = (combined[key] || 0) + maskAdj[key];
    };
    add('exposure'); add('contrast'); add('highlights'); add('shadows');
    add('whites'); add('blacks'); add('temperature'); add('tint');
    add('clarity'); add('dehaze'); add('saturation');

    // Mask sharpness → global sharpening.amount
    if (maskAdj.sharpness) {
      if (!combined.sharpening) combined.sharpening = {};
      combined.sharpening.amount = (combined.sharpening?.amount || 0) + maskAdj.sharpness;
    }
    return combined;
  }

  /**
   * Render the image with global edits PLUS per-mask local adjustments.
   *
   * Pipeline (multi-pass FBO ping-pong):
   *   1. Render base (global edits) → FBO-A
   *   2. For each mask:
   *      a. Render image with (global + mask) edits → FBO-maskLayer
   *      b. Blend FBO-src ← mix(FBO-src, FBO-maskLayer, maskAlpha) → FBO-dst
   *      c. Swap src/dst
   *   3. Draw FBO-src → screen
   */
  renderWithMasks(
    edits: any,
    masks: Array<{ adjustments: any; enabled: boolean }>,
    maskCanvases: HTMLCanvasElement[],
  ): void {
    const gl = this.gl!;
    if (!this.program || !this.imageLoaded) return;

    // Fast path: no enabled masks
    const enabledIdxs: number[] = [];
    masks.forEach((m, i) => { if (m.enabled && maskCanvases[i]) enabledIdxs.push(i); });
    if (enabledIdxs.length === 0) {
      this.render(edits);
      return;
    }

    // Lazy-init compositing infrastructure
    this.ensureFBOs();
    this.ensureBlendProgram();
    this.ensureDrawProgram();
    if (!this.blendProgram || !this.drawProgram || this.fboPool.length < 3) {
      // Fallback: render without masks
      this.render(edits);
      return;
    }

    const w = this.fboWidth;
    const h = this.fboHeight;

    // FBO roles: [0] and [1] for ping-pong accumulation, [2] for per-mask layer
    const accumA = this.fboPool[0];
    const accumB = this.fboPool[1];
    const maskLayer = this.fboPool[2];

    // Step 1: Render base (global edits) → accumA
    gl.bindFramebuffer(gl.FRAMEBUFFER, accumA.fbo);
    gl.viewport(0, 0, w, h);
    this.renderWithEdits(edits);

    // Step 2: For each enabled mask
    let src = accumA;
    let dst = accumB;

    for (const idx of enabledIdxs) {
      const mask = masks[idx];
      const maskCanvas = maskCanvases[idx];

      // 2a. Render with combined edits → maskLayer
      const combined = this.combineEdits(edits, mask.adjustments);
      gl.bindFramebuffer(gl.FRAMEBUFFER, maskLayer.fbo);
      gl.viewport(0, 0, w, h);
      this.renderWithEdits(combined);

      // 2b. Upload mask alpha canvas
      const maskTex = this.createTextureFromCanvas(maskCanvas);

      // 2c. Blend: dst = mix(src, maskLayer, maskAlpha)
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
      gl.viewport(0, 0, w, h);
      gl.clear(gl.COLOR_BUFFER_BIT);
      this.blendPass(src.tex, maskLayer.tex, maskTex);

      gl.deleteTexture(maskTex);

      // 2d. Swap ping-pong
      const tmp = src;
      src = dst;
      dst = tmp;
    }

    // Step 3: Draw accumulated result → screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.drawTexture(src.tex);
  }

  /** Release FBO resources */
  private destroyFBOs(): void {
    const gl = this.gl;
    if (!gl) return;
    for (const { fbo, tex } of this.fboPool) {
      gl.deleteFramebuffer(fbo);
      gl.deleteTexture(tex);
    }
    this.fboPool = [];
    this.fboWidth = 0;
    this.fboHeight = 0;
  }

  /** Get the canvas element (for export pixel capture) */
  getCanvas(): HTMLCanvasElement { return this.canvas; }

  /** Check if the renderer has a loaded image */
  isReady(): boolean { return this.imageLoaded && !!this.program; }

  /** Check if the WebGL context is still valid (not lost) */
  isContextValid(): boolean {
    if (!this.gl) return false;
    return !this.gl.isContextLost();
  }

  /** Diagnostic: check all components are ready for rendering */
  diagnose(): { ok: boolean; issues: string[] } {
    const issues: string[] = [];
    if (!this.gl) issues.push('No WebGL context');
    else if (this.gl.isContextLost()) issues.push('WebGL context lost');
    if (!this.program) issues.push('No shader program (compilation may have failed)');
    if (!this.texture) issues.push('No image texture');
    if (!this.imageLoaded) issues.push('No image loaded');
    if (!this.vertexBuffer) issues.push('No vertex buffer');
    if (this.canvas.width === 0) issues.push('Canvas width is 0');
    if (this.canvas.height === 0) issues.push('Canvas height is 0');
    const glErr = this.gl?.getError?.();
    if (glErr && glErr !== 0) issues.push(`WebGL error code: ${glErr}`);
    return { ok: issues.length === 0, issues };
  }

  /** Export the current canvas as a data URL (must call render first) */
  toDataURL(format: string = 'image/png', quality: number = 1.0): string {
    return this.canvas.toDataURL(format, quality);
  }

  /** Export canvas pixels as Blob */
  toBlob(format: string = 'image/png', quality: number = 1.0): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('toBlob failed')),
        format,
        quality,
      );
    });
  }

  /** Render to an offscreen canvas at a given resolution and return as data URL */
  renderForExport(
    edits: any,
    width: number,
    height: number,
    format: string = 'image/png',
    quality: number = 1.0,
  ): string {
    // Save current canvas dimensions
    const origW = this.canvas.width;
    const origH = this.canvas.height;

    // Resize canvas to export resolution
    this.canvas.width = width;
    this.canvas.height = height;

    // Render
    this.render(edits);

    // Capture
    const dataUrl = this.canvas.toDataURL(format, quality);

    // Restore original dimensions
    this.canvas.width = origW;
    this.canvas.height = origH;
    this.render(edits);

    return dataUrl;
  }

  /** Clean up WebGL resources */
  destroy(): void {
    const gl = this.gl;
    if (!gl) return;
    this.destroyFBOs();
    if (this.texture) gl.deleteTexture(this.texture);
    if (this.curveTexture) gl.deleteTexture(this.curveTexture);
    if (this.program) gl.deleteProgram(this.program);
    if (this.blendProgram) gl.deleteProgram(this.blendProgram);
    if (this.drawProgram) gl.deleteProgram(this.drawProgram);
  }
}
