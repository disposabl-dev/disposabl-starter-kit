---
title: Sign-in and sessions
description: How the web app starts and completes authentication.
---

The web app redirects people to WorkOS AuthKit to sign in or create an account.

## Entry points

- `/sign-in`, `/signin`, and `/login` start sign-in.
- `/sign-up` and `/signup` start account creation.
- `/callback` completes the browser authentication flow.

These paths stay unprefixed in every language. For example, the Arabic app still uses `/callback`.

## Using the session

The root providers connect AuthKit to Convex. Authenticated screens wait for the session to load before showing private content.

Backend functions use the verified identity to determine the current user, organization, and role.

## Troubleshooting

If sign-in cannot finish, check that the callback URL matches the web app's origin and that both clients use the same WorkOS application.

A successful callback alone does not prove that account provisioning or permissions work. Check a private backend operation too.
