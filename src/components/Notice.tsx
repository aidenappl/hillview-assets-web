export type NoticeTone = "error" | "warn" | "success";

export type NoticeState = {
  tone: NoticeTone;
  text: string;
  action?: { label: string; run: () => void };
};

const TONES = {
  error: "border-[#fbd0d3]/80 bg-[#fff4f5]/85 text-[#b42330]",
  warn: "border-[#ffdcae]/80 bg-[#fff8ee]/85 text-[#a2560b]",
  success: "border-[#bfe8cf]/80 bg-[#f1fbf5]/85 text-[#17733f]",
} as const;

const ICONS = {
  error: <path d="M12 8v4m0 4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />,
  warn: (
    <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
  ),
  success: <path d="M20 6 9 17l-5-5" />,
} as const;

type NoticeProps = { notice: NoticeState; onDismiss: () => void };

// One alert toast. Rendered by AlertProvider; use useAlert() to show one.
export default function Notice({ notice, onDismiss }: NoticeProps) {
  return (
    <div
      role={notice.tone === "error" ? "alert" : "status"}
      className={`pointer-events-auto flex w-[min(520px,92vw)] animate-[notice-in_420ms_var(--ease-spring)] items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-[0_16px_40px_-16px_rgba(30,41,80,0.35)] backdrop-blur-xl backdrop-saturate-150 ${TONES[notice.tone]}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5 shrink-0"
      >
        {ICONS[notice.tone]}
      </svg>
      <span className="flex-1">{notice.text}</span>
      {notice.action && (
        <button
          type="button"
          onClick={notice.action.run}
          className="shrink-0 cursor-pointer rounded-lg bg-white/70 px-3 py-1.5 font-semibold ring-1 ring-current/20 hover:bg-white"
        >
          {notice.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 cursor-pointer rounded-md p-1 opacity-60 hover:opacity-100"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="size-4"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
