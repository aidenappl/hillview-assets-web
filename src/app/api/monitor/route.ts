import type { NextRequest } from "next/server";
import { MAX_BODY_BYTES, relayBatch } from "@/lib/monitor-relay";

export const dynamic = "force-dynamic";

// Browser telemetry relay — see lib/monitor-relay.ts.
export async function POST(req: NextRequest): Promise<Response> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return new Response(null, { status: 413 });
  const status = await relayBatch(
    (name) => req.headers.get(name),
    await req.text(),
  );
  return new Response(null, { status });
}
