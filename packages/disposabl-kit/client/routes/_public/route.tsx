import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Header } from "../../components/header";

export const Route = createFileRoute("/{-$lang}/_public")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <Header authEnabled={!!import.meta.env.VITE_WORKOS_CLIENT_ID} />
      <Outlet />
    </div>
  );
}
