---
title: Web app
description: Public pages and signed-in screens for your project.
---

The web app lives in `apps/web`. React renders the interface, and TanStack Start handles routing and server rendering.

## Public pages

Use public routes for your homepage and pages that visitors can open without signing in. Documentation also lives in the public area.

## Signed-in screens

Put private app screens under the authenticated route layout. It waits for authentication before showing the screen and sends signed-out visitors to the homepage.

The server must check access again when reading or changing private data. See [permissions](/docs/authentication/permissions).

## Shared interface

The project includes shared UI components, light and dark themes, a language selector, and cookie preferences. Import shared components through `@disposabl/disposabl-kit/client`.

See [translations](/docs/localization) before adding text that should appear in multiple languages.
