---
title: Backend functions
description: Read data, change records, and call external services.
---

Convex functions live under `packages/backend/convex`.

## Queries

Use queries to read database state. Clients can subscribe to query results so the interface reflects changes.

## Mutations

Use mutations to write records. Validate inputs and check the current account before changing private data.

## Actions

Use actions when an operation needs an external service. For example, the project gets file download URLs through an action.

## Public and internal functions

Public functions are client entry points. Internal functions hold operations that run behind an authenticated entry point or another trusted server call.

Shared kit functions are registered through `packages/backend/convex/disposabl.ts`. Additional app functions can live in their own modules.

See [interfaces](/docs/interfaces) to expose selected operations over HTTP or MCP.
