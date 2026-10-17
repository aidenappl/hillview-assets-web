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
import CartList, { type CartItem } from "@/components/pos/CartList";
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

  const restart = () => window.location.reload();

  // ---- Step 1: student ----

  const searchStudents = useCallback(async (q: string) => {
    const seq = ++searchSeq.current;
    if (q.trim() === "") {
      setResults([]);
      return;
    }
    const res = await reqSearchStudents(q);
    // A slower, older search must not overwrite a newer one.
    if (seq !== searchSeq.current) return;
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
      window.alert("missing studentID");
      return;
    }
    setBusy(true);
    const res = await reqGetStudent(id);
    setBusy(false);
    if (!res.success) {
      window.alert(res.error_message);
      return;
    }
    searchSeq.current++;
    setResults([]);
    setStudent(res.data);
    setStep(2);
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
      window.alert("Asset already in cart");
      setAssetInput("");
      return;
    }
    setScanning(true);
    const res = await reqGetAsset(tag);
    setScanning(false);
    setAssetInput("");
    assetRef.current?.focus();
    if (!res.success) {
      window.alert(res.error_message);
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
      window.alert(res.error_message);
      return;
    }
    setTimeout(() => removeItem(item.id), 400);
  };

  const viewItem = (item: CartItem) => {
    setLookupAsset(item);
    setMode("lookup");
    setStep(3);
  };

  const continueToDetails = () => {
    const warned = cart.filter(
      (i) => i.status && i.status.id !== ASSET_STATUS_OK,
    );
    if (warned.length > 0) {
      const go = window.confirm(
        "There are items in your cart that include warnings. Do you want to continue?",
      );
      if (!go) return;
      track("assets.cart.warning_override", {
        assets: warned.map((i) => i.id),
      });
    }
    if (cart.length === 0) {
      window.alert("no assets in cart");
      return;
    }
    if (cart.some((i) => i.active_tab)) {
      window.alert("there are unavailable items in your cart");
      return;
    }
    setMode("checkout");
    setStep(3);
  };

  // ---- Step 3: finish ----

  const finishCheckout = async () => {
    if (!student) return;
    let expectedIn: string | undefined;
    if (location === "offsite") {
      const iso = returnDate ? localMidnightISO(returnDate) : null;
      if (!iso) {
        window.alert("missing duration of checkout");
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
      window.alert(res.error_message);
      return;
    }
    const failed = res.data.filter((r) => !r.ok);
    if (failed.length === res.data.length) {
      window.alert(failed[0]?.error ?? "Something went wrong!");
      return;
    }
    setNotCheckedOut(
      failed.map((f) => {
        const item = cart.find((i) => i.id === f.asset_id);
        return `${item?.name ?? `Asset ${f.asset_id}`}: ${f.error ?? "failed"}`;
      }),
    );
    setStep(4);
  };

  const back = useCallback(() => {
    setNotesOpen(false);
    setStep((s) => (s === 2 || s === 3 ? ((s - 1) as Step) : s));
  }, []);

  // ---- Keyboard & focus ----

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Backslash" && !e.ctrlKey && !e.metaKey) {
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
    if (step === 1) studentRef.current?.focus();
    if (step === 2) {
      // After the slide-in, so the browser doesn't scroll the panel into view.
      const t = setTimeout(() => assetRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
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
    <div className="relative flex min-h-screen flex-col items-center overflow-x-hidden pb-24">
      {notesOpen && lookupAsset && (
        <NotesOverlay
          notes={lookupAsset.metadata?.notes ?? null}
          onClose={() => setNotesOpen(false)}
        />
      )}

      <StepIndicator step={step} />

      <div className="grid w-full justify-items-center">
        {/* Step 1 */}
        <StepPanel index={1} step={step}>
          <Header
            title="Welcome! First things first..."
            subtitle="Get your Student ID ready to go!"
          />
          <div className="flex w-[min(550px,90vw)] flex-col gap-[30px] py-[70px]">
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
              {results.length > 0 && (
                <ul
                  id="student-results"
                  role="listbox"
                  className="absolute z-10 mt-[10px] w-full rounded-[7px] border-2 border-[#dcdcde] bg-white px-4 shadow-[0_0_10px_0_#a9afd04a]"
                >
                  {results.map((r, i) => (
                    <li
                      key={r.id}
                      role="option"
                      aria-selected={i === highlight}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        pickResult(r);
                        studentRef.current?.focus();
                      }}
                      className={`cursor-pointer py-[10px] hover:underline ${i === highlight ? "underline" : ""}`}
                    >
                      {r.name}
                    </li>
                  ))}
                </ul>
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
          <div className="flex w-[min(550px,90vw)] flex-col py-[70px]">
            <Field label="Asset ID" htmlFor="assetID">
              <div className="flex items-center gap-[18px]">
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
                  className="size-8 shrink-0 cursor-pointer rounded bg-line p-[5px]"
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

            <Button
              className="mt-[30px]"
              loading={scanning}
              onClick={continueToDetails}
            >
              Next Step
            </Button>
            <Button variant="secondary" className="mt-5" onClick={restart}>
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
          <div className="flex w-[min(550px,90vw)] flex-col gap-[30px] py-[70px]">
            {mode === "checkout" && (
              <>
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
                <Button
                  variant="secondary"
                  className="-mt-[10px]"
                  onClick={back}
                >
                  Go Back
                </Button>
              </>
            )}
          </div>
        </StepPanel>

        {/* Step 4 */}
        <StepPanel index={4} step={step}>
          <div className="mt-[50px] flex size-[75px] items-center justify-center rounded-full bg-brand">
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
            <h2 className="mt-10 text-[clamp(32px,5vw,50px)] font-bold text-[#1c222f]">
              All Set{firstName ? `, ${firstName}` : ""}!
            </h2>
            <p className="mt-[10px] text-[22px] font-light text-muted">
              You are all set and thanks for using the Asset System.
            </p>
            {notCheckedOut.length > 0 && (
              <div
                role="alert"
                className="mx-auto mt-8 w-[min(550px,90vw)] rounded-md border-2 border-[#ffcc84] bg-[#fff7eb] p-4 text-left"
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
            <div className="mx-auto w-[min(550px,90vw)] py-[70px]">
              <Button onClick={restart}>Start Over</Button>
            </div>
          </div>
        </StepPanel>
      </div>

      <footer className="fixed right-[25px] bottom-[25px] left-[25px] flex items-center justify-between">
        <p className="font-extralight text-muted/25">
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
            className="font-semibold text-[#e1e4e9] hover:text-muted"
          >
            Login
          </a>
          <button
            type="button"
            onClick={() => router.push("/seeker")}
            className="cursor-pointer font-semibold text-[#e1e4e9] hover:text-muted"
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
    <div className="w-[min(700px,90vw)] py-[10px] text-center">
      <h2 className="text-[clamp(30px,4.5vw,45px)] font-bold text-ink">
        {title}
      </h2>
      <p className="mt-[10px] text-[22px] font-light text-muted">{subtitle}</p>
    </div>
  );
}
