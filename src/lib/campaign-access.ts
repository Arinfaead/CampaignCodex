import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { campaignMembers, campaigns, wikiPages, type CampaignRole } from "@/db/schema";
import { canReadVisibility } from "@/lib/permissions";

export async function getCampaignForUser(slug: string, userId: string) {
  const [row] = await db
    .select({
      campaign: campaigns,
      membership: campaignMembers
    })
    .from(campaigns)
    .innerJoin(campaignMembers, eq(campaignMembers.campaignId, campaigns.id))
    .where(and(eq(campaigns.slug, slug), eq(campaignMembers.userId, userId)))
    .limit(1);

  return row ?? null;
}

export async function getReadablePage(campaignId: string, pageSlug: string, userId: string, role: CampaignRole) {
  const [page] = await db
    .select()
    .from(wikiPages)
    .where(and(eq(wikiPages.campaignId, campaignId), eq(wikiPages.slug, pageSlug)))
    .limit(1);

  if (!page || !canReadVisibility(role, page.visibility, page.authorId === userId)) {
    return null;
  }

  return page;
}
