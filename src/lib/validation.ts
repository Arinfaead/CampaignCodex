import { z } from "zod";

import { type CampaignRole, type PageVisibility } from "@/db/schema";

const campaignRoleValues = ["campaign_admin", "member", "viewer"] as const;
const pageVisibilityValues = ["public", "campaign", "gm", "private"] as const;
const campaignVisibilityValues = ["private", "shared", "public"] as const;

export const signUpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Bitte gib eine gueltige E-Mail-Adresse ein.").max(320),
  displayName: z.string().trim().min(2, "Bitte gib einen Namen an.").max(80),
  password: z
    .string()
    .min(12, "Das Passwort muss mindestens 12 Zeichen lang sein.")
    .max(128, "Das Passwort ist zu lang.")
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Bitte gib eine gueltige E-Mail-Adresse ein.").max(320),
  password: z.string().min(1, "Bitte gib dein Passwort ein.").max(128)
});

export const createCampaignSchema = z.object({
  name: z.string().trim().min(1, "Bitte gib einen Kampagnennamen an.").max(120),
  description: z.string().trim().max(2000).default(""),
  visibility: z.enum(campaignVisibilityValues).default("private")
});

export const createPageSchema = z.object({
  campaignId: z.string().uuid(),
  campaignSlug: z.string().trim().min(1),
  title: z.string().trim().min(1).max(160),
  content: z.string().max(200_000).default(""),
  visibility: z.enum(pageVisibilityValues).default("campaign")
});

export const updatePageSchema = createPageSchema.extend({
  pageId: z.string().uuid(),
  pageSlug: z.string().trim().min(1)
});

export const createInviteSchema = z.object({
  campaignId: z.string().uuid(),
  campaignSlug: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email().max(320),
  role: z.enum(campaignRoleValues).default("member")
});

export const acceptInviteSchema = z.object({
  token: z.string().trim().min(16).max(256)
});

export const uploadAssetSchema = z.object({
  campaignId: z.string().uuid(),
  campaignSlug: z.string().trim().min(1),
  visibility: z.enum(pageVisibilityValues).default("campaign")
});

export function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function parseForm<T extends z.ZodRawShape>(schema: z.ZodObject<T>, formData: FormData) {
  const values: Record<string, string> = {};

  for (const key of Object.keys(schema.shape)) {
    if (formData.has(key)) {
      values[key] = getString(formData, key);
    }
  }

  return schema.safeParse(values);
}

export function coerceCampaignRole(value: string): CampaignRole {
  return campaignRoleValues.includes(value as CampaignRole) ? (value as CampaignRole) : "member";
}

export function coercePageVisibility(value: string): PageVisibility {
  return pageVisibilityValues.includes(value as PageVisibility) ? (value as PageVisibility) : "campaign";
}
