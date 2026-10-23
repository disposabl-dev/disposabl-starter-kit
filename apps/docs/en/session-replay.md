---
title: Session replay
description: Inspect the steps leading to a problem.
---

PostHog session replay is planned for understanding how people move through the app. Replay is not currently recording sessions.

## Before enabling replay

Connect replay to an explicit optional tracking preference. Mask sensitive inputs and private content before collecting any recording.

See [consent and identity](/docs/analytics/consent).

## Keep recordings useful

Use replay alongside named [events](/docs/analytics/events). An event can identify the failed task; the recording can show what happened around it.

## Review

Record a development session and inspect what is visible. Check that private fields remain masked and that declining tracking prevents recording.

Configure and verify each client separately.
