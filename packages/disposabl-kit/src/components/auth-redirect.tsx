import { Navigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@workos-inc/authkit-react";
import { useConvexAuth } from "convex/react";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Skeleton } from "disposabl-kit/components/ui/skeleton";
import { Button } from "disposabl-kit/components/ui/button";

export function AuthRedirect({
  to,
  mode = "signIn",
}: {
  to: NonNullable<ComponentProps<typeof Navigate>["to"]>;
  mode?: "signIn" | "signUp";
}) {
  const { user, isLoading, signIn, signUp, signOut } = useAuth();
  const { isLoading: convexLoading, isAuthenticated } = useConvexAuth();
  const pathname = useLocation({ select: (location) => location.pathname });
  const started = useRef(false);
  const [error, setError] = useState<Error | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [recoveryFailed, setRecoveryFailed] = useState(false);

  useEffect(() => {
    if (isLoading || user || started.current) return;
    started.current = true;
    const redirect = mode === "signUp" ? signUp : signIn;
    void redirect({ state: { authEntryPath: pathname } }).catch(
      (cause: unknown) => {
        setError(
          cause instanceof Error ? cause : new Error("Unable to open sign in."),
        );
      },
    );
  }, [isLoading, user, signIn, signUp, mode, pathname]);

  if (error) throw error;
  if (isAuthenticated) return <Navigate to={to} replace />;
  if (!isLoading && !convexLoading && user)
    return (
      <main className="grid min-h-svh place-content-center gap-4 p-6 text-center">
        <div role="alert" className="space-y-2">
          <h1 className="text-xl font-semibold">
            Unable to verify your session
          </h1>
          <p className="text-muted-foreground">
            {recoveryFailed
              ? "Sign out failed. Try again."
              : "Try again or sign in with a new session."}
          </p>
        </div>
        <Button onClick={() => window.location.reload()}>Try again</Button>
        <Button
          variant="outline"
          disabled={recovering}
          onClick={async () => {
            setRecovering(true);
            setRecoveryFailed(false);
            try {
              await signOut({
                returnTo: new URL("/login", window.location.origin).href,
              });
            } catch {
              setRecoveryFailed(true);
            } finally {
              setRecovering(false);
            }
          }}
        >
          {recovering ? "Signing out…" : "Sign in again"}
        </Button>
      </main>
    );
  return (
    <Skeleton
      className="h-8 w-48 m-8"
      role="status"
      aria-label="Redirecting to sign in"
    />
  );
}
