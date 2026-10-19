import {
  createFileRoute,
  Navigate,
  notFound,
  useLocation,
} from "@tanstack/react-router";
import { useAuth } from "@workos-inc/authkit-react";
import { useEffect, useRef, useState } from "react";
import { T } from "gt-react";
import { Skeleton } from "@disposabl/disposabl-kit/client/components/ui/skeleton";

const signup = ["/signup", "/sign-up"];
const signin = ["/signin", "/sign-in", "/login"];

export const Route = createFileRoute("/_auth-pages")({
  ssr: false,
  beforeLoad: () => {
    if (!import.meta.env.VITE_WORKOS_CLIENT_ID) throw notFound();
  },
  component: AuthPages,
});

function AuthPages() {
  const { user, isLoading, signIn, signUp } = useAuth();
  const pathname = useLocation({ select: (location) => location.pathname });
  const started = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (isLoading || user || started.current === pathname) return;
    started.current = pathname;
    if (signup.includes(pathname)) {
      void signUp().catch(() => setFailed(true));
    } else if (signin.includes(pathname)) {
      void signIn().catch(() => setFailed(true));
    }
  }, [isLoading, user, pathname, signIn, signUp]);

  if (!isLoading && user) return <Navigate to="/" replace />;
  if (!isLoading && (failed || pathname === "/callback"))
    return (
      <a href="/sign-in">
        <T>Try again</T>
      </a>
    );
  return (
    <Skeleton
      className="h-screen w-full"
      role="status"
      aria-label="Completing login"
    />
  );
}
