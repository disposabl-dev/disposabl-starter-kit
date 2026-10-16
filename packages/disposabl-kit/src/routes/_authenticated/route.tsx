import { notFound } from "@tanstack/react-router";
import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Spinner } from "../../components/ui/spinner";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: () => {
    if (!import.meta.env.VITE_WORKOS_CLIENT_ID) throw notFound();
  },
  component: () => {
    return (
      <>
        <Authenticated>
          <Outlet />
        </Authenticated>
        <Unauthenticated>
          <Navigate to="/" />
        </Unauthenticated>
        <AuthLoading>
          <Spinner className="h-10 w-10 animate-spin" />
        </AuthLoading>
      </>
    );
  },
});
