---
name: setup
description: Check this application's MCP connection, complete sign-in, and verify the connected account when the user installs the plugin or asks to connect it.
metadata:
  required-tools: disposabl_getAccount
---

Use the MCP server bundled with this plugin. If the client offers sign-in or reconnect, guide the user through that client flow. Credentials belong in the client's authentication flow.

Call `disposabl_getAccount` with no arguments to verify access. The server selects the authenticated user and organization; do not supply identity fields. Report the returned account identifiers and role as connection evidence.

If the tool is unavailable, explain that the plugin's MCP server must be enabled and connected. If the call fails, report the actual authentication or service error and the next connection step. Do not claim setup succeeded from tool discovery alone or retry a failed sign-in repeatedly.

Account creation and team changes are separate tasks. A request to set up this plugin authorizes checking the existing connection.
