import { upstream, ASSETS_API } from "@/lib/upstream";
import { fail, ok } from "@/lib/respond";
import { getServerMonitor } from "@/lib/monitor-server";
import type { CheckoutRequest, CheckoutResult } from "@/types";

export const dynamic = "force-dynamic";

const MAX_ASSETS = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Checks out a whole cart. The API takes one asset per call, so this runs
 * them in order and reports each one: the kiosk only says "All Set" when
 * every asset was checked out, and names the ones that weren't.
 */
export async function POST(req: Request): Promise<Response> {
  let body: Partial<CheckoutRequest>;
  try {
    body = (await req.json()) as Partial<CheckoutRequest>;
  } catch {
    return fail(400, "invalid_body");
  }

  const userId = body.user_id;
  if (!Number.isInteger(userId) || (userId as number) <= 0)
    return fail(400, "missing_user_id");

  const ids = body.asset_ids;
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > MAX_ASSETS ||
    !ids.every((id) => Number.isInteger(id) && id > 0) ||
    new Set(ids).size !== ids.length
  )
    return fail(400, "invalid_asset_ids", "no assets in cart");

  const offsite = body.offsite === true;
  let expectedIn: string | undefined;
  if (offsite) {
    const when = body.expected_in ? Date.parse(body.expected_in) : NaN;
    if (Number.isNaN(when))
      return fail(400, "missing_return_date", "missing duration of checkout");
    // Local midnight of today in any timezone is at most a day behind now.
    if (when < Date.now() - DAY_MS)
      return fail(400, "return_date_past", "The return date is in the past.");
    expectedIn = new Date(when).toISOString();
  }

  const m = getServerMonitor();
  const results: CheckoutResult[] = [];
  for (const assetId of ids) {
    const res = await upstream("checkout", `${ASSETS_API}/checkout`, {
      method: "POST",
      // On-site checkouts send no return date, as the Angular kiosk did.
      body: {
        user_id: userId,
        asset_id: assetId,
        offsite,
        ...(expectedIn ? { duration: expectedIn } : {}),
      },
    });
    if (res.status === 200) {
      results.push({ asset_id: assetId, ok: true });
      m?.info("assets.checkout", {
        userId: String(userId),
        data: { asset_id: assetId, offsite, expected_in: expectedIn ?? null },
      });
    } else {
      const error =
        res.status === 400 && res.text ? res.text : "Something went wrong!";
      results.push({ asset_id: assetId, ok: false, error });
      m?.error("assets.checkout.failed", {
        userId: String(userId),
        data: {
          asset_id: assetId,
          offsite,
          status_code: res.status,
          message: res.text.slice(0, 300),
          outcome: "this asset was not checked out; the kiosk listed it",
        },
      });
    }
  }

  const failed = results.filter((r) => !r.ok).length;
  if (failed > 0 && failed < results.length) {
    m?.warn("assets.checkout.partial", {
      userId: String(userId),
      data: { assets: results.length, failed },
    });
  }
  return ok(results);
}
