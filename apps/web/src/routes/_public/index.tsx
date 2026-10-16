import { createFileRoute } from "@tanstack/react-router";
import { T } from "gt-react";

export const Route = createFileRoute("/_public/")({
  component: Home,
});

function Home() {
  return (
    <div>
      <T>Hello World</T>
    </div>
  );
}
