import { Component, createContext, useContext, type ReactNode } from "react";
import { type ErrorComponentProps } from "@tanstack/react-router";
import { CircleAlertIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

const ErrorDetailsContext = createContext(false);

export class ErrorBoundary extends Component<
  { children: ReactNode; showDetails?: boolean },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  render() {
    const { error } = this.state;
    if (!error) {
      return (
        <ErrorDetailsContext value={this.props.showDetails ?? false}>
          {this.props.children}
        </ErrorDetailsContext>
      );
    }

    return <ErrorRecovery error={error} showDetails={this.props.showDetails} />;
  }
}

export function RouteErrorBoundary({ error }: ErrorComponentProps) {
  const showDetails = useContext(ErrorDetailsContext);
  return <ErrorRecovery error={error} showDetails={showDetails} />;
}

export function ErrorRecovery({
  error: caught,
  showDetails = false,
}: {
  error: unknown;
  showDetails?: boolean;
}) {
  const error = caught instanceof Error ? caught : new Error(String(caught));
  const missingClientId =
    error.message.includes("@workos-inc/authkit-react") &&
    error.message.includes("clientId");

  return (
    <main className="grid min-h-svh place-items-center bg-background p-4 text-foreground sm:p-6">
      <Card className="w-full max-w-lg py-6 shadow-sm">
        <CardContent className="space-y-6 px-6">
          <div role="alert" className="space-y-3">
            <div
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-xl bg-muted"
            >
              <CircleAlertIcon className="size-5 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">
              We couldn't load this page
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Try again to reload the page.
            </p>
          </div>
          <Button onClick={() => window.location.reload()}>
            <RefreshCwIcon />
            Try again
          </Button>
          {showDetails && (
            <details className="rounded-lg border bg-muted/40 p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Technical details
              </summary>
              {missingClientId && (
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Configure VITE_WORKOS_CLIENT_ID and VITE_WORKOS_REDIRECT_URI
                  in your environment, then rebuild or restart the app.
                </p>
              )}
              <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs leading-5 text-muted-foreground">
                {error.stack || error.message}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
