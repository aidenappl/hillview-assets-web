const STEPS = [1, 2, 3, 4] as const;

// Four numbered dots on a frosted pill, with the progress line behind them.
export default function StepIndicator({ step }: { step: number }) {
  return (
    <div className="pt-10 pb-6">
      <div
        className="glass-subtle relative flex w-[min(320px,80vw)] items-center justify-between rounded-full px-2 py-2"
        aria-label={`Step ${step} of 4`}
      >
        <div className="absolute top-1/2 right-6 left-6 h-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-[#dfe3ec]">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-700 ease-spring"
            style={{ width: `${((step - 1) / 3) * 100}%` }}
          />
        </div>
        {STEPS.map((n) => (
          <div
            key={n}
            className={`relative z-10 flex size-9 items-center justify-center rounded-full text-sm font-semibold transition-all duration-500 ease-spring ${
              step > n
                ? "bg-brand text-white"
                : step === n
                  ? "scale-110 bg-brand text-white shadow-[0_0_0_5px_rgba(48,103,246,0.18)]"
                  : "bg-white/90 text-[#a3abba] ring-1 ring-[#e3e7ef]"
            }`}
          >
            {step > n ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : (
              n
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
