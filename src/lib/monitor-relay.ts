import { MONITOR_SERVICE } from "@/services/monitor.service";
import { reportServerWarning, warnOnce } from "@/lib/monitor-server";

/**
 * Same-origin relay for browser telemetry. Pages post here and this forwards
 * to Monitor with the ingest key, which never reaches the browser.
 *
 * It spends the server's key, so it relays only for this app's own pages, only
 * under this app's service name, and only bounded batches. Monitor's status is
 * passed back, so the SDK's retry and bad-line isolation work as they would
 * against ingest directly.
 *
 * What it refuses is reported through the server's own Monitor client, which
 * ships to ingest directly rather than through this route. What it cannot
 * forward — Monitor unreachable, the key refused — goes to the container log:
 * reporting it to Monitor would be reporting to the thing that is down.
 *
 * Framework-neutral so the App Router route and a Pages Router API route can
 * share it: callers pass the headers and raw body, and send back the status.
 */
export const MAX_BODY_BYTES = 512 * 1024;
const MAX_EVENTS = 500;
const FORWARD_TIMEOUT_MS = 5000;

type HeaderGet = (name: string) => string | null | undefined;

const sameOrigin = (header: HeaderGet): boolean => {
  const site = header("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const origin = header("origin");
  if (!origin) return true;
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  return host === header("x-forwarded-host") || host === header("host");
};

/** Refuses a batch and records why. The batch's content is never included. */
const reject = (
  status: number,
  reason: string,
  data: Record<string, unknown> = {},
): number => {
  reportServerWarning("monitor.relay.rejected", reason, {
    ...data,
    status_code: status,
    reason,
    outcome: "batch refused; those browser events are lost",
  });
  return status;
};

/** Forwards one batch; returns the HTTP status to answer the browser with. */
export const relayBatch = async (
  header: HeaderGet,
  body: string,
): Promise<number> => {
  if (!sameOrigin(header)) {
    // Someone else's page spending this app's ingest key.
    return reject(403, "cross_origin", {
      origin: header("origin"),
      sec_fetch_site: header("sec-fetch-site"),
    });
  }

  const ingestUrl = process.env.MONITOR_INGEST_URL;
  const apiKey = process.env.MONITOR_API_KEY;
  if (!ingestUrl || !apiKey) {
    // Not configured: accept and discard, so browsers don't retry into
    // nothing — but say so once a minute, or a missing variable is silent.
    warnOnce(
      "unconfigured",
      "MONITOR_INGEST_URL or MONITOR_API_KEY is unset; browser telemetry is discarded",
    );
    return 204;
  }

  const bytes = Buffer.byteLength(body);
  if (bytes > MAX_BODY_BYTES) return reject(413, "body_too_large", { bytes });

  const lines = body.split("\n").filter((line) => line.trim() !== "");
  if (lines.length === 0) return 204;
  if (lines.length > MAX_EVENTS)
    return reject(413, "too_many_events", { events: lines.length });

  const out: string[] = [];
  for (const [index, line] of lines.entries()) {
    let event: unknown;
    try {
      event = JSON.parse(line);
    } catch {
      return reject(400, "invalid_json", { line: index, events: lines.length });
    }
    if (typeof event !== "object" || event === null || Array.isArray(event)) {
      return reject(400, "not_an_object", {
        line: index,
        events: lines.length,
      });
    }
    // A page does not get to choose which service it speaks for.
    out.push(
      JSON.stringify({
        ...(event as Record<string, unknown>),
        service: MONITOR_SERVICE,
      }),
    );
  }

  try {
    const res = await fetch(ingestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-ndjson", "X-Api-Key": apiKey },
      body: out.join("\n"),
      signal: AbortSignal.timeout(FORWARD_TIMEOUT_MS),
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) {
      warnOnce(
        "key_refused",
        `Monitor refused the ingest key (HTTP ${res.status}); browser telemetry is being dropped`,
      );
    } else if (res.status >= 500) {
      warnOnce(
        "ingest_error",
        `Monitor ingest answered HTTP ${res.status}; the browser will retry`,
      );
    }
    return res.status;
  } catch (err) {
    // Monitor unreachable: a 503 makes the SDK back off and try again.
    const timeout = err instanceof Error && err.name === "TimeoutError";
    warnOnce(
      "unreachable",
      `Monitor ingest unreachable (${timeout ? "timed out" : err instanceof Error ? err.message : String(err)}); the browser will retry`,
    );
    return 503;
  }
};
