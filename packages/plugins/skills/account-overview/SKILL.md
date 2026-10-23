---
name: account-overview
description: Summarize the connected application's current account and available teams when the user asks which account or teams they can access.
metadata:
  required-tools: disposabl_getAccount disposabl_listTeams
---

Call `disposabl_getAccount` without arguments to identify the current organization, user, and role. Use the connection's server-selected identity rather than inferring it from previous conversation.

If the user asks about teams, call `disposabl_listTeams` with `paginationOpts: { numItems: 25, cursor: null }`. Follow `continueCursor` while `isDone` is false when the user requested a complete list. For an overview, one page is enough; say when more teams remain. Keep team names and each team's returned role together.

Report the account and team information the tools actually returned. If teams are unavailable or a tool call fails, retain the verified account result and describe the limitation. These calls inspect access; a request for an overview does not require creating or switching teams, inviting members, or changing roles.
