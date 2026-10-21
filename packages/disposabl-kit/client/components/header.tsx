import { Link } from "@tanstack/react-router";
import { useAuth } from "@workos-inc/authkit-react";
import { T, useGT } from "gt-react";
import { useState } from "react";
import { LocaleToggle } from "./locale-toggle";
import { ModeToggle } from "./mode-toggle";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { Logo } from "./logo";

export const Header = ({ authEnabled = false }: { authEnabled?: boolean }) => {
  const gt = useGT();
  return (
    <header className="sticky top-0 z-40 bg-background">
      <div className="mx-auto flex min-h-24 w-full max-w-[1440px] flex-col justify-center gap-2 px-5 py-3 sm:h-14 sm:min-h-0 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-0 xl:px-10">
        <nav
          aria-label={gt("Main navigation")}
          className="flex items-center gap-4 sm:gap-6"
        >
          <Link to="/{-$lang}" params={{}} className="font-semibold">
            <Logo />
          </Link>
          <Link
            to="/{-$lang}/docs/$"
            params={{ _splat: "" }}
            className="text-sm hover:underline"
          >
            <T>Docs</T>
          </Link>
        </nav>
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <LocaleToggle />
          <ModeToggle />
          {authEnabled && <AuthButtons />}
        </div>
      </div>
    </header>
  );
};

function AuthButtons() {
  const { user, isLoading, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [failed, setFailed] = useState(false);
  const gt = useGT();

  if (isLoading) {
    return (
      <Skeleton
        className="h-8 w-36"
        role="status"
        aria-label={gt("Loading account")}
      />
    );
  }

  if (!user) {
    return (
      <>
        <Button variant="ghost" asChild>
          <Link to="/sign-in">
            <T>Sign in</T>
          </Link>
        </Button>
        <Button asChild>
          <Link to="/sign-up">
            <T>Sign up</T>
          </Link>
        </Button>
      </>
    );
  }

  async function handleSignOut() {
    setSigningOut(true);
    setFailed(false);
    try {
      await signOut({ returnTo: window.location.origin });
    } catch {
      setSigningOut(false);
      setFailed(true);
    }
  }

  return (
    <>
      <Button variant="ghost" asChild>
        <Link to="/{-$lang}/dashboard" params={{}}>
          <T>Dashboard</T>
        </Link>
      </Button>
      <Button
        variant="outline"
        disabled={signingOut}
        onClick={() => void handleSignOut()}
      >
        <T>Sign out</T>
      </Button>
      {failed && (
        <span role="alert" className="text-sm text-destructive">
          {gt("Unable to sign out. Please try again.")}
        </span>
      )}
    </>
  );
}
