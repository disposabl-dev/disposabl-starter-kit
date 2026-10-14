import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LocaleToggle } from "../../components/locale-toggle";

export const Route = createFileRoute("/_public")({
  component: () => {
    return (
      <>
        <header>
          <LocaleToggle />
        </header>
        <main>
          <Outlet />
        </main>
      </>
    );
  },
});
