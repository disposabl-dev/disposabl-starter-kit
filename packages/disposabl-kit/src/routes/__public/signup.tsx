import { createRoute } from "@tanstack/react-router";
import { Route as publicRoute } from "./route";
import { SignUp } from "./sign-up";

export const Route = createRoute({
  getParentRoute: () => publicRoute,
  path: "signup",
  component: SignUp,
});
