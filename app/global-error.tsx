"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof console !== "undefined") {
      console.error("GlobalError:", error);
    }
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
          padding: "1.5rem",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          background: "#ffffff",
          color: "#0a0a0a",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: "100%",
            border: "1px solid #fecaca",
            background: "#fef2f2",
            borderRadius: 10,
            padding: 24,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
          <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 600 }}>
            Silong hit a fatal error
          </h2>
          <p style={{ margin: "0 0 16px", fontSize: 14, color: "#525252" }}>
            The root layout crashed. A reload usually clears it.
          </p>
          {error.digest && (
            <p
              style={{
                margin: "0 0 16px",
                fontSize: 12,
                color: "#737373",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              id: {error.digest}
            </p>
          )}
          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "center",
            }}
          >
            <button
              onClick={() => reset()}
              style={{
                background: "#0a0a0a",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 14px",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <button
              onClick={() => {
                if (typeof window !== "undefined") window.location.reload();
              }}
              style={{
                background: "transparent",
                color: "#0a0a0a",
                border: "1px solid #d4d4d4",
                borderRadius: 6,
                padding: "8px 14px",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Hard reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
