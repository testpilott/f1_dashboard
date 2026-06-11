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
});
