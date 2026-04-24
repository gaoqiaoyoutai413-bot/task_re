"use client";

import React, { useRef, useState, useEffect } from "react";
import { getStroke } from "perfect-freehand";

// Extract SVG path from stroke points
function getSvgPathFromStroke(stroke: number[][]) {
  if (!stroke.length) return "";

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...stroke[0], "Q"]
  );

  d.push("Z");
  return d.join(" ");
}

interface HandwritingCanvasProps {
  initialStrokes?: number[][][];
  onSave?: (strokes: number[][][]) => void;
}

export function HandwritingCanvas({ initialStrokes, onSave }: HandwritingCanvasProps) {
  const [points, setPoints] = useState<number[][]>([]);
  const [strokes, setStrokes] = useState<number[][][]>(initialStrokes || []);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 変更があったら1秒後に保存（連続保存による負荷を軽減するDebounce処理）
    if (onSave) {
      const handler = setTimeout(() => {
        onSave(strokes);
      }, 1000);
      return () => clearTimeout(handler);
    }
  }, [strokes, onSave]);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPoints([[e.clientX - rect.left, e.clientY - rect.top, e.pressure]]);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.buttons !== 1) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPoints([...points, [e.clientX - rect.left, e.clientY - rect.top, e.pressure]]);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (points.length > 0) {
      setStrokes([...strokes, points]);
      setPoints([]);
    }
  }

  const allStrokes = [...strokes, points].filter(p => p.length > 0);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative cursor-crosshair touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <svg className="w-full h-full pointer-events-none">
        {/* Adds a slight ink texture via turbulence */}
        <filter id="ink" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.2" numOctaves="2" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        {allStrokes.map((stroke, i) => {
          const strokeOutline = getStroke(stroke, {
            size: 4,
            thinning: 0.5,
            smoothing: 0.5,
            streamline: 0.5,
          });
          const pathData = getSvgPathFromStroke(strokeOutline);
          return (
            <path
              key={i}
              d={pathData}
              fill="var(--color-ink-blue)"
              filter="url(#ink)"
              opacity="0.85"
            />
          );
        })}
      </svg>
      {/* Decorative prompt */}
      {allStrokes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-black/20 italic pointer-events-none text-sm">
          手書きメモを追加...
        </div>
      )}
    </div>
  );
}
