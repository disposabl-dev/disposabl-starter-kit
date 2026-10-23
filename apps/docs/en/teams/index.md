---
title: Teams
description: Share an account with other people.
---

Teams use WorkOS organizations and memberships. The active organization determines which account's data an operation can access.

## Enable teams

Team operations require `TEAMS_ENABLED=true` on the Convex deployment. They are disabled otherwise.

The backend includes operations for creating teams, listing memberships, changing roles, and managing invitations. These operations still need app screens for people to use them in the web or mobile interface.

## Personal and shared accounts

Personal organizations use a `personal:` external ID. Team administration rejects personal accounts where a shared team is required.

## Guides

- [Members and roles](/docs/teams/members)
- [Invitations](/docs/teams/invitations)
- [Permissions](/docs/authentication/permissions)
