import { upstream, ASSETS_API } from "@/lib/upstream";
import { cleanTag, fail, ok } from "@/lib/respond";
import { reportServerWarning } from "@/lib/monitor-server";
import type { AssetUser } from "@/types";

export const dynamic = "force-dynamic";

// A student by the ID on their card (users.nfc_identifier).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tag: string }> },
): Promise<Response> {
  const tag = cleanTag((await params).tag);
  if (!tag) return fail(400, "invalid_tag", "That student ID isn't valid.");

  const res = await upstream(
    "read/userByTag",
    `${ASSETS_API}/read/userByTag/${encodeURIComponent(tag)}`,
  );
  if (res.status !== 200)
    return fail(502, "upstream_error", "Couldn't look up that student.");
  if (res.body === null) {
    // Never the ID itself: it identifies a student.
    reportServerWarning("assets.lookup.not_found", "user", { kind: "user" });
    return fail(404, "not_found", "invalid studentID");
  }
  return ok(res.body as AssetUser);
}
