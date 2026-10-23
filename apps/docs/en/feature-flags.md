---
title: Feature flags
description: Control when a change becomes available.
---

PostHog feature flags are planned. The app does not currently evaluate flags.

## Choose a stable subject

Decide whether a flag applies to a person or an organization. A team-wide feature should behave consistently for members of that team.

## Keep a fallback

Choose the behavior when a flag cannot be loaded. Keep permission checks and paid-access checks on the backend regardless of a flag's value.

## Review

Check enabled, disabled, and unavailable states. Verify that switching accounts uses the correct flag subject.

See [analytics](/docs/analytics) for the related event and identity setup.
