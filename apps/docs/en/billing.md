---
title: Billing
description: Plan paid access across web and mobile.
---

Billing is planned. The project does not currently implement checkout, subscriptions, credits, or purchase verification.

The intended providers are Autumn, Stripe, and RevenueCat.

## Define access first

Write down what a plan includes, which account pays, and what should happen when a payment fails or a subscription ends.

## Enforce it on the backend

Store verified billing state against the account. Protected operations must check paid access on the server.

Web purchases and mobile purchases need a consistent account model before they can grant the same benefits.

## Review

Before launch, check purchase, renewal, cancellation, and restored access using the providers' test environments.

[Teams](/docs/teams) and [permissions](/docs/authentication/permissions) explain the account boundaries billing will need to follow.
