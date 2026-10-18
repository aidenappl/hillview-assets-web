import type { NextRequest } from "next/server";
import { upstream, CORE_API } from "@/lib/upstream";
import { fail, ok } from "@/lib/respond";
import type { MobileUser } from "@/types";

export const dynamic = "force-dynamic";

// Type-ahead on the student step: hillviewCoreAPI's public mobile-user list.
export async function GET(req: NextRequest): Promise<Response> {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 64);
  if (q === "") return ok<MobileUser[]>([]);

  const params = new URLSearchParams({ limit: "20", offset: "0", search: q });
  const res = await upstream(
    "list/mobileUsers",
    `${CORE_API}/list/mobileUsers?${params}`,
  );
  if (res.status !== 200)
    return fail(502, "upstream_error", "Couldn't search students.");
  const users = Array.isArray(res.body) ? (res.body as MobileUser[]) : [];
  // Deactivated students can't check anything out, so don't offer them.
  return ok(
    users.filter((u) => u.status?.short_name !== "deactivated").slice(0, 5),
  );
}
