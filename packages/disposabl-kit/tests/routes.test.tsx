import {
  createMemoryHistory,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { afterEach, expect, it, vi } from "vitest";
import { Route as rootRoute } from "../src/routes/__root";
import { Route as publicRoute } from "../src/routes/__public/route";
import { Route as login } from "../src/routes/__public/login";
import { Route as signIn } from "../src/routes/__public/sign-in";
import { Route as signin } from "../src/routes/__public/signin";
import { Route as signUp } from "../src/routes/__public/sign-up";
import { Route as signup } from "../src/routes/__public/signup";
import { Route as callback } from "../src/routes/__public/callback";
import { Route as apiReference } from "../src/routes/__public/api-reference";

afterEach(() => vi.unstubAllGlobals());

function makeRouter(pathname = "/") {
  const home = createRoute({
    getParentRoute: () => publicRoute,
    path: "/",
    component: () => <main>Home</main>,
  });
  return createRouter({
    routeTree: rootRoute.addChildren([
      publicRoute.addChildren([
        login,
        signIn,
        signin,
        signUp,
        signup,
        home,
        callback,
        apiReference,
      ]),
    ]),
    context: {
      name: "Test app",
      apiReference: { siteUrl: "https://api.example.com" },
    },
    history: createMemoryHistory({ initialEntries: [pathname] }),
  });
}

it.each([
  "/login",
  "/sign-in",
  "/signin",
  "/sign-up",
  "/signup",
  "/callback",
  "/api-reference",
  "/",
])("provides the shared default route %s", (pathname) => {
  const router = makeRouter(pathname);
  expect(router.matchRoutes(pathname).at(-1)?.pathname).toBe(pathname);
  expect(router.matchRoutes(pathname).at(-1)?.routeId).not.toBe("__root__");
});

it("keeps sign-in and sign-up under the shared public layout", () => {
  const router = makeRouter();
  expect(router.matchRoutes("/login").map((match) => match.routeId)).toEqual([
    "__root__",
    "/__public",
    "/__public/login",
  ]);
  expect(router.matchRoutes("/sign-up").map((match) => match.routeId)).toEqual([
    "__root__",
    "/__public",
    "/__public/sign-up",
  ]);
});

it("loads API documents using the consuming app's router context", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ paths: {} })),
  );
  const router = makeRouter("/api-reference");
  await router.load();
  expect(router.state.matches.at(-1)?.loaderData).toBe(
    JSON.stringify({
      paths: {},
      servers: [{ url: "https://api.example.com" }],
    }),
  );
});
