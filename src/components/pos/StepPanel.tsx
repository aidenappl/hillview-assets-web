import type { ReactNode } from "react";

type StepPanelProps = { index: number; step: number; children: ReactNode };

// One slide of the StepCarousel. Off-screen slides are inert so Tab and the
// scanner can't land in them.
export default function StepPanel({ index, step, children }: StepPanelProps) {
  const active = index === step;
  return (
    <section
      data-step={index}
      aria-hidden={!active}
      inert={!active}
      className={`flex w-full shrink-0 flex-col items-center px-4 pb-10 transition-opacity duration-300 ${active ? "opacity-100" : "opacity-40"}`}
    >
      {children}
    </section>
  );
}
