import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";

export function ApiReference({ content }: { content: string }) {
  return <ApiReferenceReact configuration={{ content }} />;
}
