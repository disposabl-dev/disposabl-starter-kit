import { notFound } from "@tanstack/react-router";
import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Spinner } from "../../components/ui/spinner";

export const Route = createFileRoute("/{-$lang}/_authenticated")({
  ssr: false,
  beforeLoad: () => {
    if (!import.meta.env.VITE_WORKOS_CLIENT_ID) throw notFound();
  },
  component: function AuthenticatedLayout() {
    const { lang } = Route.useParams();
    return (
      <>
        <Authenticated>
          <Outlet />
        </Authenticated>
        <Unauthenticated>
          <Navigate to="/{-$lang}" params={{ lang }} />
        </Unauthenticated>
        <AuthLoading>
          <Spinner className="h-10 w-10 animate-spin" />
        </AuthLoading>
      </>
    );
  },
});
