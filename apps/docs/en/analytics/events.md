---
title: Events
description: Measure the actions that matter to your app.
---

An event records something a person did or something the system completed.

## Choose clear names

Use names tied to app behavior, such as `project_created`, `invite_sent`, or `file_uploaded`.

Record success after the operation succeeds. A button click and a completed upload answer different questions.

## Add useful properties

Include only the details needed for analysis, such as the client platform or upload provider. Avoid file contents, access tokens, and private document text.

Use the same event names across web and mobile when they describe the same action.

## Connect and check

The app does not send PostHog events yet. After connecting it, trigger each event in development and confirm its name and properties in the analytics project.

See [consent and identity](/docs/analytics/consent) before enabling tracking for users.
