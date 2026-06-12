"use client";

// Renders when the root layout itself throws. Must declare its own
// <html>/<body> because the root layout never mounted — and must NOT import
// any providers from /components (QueryClient, ThemeProvider) for the same
// reason. Tokens are inlined; no globals.css inheritance here.

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          padding: "1rem",
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#0a0a0a",
          color: "#fafafa",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>
            Something went wrong at the top level
          </h2>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#9ca3af",
              marginTop: "0.5rem",
              maxWidth: 360,
            }}
          >
            {error.message || "An unexpected error occurred. Please try again."}
          </p>
        </div>
        <button
          onClick={reset}
          style={{
            background: "#e10600",
            color: "#fafafa",
            border: "none",
            borderRadius: 6,
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
