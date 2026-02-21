/**
 * Lumora Studio Pro — Edit Slider Component
 * 
 * Professional slider control with label, value display,
 * reset button, and centered zero-point indicator.
 * Double-click label to reset to default value.
 */

import React, { useCallback, useRef, useState } from 'react';

interface EditSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  onChange: (value: number) => void;
  onChangeEnd?: (value: number) => void;
  /** If true, shows a centered fill indicator (for -100 to 100 ranges) */
  centered?: boolean;
  /** Format the display value */
  formatValue?: (value: number) => string;
  /** Compact layout */
  compact?: boolean;
}

export const EditSlider: React.FC<EditSliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  defaultValue = 0,
  onChange,
  onChangeEnd,
  centered = false,
  formatValue,
  compact = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue = formatValue ? formatValue(value) : 
    Number.isInteger(value) ? value.toString() : value.toFixed(1);

  const isModified = value !== defaultValue;

  // Calculate fill position for centered sliders
  const range = max - min;
  const fillStart = centered ? ((defaultValue - min) / range) * 100 : 0;
  const fillEnd = ((value - min) / range) * 100;
  const actualStart = Math.min(fillStart, fillEnd);
  const actualEnd = Math.max(fillStart, fillEnd);

  const handleReset = useCallback(() => {
    onChange(defaultValue);
    onChangeEnd?.(defaultValue);
  }, [defaultValue, onChange, onChangeEnd]);

  const handleDoubleClick = useCallback(() => {
    handleReset();
  }, [handleReset]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    onChange(newValue);
  }, [onChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    onChangeEnd?.(value);
  }, [onChangeEnd, value]);

  return (
    <div
      className={`group ${compact ? 'py-0.5' : 'py-1'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Label row */}
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-xs ${isModified ? 'text-surface-200' : 'text-surface-400'} cursor-default select-none`}
          onDoubleClick={handleDoubleClick}
          title="Double-click to reset"
        >
          {label}
        </span>
        <div className="flex items-center gap-1">
          {/* Value display / editable */}
          <span
            className={`text-xs tabular-nums min-w-[2.5rem] text-right ${
              isModified ? 'text-surface-200' : 'text-surface-500'
            }`}
          >
            {value > 0 && centered ? '+' : ''}{displayValue}
          </span>
          {/* Reset button — appears on hover when modified */}
          {isModified && isHovered && (
            <button
              onClick={handleReset}
              className="w-3.5 h-3.5 flex items-center justify-center text-surface-500 hover:text-surface-200 transition-colors"
              title="Reset"
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Slider track */}
      <div className={`lumora-slider ${centered ? 'lumora-slider-centered' : ''}`}>
        <div className="relative w-full h-1 bg-surface-700 rounded-full overflow-hidden">
          {/* Fill indicator */}
          <div
            className="absolute top-0 h-full bg-lumora-500/60 rounded-full transition-all duration-75"
            style={{
              left: `${actualStart}%`,
              width: `${actualEnd - actualStart}%`,
            }}
          />
          {/* Center tick for centered sliders */}
          {centered && (
            <div
              className="absolute top-0 w-px h-full bg-surface-500/50"
              style={{ left: `${fillStart}%` }}
            />
          )}
        </div>
        <input
          ref={inputRef}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={handleMouseUp}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          style={{ height: '20px', margin: '-8px 0 0 0' }}
        />
        {/* Custom thumb */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-surface-200 shadow-sm pointer-events-none
            transition-transform duration-75 ${isDragging ? 'scale-125 bg-lumora-400' : 'hover:scale-110'}`}
          style={{ left: `calc(${fillEnd}% - 6px)` }}
        />
      </div>
    </div>
  );
};
