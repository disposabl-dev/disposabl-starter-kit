import { createFileRoute } from "@tanstack/react-router";
import { T } from "gt-react";
import { ModeToggle } from "@disposabl/disposabl-kit/client/components/mode-toggle";
import { LocaleToggle } from "@disposabl/disposabl-kit/client/components/locale-toggle";

export const Route = createFileRoute("/{-$lang}/_public/")({
  component: Home,
});

function Home() {
  return (
    <main>
      <ModeToggle />
      <LocaleToggle />
      <div>
        <T>Hello World</T>
      </div>
    </main>
  );
}
