import type { ReactNode } from "react";
import RemoteImage from "@/components/RemoteImage";
import type { Asset } from "@/types";

type AssetCardProps = { asset: Asset; title: string; pill: ReactNode };

// The Angular "device-wrapper": image, name, who has it, and a status pill.
export default function AssetCard({ asset, title, pill }: AssetCardProps) {
  const holder = asset.active_tab?.user?.name;
  return (
    <div className="glass flex w-full gap-5 rounded-[28px] p-3 sm:gap-6">
      <RemoteImage
        src={asset.image_url}
        alt={asset.name ?? "Asset"}
        className="aspect-square w-28 rounded-[20px] ring-1 ring-[#e6e9f0] sm:w-36"
        sizes="144px"
      />
      <div className="flex min-w-0 flex-1 flex-col py-2 pr-2">
        <h1 className="text-[clamp(20px,3vw,28px)] font-bold leading-tight tracking-[-0.02em]">
          {title}
        </h1>
        <h2 className="mt-1 text-base text-muted sm:text-lg">
          {asset.active_tab
            ? `Currently checked out to ${holder ?? "someone"}`
            : (asset.description ?? "")}
        </h2>
        <div className="mt-auto pt-3">{pill}</div>
      </div>
    </div>
  );
}

/** Placeholder while an asset is being looked up. */
export function AssetCardSkeleton() {
  return (
    <div
      className="glass flex w-full gap-5 rounded-[28px] p-3 sm:gap-6"
      aria-busy="true"
      aria-label="Loading asset"
    >
      <div className="skeleton aspect-square w-28 shrink-0 rounded-[20px] sm:w-36" />
      <div className="flex flex-1 flex-col gap-3 pt-[18px]">
        <div className="skeleton h-7 w-3/4 rounded-md" />
        <div className="skeleton h-5 w-1/2 rounded-md" />
        <div className="skeleton mt-auto mb-2 h-7 w-28 rounded-full" />
      </div>
    </div>
  );
}
