import { upstream, ASSETS_API } from "@/lib/upstream";
import { fail, ok } from "@/lib/respond";
import { getServerMonitor } from "@/lib/monitor-server";
import type { CheckinRequest } from "@/types";

export const dynamic = "force-dynamic";

// The seeker's check-in is an admin override; the POS check-in is the student
// returning their own item. The API closes whichever checkout is active.
const NOTES: Record<CheckinRequest["source"], string | null> = {
  pos: null,
  seeker: "checked in by admin",
};

export async function POST(req: Request): Promise<Response> {
  let body: Partial<CheckinRequest>;
  try {
    body = (await req.json()) as Partial<CheckinRequest>;
  } catch {
    return fail(400, "invalid_body");
  }
  const assetId = body.asset_id;
  const source = body.source;
  if (!Number.isInteger(assetId) || (assetId as number) <= 0)
    return fail(400, "missing_asset_id");
  if (source !== "pos" && source !== "seeker")
    return fail(400, "invalid_source");

  const res = await upstream("checkin", `${ASSETS_API}/checkin`, {
    method: "POST",
    body: { asset_id: assetId, notes: NOTES[source] },
  });

  const m = getServerMonitor();
  if (res.status !== 200) {
    m?.error("assets.checkin.failed", {
      data: {
        asset_id: assetId,
        source,
        status_code: res.status,
        message: res.text.slice(0, 300),
        outcome: "the asset is still checked out",
      },
    });
    return fail(
      res.status === 400 ? 409 : 502,
      "checkin_failed",
      res.status === 400 ? res.text : "Something went wrong!",
    );
  }

  m?.info("assets.checkin", { data: { asset_id: assetId, source } });
  return ok({ asset_id: assetId });
}
