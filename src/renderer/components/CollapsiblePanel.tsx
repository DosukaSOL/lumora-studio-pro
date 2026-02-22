/**
 * Lumora Studio Pro — Collapsible Panel Section
 * 
 * Animated collapsible panel with header, used for all
 * edit sections in the right panel (Basic, Tone Curve, HSL, etc.)
 */

import React, { useState, useRef, useEffect } from 'react';

interface CollapsiblePanelProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  /** Show a colored indicator when settings are modified */
  isModified?: boolean;
  /** Optional action element in the header (e.g., channel selector) */
  headerAction?: React.ReactNode;
}

export const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  title,
  defaultOpen = true,
  children,
  isModified = false,
  headerAction,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);

  // Measure content height for smooth animation
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [children, isOpen]);

  return (
    <div className="border-b border-surface-800/50">
      {/* Header */}
      <button
        className="panel-header w-full"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          {/* Collapse arrow */}
          <svg
            className={`w-2.5 h-2.5 text-surface-500 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>

          <span className="text-xs font-medium tracking-wide">{title}</span>

          {/* Modified indicator */}
          {isModified && (
            <div className="w-1.5 h-1.5 rounded-full bg-lumora-500 shadow-sm shadow-lumora-500/30" />
          )}
        </div>

        {/* Header action (e.g., channel selector) */}
        {headerAction && (
          <div
            className="no-drag"
            onClick={(e) => e.stopPropagation()}
          >
            {headerAction}
          </div>
        )}
      </button>

      {/* Content with animation */}
      <div
        className="overflow-hidden transition-all duration-200 ease-out"
        style={{
          maxHeight: isOpen ? (contentHeight || 2000) : 0,
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div ref={contentRef} className="panel-content">
          {children}
        </div>
      </div>
    </div>
  );
};
