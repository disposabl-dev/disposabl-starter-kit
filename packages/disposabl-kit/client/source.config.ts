import { fileURLToPath } from "node:url";
import { defineDocs } from "fumadocs-mdx/config";

export const docs = defineDocs({
  dir: fileURLToPath(new URL("../../../apps/docs/", import.meta.url)),
  docs: { files: ["**/*.md"] },
});
