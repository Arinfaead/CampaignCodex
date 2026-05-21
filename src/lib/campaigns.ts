import { eq } from "drizzle-orm";

import { db } from "@/db";
import { campaignMembers, campaigns } from "@/db/schema";

export async function listCampaignsForUser(userId: string) {
  return db
    .select({
      role: campaignMembers.role,
      campaign: campaigns
    })
    .from(campaignMembers)
    .innerJoin(campaigns, eq(campaignMembers.campaignId, campaigns.id))
    .where(eq(campaignMembers.userId, userId));
}
