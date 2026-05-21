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
  wikiPages
} from "@/db/schema";
import { createSession, deleteCurrentSession, requireUser } from "@/lib/auth";
import { getCampaignMembership } from "@/lib/campaign-access";
import { env } from "@/lib/env";
import { canManageCampaign, canWriteContent } from "@/lib/permissions";
import { addDays, createSecretToken, hashPassword, hashToken, normalizeEmail, verifyPassword } from "@/lib/security";
import { cleanFileName, putCampaignObject } from "@/lib/storage";
import { slugify } from "@/lib/slugs";
import {
  acceptInviteSchema,
  createCampaignSchema,
  createInviteSchema,
  createPageSchema,
  parseForm,
  signInSchema,
  signUpSchema,
  updatePageSchema,
  uploadAssetSchema
} from "@/lib/validation";

export async function signUpAction(formData: FormData) {
  const parsed = parseForm(signUpSchema, formData);

  if (!parsed.success) {
    redirect("/auth/sign-up?error=invalid");
  }

  const { email, displayName, password } = parsed.data;
  const [{ value: userCount }] = await db.select({ value: count() }).from(users);

  if (!env.ALLOW_REGISTRATION && userCount > 0) {
    redirect("/auth/sign-in?error=registration-closed");
  }

  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existingUser) {
    redirect("/auth/sign-up?error=email-exists");
  }

  const [createdUser] = await db
    .insert(users)
    .values({
      email,
      displayName,
      passwordHash: await hashPassword(password),
      role: userCount === 0 ? "instance_admin" : "user"
    })
    .returning();

  await createSession(createdUser.id);
  redirect("/dashboard");
}

export async function signInAction(formData: FormData) {
  const parsed = parseForm(signInSchema, formData);

  if (!parsed.success) {
    redirect("/auth/sign-in?error=invalid");
  }

  const email = normalizeEmail(parsed.data.email);
  const password = parsed.data.password;
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    redirect("/auth/sign-in?error=invalid");
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function signOutAction() {
  await deleteCurrentSession();
  redirect("/auth/sign-in");
}

export async function createCampaignAction(formData: FormData) {
  const user = await requireUser();
  const parsed = parseForm(createCampaignSchema, formData);

  if (!parsed.success) {
    redirect("/campaigns/new?error=missing-name");
  }

  const { name, description, visibility } = parsed.data;
  const baseSlug = slugify(name);
  const slug = `${baseSlug}-${randomUUID().slice(0, 8)}`;

  const [campaign] = await db
    .insert(campaigns)
    .values({
      createdByUserId: user.id,
      name,
      slug,
      description,
      visibility
    })
    .returning();

  await db.insert(campaignMembers).values({
    campaignId: campaign.id,
    userId: user.id,
    role: "campaign_admin"
  });

  redirect(`/campaigns/${campaign.slug}`);
}

export async function createPageAction(formData: FormData) {
  const user = await requireUser();
  const parsed = parseForm(createPageSchema, formData);

  if (!parsed.success) {
    redirect("/dashboard");
  }

  const { campaignId, campaignSlug, title, content, visibility } = parsed.data;
  const membership = await getCampaignMembership(campaignId, user.id);

  if (!membership || !canWriteContent(membership.role)) {
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
  const parsed = parseForm(updatePageSchema, formData);

  if (!parsed.success) {
    redirect("/dashboard");
  }

  const { pageId, campaignSlug, pageSlug, campaignId, title, content, visibility } = parsed.data;
  const membership = await getCampaignMembership(campaignId, user.id);

  if (!membership || !canWriteContent(membership.role)) {
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
  const parsed = parseForm(createInviteSchema, formData);

  if (!parsed.success) {
    redirect("/dashboard");
  }

  const { campaignId, campaignSlug, role } = parsed.data;
  const email = normalizeEmail(parsed.data.email);
  const membership = await getCampaignMembership(campaignId, user.id);

  if (!membership || !canManageCampaign(membership.role)) {
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
  const parsed = parseForm(acceptInviteSchema, formData);

  if (!parsed.success) {
    redirect("/dashboard");
  }

  const { token } = parsed.data;
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
  const parsed = parseForm(uploadAssetSchema, formData);

  if (!parsed.success) {
    redirect("/dashboard");
  }

  const { campaignId, campaignSlug, visibility } = parsed.data;
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
