---
title: Consent and identity
description: Connect analytics to the right person and preference.
---

The current cookie banner stores essential-cookie preferences. It does not load PostHog or manage optional analytics consent.

## Optional tracking

Add an optional analytics choice and connect it to tracker initialization. Update the banner's text when the app starts using optional tracking.

Check that declining analytics prevents the tracker from starting, including after a reload.

## Signed-in users

When analytics is enabled, use a stable user identifier after sign-in. Reset analytics identity on sign-out so a later user on the same device does not inherit the previous identity.

If you analyze team activity, keep the active organization distinct from the person's identity.

## Sensitive content

Do not record credentials, file contents, or private messages as event properties. Configure masking separately for [session replay](/docs/session-replay).
