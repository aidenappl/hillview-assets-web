"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type StepCarouselProps = { step: number; children: ReactNode };

/**
 * The POS steps as a horizontal carousel: every slide sits side by side on one
 * track, which slides a full width per step. The viewport's height follows
 * the active slide (measured), so the page grows or shrinks smoothly instead
 * of jumping. overflow-x: clip keeps the card shadows visible top and bottom.
 */
export default function StepCarousel({ step, children }: StepCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const slide = trackRef.current?.querySelector<HTMLElement>(
      `[data-step="${step}"]`,
    );
    if (!slide) return;
    const observer = new ResizeObserver(([entry]) =>
      setHeight(entry.borderBoxSize[0].blockSize),
    );
    observer.observe(slide);
    return () => observer.disconnect();
  }, [step]);

  return (
    <div
      className="relative w-full transition-[height] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] [overflow-x:clip]"
      style={{ height }}
    >
      <div
        ref={trackRef}
        className="flex items-start transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform motion-reduce:transition-none"
        style={{ transform: `translateX(-${(step - 1) * 100}%)` }}
      >
        {children}
      </div>
    </div>
  );
}
