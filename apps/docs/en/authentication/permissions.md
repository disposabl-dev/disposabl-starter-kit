---
title: Permissions
description: Keep each account's data behind server checks.
---

The backend represents the current identity with three fields:

- `userId` identifies the signed-in person.
- `orgId` identifies the active organization.
- `role` is `admin` or `member`.

## Check access on the server

Public Convex functions call `requireUser` before invoking private operations. HTTP and MCP requests authenticate at their transport boundary.

Never accept a caller's claimed organization or role as proof of access. The server supplies those values from the authenticated identity.

## Scope data to the account

Store an organization ID on account-owned records and filter reads by that organization. Check ownership before updates and deletes.

Hiding a screen or button only changes the interface. The operation itself still needs an access check.

## Teams and files

[Team administration](/docs/teams/members) requires additional checks. [Stored files](/docs/storage/downloads) also belong to an organization.
