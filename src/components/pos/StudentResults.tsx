import Spinner from "@/components/Spinner";
import RemoteImage from "@/components/RemoteImage";
import type { MobileUser } from "@/types";

type StudentResultsProps = {
  query: string;
  results: MobileUser[];
  searching: boolean;
  highlight: number;
  onPick: (user: MobileUser) => void;
  onHover: (index: number) => void;
};

/** Bolds the part of a name that matches what was typed. */
function Match({ text, query }: { text: string; query: string }) {
  const at = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (at === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="bg-transparent font-bold text-ink">
        {text.slice(at, at + query.length)}
      </mark>
      {text.slice(at + query.length)}
    </>
  );
}

// The student type-ahead under the Student ID field.
export default function StudentResults({
  query,
  results,
  searching,
  highlight,
  onPick,
  onHover,
}: StudentResultsProps) {
  const q = query.trim();
  // A scanned card is all digits: don't flash "no match" at a scanner.
  if (q === "" || /^\d+$/.test(q)) return null;
  if (!searching && results.length === 0) {
    return (
      <div className="absolute z-10 mt-2 w-full rounded-xl border border-line-strong bg-white px-4 py-3 text-sm text-muted shadow-[0_12px_32px_-8px_rgba(16,24,40,0.18)]">
        No students match &ldquo;{q}&rdquo;. Try scanning the ID card.
      </div>
    );
  }
  return (
    <ul
      id="student-results"
      role="listbox"
      className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-line-strong bg-white p-1.5 shadow-[0_12px_32px_-8px_rgba(16,24,40,0.18)]"
    >
      {searching && results.length === 0 && (
        <li className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted">
          <Spinner className="size-4! border-[#d7dbe3]! border-l-brand!" />{" "}
          Searching…
        </li>
      )}
      {results.map((r, i) => (
        <li
          key={r.id}
          role="option"
          aria-selected={i === highlight}
          onMouseEnter={() => onHover(i)}
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(r);
          }}
          className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors ${i === highlight ? "bg-brand/8" : ""}`}
        >
          <RemoteImage
            src={r.profile_image_url}
            alt=""
            className="size-9 rounded-full"
            sizes="36px"
            fit="cover"
          />
          <span className="min-w-0 flex-1 truncate text-ink-soft">
            <Match text={r.name} query={q} />
          </span>
          <span className="shrink-0 font-mono text-xs text-muted">
            {r.nfc_identifier}
          </span>
        </li>
      ))}
    </ul>
  );
}
