"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import Button from "@/components/Button";
import { useAlert } from "@/components/AlertProvider";
import Field, { inputClass } from "@/components/Field";
import AssetCard, { AssetCardSkeleton } from "@/components/AssetCard";
import StatusPill from "@/components/StatusPill";
import {
  reqCheckin,
  reqGetAsset,
  reqGetAssetHistory,
} from "@/services/assets.service";
import type { Asset, AssetCheckout } from "@/types";

const formatTime = (iso: string | null, fallback: string) =>
  iso ? dayjs(iso).format("MMM D, h:mm a") : fallback;

/**
 * Admin lookup: scan any asset to see who has it and its last 10 checkouts,
 * and force a check-in. Keys: c checks in, b goes back to the POS.
 */
export default function Seeker() {
  const router = useRouter();
  const alerts = useAlert();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tag, setTag] = useState("");
  const [asset, setAsset] = useState<Asset | null>(null);
  const [history, setHistory] = useState<AssetCheckout[]>([]);
  const [looking, setLooking] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const lookup = async () => {
    const value = tag.trim();
    if (value === "" || looking) return;
    setLooking(true);
    const [assetRes, historyRes] = await Promise.all([
      reqGetAsset(value),
      reqGetAssetHistory(value),
    ]);
    setLooking(false);
    setTag("");
    if (!assetRes.success) {
      alerts.show("error", assetRes.error_message);
      return;
    }
    setAsset(assetRes.data);
    setHistory(historyRes.success ? historyRes.data : []);
  };

  const checkin = useCallback(async () => {
    if (!asset?.active_tab || checkingIn) return;
    setCheckingIn(true);
    const res = await reqCheckin({ asset_id: asset.id, source: "seeker" });
    setCheckingIn(false);
    if (!res.success) {
      alerts.show("error", res.error_message);
      return;
    }
    alerts.show("success", `${asset.name ?? "Asset"} checked in.`);
    setAsset(null);
    setHistory([]);
    inputRef.current?.focus();
  }, [asset, checkingIn, alerts]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // The tag field is numeric, so letters typed into it are shortcuts, as
      // they were in the Angular seeker. Any other text field keeps its keys.
      const target = e.target as HTMLElement | null;
      if (
        target &&
        target !== inputRef.current &&
        target.matches("input, textarea")
      )
        return;
      if (e.key === "c") {
        e.preventDefault();
        void checkin();
      } else if (e.key === "b") {
        e.preventDefault();
        router.push("/pos");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [checkin, router]);

  return (
    <div className="min-h-screen pb-[100px]">
      <button
        type="button"
        onClick={() => router.push("/pos")}
        className="glass-subtle mt-5 ml-5 h-10 cursor-pointer rounded-full px-4 text-sm font-semibold text-ink-soft transition-colors hover:bg-white/80"
      >
        ← Back to POS
      </button>

      <div className="mx-auto flex w-[min(650px,92vw)] flex-col items-center">
        <div className="glass mt-6 mb-8 flex w-[min(560px,92vw)] flex-col gap-5 rounded-[28px] p-6 sm:p-8">
          <Field label="Asset ID" htmlFor="assetID">
            <input
              ref={inputRef}
              id="assetID"
              type="number"
              inputMode="numeric"
              autoFocus
              autoComplete="off"
              placeholder="The Asset ID..."
              className={`${inputClass} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void lookup();
                }
              }}
            />
          </Field>
          <Button loading={looking} onClick={() => void lookup()}>
            Lookup
          </Button>
        </div>

        {looking && <AssetCardSkeleton />}

        {asset && !looking && (
          <>
            <AssetCard
              asset={asset}
              title={`${asset.name ?? "Asset"} - ${asset.identifier ?? asset.id}`}
              pill={
                <StatusPill
                  tone={asset.active_tab ? "checkedout" : "available"}
                >
                  {asset.active_tab ? "Checked Out" : "Available"}
                </StatusPill>
              }
            />
            {asset.active_tab && (
              <div className="mt-5 w-[min(560px,92vw)]">
                <Button loading={checkingIn} onClick={() => void checkin()}>
                  Check In
                </Button>
              </div>
            )}
          </>
        )}

        {asset && !looking && history.length > 0 && (
          <section className="w-full">
            <h2 className="mt-10 mb-4 pl-1 text-lg font-bold text-ink-soft">
              Recent History
            </h2>
            <ul className="flex flex-col gap-2.5">
              {history.map((h) => (
                <li key={h.id} className="glass-subtle rounded-2xl px-5 py-3.5">
                  <h3 className="font-bold">
                    {h.user?.name ?? "Unknown student"}
                  </h3>
                  <h4 className="font-normal text-ink-soft">
                    <b>Time Out:</b> {formatTime(h.time_out, "—")}
                    <b className="pl-[5px]">Time In:</b>{" "}
                    {formatTime(h.time_in, "Checked Out")}
                  </h4>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
