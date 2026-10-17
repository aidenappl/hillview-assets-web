import { Monitor } from "@aidenappleby/monitor-js";

export const MONITOR_SERVICE = "hillview-assets-web";

/**
 * Browser telemetry. Events go to this app's own /api/monitor route, which adds
 * the ingest key server-side: a key compiled into the bundle is readable by
 * anyone who loads the page. null during server rendering.
 *
 * Uncaught errors and unhandled rejections are captured by the SDK itself.
 */
export const monitor: Monitor | null =
  typeof window !== "undefined"
    ? new Monitor({
        service: MONITOR_SERVICE,
        ingestUrl: "/api/monitor",
        apiKey: "",
        env:
          process.env.NODE_ENV === "production" ? "production" : "development",
        ignoreErrors: [
          // Thrown by browser extensions, not by this app.
          /(chrome|moz|safari(-web)?)-extension:\/\//,
          // A benign layout notification some browsers surface as an error.
          /ResizeObserver loop/,
        ],
      })
    : null;

type Reportable = {
  message?: unknown;
  stack?: unknown;
  digest?: unknown;
  name?: unknown;
};

/** An error's message, type and stack — what an error event is diagnosed from. */
export const describeError = (error: unknown): Record<string, unknown> => {
  const e = (
    typeof error === "object" && error !== null ? error : {}
  ) as Reportable;
  return {
    message: typeof e.message === "string" ? e.message : String(error),
    error_type: typeof e.name === "string" ? e.name : typeof error,
    stack: typeof e.stack === "string" ? e.stack : undefined,
    digest: typeof e.digest === "string" ? e.digest : undefined,
  };
};

/** A kiosk action worth counting (no names, notes or student IDs in data). */
export const track = (name: string, data: Record<string, unknown>): void => {
  if (!monitor) return;
  monitor.info(name, {
    data: { ...data, path: window.location.pathname },
  });
};

/** Reports an error caught by an error boundary or a handler. */
export const reportError = (
  name: string,
  error: unknown,
  data: Record<string, unknown> = {},
): void => {
  if (!monitor) return;
  monitor.error(name, {
    data: { ...data, ...describeError(error), path: window.location.pathname },
  });
};
