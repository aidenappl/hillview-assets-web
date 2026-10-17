import type { ReactNode } from "react";
import type { Asset } from "@/types";

type AssetCardProps = { asset: Asset; title: string; pill: ReactNode };

// The Angular "device-wrapper": image, name, who has it, and a status pill.
export default function AssetCard({ asset, title, pill }: AssetCardProps) {
  const holder = asset.active_tab?.user?.name;
  return (
    <div className="flex min-h-[210px] w-full gap-[30px] rounded-[20px] bg-white p-[10px] outline-2 outline-[#8e9ec524]">
      <div
        className="size-[190px] shrink-0 rounded-[20px] bg-[#bec1e53d] bg-cover bg-center"
        style={
          asset.image_url
            ? { backgroundImage: `url("${asset.image_url}")` }
            : undefined
        }
        role="img"
        aria-label={asset.name ?? "Asset"}
      />
      <div className="flex min-w-0 flex-1 flex-col pt-[15px] pb-[5px]">
        <h1 className="pb-[3px] text-[30px] font-bold leading-tight">
          {title}
        </h1>
        <h2 className="text-[21px] font-normal">
          {asset.active_tab
            ? `Currently checked out to ${holder ?? "someone"}`
            : (asset.description ?? "")}
        </h2>
        <div className="mt-auto pt-4">{pill}</div>
      </div>
    </div>
  );
}
