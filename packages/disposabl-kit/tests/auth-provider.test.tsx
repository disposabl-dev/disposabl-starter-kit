import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginRequiredError } from "@workos-inc/authkit-react";
import type { ConvexReactClient } from "convex/react";
import { Providers } from "../src/providers";

type AuthState = {
  isLoading: boolean;
  isAuthenticated: boolean;
  fetchAccessToken: (options: {
    forceRefreshToken: boolean;
  }) => Promise<string | null>;
};

const fixture = vi.hoisted(() => ({
  workos: {
    isLoading: false,
    user: { id: "user_one" } as { id: string } | null,
    organizationId: "org_one",
    getAccessToken:
      vi.fn<(options?: { forceRefresh?: boolean }) => Promise<string>>(),
  },
  auth: null as AuthState | null,
}));

vi.mock("@workos-inc/authkit-react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@workos-inc/authkit-react")>()),
  useAuth: () => fixture.workos,
  AuthKitProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("convex/react", () => ({
  ConvexProviderWithAuth: ({
    useAuth,
    children,
  }: {
    useAuth: () => AuthState;
    children: ReactNode;
  }) => {
    fixture.auth = useAuth();
    return children;
  },
}));

let root: Root;
let container: HTMLDivElement;
const client = {} as ConvexReactClient;

async function render() {
  await act(async () => {
    root.render(
      <Providers auth={{ client, clientId: "client_fixture" }}>App</Providers>,
    );
  });
}

function auth() {
  if (!fixture.auth) throw new Error("Provider did not render");
  return fixture.auth;
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  fixture.workos.user = { id: "user_one" };
  fixture.workos.organizationId = "org_one";
  fixture.workos.isLoading = false;
  fixture.workos.getAccessToken.mockReset().mockResolvedValue("token");
  fixture.auth = null;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe("AuthKit to Convex authentication", () => {
  it("passes Convex's forced refresh request to WorkOS under StrictMode", async () => {
    await render();
    expect(auth().isAuthenticated).toBe(true);
    await expect(
      auth().fetchAccessToken({ forceRefreshToken: true }),
    ).resolves.toBe("token");
    expect(fixture.workos.getAccessToken).toHaveBeenCalledWith({
      forceRefresh: true,
    });
  });

  it("does not request a token while signed out", async () => {
    fixture.workos.user = null;
    await render();
    expect(auth().isAuthenticated).toBe(false);
    await expect(
      auth().fetchAccessToken({ forceRefreshToken: false }),
    ).resolves.toBeNull();
    expect(fixture.workos.getAccessToken).not.toHaveBeenCalled();
  });

  it("reports loading and treats an expired session as signed out", async () => {
    fixture.workos.isLoading = true;
    fixture.workos.getAccessToken.mockRejectedValue(new LoginRequiredError());
    await render();
    expect(auth().isLoading).toBe(true);
    await expect(
      auth().fetchAccessToken({ forceRefreshToken: false }),
    ).resolves.toBeNull();
  });

  it("retries transient network failures without signing out", async () => {
    vi.useFakeTimers();
    fixture.workos.getAccessToken.mockRejectedValueOnce(
      new Error("Network unavailable"),
    );
    await render();
    const token = auth().fetchAccessToken({ forceRefreshToken: true });
    await vi.advanceTimersByTimeAsync(1000);
    await expect(token).resolves.toBe("token");
    expect(fixture.workos.getAccessToken).toHaveBeenCalledTimes(2);
  });

  it("stops after three failures so a permanent error cannot leave auth pending forever", async () => {
    vi.useFakeTimers();
    fixture.workos.getAccessToken.mockRejectedValue(
      new Error("Token unavailable"),
    );
    await render();
    const pending = auth().fetchAccessToken({ forceRefreshToken: true });
    await vi.advanceTimersByTimeAsync(3000);
    await expect(pending).resolves.toBeNull();
    expect(fixture.workos.getAccessToken).toHaveBeenCalledTimes(3);
  });

  it.each(["organization", "user", "sign-out", "unmount"])(
    "discards an in-flight token after %s changes",
    async (change) => {
      let resolveToken!: (token: string) => void;
      fixture.workos.getAccessToken.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveToken = resolve;
        }),
      );
      await render();
      const oldAuth = auth();
      const pending = oldAuth.fetchAccessToken({ forceRefreshToken: false });
      if (change === "unmount") {
        await act(async () => root.unmount());
        root = createRoot(container);
      } else {
        if (change === "organization")
          fixture.workos.organizationId = "org_two";
        if (change === "user") fixture.workos.user = { id: "user_two" };
        if (change === "sign-out") fixture.workos.user = null;
        await render();
      }
      resolveToken("old-session-token");
      await expect(pending).resolves.toBeNull();
      await expect(
        oldAuth.fetchAccessToken({ forceRefreshToken: false }),
      ).resolves.toBeNull();
    },
  );

  it("stops retrying when the provider unmounts", async () => {
    vi.useFakeTimers();
    fixture.workos.getAccessToken.mockRejectedValue(
      new Error("Network unavailable"),
    );
    await render();
    const pending = auth().fetchAccessToken({ forceRefreshToken: true });
    await act(async () => root.unmount());
    root = createRoot(container);
    await vi.advanceTimersByTimeAsync(1000);
    await expect(pending).resolves.toBeNull();
    expect(fixture.workos.getAccessToken).toHaveBeenCalledTimes(1);
  });
});
