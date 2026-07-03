import { render } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const queryClientCtor = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  QueryClient: class {
    constructor(options: unknown) {
      queryClientCtor(options);
    }
  },
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import Providers from "@/components/providers";

describe("Providers", () => {
  beforeEach(() => {
    queryClientCtor.mockClear();
  });

  it("configures React Query with refetchOnReconnect disabled", () => {
    render(
      <Providers>
        <div>child</div>
      </Providers>,
    );

    const options = queryClientCtor.mock.calls[0]?.[0] as {
      defaultOptions?: { queries?: { refetchOnReconnect?: boolean } };
    };

    expect(options.defaultOptions?.queries?.refetchOnReconnect).toBe(false);
  });

  it("configures a retry predicate that refuses to retry 429s", () => {
    render(
      <Providers>
        <div>child</div>
      </Providers>,
    );

    const options = queryClientCtor.mock.calls[0]?.[0] as {
      defaultOptions?: {
        queries?: { retry?: (failureCount: number, error: unknown) => boolean };
      };
    };
    const retry = options.defaultOptions?.queries?.retry;

    expect(typeof retry).toBe("function");
    // Rate-limited: must NOT retry (would amplify traffic under throttling).
    expect(retry!(0, new Error("Request failed: 429 /api/standings"))).toBe(false);
    // Transient server error: bounded retry allowed.
    expect(retry!(0, new Error("Request failed: 503 /api/standings"))).toBe(true);
    expect(retry!(2, new Error("Request failed: 503 /api/standings"))).toBe(false);
  });
});
