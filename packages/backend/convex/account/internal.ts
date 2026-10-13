import { createAccountFunctions } from "disposabl-kit/server/account";
import { env, internalAction, internalQuery } from "../_generated/server";
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
