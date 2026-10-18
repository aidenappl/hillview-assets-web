"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Field, { inputClass } from "@/components/Field";
import NotesOverlay from "@/components/NotesOverlay";
import AssetCard from "@/components/AssetCard";
import StatusPill from "@/components/StatusPill";
import StepIndicator from "@/components/pos/StepIndicator";
import StepPanel from "@/components/pos/StepPanel";
import StepCarousel from "@/components/pos/StepCarousel";
import CartList, { type CartItem } from "@/components/pos/CartList";
import StudentResults from "@/components/pos/StudentResults";
import StudentChip from "@/components/pos/StudentChip";
import QuickDates from "@/components/pos/QuickDates";
import RemoteImage from "@/components/RemoteImage";
import { useAlert } from "@/components/AlertProvider";
import LocationSelect, { type Location } from "@/components/pos/LocationSelect";
import {
  reqCheckin,
  reqCheckout,
  reqGetAsset,
  reqGetStudent,
  reqSearchStudents,
} from "@/services/assets.service";
import { playAlert } from "@/services/sound.service";
import { reportError, track } from "@/services/monitor.service";
import {
  ASSET_STATUS_OK,
  type Asset,
  type AssetUser,
  type MobileUser,
} from "@/types";

type Step = 1 | 2 | 3 | 4;
/** Step 3 either finishes a checkout or shows one cart item's details. */
type Mode = "checkout" | "lookup";

const SEARCH_DEBOUNCE_MS = 150;
/** The done screen returns to the start so the next student gets a clean kiosk. */
const RESET_SECONDS = 15;

/** Local midnight on a YYYY-MM-DD date input value, as ISO. */
const localMidnightISO = (value: string): string | null => {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  // Months are 0-based; the Angular kiosk passed the 1-based month straight
  // through and recorded every return date a month late.
  return new Date(y, m - 1, d).toISOString();
};

const todayInputValue = (): string => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export default function PosKiosk() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [mode, setMode] = useState<Mode>("checkout");
  const [busy, setBusy] = useState(false);

  // Step 1
  const [studentInput, setStudentInput] = useState("");
  const [results, setResults] = useState<MobileUser[]>([]);
  const [highlight, setHighlight] = useState(-1);
  const [searching, setSearching] = useState(false);
  const [student, setStudent] = useState<AssetUser | null>(null);
  const searchSeq = useRef(0);
  const studentRef = useRef<HTMLInputElement>(null);

  // Step 2
  const [assetInput, setAssetInput] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [scanning, setScanning] = useState(false);
  const assetRef = useRef<HTMLInputElement>(null);

  // Step 3
  const [location, setLocation] = useState<Location>("onsite");
  const [returnDate, setReturnDate] = useState("");
  const [lookupAsset, setLookupAsset] = useState<Asset | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);

  // Step 4
  const [notCheckedOut, setNotCheckedOut] = useState<string[]>([]);
  const [countdown, setCountdown] = useState(RESET_SECONDS);

  const alerts = useAlert();
  const say = alerts.show;
  /** Moves between steps; a message belongs to the step it was shown on. */
  const goTo = (next: Step) => {
    alerts.clear();
    setStep(next);
  };

  const restart = () => window.location.reload();

  // ---- Step 1: student ----

  const searchStudents = useCallback(async (q: string) => {
    const seq = ++searchSeq.current;
    if (q.trim() === "") {
      setResults([]);
      return;
    }
    setSearching(true);
    const res = await reqSearchStudents(q);
    // A slower, older search must not overwrite a newer one.
    if (seq !== searchSeq.current) return;
    setSearching(false);
    setResults(res.success ? res.data : []);
    setHighlight(-1);
  }, []);

  useEffect(() => {
    if (step !== 1) return;
    const t = setTimeout(
      () => void searchStudents(studentInput),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(t);
  }, [studentInput, step, searchStudents]);

  const submitStudent = async (tag: string) => {
    const id = tag.trim();
    if (id === "") {
      say("error", "Enter or scan a student ID.");
      return;
    }
    setBusy(true);
    const res = await reqGetStudent(id);
    setBusy(false);
    if (!res.success) {
      say("error", res.error_message);
      return;
    }
    searchSeq.current++;
    setResults([]);
    setStudent(res.data);
    goTo(2);
  };

  const pickResult = (user: MobileUser) => {
    // The Angular kiosk filled in `identifier`, which mobile users don't
    // have, so a picked name always failed validation.
    searchSeq.current++;
    setStudentInput(user.nfc_identifier);
    setResults([]);
    setHighlight(-1);
    return user.nfc_identifier;
  };

  const onStudentKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && results.length > 0) {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp" && results.length > 0) {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results.length === 1) {
        void submitStudent(pickResult(results[0]));
      } else if (highlight >= 0 && results[highlight]) {
        pickResult(results[highlight]);
      } else {
        // A scanned card ends in Enter with no name picked.
        void submitStudent(studentInput);
      }
    }
  };

  // ---- Step 2: cart ----

  const addToCart = async () => {
    const tag = assetInput.trim();
    if (tag === "" || scanning) return;
    if (cart.some((item) => item.identifier === tag)) {
      say("warn", "That item is already in the cart.");
      setAssetInput("");
      return;
    }
    setScanning(true);
    const res = await reqGetAsset(tag);
    setScanning(false);
    setAssetInput("");
    assetRef.current?.focus({ preventScroll: true });
    if (!res.success) {
      say("error", res.error_message);
      return;
    }
    const asset = res.data;
    if (asset.status && asset.status.id !== ASSET_STATUS_OK) {
      playAlert();
      track("assets.cart.warning_scanned", {
        asset_id: asset.id,
        status: asset.status.short_name,
      });
    }
    setCart((c) => [asset, ...c]);
  };

  const removeItem = (id: number) =>
    setCart((c) => c.filter((i) => i.id !== id));

  const checkinItem = async (item: CartItem) => {
    setCart((c) =>
      c.map((i) => (i.id === item.id ? { ...i, checkingIn: true } : i)),
    );
    const res = await reqCheckin({ asset_id: item.id, source: "pos" });
    if (!res.success) {
      setCart((c) =>
        c.map((i) => (i.id === item.id ? { ...i, checkingIn: false } : i)),
      );
      say("error", res.error_message);
      return;
    }
    say("success", `${item.name ?? "Item"} checked in. Thanks!`);
    setTimeout(() => removeItem(item.id), 400);
  };

  const viewItem = (item: CartItem) => {
    setLookupAsset(item);
    setMode("lookup");
    goTo(3);
  };

  const continueToDetails = (warningAccepted = false) => {
    if (cart.length === 0) {
      say("error", "Scan at least one item first.");
      return;
    }
    if (cart.some((i) => i.active_tab)) {
      say(
        "error",
        "Remove the items marked Unavailable, or check yours in, to continue.",
      );
      return;
    }
    const warned = cart.filter(
      (i) => i.status && i.status.id !== ASSET_STATUS_OK,
    );
    if (warned.length > 0 && !warningAccepted) {
      say("warn", "Some items in your cart have warnings.", {
        label: "Continue anyway",
        run: () => {
          track("assets.cart.warning_override", {
            assets: warned.map((i) => i.id),
          });
          continueToDetails(true);
        },
      });
      return;
    }
    setMode("checkout");
    goTo(3);
  };

  // ---- Step 3: finish ----

  const finishCheckout = async () => {
    if (!student) return;
    let expectedIn: string | undefined;
    if (location === "offsite") {
      const iso = returnDate ? localMidnightISO(returnDate) : null;
      if (!iso) {
        say("error", "Pick a return date for off-campus gear.");
        return;
      }
      expectedIn = iso;
    }

    setBusy(true);
    const res = await reqCheckout({
      user_id: student.id,
      asset_ids: cart.map((i) => i.id),
      offsite: location === "offsite",
      expected_in: expectedIn,
    });
    setBusy(false);

    if (!res.success) {
      say("error", res.error_message);
      return;
    }
    const failed = res.data.filter((r) => !r.ok);
    if (failed.length === res.data.length) {
      say("error", failed[0]?.error ?? "Something went wrong!");
      return;
    }
    setNotCheckedOut(
      failed.map((f) => {
        const item = cart.find((i) => i.id === f.asset_id);
        return `${item?.name ?? `Asset ${f.asset_id}`}: ${f.error ?? "failed"}`;
      }),
    );
    setCountdown(RESET_SECONDS);
    goTo(4);
  };

  const back = useCallback(() => {
    setNotesOpen(false);
    alerts.clear();
    setStep((s) => (s === 2 || s === 3 ? ((s - 1) as Step) : s));
  }, [alerts]);

  // ---- Keyboard & focus ----

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.code === "Backslash" || e.key === "\\") &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        e.preventDefault();
        back();
      } else if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        router.push("/seeker");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [back, router]);

  useEffect(() => {
    if (step === 1) studentRef.current?.focus({ preventScroll: true });
    if (step === 2) {
      // After the slide-in, so the browser doesn't scroll the panel into view.
      const t = setTimeout(
        () => assetRef.current?.focus({ preventScroll: true }),
        500,
      );
      return () => clearTimeout(t);
    }
  }, [step]);

  useEffect(() => {
    if (step !== 4) return;
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) window.location.reload();
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [step]);

  useEffect(() => {
    // Anything that throws in an event handler outside React's boundaries.
    const onError = (e: PromiseRejectionEvent) =>
      reportError("assets.pos.unhandled", e.reason, { step });
    window.addEventListener("unhandledrejection", onError);
    return () => window.removeEventListener("unhandledrejection", onError);
  }, [step]);

  const firstName = student?.name?.split(" ")[0];

  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-x-hidden pb-[25px]">
      {notesOpen && lookupAsset && (
        <NotesOverlay
          notes={lookupAsset.metadata?.notes ?? null}
          onClose={() => setNotesOpen(false)}
        />
      )}

      <StepIndicator step={step} />

      <StepCarousel step={step}>
        {/* Step 1 */}
        <StepPanel index={1} step={step}>
          <Header
            title="Welcome! First things first..."
            subtitle="Get your Student ID ready to go!"
          />
          <div className="glass mt-8 flex w-[min(560px,92vw)] flex-col gap-5 rounded-[28px] p-6 sm:p-8">
            <div className="relative">
              <Field label="Student ID" htmlFor="studentID">
                <input
                  ref={studentRef}
                  id="studentID"
                  type="text"
                  autoComplete="off"
                  placeholder="Lookup Student ID"
                  className={inputClass}
                  value={studentInput}
                  onChange={(e) => setStudentInput(e.target.value)}
                  onKeyDown={onStudentKeyDown}
                  role="combobox"
                  aria-expanded={results.length > 0}
                  aria-controls="student-results"
                />
              </Field>
              {step === 1 && (
                <StudentResults
                  query={studentInput}
                  results={results}
                  searching={searching}
                  highlight={highlight}
                  onHover={setHighlight}
                  onPick={(r) => {
                    void submitStudent(pickResult(r));
                  }}
                />
              )}
            </div>
            <Button
              loading={busy && step === 1}
              onClick={() => void submitStudent(studentInput)}
            >
              Next Step
            </Button>
          </div>
        </StepPanel>

        {/* Step 2 */}
        <StepPanel index={2} step={step}>
          <Header
            title="Scan your items"
            subtitle="Grab the assets and check them out or in?"
          />
          {student && <StudentChip student={student} onChange={restart} />}
          <div className="glass mt-8 flex w-[min(560px,92vw)] flex-col gap-5 rounded-[28px] p-6 sm:p-8">
            <Field label="Asset ID" htmlFor="assetID">
              <div className="flex items-center gap-3">
                <input
                  ref={assetRef}
                  id="assetID"
                  type="text"
                  autoComplete="off"
                  placeholder="The Asset ID..."
                  className={inputClass}
                  value={assetInput}
                  onChange={(e) => setAssetInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void addToCart();
                    }
                  }}
                />
                <button
                  type="button"
                  aria-label="Add to cart"
                  onClick={() => void addToCart()}
                  className="flex size-14 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-[#d5dbe6] bg-white text-brand shadow-[0_1px_2px_rgba(30,41,80,0.05)] transition-[transform,border-color] duration-200 ease-spring hover:border-brand active:scale-95 [&>svg]:size-5"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              </div>
            </Field>

            {cart.length > 0 && student && (
              <CartList
                items={cart}
                studentId={student.id}
                onRemove={removeItem}
                onCheckin={(i) => void checkinItem(i)}
                onView={viewItem}
              />
            )}

            <Button loading={scanning} onClick={() => continueToDetails()}>
              Next Step
            </Button>
            <Button variant="secondary" onClick={restart}>
              Restart
            </Button>
          </div>
        </StepPanel>

        {/* Step 3 */}
        <StepPanel index={3} step={step}>
          <Header
            title="Let's get this done!"
            subtitle="Add some last bits and pieces."
          />
          {student && <StudentChip student={student} onChange={restart} />}
          <div className="glass mt-8 flex w-[min(560px,92vw)] flex-col gap-5 rounded-[28px] p-6 sm:p-8">
            {mode === "checkout" && (
              <>
                <div className="glass-subtle flex items-center justify-between rounded-2xl px-4 py-3">
                  <span className="font-semibold text-ink-soft">
                    Checking out {cart.length}{" "}
                    {cart.length === 1 ? "item" : "items"}
                  </span>
                  <span className="flex -space-x-2">
                    {cart.slice(0, 5).map((i) => (
                      <RemoteImage
                        key={i.id}
                        src={i.image_url}
                        alt={i.name ?? "Asset"}
                        className="size-9 rounded-lg ring-2 ring-white"
                        sizes="36px"
                      />
                    ))}
                  </span>
                </div>
                <LocationSelect value={location} onChange={setLocation} />
                {location === "offsite" && (
                  <Field label="Return Date" htmlFor="returnDate">
                    <input
                      id="returnDate"
                      type="date"
                      min={todayInputValue()}
                      className={inputClass}
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                    />
                    <QuickDates value={returnDate} onPick={setReturnDate} />
                  </Field>
                )}
                <Button
                  loading={busy && step === 3}
                  onClick={() => void finishCheckout()}
                >
                  Done!
                </Button>
              </>
            )}

            {mode === "lookup" && lookupAsset && (
              <>
                <AssetCard
                  asset={lookupAsset}
                  title={lookupAsset.name ?? "Asset"}
                  pill={
                    lookupAsset.status &&
                    lookupAsset.status.id !== ASSET_STATUS_OK ? (
                      <StatusPill
                        tone="warn"
                        onClick={() => setNotesOpen(true)}
                      >
                        {lookupAsset.status.name}
                      </StatusPill>
                    ) : (
                      <StatusPill
                        tone={
                          lookupAsset.active_tab ? "checkedout" : "available"
                        }
                        onClick={back}
                      >
                        {lookupAsset.active_tab ? "Checked Out" : "Available"}
                      </StatusPill>
                    )
                  }
                />
                <Button onClick={() => setNotesOpen(true)}>View Notes</Button>
                <Button variant="secondary" onClick={back}>
                  Go Back
                </Button>
              </>
            )}
          </div>
        </StepPanel>

        {/* Step 4 */}
        <StepPanel index={4} step={step}>
          <div className="mt-6 flex size-20 animate-[pop-in_600ms_var(--ease-spring)] items-center justify-center rounded-full bg-gradient-to-b from-[#4479ff] to-[#2a5ef0] shadow-[0_0_0_10px_rgba(48,103,246,0.12),0_16px_40px_-10px_rgba(48,103,246,0.6)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-7"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="w-[min(700px,90vw)] text-center">
            <h2 className="mt-8 text-[clamp(30px,4.5vw,44px)] font-bold tracking-[-0.02em] text-ink">
              All Set{firstName ? `, ${firstName}` : ""}!
            </h2>
            <p className="mt-2 text-lg text-muted">
              You are all set and thanks for using the Asset System.
            </p>
            {notCheckedOut.length > 0 && (
              <div
                role="alert"
                className="glass mx-auto mt-6 w-[min(520px,90vw)] rounded-2xl p-4 text-left"
              >
                <p className="pb-2 font-semibold text-caution">
                  These weren&apos;t checked out:
                </p>
                <ul className="list-disc pl-5 text-ink-soft">
                  {notCheckedOut.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mx-auto w-[min(420px,90vw)] pt-8">
              <Button onClick={restart}>Start Over</Button>
              <p className="mt-4 text-sm text-muted" aria-live="polite">
                Starting over in {countdown}s
              </p>
            </div>
          </div>
        </StepPanel>
      </StepCarousel>

      <footer className="mt-auto flex w-full items-center justify-between px-6 pt-10 text-sm">
        <p className="text-muted/60">
          Built by{" "}
          <a
            target="_blank"
            rel="noreferrer"
            href="https://github.com/aidenappl"
            className="font-medium"
          >
            Aiden Appleby.
          </a>
        </p>
        <div className="flex gap-4">
          <a
            href="https://team.hillview.tv/login"
            className="font-semibold text-muted/70 transition-colors hover:text-ink-soft"
          >
            Login
          </a>
          <button
            type="button"
            onClick={() => router.push("/seeker")}
            className="cursor-pointer font-semibold text-muted/70 transition-colors hover:text-ink-soft"
          >
            Seeker
          </button>
        </div>
      </footer>
    </div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="w-[min(700px,90vw)] text-center">
      <h2 className="text-[clamp(28px,4vw,40px)] font-bold tracking-[-0.02em] text-ink">
        {title}
      </h2>
      <p className="mt-2 text-lg text-muted">{subtitle}</p>
    </div>
  );
}
