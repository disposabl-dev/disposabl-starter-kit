---
title: Push notifications
description: Notify mobile users when something needs their attention.
---

Expo is the intended provider for mobile push notifications. The current mobile workspace does not implement permission prompts, device registration, or delivery.

## Registration

A native client needs to request permission and register a device token. Associate that token with the signed-in user so messages reach the correct person.

## Delivery

Send notifications from the backend after the relevant action succeeds. Include only enough information to help the recipient decide whether to open the app.

## Review

Check permission denial, sign-out, and account changes. Open a notification and confirm that it reaches the correct screen.

Test the complete flow on the intended iOS and Android targets. See [mobile apps](/docs/platforms/mobile).
