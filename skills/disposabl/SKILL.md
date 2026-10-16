---
name: disposabl
description: Discover Disposabl platform API operations, inspect their input schemas, and call requested operations through the Disposabl CLI or authenticated HTTP API. Use for account, team, member, invitation, and app platform operations exposed by Disposabl.
---

# Disposabl

Use the configured Disposabl deployment and the current API contract. Do not invent deployment URLs, operation names, CLI flags, or credentials.

## Discover before calling

1. Inspect the current CLI interface with `npx --yes --prefer-online @disposabl/cli@latest --help`. Use its documented subcommand help to discover authentication, deployment configuration, API discovery, and operation invocation. The installed CLI's help is authoritative for command syntax.
2. In a starter checkout, read `generated/openapi.json`. For a deployed app, retrieve `/openapi.json` from the explicitly configured app/backend origin. The local file is a generated snapshot; prefer the deployed contract when operating a deployment.
3. Select the operation by method, path, or operationId. Inspect its parameters, requestBody schema, security requirements, and response schema before constructing an invocation. Preserve the declared HTTP method and `/api/v1` route.
4. Authenticate through the CLI's supported login or an existing configured bearer credential. Never print credentials or copy them into committed files.
5. Invoke only the requested operation. If the CLI exposes generic API invocation, use the syntax shown by its help. Otherwise use the authenticated HTTP route from the contract. Report the status and relevant result; never report an attempted request as successful without its response.

## Request rules

- Send the flat JSON object defined by requestBody; do not add an `args` wrapper.
- Supply only declared properties and observe required fields and enum values. Do not send `orgId`, `userId`, or `role` as identity overrides. Server authentication establishes identity. An operation may separately declare a legitimate business field such as `roleSlug`; follow that schema.
- Treat a read operation declared as POST as POST. Do not infer its method from the name.
- Missing origin or credentials is a configuration requirement. Ask for the missing deployment context rather than selecting a guessed production host.
- Respect authorization already given for the requested change. For invitations or other actions that contact people, require the user's explicit request for that action.

## Starter examples to verify against the current contract

The current starter snapshot includes `GET /api/v1/account/getAccount` with bearer security and no parameters. Its operationId is `account/internal:getAccount`.

It also includes `POST /api/v1/todo/createTodo`, operationId `todo/internal:createTodo`, whose JSON body is `{ "text": "Example" }`. Only create a todo when the user requests it. These examples are discovery aids, not a permanent operation registry.

## Skill and CLI freshness

CLI invocations above resolve the npm `latest` release before execution. Skill content comes from the configured Git skill/plugin repository and updates independently of npm releases. Do not edit this skill or install other skills while carrying out an API request. A plugin or skill update may require a new agent session or plugin reload before the new instructions are active.
