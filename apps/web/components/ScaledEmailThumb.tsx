'use client';

import React, { useEffect, useRef, useState } from 'react';

interface ScaledEmailThumbProps {
  html: string;
  title: string;
  className?: string;
}

/**
 * Renders a crisp scaled miniature of compiled 600px HTML email inside a sandboxed iframe.
 */
export function ScaledEmailThumb({ html, title, className = '' }: ScaledEmailThumbProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.56);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const updateScale = () => {
      const width = node.getBoundingClientRect().width;
      if (width > 0) {
        setScale(width / 600);
      }
    };

    updateScale();
    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(updateScale);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-slate-100 select-none ${className}`}
    >
      <iframe
        title={title}
        srcDoc={html}
        sandbox=""
        loading="lazy"
        tabIndex={-1}
        className="pointer-events-none border-0 bg-white block"
        style={{
          width: '600px',
          height: '1200px',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      />
    </div>
  );
}

