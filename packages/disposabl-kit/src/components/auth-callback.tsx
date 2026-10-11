import { Navigate } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Skeleton } from "./ui/skeleton";

type Destination = NonNullable<ComponentProps<typeof Navigate>["to"]>;

export function AuthCallback({
  to,
  signIn,
}: {
  to: Destination;
  signIn: Destination;
}) {
  return (
    <>
      <AuthLoading>
        <Skeleton
          className="h-screen w-full"
          role="status"
          aria-label="Completing login"
        />
      </AuthLoading>
      <Unauthenticated>
        <Navigate to={signIn} replace />
      </Unauthenticated>
      <Authenticated>
        <Navigate to={to} replace />
      </Authenticated>
    </>
  );
}
