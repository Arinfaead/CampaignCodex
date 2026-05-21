import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db";
import { assets, campaignMembers } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getCampaignObject } from "@/lib/storage";
import { canReadVisibility } from "@/lib/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { assetId } = await params;
  const [asset] = await db.select().from(assets).where(eq(assets.id, assetId)).limit(1);

  if (!asset) {
    notFound();
  }

  const [userMembership] = await db
    .select()
    .from(campaignMembers)
    .where(and(eq(campaignMembers.campaignId, asset.campaignId), eq(campaignMembers.userId, user.id)))
    .limit(1);

  if (!userMembership || !canReadVisibility(userMembership.role, asset.visibility, asset.uploadedById === user.id)) {
    return new Response("Forbidden", { status: 403 });
  }

  const object = await getCampaignObject(asset.objectKey);

  if (!object.Body) {
    return new Response("Asset not found", { status: 404 });
  }

  return new Response(object.Body.transformToWebStream(), {
    headers: {
      "Content-Type": asset.contentType,
      "Content-Disposition": `inline; filename="${asset.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=60"
    }
  });
}
