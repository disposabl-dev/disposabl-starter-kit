---
title: Members and roles
description: Decide who can use or administer a team.
---

The project recognizes two membership roles: `admin` and `member`.

## Members

Members can use account-scoped operations allowed by the app. Listing team members requires teams to be enabled.

## Administrators

Administrators can manage team settings, change another member's role, and remove eligible memberships.

The backend checks the active organization and membership before making changes. It rejects edits to the caller's own membership and to directory-managed memberships.

## Build the interface

Show the active account clearly before offering member actions. After a role change or removal, refresh the displayed membership list.

Check both allowed and rejected actions. A disabled button is not a permission check.
