import { createFileRoute } from "@tanstack/react-router";
import { T } from "gt-react";

export const Route = createFileRoute("/{-$lang}/_public/")({
  component: Home,
});

function Home() {
  return (
    <main>
      <div>
        <T>Hello World</T>
      </div>
    </main>
  );
}
