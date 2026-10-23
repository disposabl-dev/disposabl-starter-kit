---
title: SDK
description: Call application operations from TypeScript.
---

## Status

The TypeScript SDK is planned. There is no published package or generated function reference yet.

## Generated operations

The SDK will be generated from the approved OpenAPI specification using Hey API. It will include typed inputs, responses, and a configurable API URL.

## Authentication and custom functions

Server applications will supply a WorkOS API key at runtime. API keys must stay out of browser bundles.

Application developers will be able to add custom functions alongside generated operations. Regeneration will preserve those custom functions.
