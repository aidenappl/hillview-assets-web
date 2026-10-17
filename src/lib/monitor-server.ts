import { Monitor } from "@aidenappleby/monitor-js";
import type { Instrumentation } from "next";
import { MONITOR_SERVICE } from "@/services/monitor.service";

let monitor: Monitor | null | undefined;

// Created on first use, from runtime env. The SDK must not install its own
// process-wide handlers here: an uncaughtException listener stops Node from
// exiting on a crash, and would leave a broken server running.
export const getServerMonitor = (): Monitor | null => {
  if (monitor !== undefined) return monitor;
  const ingestUrl = process.env.MONITOR_INGEST_URL;
  const apiKey = process.env.MONITOR_API_KEY;
  monitor =
    ingestUrl && apiKey
      ? new Monitor({
          service: MONITOR_SERVICE,
          ingestUrl,
          apiKey,
          env: process.env.MONITOR_ENV ?? "production",
          captureErrors: false,
          captureUnhandledRejections: false,
        })
      : null;
  return monitor;
};

type OnRequestErrorArgs = Parameters<Instrumentation.onRequestError>;
type Reportable = {
  message?: unknown;
  stack?: unknown;
  digest?: unknown;
  name?: unknown;
};

export const reportServerError = (
  error: OnRequestErrorArgs[0],
  request: OnRequestErrorArgs[1],
  context: OnRequestErrorArgs[2],
): void => {
  const m = getServerMonitor();
  if (!m) return;
  const e = (
    typeof error === "object" && error !== null ? error : {}
  ) as Reportable;
  m.error("server.request.error", {
    data: {
      message: typeof e.message === "string" ? e.message : String(error),
      error_type: typeof e.name === "string" ? e.name : undefined,
      stack: typeof e.stack === "string" ? e.stack : undefined,
      digest: typeof e.digest === "string" ? e.digest : undefined,
      method: request.method,
      path: request.path.split(/[?#]/)[0],
      route: context.routePath,
      route_type: context.routeType,
      router_kind: context.routerKind,
      render_source: context.renderSource,
      outcome: "the request failed; Next.js rendered its error response",
    },
  });
};

const WINDOW_MS = 60_000;
const lastSent = new Map<string, number>();
const suppressed = new Map<string, number>();

/**
 * A server-side warning, at most once a minute per name and key; the repeats
 * in between ride along as `suppressed` on the next one. Without Monitor
 * configured it is a no-op — see warnOnce for what goes to the container log.
 */
export const reportServerWarning = (
  name: string,
  key: string,
  data: Record<string, unknown>,
): void => {
  const m = getServerMonitor();
  if (!m) return;
  const id = `${name} ${key}`;
  const now = Date.now();
  const last = lastSent.get(id);
  if (last !== undefined && now - last < WINDOW_MS) {
    suppressed.set(id, (suppressed.get(id) ?? 0) + 1);
    return;
  }
  const folded = suppressed.get(id) ?? 0;
  suppressed.delete(id);
  lastSent.set(id, now);
  m.warn(name, { data: folded > 0 ? { ...data, suppressed: folded } : data });
};

const warnedAt = new Map<string, number>();

/**
 * A line on the server's own log, at most once a minute per key — for the
 * failures that cannot go to Monitor because Monitor is the thing failing.
 */
export const warnOnce = (key: string, message: string): void => {
  const now = Date.now();
  const last = warnedAt.get(key);
  if (last !== undefined && now - last < WINDOW_MS) return;
  warnedAt.set(key, now);
  console.warn(`[monitor relay] ${message}`);
};
