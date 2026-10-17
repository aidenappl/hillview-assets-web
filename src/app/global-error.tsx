"use client";

import { useEffect } from "react";
import { reportError } from "@/services/monitor.service";

// Replaces the root layout when the layout itself fails, so it renders its own
// document and cannot rely on the app's stylesheet.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError("client.error.global", error, {
      reason: "root_layout_error",
      outcome: "the whole app was replaced by the fallback page",
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#1a2533",
        }}
      >
        <main style={{ maxWidth: 420, padding: 32, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px" }}>
            Hillview Assets couldn&apos;t load
          </h1>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.5,
              color: "#4a5568",
              margin: "0 0 24px",
            }}
          >
            The error has been reported. Try again in a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "8px 20px",
              borderRadius: 999,
              border: "none",
              background: "#3067f6",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
