import { act, StrictMode, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ConvexProviderWithAuth } from "convex/react";
import { AuthenticatedLayout } from "../src/components/dashboard/layout";
import { AuthRedirect } from "../src/components/auth-redirect";
import { Header } from "../src/components/header";
import { NavMain } from "../src/components/dashboard/nav-main";
import { SidebarProvider } from "../src/components/ui/sidebar";
import { TooltipProvider } from "../src/components/ui/tooltip";
import { ErrorBoundary } from "../src/providers/error-boundary";
import { ThemeProvider } from "../src/providers/theme";
import { AuthCallback } from "../src/components/auth-callback";
import { AppSidebar } from "../src/components/dashboard/app-sidebar";

const fixture = vi.hoisted(() => ({
  user: null as { id: string } | null,
  isLoading: false,
  convexAuthenticated: true as boolean | null,
  signIn: vi.fn<() => Promise<void>>(),
  signUp: vi.fn<() => Promise<void>>(),
  signOut: vi.fn<(options: { returnTo: string }) => Promise<void>>(),
}));

vi.mock("@workos-inc/authkit-react", () => ({ useAuth: () => fixture }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Outlet: () => <>Private content</>,
  useLocation: () => "/login",
  Navigate: ({ to }: { to: string }) => <output>{to}</output>,
}));

function AppLayout() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <AuthenticatedLayout
          name="Test app"
          sidebar={<nav>Business navigation</nav>}
        >
          Private content
        </AuthenticatedLayout>
      </TooltipProvider>
    </ThemeProvider>
  );
}

let confirmAuth: ((authenticated: boolean) => void) | undefined;
const client = {
  setAuth: (
    _fetchToken: unknown,
    onChange: (authenticated: boolean) => void,
  ) => {
    confirmAuth = onChange;
    if (fixture.convexAuthenticated !== null)
      onChange(fixture.convexAuthenticated);
  },
  clearAuth: () => {},
};
const fetchAccessToken = async () => "test-token";
function useTestAuth() {
  return {
    isLoading: fixture.isLoading,
    isAuthenticated: !!fixture.user,
    fetchAccessToken,
  };
}

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  fixture.user = null;
  fixture.isLoading = false;
  fixture.convexAuthenticated = true;
  confirmAuth = undefined;
  fixture.signIn.mockReset().mockResolvedValue();
  fixture.signUp.mockReset().mockResolvedValue();
  fixture.signOut.mockReset().mockResolvedValue();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

async function render(children: ReactNode) {
  await act(async () =>
    root.render(
      <StrictMode>
        <ConvexProviderWithAuth client={client} useAuth={useTestAuth}>
          {children}
        </ConvexProviderWithAuth>
      </StrictMode>,
    ),
  );
}

it("keeps protected content hidden until the session finishes loading", async () => {
  fixture.isLoading = true;
  await render(<AppLayout />);
  expect(
    container.querySelector('[role="status"]')?.getAttribute("aria-label"),
  ).toBe("Loading session");
  expect(container.textContent).not.toContain("Private content");
  expect(container.textContent).not.toContain("/login");
});

it("redirects signed-out visitors to login", async () => {
  await render(<AppLayout />);
  expect(container.textContent).toBe("/login");
});

it("renders protected children for an authenticated user", async () => {
  fixture.user = { id: "user_fixture" };
  await render(<AppLayout />);
  expect(container.textContent).toContain("Private content");
});

it.each([
  { loading: true, authenticated: false, destination: null },
  { loading: false, authenticated: false, destination: "/login" },
  { loading: false, authenticated: true, destination: "/dashboard" },
])(
  "completes the callback for session %j",
  async ({ loading, authenticated, destination }) => {
    fixture.isLoading = loading;
    fixture.user = authenticated ? { id: "user_fixture" } : null;
    await render(<AuthCallback to="/dashboard" signIn="/login" />);
    expect(container.querySelector("output")?.textContent ?? null).toBe(
      destination,
    );
    if (loading) {
      expect(
        container.querySelector('[role="status"]')?.getAttribute("aria-label"),
      ).toBe("Completing login");
    }
  },
);

it("starts one WorkOS redirect under StrictMode", async () => {
  await render(<AuthRedirect to="/dashboard" />);
  expect(fixture.signIn).toHaveBeenCalledTimes(1);
  expect(fixture.signIn).toHaveBeenCalledWith({
    state: { authEntryPath: "/login" },
  });
});

it("opens WorkOS sign-up rather than sign-in for registration", async () => {
  await render(<AuthRedirect to="/dashboard" mode="signUp" />);
  expect(fixture.signUp).toHaveBeenCalledTimes(1);
  expect(fixture.signIn).not.toHaveBeenCalled();
});

it("uses the app's destination for an authenticated visitor", async () => {
  fixture.user = { id: "user_fixture" };
  await render(<AuthRedirect to="/dashboard" />);
  expect(container.querySelector("output")?.textContent).toBe("/dashboard");
  expect(fixture.signIn).not.toHaveBeenCalled();
});

it("sends failed sign-in redirects to shared error recovery", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  fixture.signIn.mockRejectedValueOnce(new Error("Sign in unavailable"));
  await render(
    <ErrorBoundary>
      <AuthRedirect to="/dashboard" />
    </ErrorBoundary>,
  );
  expect(container.querySelector('[role="alert"]')?.textContent).toContain(
    "We couldn't load this page",
  );
});

it.each([false, true])(
  "uses app-provided header links when authenticated=%s",
  async (authenticated) => {
    fixture.user = authenticated ? { id: "user_fixture" } : null;
    await render(
      <ThemeProvider>
        <Header
          home={<a href="/">Example app</a>}
          authenticated={<a href="/dashboard">Workspace</a>}
          unauthenticated={<a href="/login">Sign in</a>}
        />
      </ThemeProvider>,
    );
    expect(container.querySelector('a[href="/"]')?.textContent).toBe(
      "Example app",
    );
    expect(
      container.querySelector(
        `a[href="${authenticated ? "/dashboard" : "/login"}"]`,
      ),
    ).not.toBeNull();
    expect(container.textContent).not.toContain("TinyAPK");
  },
);

it("keeps sidebar navigation separate from expanding child links", async () => {
  await render(
    <TooltipProvider>
      <SidebarProvider>
        <NavMain
          items={[
            { title: "Dashboard", url: "/dashboard" },
            {
              title: "Settings",
              url: "/settings",
              items: [{ title: "Account", url: "/settings/account" }],
            },
          ]}
        />
      </SidebarProvider>
    </TooltipProvider>,
  );
  expect(container.querySelector('a[href="/dashboard"]')?.textContent).toBe(
    "Dashboard",
  );
  expect(container.querySelector('a[href="/settings"]')?.textContent).toBe(
    "Settings",
  );
  expect(container.querySelector('[aria-label="Toggle Dashboard"]')).toBeNull();
  const toggle = container.querySelector<HTMLButtonElement>(
    '[aria-label="Toggle Settings"]',
  );
  expect(toggle?.getAttribute("aria-expanded")).toBe("false");
  await act(async () => toggle?.click());
  expect(toggle?.getAttribute("aria-expanded")).toBe("true");
  expect(
    container.querySelector('a[href="/settings/account"]')?.textContent,
  ).toBe("Account");
});

it("places app navigation between the shared organization and user controls", async () => {
  fixture.user = { id: "user_fixture" };
  await render(
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          teams={[
            { name: "Example organization", logo: <span>O</span>, plan: "" },
          ]}
        >
          <nav aria-label="Business navigation">
            <a href="/dashboard/world">World</a>
          </nav>
        </AppSidebar>
      </SidebarProvider>
    </TooltipProvider>,
  );
  const header = container.querySelector('[data-slot="sidebar-header"]');
  const content = container.querySelector('[data-slot="sidebar-content"]');
  const footer = container.querySelector('[data-slot="sidebar-footer"]');
  expect(header?.textContent).toContain("Example organization");
  expect(
    content?.querySelector('[aria-label="Business navigation"]'),
  ).not.toBeNull();
  expect(
    content?.querySelector('a[href="/dashboard/world"]')?.textContent,
  ).toBe("World");
  expect(footer?.querySelector('[aria-label="Open user menu"]')).not.toBeNull();
  expect(content?.querySelector('[aria-label="Open user menu"]')).toBeNull();
  expect(container.querySelector('a[href="#"]')).toBeNull();
  expect(header?.textContent).not.toContain("Add team");
});

it("keeps the logout confirmation open and offers retry when sign-out fails", async () => {
  fixture.user = { id: "user_fixture" };
  fixture.signOut.mockRejectedValueOnce(new Error("Network unavailable"));
  await render(<AppLayout />);
  const trigger = container.querySelector('[aria-label="Open user menu"]');
  await act(async () =>
    trigger?.dispatchEvent(
      new PointerEvent("pointerdown", {
        button: 0,
        ctrlKey: false,
        bubbles: true,
      }),
    ),
  );
  const menuItem = Array.from(
    document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
  ).find((item) => item.textContent?.includes("Log out"));
  expect(menuItem).toBeDefined();
  await act(async () => menuItem?.click());
  const confirm = document.querySelector('[role="alertdialog"]');
  expect(confirm).not.toBeNull();
  const button = Array.from(confirm!.querySelectorAll("button")).find(
    (button) => button.textContent === "Log out",
  );
  await act(async () => button?.click());
  expect(fixture.signOut).toHaveBeenCalledTimes(1);
  expect(
    document.querySelector('[role="alertdialog"] [role="alert"]')?.textContent,
  ).toContain("Couldn't sign out. Try again.");
  expect(button?.disabled).toBe(false);
});

it("waits for Convex validation even after WorkOS has a user", async () => {
  fixture.user = { id: "user_fixture" };
  fixture.convexAuthenticated = null;
  await render(<AppLayout />);
  expect(
    container.querySelector('[aria-label="Loading session"]'),
  ).not.toBeNull();
  expect(container.textContent).not.toContain("Private content");
  expect(container.querySelector("output")).toBeNull();
  await act(async () => confirmAuth?.(true));
  expect(container.textContent).toContain("Private content");
});

it("waits for Convex validation before completing the callback", async () => {
  fixture.user = { id: "user_fixture" };
  fixture.convexAuthenticated = null;
  await render(<AuthCallback to="/dashboard" signIn="/login" />);
  expect(
    container.querySelector('[aria-label="Completing login"]'),
  ).not.toBeNull();
  expect(container.querySelector("output")).toBeNull();
  await act(async () => confirmAuth?.(true));
  expect(container.querySelector("output")?.textContent).toBe("/dashboard");
});

it("keeps protected content hidden when Convex rejects a WorkOS token", async () => {
  fixture.user = { id: "user_fixture" };
  fixture.convexAuthenticated = false;
  await render(<AppLayout />);
  expect(container.textContent).toBe("/login");
});

it("shows error recovery instead of redirecting rejected tokens in a loop", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  fixture.user = { id: "user_fixture" };
  fixture.convexAuthenticated = false;
  await render(
    <ErrorBoundary>
      <AuthRedirect to="/dashboard" />
    </ErrorBoundary>,
  );
  expect(container.querySelector('[role="alert"]')).not.toBeNull();
  expect(container.querySelector("output")).toBeNull();
  expect(fixture.signIn).not.toHaveBeenCalled();
});

it("offers a new session when Convex rejects the WorkOS token and handles sign-out failure", async () => {
  fixture.user = { id: "user_fixture" };
  fixture.convexAuthenticated = false;
  fixture.signOut.mockRejectedValueOnce(new Error("Network unavailable"));
  await render(<AuthRedirect to="/dashboard" />);
  const button = Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent === "Sign in again",
  );
  expect(button).toBeDefined();
  await act(async () => button?.click());
  expect(fixture.signOut).toHaveBeenCalledWith({
    returnTo: new URL("/login", window.location.origin).href,
  });
  expect(container.querySelector('[role="alert"]')?.textContent).toContain(
    "Sign out failed. Try again.",
  );
  expect(button?.disabled).toBe(false);
});
