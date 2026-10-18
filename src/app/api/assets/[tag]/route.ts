import { upstream, ASSETS_API } from "@/lib/upstream";
import { cleanTag, fail, ok } from "@/lib/respond";
import { reportServerWarning } from "@/lib/monitor-server";
import type { Asset } from "@/types";

export const dynamic = "force-dynamic";

// An asset by the tag on its label (assets.identifier).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tag: string }> },
): Promise<Response> {
  const tag = cleanTag((await params).tag);
  if (!tag) return fail(400, "invalid_tag", "That asset ID isn't valid.");

  const res = await upstream(
    "read/assetByTag",
    `${ASSETS_API}/read/assetByTag/${encodeURIComponent(tag)}`,
  );
  if (res.status !== 200)
    return fail(502, "upstream_error", "Couldn't look up that asset.");
  if (res.body === null) {
    reportServerWarning("assets.lookup.not_found", `asset ${tag}`, {
      kind: "asset",
      tag,
    });
    return fail(
      404,
      "not_found",
      "No item has that tag. Check the label and scan again.",
    );
  }
  return ok(res.body as Asset);
}
