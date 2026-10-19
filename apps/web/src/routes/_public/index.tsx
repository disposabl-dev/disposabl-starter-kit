import { createFileRoute } from "@tanstack/react-router";
import { T } from "gt-react";
import { ModeToggle } from "@disposabl/disposabl-kit/client/components/mode-toggle";

export const Route = createFileRoute("/_public/")({
  component: Home,
});

function Home() {
  return (
    <main>
      <ModeToggle />
      <div>
        <T>Hello World</T>
      </div>
    </main>
  );
}
