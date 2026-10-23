---
title: Distributed tracing
description: Follow a request across the services it uses.
---

OpenTelemetry is the intended tracing approach. The project does not currently initialize tracing or send traces to a collector.

## What to trace

Start with one app operation that crosses a backend or external-service boundary. Give it a clear name and record where time is spent.

Keep a request's trace context connected across supported services.

## Sensitive data

Keep tokens, personal content, and full uploaded payloads out of trace attributes.

## Review

Trigger an operation and check that the trace includes the expected steps. Do not assume browser instrumentation also covers Convex actions or mobile requests.

[Crash analytics](/docs/crash-analytics) records failures; traces can help explain where an operation failed.
