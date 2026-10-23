---
title: HTTP API
description: Call project operations through authenticated HTTP requests.
---

The backend enables HTTP API routes through `DISPOSABL_PLATFORMS`. Selecting `api`, `cli`, or `sdk` enables the API transport.

## Operations

Functions marked with `platforms: ["api"]` can appear as POST routes under `/api/v1/`. The generated reference lists each operation's request and response.

## Authentication

Requests use an `Authorization: Bearer` header. The server supports WorkOS session access tokens and validates eligible WorkOS user API keys.

API keys require `api:access` permission and an active organization membership. Key issuance is separate from these route handlers.

The server supplies the trusted user, organization, and role. Do not send them as request input.

## Contracts

Run `bun run generate:platforms` after changing exposed functions. This command can deploy the backend after the compatibility check passes.

If generation reports `PLATFORM_BREAKING_CHANGE_APPROVAL_REQUIRED`, review the reported changes and obtain explicit approval before accepting them. Keep the existing generated contracts until then.
