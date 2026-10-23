---
title: MCP tools
description: Connect compatible agents to project operations.
---

MCP exposes selected backend operations as tools at `/mcp` on the Convex site.

## Enable the transport

Include `mcp` in `DISPOSABL_PLATFORMS`. The `openai-plugin` and `claude-plugin` selections also enable MCP.

An operation must separately declare MCP exposure. Enabling the transport does not publish every internal function.

## Authentication

The endpoint publishes OAuth protected-resource metadata and points clients to the WorkOS authorization server.

MCP access tokens must target the project's MCP endpoint. The server checks the user's active organization membership before running a tool.

## Connect a client

Use a compatible OAuth-capable MCP client and your deployed `/mcp` URL. Confirm sign-in, tool discovery, one allowed operation, and a rejected request without authorization.

CLI and SDK generation are separate from MCP. See [interfaces](/docs/interfaces).
