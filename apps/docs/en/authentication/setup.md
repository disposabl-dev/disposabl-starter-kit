---
title: Authentication setup
description: Connect WorkOS AuthKit to the web app and Convex.
---

Use a separate WorkOS environment for development and production.

## Configure the web app

Set these frontend values for the web app:

- `VITE_CONVEX_URL` points to your Convex deployment.
- `VITE_WORKOS_CLIENT_ID` identifies the WorkOS application.

The web app loads environment values from `packages/backend`. Register your web origin and its `/callback` URL in WorkOS. For local development, the callback is `http://localhost:3000/callback`.

Without a WorkOS client ID, the app hides sign-in controls and disables authentication routes.

## Configure the backend

Set these values on the Convex deployment:

- `WORKOS_CLIENT_ID`
- `WORKOS_API_KEY`
- `WORKOS_WEBHOOK_SECRET`

Use the same WorkOS application for the web client and backend. Keep the API key and webhook secret on the server.

## Connect events

Configure WorkOS to send events to your Convex site's `/workos/webhook` endpoint. Include `user.created` so the backend can provision personal accounts.

## Check the flow

Open sign-up, complete the callback, and confirm the session can access a protected backend operation. Also check sign-out and a rejected request from a signed-out browser.
