---
title: Mobile apps
description: Plan the iOS and Android clients for your project.
---

The mobile workspace is `apps/mobile`. It currently contains a placeholder, with no Expo app, native screens, or device build configured.

## Share the backend

An Expo and React Native client can use the same Convex backend as the web app. Reuse backend operations and permission checks. Build native screens and navigation for the mobile client.

## Sign in

Configure a native authentication flow and callback before connecting private data. The web app's browser callback is not a ready-made mobile sign-in flow.

## Add device features

[Push notifications](/docs/notifications) and [app updates](/docs/updates) each need native setup.

Verify sign-in, uploads, and navigation on an iOS or Android target before treating the mobile app as ready.
