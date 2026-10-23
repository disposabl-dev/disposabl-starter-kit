---
title: Database
description: Keep project data in one Convex backend.
---

Convex stores the data used by your app clients. The schema lives in `packages/backend/convex/schema.ts`.

## Model your data

Define a table for each kind of record and add validators for its fields. The current schema includes `files` and `todos`.

Include an organization ID on private account-owned records. Add indexes for the queries your app needs.

## Use backend functions

Clients read and change data through Convex functions. [Backend functions](/docs/database/functions) explains queries, mutations, and actions.

## Shared data

Web and future mobile clients can use the same backend. Keep permission checks in backend functions so each client follows the same rules.

The current todo operation returns a demonstration result. It does not persist a todo in the database yet.
