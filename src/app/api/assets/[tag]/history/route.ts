import { upstream, ASSETS_API } from "@/lib/upstream";
import { cleanTag, fail, ok } from "@/lib/respond";
import type { AssetCheckout } from "@/types";

export const dynamic = "force-dynamic";

// The asset's last 10 checkouts, newest first (the API's fixed limit).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tag: string }> },
): Promise<Response> {
  const tag = cleanTag((await params).tag);
  if (!tag) return fail(400, "invalid_tag", "That asset ID isn't valid.");

  const res = await upstream(
    "read/assetCheckoutHistory",
    `${ASSETS_API}/read/assetCheckoutHistory?${new URLSearchParams({ tag })}`,
  );
  if (res.status !== 200)
    return fail(502, "upstream_error", "Couldn't load the checkout history.");
  return ok(Array.isArray(res.body) ? (res.body as AssetCheckout[]) : []);
}
