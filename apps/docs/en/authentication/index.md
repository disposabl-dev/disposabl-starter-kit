---
title: Authentication
description: Sign people in and connect their accounts to your project.
---

Disposabl uses WorkOS AuthKit for sign-in. The web app connects the signed-in session to Convex so backend functions can identify the user and their current account.

## Start here

- [Set up authentication](/docs/authentication/setup) for your web app and backend.
- [Sign-in and sessions](/docs/authentication/sessions) explains the browser flow.
- [Permissions](/docs/authentication/permissions) explains who can access data.
- [Teams](/docs/teams) covers shared accounts, members, and invitations.

## Accounts

A user identifies a person. An organization identifies the account whose data they are accessing. A person can belong to more than one organization.

The backend handles `user.created` events by starting personal-account provisioning. Configure webhook delivery as part of setup.

## Mobile

Native authentication still needs implementation. See [mobile apps](/docs/platforms/mobile).
