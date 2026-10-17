type StatusPillProps = {
  tone: "available" | "checkedout" | "warn";
  children: string;
  onClick?: () => void;
};

const TONES = {
  available: "bg-[#bdffd5]",
  checkedout: "bg-[#ffbdbd]",
  warn: "bg-[#ffcc84]",
} as const;

export default function StatusPill({
  tone,
  children,
  onClick,
}: StatusPillProps) {
  const className = `rounded-[20px] px-[17px] py-[5px] text-sm font-medium text-ink ${TONES[tone]}`;
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
