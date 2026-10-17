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
      className="flex justify-between gap-4"
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
            className={`flex aspect-square w-[min(240px,43vw)] cursor-pointer flex-col justify-between rounded-[15px] border-2 p-[clamp(16px,3vw,35px)] text-left transition-colors select-none ${
              active ? "border-brand" : "border-[#f0f2f8]"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`size-[35px] transition-colors ${active ? "stroke-brand" : "stroke-[#354259]"}`}
            >
              {o.icon}
            </svg>
            <span>
              <span className="block pb-[13px] text-xl font-bold text-[#2b3545]">
                {o.title}
              </span>
              <span className="block text-base tracking-[0.5px] text-muted">
                {o.body}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
