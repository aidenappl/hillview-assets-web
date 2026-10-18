export type Location = "onsite" | "offsite";

const OPTIONS = [
  {
    value: "onsite",
    title: "On-Campus",
    body: "Will the equipment remain here on campus?",
    icon: (
      <>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
  },
  {
    value: "offsite",
    title: "Off-Campus",
    body: "Do you plan on taking the equipment home?",
    icon: (
      <>
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </>
    ),
  },
] as const;

type LocationSelectProps = {
  value: Location;
  onChange: (value: Location) => void;
};

export default function LocationSelect({
  value,
  onChange,
}: LocationSelectProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Where will the equipment be?"
      className="flex gap-3"
    >
      {OPTIONS.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`relative flex flex-1 cursor-pointer flex-col gap-6 rounded-2xl border p-5 text-left transition-all duration-300 ease-spring select-none active:scale-[0.98] ${
              active
                ? "-translate-y-0.5 border-brand/50 bg-white shadow-[0_0_0_4px_rgba(48,103,246,0.12),0_10px_30px_-12px_rgba(48,103,246,0.4)]"
                : "border-white/70 bg-white/45 hover:bg-white/70"
            }`}
          >
            <span
              aria-hidden
              className={`absolute top-4 right-4 flex size-5 items-center justify-center rounded-full border-2 transition-all duration-300 ease-spring ${
                active
                  ? "scale-100 border-brand bg-brand"
                  : "scale-90 border-[#cfd5e1] bg-white"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth={3.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`size-3 transition-transform duration-300 ease-spring ${active ? "scale-100" : "scale-0"}`}
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`size-7 transition-[transform,stroke] duration-300 ease-spring ${active ? "scale-110 stroke-brand" : "stroke-[#354259]"}`}
            >
              {o.icon}
            </svg>
            <span>
              <span className="block pb-1 text-base font-bold text-[#2b3545]">
                {o.title}
              </span>
              <span className="block text-sm leading-snug text-muted">
                {o.body}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
