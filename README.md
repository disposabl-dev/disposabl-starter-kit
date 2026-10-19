# Disposabl Starter Kit

A monorepo for web, mobile, backend, and shared packages.

## Tech stack

- Bun, TypeScript
- React, TanStack Start, React Native, Expo
- Convex, WorkOS AuthKit
- UI: Tailwind CSS, shadcn/ui
- Content: Fumadocs
- Analytics: PostHog
- Translations: General Translation

Bun and TypeScript are configured. App integrations are being migrated.

## Cookie preferences

`CookieConsentBanner` is mounted in the web root and takes no props. It uses the
app's translations and light/dark theme. Saving preferences hides the banner,
including on later visits while the saved preference remains valid. Apps can
provide their own link using `showCookiePreferences()` if needed.

The banner describes essential cookies only. It does not load analytics, scan
cookies, or manage optional trackers. Add explicit consent handling before adding
any optional tracking service.

## Setup

```sh
bun install
```

## Workspaces

### Apps

| Path             | Purpose and stack                  |
| ---------------- | ---------------------------------- |
| `apps/web`       | Web app · React, TanStack Start    |
| `apps/mobile`    | Mobile app · React Native, Expo    |
| `apps/blog`      | Blog · Markdown                    |
| `apps/changelog` | Release notes · Markdown           |
| `apps/docs`      | Documentation · Markdown, Fumadocs |

### Packages

| Path                         | Purpose and stack                                       |
| ---------------------------- | ------------------------------------------------------- |
| `packages/backend`           | Backend · Convex                                        |
| `packages/disposabl-kit`     | Shared app code and UI · React, Tailwind CSS, shadcn/ui |
| `packages/sdk`               | Client SDK · TypeScript                                 |
| `packages/cli`               | Command-line tools · Bun, TypeScript                    |
| `packages/typescript-config` | Shared TypeScript settings                              |

## Validation

```sh
bun run validate        # Auto-fix lint, format, and check types
bun run validate:check  # Read-only checks
```

## Pre-commit hook

Auto-fixes staged lint and formatting, then checks types.

## CI

Runs frozen installation and read-only validation on pushes and PRs.
