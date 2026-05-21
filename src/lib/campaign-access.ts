import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db";
import { campaignMembers, campaigns, wikiPages, type CampaignRole } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { canManageCampaign, canReadVisibility } from "@/lib/permissions";

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

export async function getCampaignMembership(campaignId: string, userId: string) {
  const [membership] = await db
    .select()
    .from(campaignMembers)
    .where(and(eq(campaignMembers.campaignId, campaignId), eq(campaignMembers.userId, userId)))
    .limit(1);

  return membership ?? null;
}

export async function requireCampaignAccess(slug: string) {
  const user = await requireUser();
  const context = await getCampaignForUser(slug, user.id);

  if (!context) {
    notFound();
  }

  return { ...context, user };
}

export async function requireCampaignAdmin(slug: string) {
  const context = await requireCampaignAccess(slug);

  if (!canManageCampaign(context.membership.role)) {
    notFound();
  }

  return context;
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
