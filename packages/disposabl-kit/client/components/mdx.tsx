import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import type { ComponentProps } from "react";
import { Image } from "./image";
import { cn } from "../lib/utils";

function MarkdownImage({
  src,
  width,
  height,
  ...props
}: ComponentProps<"img">) {
  if (!src) return null;

  // Fumadocs supplies the probed dimensions as strings for remote Markdown images.
  const imageWidth = Number(width);
  const imageHeight = Number(height);
  const imageProps = {
    ...props,
    src,
    sizes:
      props.sizes ??
      "(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 900px",
    className: cn("rounded-lg", props.className),
  };

  return imageWidth > 0 && imageHeight > 0 ? (
    <Image {...imageProps} width={imageWidth} height={imageHeight} />
  ) : (
    <Image {...imageProps} layout="fullWidth" />
  );
}

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    img: MarkdownImage,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
