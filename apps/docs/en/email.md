---
title: Email
description: Plan transactional messages for your project.
---

Resend is the intended provider for transactional email. A project email integration is not implemented yet.

## Common messages

Start with messages people need to complete a task, such as a receipt or a completed export. WorkOS authentication and invitation messages belong to the authentication setup.

## Setup to add

Connect a verified sending domain, keep the provider credential on the backend, and send messages from server operations.

Give each message a clear subject and a useful link back to the app. Handle retries so one operation does not send duplicate messages.

## Review

Check delivery and links in a real inbox before enabling the flow for users. Keep translated messages aligned with the app's [languages](/docs/localization).
