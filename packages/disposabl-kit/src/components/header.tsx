import type { ReactElement, ReactNode } from "react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Button } from "disposabl-kit/components/ui/button";
import { Skeleton } from "disposabl-kit/components/ui/skeleton";
import { ModeToggle } from "disposabl-kit/components/mode-toggle";

export function Header({
  home,
  authenticated,
  unauthenticated,
}: {
  home: ReactNode;
  authenticated: ReactElement;
  unauthenticated: ReactElement;
}) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background p-4">
      {home}
      <div className="flex items-center gap-2">
        <ModeToggle />
        <AuthLoading>
          <Skeleton className="h-8 w-24" />
        </AuthLoading>
        <Authenticated>
          <Button asChild>{authenticated}</Button>
        </Authenticated>
        <Unauthenticated>
          <Button asChild>{unauthenticated}</Button>
        </Unauthenticated>
      </div>
    </header>
  );
}
