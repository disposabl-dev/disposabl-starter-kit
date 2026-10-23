---
title: API, CLI, and MCP
description: Make selected project operations available to other clients.
---

Web clients call public Convex functions. Selected internal operations can also be exposed through HTTP and MCP.

## HTTP API

The kit builds typed HTTP routes and an OpenAPI specification from registered functions.

See the [HTTP API guide](/docs/interfaces/http) and [OpenAPI reference](/docs/api).

## MCP

MCP makes selected operations available as tools for compatible agents. It has a separate authentication flow.

See [MCP tools](/docs/interfaces/mcp).

## CLI and SDK

The [CLI](/docs/cli) and [TypeScript SDK](/docs/sdk) packages are placeholders. Client generation and distribution are still planned.

Selecting a transport does not grant access. Every protected operation still needs a valid identity and permission checks.
