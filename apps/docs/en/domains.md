---
title: Custom domains
description: Plan the public address for a published app.
---

The backend includes Convex static hosting and a fallback for app routes. A custom-domain setup flow is not included in the project.

## Before connecting a domain

Choose the app's public URL and confirm where the web app is deployed. Domain verification and DNS records depend on that hosting setup.

## Update related settings

After choosing a domain, review WorkOS allowed origins and callback URLs, storage CORS origins, and links sent in emails or invitations.

Keep authentication callbacks on the registered `/callback` path.

## Review

Open the app on its final domain and check deep links, sign-in, uploads, and documentation.

See [authentication setup](/docs/authentication/setup) and [file storage configuration](/docs/files).
