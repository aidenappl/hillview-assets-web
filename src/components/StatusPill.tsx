type StatusPillProps = {
  tone: "available" | "checkedout" | "warn";
  children: string;
  onClick?: () => void;
};

const TONES = {
  available: "bg-[#e7f8ee] text-[#17733f] ring-[#bfe8cf]",
  checkedout: "bg-[#fff0f1] text-[#b42330] ring-[#fbd0d3]",
  warn: "bg-[#fff6e8] text-[#a2560b] ring-[#ffdcae]",
} as const;

export default function StatusPill({
  tone,
  children,
  onClick,
}: StatusPillProps) {
  const className = `inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${TONES[tone]}`;
  if (!onClick) return <span className={className}>{children}</span>;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer ${className}`}
    >
      {children}
    </button>
  );
}
