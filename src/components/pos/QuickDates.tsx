const pad = (n: number) => String(n).padStart(2, "0");
const toInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

/** Tomorrow, the coming Friday (next week's if today is Friday) and a week out. */
const options = () => {
  const day = new Date().getDay();
  const toFriday = (5 - day + 7) % 7 || 7;
  return [
    { label: "Tomorrow", value: toInput(addDays(1)) },
    { label: "Friday", value: toInput(addDays(toFriday)) },
    { label: "1 week", value: toInput(addDays(7)) },
  ];
};

type QuickDatesProps = { value: string; onPick: (value: string) => void };

export default function QuickDates({ value, onPick }: QuickDatesProps) {
  return (
    <div className="mt-3 flex gap-2">
      {options().map((o) => (
        <button
          key={o.label}
          type="button"
          onClick={() => onPick(o.value)}
          className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
            value === o.value
              ? "border-brand bg-brand text-white"
              : "border-line-strong text-ink-soft hover:border-brand hover:text-brand"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
