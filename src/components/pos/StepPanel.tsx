import type { ReactNode } from "react";

type StepPanelProps = { index: number; step: number; children: ReactNode };

// All four steps share one grid cell; the active one slides in from the
// right and finished ones slide out to the left, as in the Angular kiosk.
export default function StepPanel({ index, step, children }: StepPanelProps) {
  let state = "translate-x-[15vw] opacity-0 pointer-events-none";
  if (index === step) state = "translate-x-0 opacity-100 delay-100";
  else if (index < step)
    state = "-translate-x-[15vw] opacity-0 pointer-events-none";

  return (
    <section
      aria-hidden={index !== step}
      inert={index !== step}
      className={`col-start-1 row-start-1 flex flex-col items-center transition-all duration-400 ${state}`}
    >
      {children}
    </section>
  );
}
