import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AuthenticatedLayout } from "disposabl-kit/components/dashboard/layout";
import Sidebar from "../../components/sidebar";

export const Route = createFileRoute("/__authenticated")({
  component: AppLayout,
});

function AppLayout() {
  const { name } = Route.useRouteContext();
  return (
    <AuthenticatedLayout name={name} sidebar={<Sidebar />}>
      <Outlet />
    </AuthenticatedLayout>
  );
}
