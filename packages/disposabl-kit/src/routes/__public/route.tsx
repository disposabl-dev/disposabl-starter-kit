import { createRoute, Link, Outlet } from "@tanstack/react-router";
import { Header } from "../../components/header";
import { Route as rootRoute } from "../__root";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  id: "__public",
  component: PublicLayout,
});

function PublicLayout() {
  const { name, afterSignIn = "/dashboard" } = rootRoute.useRouteContext();
  return (
    <>
      <Header
        home={<Link to="/">{name}</Link>}
        authenticated={<Link to={afterSignIn}>Dashboard</Link>}
        unauthenticated={<Link to="/login">Log in</Link>}
      />
      <Outlet />
    </>
  );
}
