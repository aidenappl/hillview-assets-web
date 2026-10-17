"use client";

import { useEffect } from "react";
import { reportError } from "@/services/monitor.service";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError("client.error.boundary", error, {
      reason: "render_error",
      outcome: "the route's error page was shown; the user can retry",
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="mb-2 text-xl font-semibold text-ink">
          Something went wrong
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-muted">
          The error has been reported. Try again, or reload the page if it keeps
          happening.
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
