import { createRoute } from "@tanstack/react-router";
import { AuthRedirect } from "../../components/auth-redirect";
import { Route as rootRoute } from "../__root";
import { Route as publicRoute } from "./route";

export const Route = createRoute({
  getParentRoute: () => publicRoute,
  path: "sign-up",
  component: SignUp,
});

export function SignUp() {
  const { afterSignIn = "/dashboard" } = rootRoute.useRouteContext();
  return <AuthRedirect to={afterSignIn} mode="signUp" />;
}
