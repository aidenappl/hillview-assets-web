const STEPS = [1, 2, 3, 4] as const;

// The four numbered circles with the progress line behind them.
export default function StepIndicator({ step }: { step: number }) {
  return (
    <div
      className="relative flex w-[min(400px,80vw)] justify-between py-[70px]"
      aria-label={`Step ${step} of 4`}
    >
      <div className="absolute top-1/2 left-[5%] h-[2px] w-[90%] -translate-y-1/2 overflow-hidden bg-line-strong">
        <div
          className="h-[2px] bg-brand transition-[width] duration-400"
          style={{ width: `${((step - 1) / 3) * 100}%` }}
        />
      </div>
      {STEPS.map((n) => (
        <div
          key={n}
          className={`relative z-10 flex size-[50px] items-center justify-center rounded-full border-2 transition-colors duration-300 ${
            step >= n
              ? "border-brand bg-brand text-white"
              : "border-line-strong bg-white text-line-strong"
          }`}
        >
          {n}
        </div>
      ))}
    </div>
  );
}
