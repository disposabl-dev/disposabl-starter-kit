---
title: Docs, blog, and changelog
description: Keep written project content in Markdown.
---

Documentation lives in `apps/docs`, blog content in `apps/blog`, and release notes in `apps/changelog`.

## Documentation

Fumadocs renders Markdown files as pages. Put related guides in a folder and add an `index.md` overview to create a section.

Each file starts with metadata:

```yaml
---
title: Your page title
description: What the reader will learn.
---
```

See [writing docs](/docs/content/writing).

## Blog and changelog

The blog and changelog workspaces currently contain no articles or page implementation. They are places to add project content, with publishing routes still to build.

See [articles and release notes](/docs/content/articles).
