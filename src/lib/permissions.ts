import type { CampaignRole, PageVisibility, User } from "@/db/schema";

const writerRoles = new Set<CampaignRole>(["campaign_admin", "member"]);
const managerRoles = new Set<CampaignRole>(["campaign_admin"]);

export function canManageCampaign(role: CampaignRole) {
  return managerRoles.has(role);
}

export function canWriteContent(role: CampaignRole) {
  return writerRoles.has(role);
}

export function canReadVisibility(role: CampaignRole, visibility: PageVisibility, isAuthor = false) {
  if (visibility === "public" || visibility === "campaign") {
    return true;
  }

  if (visibility === "gm") {
    return managerRoles.has(role);
  }

  return managerRoles.has(role) || isAuthor;
}

export function isInstanceAdmin(user: User) {
  return user.role === "instance_admin";
}
