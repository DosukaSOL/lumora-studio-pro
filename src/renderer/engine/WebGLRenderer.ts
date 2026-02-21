/**
 * Lumora Studio Pro — WebGL Image Renderer
 * 
 * GPU-accelerated image rendering with real-time 
 * color and tone adjustments using WebGL shaders.
 */

export class WebGLImageRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | WebGLRenderingContext | null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private imageLoaded: boolean = false;
  private imageWidth: number = 0;
  private imageHeight: number = 0;

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
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_image;
    
    // Edit parameters
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
    uniform float u_vignetteAmount;
    uniform float u_vignetteMidpoint;
    uniform float u_grainAmount;
    
    // Convert RGB to HSL
    vec3 rgb2hsl(vec3 c) {
      float maxC = max(max(c.r, c.g), c.b);
      float minC = min(min(c.r, c.g), c.b);
      float l = (maxC + minC) / 2.0;
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
    
    // Convert HSL to RGB
    float hue2rgb(float p, float q, float t) {
      if (t < 0.0) t += 1.0;
      if (t > 1.0) t -= 1.0;
      if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
      if (t < 1.0/2.0) return q;
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
    
    // Luminance
    float luminance(vec3 c) {
      return dot(c, vec3(0.2126, 0.7152, 0.0722));
    }
    
    // Pseudo-random for grain
    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    void main() {
      vec4 texColor = texture2D(u_image, v_texCoord);
      vec3 color = texColor.rgb;
      
      // === Exposure ===
      color *= pow(2.0, u_exposure);
      
      // === Contrast ===
      float contrastFactor = (259.0 * (u_contrast + 255.0)) / (255.0 * (259.0 - u_contrast));
      color = clamp((color - 0.5) * contrastFactor + 0.5, 0.0, 1.0);
      
      // === Temperature & Tint (approximation) ===
      color.r += u_temperature * 0.0004;
      color.b -= u_temperature * 0.0004;
      color.g += u_tint * 0.0003;
      color.r -= u_tint * 0.00015;
      
      // === Highlights & Shadows ===
      float lum = luminance(color);
      float highlightMask = smoothstep(0.5, 1.0, lum);
      float shadowMask = 1.0 - smoothstep(0.0, 0.5, lum);
      color += u_highlights * 0.01 * highlightMask;
      color += u_shadows * 0.01 * shadowMask;
      
      // === Whites & Blacks ===
      float whiteMask = smoothstep(0.75, 1.0, lum);
      float blackMask = 1.0 - smoothstep(0.0, 0.25, lum);
      color += u_whites * 0.01 * whiteMask;
      color += u_blacks * 0.01 * blackMask;
      
      // === Vibrance (selective saturation boost) ===
      vec3 hsl = rgb2hsl(color);
      float vibranceBoost = u_vibrance * 0.01 * (1.0 - hsl.y);
      hsl.y = clamp(hsl.y + vibranceBoost, 0.0, 1.0);
      
      // === Saturation ===
      hsl.y = clamp(hsl.y * (1.0 + u_saturation * 0.01), 0.0, 1.0);
      color = hsl2rgb(hsl);
      
      // === Dehaze === 
      float dehazeFactor = u_dehaze * 0.005;
      color = color * (1.0 + dehazeFactor) - dehazeFactor * 0.5;
      
      // === Clarity (local contrast) ===
      // Simplified: boosts midtone contrast
      float clarityLum = luminance(color);
      float clarityMask = 1.0 - abs(clarityLum - 0.5) * 2.0;
      color += u_clarity * 0.003 * clarityMask * (color - 0.5);
      
      // === Vignette ===
      if (u_vignetteAmount != 0.0) {
        vec2 center = v_texCoord - 0.5;
        float dist = length(center) * 1.414;
        float midpt = u_vignetteMidpoint * 0.01;
        float vignette = smoothstep(midpt, 1.0, dist);
        color *= 1.0 + u_vignetteAmount * 0.01 * vignette * -1.0;
      }
      
      // === Grain ===
      if (u_grainAmount > 0.0) {
        float grain = (rand(v_texCoord * 1000.0) - 0.5) * u_grainAmount * 0.01;
        color += grain;
      }
      
      // Final clamp
      color = clamp(color, 0.0, 1.0);
      
      gl_FragColor = vec4(color, texColor.a);
    }
  `;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

    if (!this.gl) {
      throw new Error('WebGL not supported');
    }

    this.initShaders();
    this.initGeometry();
  }

  /** Compile and link shaders */
  private initShaders(): void {
    const gl = this.gl!;

    const vertexShader = this.compileShader(gl.VERTEX_SHADER, WebGLImageRenderer.VERTEX_SHADER);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, WebGLImageRenderer.FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) return;

    this.program = gl.createProgram()!;
    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('Shader link error:', gl.getProgramInfoLog(this.program));
      return;
    }

    gl.useProgram(this.program);
  }

  /** Compile a single shader */
  private compileShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl!;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
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

    this.imageWidth = img.width;
    this.imageHeight = img.height;
    this.imageLoaded = true;
  }

  /** Render the image with current edit parameters */
  render(edits: any): void {
    const gl = this.gl!;
    if (!this.program || !this.imageLoaded) return;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.067, 0.067, 0.067, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);

    // Set uniform values from edit parameters
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
    this.setUniform('u_vignetteAmount', edits.vignette?.amount || 0);
    this.setUniform('u_vignetteMidpoint', edits.vignette?.midpoint || 50);
    this.setUniform('u_grainAmount', edits.grain?.amount || 0);

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

  /** Clean up WebGL resources */
  destroy(): void {
    const gl = this.gl;
    if (!gl) return;
    if (this.texture) gl.deleteTexture(this.texture);
    if (this.program) gl.deleteProgram(this.program);
  }
}
