import { Component, createContext, useContext, type ReactNode } from "react";
import { type ErrorComponentProps } from "@tanstack/react-router";
import { useGT } from "gt-react";
import { Button } from "../components/ui/button";

const ProductionContext = createContext(process.env.NODE_ENV === "production");

export class ErrorBoundary extends Component<
  { children: ReactNode; production?: boolean },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  render() {
    const { error } = this.state;
    return (
      <ProductionContext
        value={this.props.production ?? process.env.NODE_ENV === "production"}
      >
        {error ? <ErrorScreen error={error} /> : this.props.children}
      </ProductionContext>
    );
  }
}

export function RouteErrorBoundary({ error }: ErrorComponentProps) {
  return <ErrorScreen error={error} />;
}

function ErrorScreen({ error }: { error: unknown }) {
  const gt = useGT();
  const production = useContext(ProductionContext);
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6 text-foreground">
      <h1 role="alert" className="text-xl font-semibold">
        {gt("Something went wrong")}
      </h1>
      <Button onClick={() => window.location.reload()}>
        {gt("Try again")}
      </Button>
      {!production && (
        <pre className="max-h-64 w-full max-w-2xl overflow-auto whitespace-pre-wrap break-all text-sm">
          {error instanceof Error
            ? error.stack || error.message
            : String(error)}
        </pre>
      )}
    </main>
  );
}
