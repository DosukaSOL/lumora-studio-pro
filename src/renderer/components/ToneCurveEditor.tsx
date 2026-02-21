/**
 * Lumora Studio Pro — Tone Curve Editor
 * 
 * Interactive SVG-based tone curve with draggable control points.
 * Supports RGB, Red, Green, and Blue channels.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

interface ToneCurvePoint {
  x: number;
  y: number;
}

interface ToneCurveEditorProps {
  channel: 'rgb' | 'red' | 'green' | 'blue';
  points: ToneCurvePoint[];
  onChange: (points: ToneCurvePoint[]) => void;
}

const CURVE_SIZE = 256;
const PADDING = 8;
const VIEW_SIZE = CURVE_SIZE + PADDING * 2;

const channelColors = {
  rgb: '#aaaaaa',
  red: '#ef4444',
  green: '#22c55e',
  blue: '#3b82f6',
};

export const ToneCurveEditor: React.FC<ToneCurveEditorProps> = ({
  channel,
  points,
  onChange,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const color = channelColors[channel];

  /** Convert curve coordinates to SVG coordinates */
  const toSvg = (p: ToneCurvePoint) => ({
    x: PADDING + (p.x / 255) * CURVE_SIZE,
    y: PADDING + ((255 - p.y) / 255) * CURVE_SIZE,
  });

  /** Convert SVG coordinates to curve coordinates */
  const fromSvg = (svgX: number, svgY: number): ToneCurvePoint => ({
    x: Math.max(0, Math.min(255, Math.round(((svgX - PADDING) / CURVE_SIZE) * 255))),
    y: Math.max(0, Math.min(255, Math.round((1 - (svgY - PADDING) / CURVE_SIZE) * 255))),
  });

  /** Generate smooth curve path through points */
  const generatePath = (): string => {
    if (points.length < 2) return '';

    const svgPoints = points.map(toSvg);
    let path = `M ${svgPoints[0].x} ${svgPoints[0].y}`;

    if (svgPoints.length === 2) {
      path += ` L ${svgPoints[1].x} ${svgPoints[1].y}`;
      return path;
    }

    // Use cubic bezier curves for smooth interpolation
    for (let i = 0; i < svgPoints.length - 1; i++) {
      const p0 = svgPoints[Math.max(0, i - 1)];
      const p1 = svgPoints[i];
      const p2 = svgPoints[i + 1];
      const p3 = svgPoints[Math.min(svgPoints.length - 1, i + 2)];

      const tension = 0.3;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    return path;
  };

  /** Handle mouse move during drag */
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingIndex === null || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = VIEW_SIZE / rect.width;
    const scaleY = VIEW_SIZE / rect.height;
    const svgX = (e.clientX - rect.left) * scaleX;
    const svgY = (e.clientY - rect.top) * scaleY;

    const newPoint = fromSvg(svgX, svgY);

    // Don't let endpoints move on X axis
    if (draggingIndex === 0) newPoint.x = 0;
    if (draggingIndex === points.length - 1) newPoint.x = 255;

    // Don't let points cross each other on X axis
    if (draggingIndex > 0 && newPoint.x <= points[draggingIndex - 1].x + 5) {
      newPoint.x = points[draggingIndex - 1].x + 5;
    }
    if (draggingIndex < points.length - 1 && newPoint.x >= points[draggingIndex + 1].x - 5) {
      newPoint.x = points[draggingIndex + 1].x - 5;
    }

    const newPoints = [...points];
    newPoints[draggingIndex] = newPoint;
    onChange(newPoints);
  }, [draggingIndex, points, onChange]);

  const handleMouseUp = useCallback(() => {
    setDraggingIndex(null);
  }, []);

  useEffect(() => {
    if (draggingIndex !== null) {
      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [draggingIndex, handleMouseUp]);

  /** Add a new point on double-click */
  const handleDoubleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = VIEW_SIZE / rect.width;
    const scaleY = VIEW_SIZE / rect.height;
    const svgX = (e.clientX - rect.left) * scaleX;
    const svgY = (e.clientY - rect.top) * scaleY;

    const newPoint = fromSvg(svgX, svgY);

    // Insert in sorted order
    const newPoints = [...points];
    let insertIndex = newPoints.findIndex(p => p.x > newPoint.x);
    if (insertIndex === -1) insertIndex = newPoints.length;
    newPoints.splice(insertIndex, 0, newPoint);
    onChange(newPoints);
  }, [points, onChange]);

  /** Reset curve to linear */
  const handleReset = useCallback(() => {
    onChange([
      { x: 0, y: 0 },
      { x: 64, y: 64 },
      { x: 128, y: 128 },
      { x: 192, y: 192 },
      { x: 255, y: 255 },
    ]);
  }, [onChange]);

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
        className="w-full aspect-square bg-surface-900 rounded cursor-crosshair"
        onMouseMove={handleMouseMove}
        onDoubleClick={handleDoubleClick}
      >
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((t) => (
          <React.Fragment key={t}>
            <line
              x1={PADDING + t * CURVE_SIZE} y1={PADDING}
              x2={PADDING + t * CURVE_SIZE} y2={PADDING + CURVE_SIZE}
              stroke="#333" strokeWidth="0.5"
            />
            <line
              x1={PADDING} y1={PADDING + t * CURVE_SIZE}
              x2={PADDING + CURVE_SIZE} y2={PADDING + t * CURVE_SIZE}
              stroke="#333" strokeWidth="0.5"
            />
          </React.Fragment>
        ))}

        {/* Diagonal reference line */}
        <line
          x1={PADDING} y1={PADDING + CURVE_SIZE}
          x2={PADDING + CURVE_SIZE} y2={PADDING}
          stroke="#444" strokeWidth="0.5" strokeDasharray="4,4"
        />

        {/* Border */}
        <rect
          x={PADDING} y={PADDING}
          width={CURVE_SIZE} height={CURVE_SIZE}
          fill="none" stroke="#333" strokeWidth="0.5"
        />

        {/* Histogram background (simplified) */}
        <defs>
          <linearGradient id={`curveHist-${channel}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.08" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Curve path */}
        <path
          d={generatePath()}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Control points */}
        {points.map((point, index) => {
          const svgPoint = toSvg(point);
          const isActive = draggingIndex === index || hoverIndex === index;
          return (
            <circle
              key={index}
              cx={svgPoint.x}
              cy={svgPoint.y}
              r={isActive ? 5 : 4}
              fill={isActive ? color : '#1a1a1a'}
              stroke={color}
              strokeWidth="1.5"
              className="cursor-grab active:cursor-grabbing"
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingIndex(index);
              }}
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
            />
          );
        })}
      </svg>

      {/* Reset button */}
      <button
        onClick={handleReset}
        className="absolute top-1 right-1 text-2xs text-surface-500 hover:text-surface-200 bg-surface-900/80 px-1 rounded"
        title="Reset Curve"
      >
        Reset
      </button>
    </div>
  );
};
