import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Providers } from "disposabl-kit/providers";

export const Route = createRootRoute({
  component: () => (
    <Providers
      env={{
        VITE_CONVEX_URL: import.meta.env.VITE_CONVEX_URL,
        VITE_WORKOS_CLIENT_ID: import.meta.env.VITE_WORKOS_CLIENT_ID,
      }}
    >
      <Outlet />
    </Providers>
  ),
});
