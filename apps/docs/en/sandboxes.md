---
title: Agent sandboxes
description: Plan isolated environments for coding agents.
---

Vercel Sandbox is the intended provider for isolated agent workspaces. Sandbox creation and lifecycle management are not implemented in this project.

## Keep access narrow

Give a sandbox the source and tools needed for its task. Keep production credentials out of the environment unless an operation explicitly requires them.

## Track the result

A completed agent task should return the changed files and verification results. A running preview alone does not prove that the generated project works.

## Clean up

Define when environments stop and how long artifacts remain available.

Sandbox integration is separate from exposing app operations through [MCP](/docs/interfaces/mcp).
