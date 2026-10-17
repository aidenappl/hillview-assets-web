import { getServerMonitor } from "@/lib/monitor-server";

/**
 * Server-side client for the Hillview Go APIs. The browser never calls
 * api.hillview.tv directly: it calls this app's /api routes, which forward
 * here. That keeps the APIs' CORS lists unchanged, limits the kiosk to the
 * endpoints it needs, and gives every call a Monitor event.
 */
const API_URL = process.env.HILLVIEW_API_URL ?? "https://api.hillview.tv";
export const ASSETS_API = `${API_URL}/assets/v1.1`;
export const CORE_API = `${API_URL}/core/v1.1`;

const TIMEOUT_MS = 10_000;

export type UpstreamResult = {
  status: number;
  /** Parsed JSON body, or null for an empty/non-JSON body. */
  body: unknown;
  /** Raw text, for the APIs' plain-text http.Error messages. */
  text: string;
};

/**
 * One call to a Hillview API. `endpoint` is the route pattern (no tags or
 * IDs), so events group by route rather than by scanned value. Network
 * failures and timeouts come back as status 502/504, never as a throw.
 */
export const upstream = async (
  endpoint: string,
  url: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<UpstreamResult> => {
  const method = init.method ?? "GET";
  const started = Date.now();
  let result: UpstreamResult;
  let failure: string | undefined;

  try {
    const res = await fetch(url, {
      method,
      headers:
        init.body !== undefined
          ? { "Content-Type": "application/json" }
          : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    const text = await res.text();
    let body: unknown = null;
    if (text.trim() !== "") {
      try {
        body = JSON.parse(text);
      } catch {
        body = null;
      }
    }
    result = { status: res.status, body, text: text.trim() };
  } catch (err) {
    const timeout = err instanceof Error && err.name === "TimeoutError";
    if (timeout) failure = "timed out";
    else failure = err instanceof Error ? err.message : String(err);
    result = { status: timeout ? 504 : 502, body: null, text: failure };
  }

  const m = getServerMonitor();
  if (m) {
    const data = {
      endpoint,
      method,
      status_code: result.status,
      duration_ms: Date.now() - started,
    };
    if (failure !== undefined) {
      m.error("assets.api.unreachable", {
        data: {
          ...data,
          message: failure,
          outcome: "the kiosk showed an error for this call",
        },
      });
    } else if (result.status >= 500) {
      m.error("assets.api.error", {
        data: { ...data, message: result.text.slice(0, 300) },
      });
    } else {
      m.info("assets.api.request", { data });
    }
  }

  return result;
};
