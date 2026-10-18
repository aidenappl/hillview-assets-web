import RemoteImage from "@/components/RemoteImage";
import type { AssetUser } from "@/types";

type StudentChipProps = { student: AssetUser; onChange: () => void };

// Who is at the kiosk, from step 2 on, with a way out if it's the wrong card.
export default function StudentChip({ student, onChange }: StudentChipProps) {
  return (
    <div className="mt-4 inline-flex items-center gap-2.5 rounded-full border border-line-strong bg-white py-1 pr-1 pl-1 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      <RemoteImage
        src={student.profile_image_url}
        alt=""
        className="size-7 rounded-full"
        sizes="28px"
        fit="cover"
      />
      <span className="text-sm font-semibold text-ink-soft">
        {student.name ?? "Student"}
      </span>
      <button
        type="button"
        onClick={onChange}
        className="cursor-pointer rounded-full px-3 py-1 text-xs font-medium text-muted hover:bg-[#f3f4f8] hover:text-ink-soft"
      >
        Not you?
      </button>
    </div>
  );
}
