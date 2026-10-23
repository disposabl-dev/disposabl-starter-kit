---
title: Crash analytics
description: Find errors that prevent people from using the app.
---

PostHog is the intended error reporting provider. The project does not currently collect crash reports.

## Useful reports

Capture enough context to locate the failing screen or operation. Include the app version and platform when available.

Keep credentials, request authorization headers, and private content out of reports.

## Connect errors to behavior

Link reports to [analytics](/docs/analytics) or [session replay](/docs/session-replay) only when those integrations are configured and the user's preferences allow it.

## Review

Trigger a known test error and confirm that the report identifies the source. A successful build does not prove that error collection works.

Mobile crash reporting needs its own native integration.
