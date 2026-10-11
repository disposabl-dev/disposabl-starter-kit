import { createRoute } from "@tanstack/react-router";
import { Route as publicRoute } from "./route";
import { SignIn } from "./login";

export const Route = createRoute({
  getParentRoute: () => publicRoute,
  path: "sign-in",
  component: SignIn,
});
