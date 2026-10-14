import { createAccountFunctions } from "disposabl-kit/server/account/internal";
import { env } from "../_generated/server";
import { internalAction, internalQuery } from "../lib/functions";
import { authkit } from "../auth";

export const {
  getAccount,
  updateAccount,
  listTeams,
  createTeam,
  listMembers,
  updateMemberRole,
  removeMember,
  listInvitations,
  sendInvitation,
  resendInvitation,
  revokeInvitation,
} = createAccountFunctions({
  internalAction,
  internalQuery,
  authkit,
  teamsEnabled: env.TEAMS_ENABLED === "true",
});
