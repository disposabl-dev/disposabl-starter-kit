import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";

export function ApiReference({
  content,
  title = "API Reference",
}: {
  content: string | null;
  title?: string;
}) {
  return (
    <>
      <title>{title}</title>
      {content ? (
        <ApiReferenceReact configuration={{ content }} />
      ) : (
        <main className="mx-auto max-w-3xl px-6 py-12">
          <h1 className="text-2xl font-semibold">API reference unavailable</h1>
          <p className="mt-2 text-muted-foreground">
            No API endpoints are currently available.
          </p>
        </main>
      )}
    </>
  );
}
