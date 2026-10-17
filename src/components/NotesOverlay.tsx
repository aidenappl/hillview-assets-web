import { useEffect } from "react";

type NotesOverlayProps = { notes: string | null; onClose: () => void };

// The asset's metadata notes (why it carries a warning). Escape, the
// backdrop or "Acknowledge" closes it.
export default function NotesOverlay({ notes, onClose }: NotesOverlayProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/10"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notes-title"
        className="relative w-[min(500px,90vw)] rounded-lg border-2 border-[#f1f2f7] bg-white p-[30px] shadow-[0_0_10px_0_#0000001f]"
      >
        <h4 id="notes-title" className="mb-5 text-2xl font-semibold">
          Notes
        </h4>
        <p className="whitespace-pre-wrap">
          {notes ?? "There are no notes for this asset."}
        </p>
        <button
          type="button"
          autoFocus
          onClick={onClose}
          className="mt-[30px] h-10 w-full cursor-pointer rounded-[5px] bg-brand text-white"
        >
          Acknowledge
        </button>
      </div>
    </div>
  );
}
