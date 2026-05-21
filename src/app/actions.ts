"use server";

import { and, count, eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";

import { db } from "@/db";
import {
  assets,
  campaignInvites,
  campaignMembers,
  campaigns,
  users,
  wikiPages,
  type CampaignRole,
  type PageVisibility
} from "@/db/schema";
import { createSession, deleteCurrentSession, requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { canManageCampaign, canWriteContent } from "@/lib/permissions";
import { addDays, createSecretToken, hashPassword, hashToken, normalizeEmail, verifyPassword } from "@/lib/security";
import { cleanFileName, putCampaignObject } from "@/lib/storage";
import { slugify } from "@/lib/slugs";

const campaignRoles = new Set<CampaignRole>(["owner", "gm", "player", "viewer"]);
const pageVisibilities = new Set<PageVisibility>(["public", "campaign", "gm", "private"]);

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function assertRole(value: string): CampaignRole {
  return campaignRoles.has(value as CampaignRole) ? (value as CampaignRole) : "player";
}

function assertVisibility(value: string): PageVisibility {
  return pageVisibilities.has(value as PageVisibility) ? (value as PageVisibility) : "campaign";
}

async function getCampaignMembership(campaignId: string, userId: string) {
  const [membership] = await db
    .select()
    .from(campaignMembers)
    .where(and(eq(campaignMembers.campaignId, campaignId), eq(campaignMembers.userId, userId)))
    .limit(1);

  return membership ?? null;
}

export async function signUpAction(formData: FormData) {
  const email = normalizeEmail(readString(formData, "email"));
  const displayName = readString(formData, "displayName");
  const password = readString(formData, "password");

  if (!email || !displayName || password.length < 12) {
    redirect("/auth/sign-up?error=invalid");
  }

  const [{ value: userCount }] = await db.select({ value: count() }).from(users);

  if (!env.ALLOW_REGISTRATION && userCount > 0) {
    redirect("/auth/sign-in?error=registration-closed");
  }

  const [createdUser] = await db
    .insert(users)
    .values({
      email,
      displayName,
      passwordHash: await hashPassword(password),
      role: userCount === 0 ? "admin" : "member"
    })
    .returning();

  await createSession(createdUser.id);
  redirect("/");
}

export async function signInAction(formData: FormData) {
  const email = normalizeEmail(readString(formData, "email"));
  const password = readString(formData, "password");
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    redirect("/auth/sign-in?error=invalid");
  }

  await createSession(user.id);
  redirect("/");
}

export async function signOutAction() {
  await deleteCurrentSession();
  redirect("/auth/sign-in");
}

export async function createCampaignAction(formData: FormData) {
  const user = await requireUser();
  const name = readString(formData, "name");
  const description = readString(formData, "description");

  if (!name) {
    redirect("/campaigns/new?error=missing-name");
  }

  const baseSlug = slugify(name);
  const slug = `${baseSlug}-${randomUUID().slice(0, 8)}`;

  const [campaign] = await db
    .insert(campaigns)
    .values({
      ownerId: user.id,
      name,
      slug,
      description
    })
    .returning();

  await db.insert(campaignMembers).values({
    campaignId: campaign.id,
    userId: user.id,
    role: "owner"
  });

  redirect(`/campaigns/${campaign.slug}`);
}

export async function createPageAction(formData: FormData) {
  const user = await requireUser();
  const campaignId = readString(formData, "campaignId");
  const campaignSlug = readString(formData, "campaignSlug");
  const title = readString(formData, "title");
  const content = readString(formData, "content");
  const visibility = assertVisibility(readString(formData, "visibility"));
  const membership = await getCampaignMembership(campaignId, user.id);

  if (!membership || !canWriteContent(membership.role) || !title) {
    redirect(`/campaigns/${campaignSlug}`);
  }

  const pageSlug = `${slugify(title)}-${randomUUID().slice(0, 8)}`;
  await db.insert(wikiPages).values({
    campaignId,
    slug: pageSlug,
    title,
    content,
    visibility,
    authorId: user.id,
    updatedById: user.id
  });

  revalidatePath(`/campaigns/${campaignSlug}`);
  redirect(`/campaigns/${campaignSlug}/pages/${pageSlug}`);
}

export async function updatePageAction(formData: FormData) {
  const user = await requireUser();
  const pageId = readString(formData, "pageId");
  const campaignSlug = readString(formData, "campaignSlug");
  const pageSlug = readString(formData, "pageSlug");
  const campaignId = readString(formData, "campaignId");
  const title = readString(formData, "title");
  const content = readString(formData, "content");
  const visibility = assertVisibility(readString(formData, "visibility"));
  const membership = await getCampaignMembership(campaignId, user.id);

  if (!membership || !canWriteContent(membership.role) || !title) {
    redirect(`/campaigns/${campaignSlug}/pages/${pageSlug}`);
  }

  await db
    .update(wikiPages)
    .set({
      title,
      content,
      visibility,
      updatedById: user.id,
      updatedAt: new Date()
    })
    .where(eq(wikiPages.id, pageId));

  revalidatePath(`/campaigns/${campaignSlug}/pages/${pageSlug}`);
  redirect(`/campaigns/${campaignSlug}/pages/${pageSlug}`);
}

export async function createInviteAction(formData: FormData) {
  const user = await requireUser();
  const campaignId = readString(formData, "campaignId");
  const campaignSlug = readString(formData, "campaignSlug");
  const email = normalizeEmail(readString(formData, "email"));
  const role = assertRole(readString(formData, "role"));
  const membership = await getCampaignMembership(campaignId, user.id);

  if (!membership || !canManageCampaign(membership.role) || !email || role === "owner") {
    redirect(`/campaigns/${campaignSlug}/settings`);
  }

  const token = createSecretToken();
  await db.insert(campaignInvites).values({
    campaignId,
    email,
    role,
    tokenHash: hashToken(token),
    expiresAt: addDays(14),
    createdById: user.id
  });

  redirect(`/campaigns/${campaignSlug}/settings?invite=${token}`);
}

export async function acceptInviteAction(formData: FormData) {
  const user = await requireUser();
  const token = readString(formData, "token");
  const tokenHash = hashToken(token);

  const [invite] = await db
    .select()
    .from(campaignInvites)
    .where(and(eq(campaignInvites.tokenHash, tokenHash), eq(campaignInvites.status, "pending"), gt(campaignInvites.expiresAt, new Date())))
    .limit(1);

  if (!invite) {
    redirect("/");
  }

  await db
    .insert(campaignMembers)
    .values({
      campaignId: invite.campaignId,
      userId: user.id,
      role: invite.role
    })
    .onConflictDoUpdate({
      target: [campaignMembers.campaignId, campaignMembers.userId],
      set: { role: invite.role }
    });

  await db
    .update(campaignInvites)
    .set({
      status: "accepted",
      acceptedAt: new Date(),
      acceptedById: user.id
    })
    .where(eq(campaignInvites.id, invite.id));

  const [campaign] = await db.select({ slug: campaigns.slug }).from(campaigns).where(eq(campaigns.id, invite.campaignId)).limit(1);

  redirect(campaign ? `/campaigns/${campaign.slug}` : "/");
}

export async function uploadAssetAction(formData: FormData) {
  const user = await requireUser();
  const campaignId = readString(formData, "campaignId");
  const campaignSlug = readString(formData, "campaignSlug");
  const visibility = assertVisibility(readString(formData, "visibility"));
  const membership = await getCampaignMembership(campaignId, user.id);
  const file = formData.get("file");

  if (!membership || !canWriteContent(membership.role) || !(file instanceof File) || file.size === 0) {
    redirect(`/campaigns/${campaignSlug}/assets`);
  }

  const safeName = cleanFileName(file.name);
  const key = `${campaignId}/${randomUUID()}-${safeName}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  await putCampaignObject({
    key,
    body: bytes,
    contentType: file.type || "application/octet-stream"
  });

  await db.insert(assets).values({
    campaignId,
    objectKey: key,
    fileName: safeName,
    contentType: file.type || "application/octet-stream",
    size: file.size,
    visibility,
    uploadedById: user.id
  });

  revalidatePath(`/campaigns/${campaignSlug}/assets`);
  redirect(`/campaigns/${campaignSlug}/assets`);
}
