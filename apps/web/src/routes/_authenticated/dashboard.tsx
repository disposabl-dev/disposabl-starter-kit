import { createFileRoute } from "@tanstack/react-router";
import { T } from "gt-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <T>Hello from the authenticated route!</T>
    </div>
  );
}
