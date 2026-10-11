import { createRoute } from "@tanstack/react-router";
import { AuthCallback } from "../../components/auth-callback";
import { Route as rootRoute } from "../__root";

import { Route as publicRoute } from "./route";

export const Route = createRoute({
  getParentRoute: () => publicRoute,
  path: "callback",
  component: Callback,
});

function Callback() {
  const { afterSignIn = "/dashboard" } = rootRoute.useRouteContext();
  return <AuthCallback to={afterSignIn} signIn="/login" />;
}
