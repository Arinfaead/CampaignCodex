import {
  bigint,
  type AnyPgColumn,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const instanceRole = pgEnum("instance_role", ["instance_admin", "user"]);
export const campaignRole = pgEnum("campaign_role", ["campaign_admin", "member", "viewer"]);
export const campaignVisibility = pgEnum("campaign_visibility", ["private", "shared", "public"]);
export const pageVisibility = pgEnum("page_visibility", ["public", "campaign", "gm", "private"]);
export const inviteStatus = pgEnum("invite_status", ["pending", "accepted", "revoked"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: instanceRole("role").notNull().default("user"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_unique").on(table.email)
  })
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tokenHash: text("token_hash").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    tokenIdx: uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
    userIdx: index("sessions_user_id_idx").on(table.userId),
    expiresIdx: index("sessions_expires_at_idx").on(table.expiresAt)
  })
);

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    visibility: campaignVisibility("visibility").notNull().default("private"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    slugIdx: uniqueIndex("campaigns_slug_unique").on(table.slug),
    createdByIdx: index("campaigns_created_by_user_id_idx").on(table.createdByUserId)
  })
);

export const campaignMembers = pgTable(
  "campaign_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: campaignRole("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    campaignUserIdx: uniqueIndex("campaign_members_campaign_user_unique").on(table.campaignId, table.userId),
    userIdx: index("campaign_members_user_id_idx").on(table.userId)
  })
);

export const oauthAccounts = pgTable(
  "oauth_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    providerAccountIdx: uniqueIndex("oauth_accounts_provider_account_unique").on(table.provider, table.providerAccountId),
    userIdx: index("oauth_accounts_user_id_idx").on(table.userId)
  })
);

export const wikiPages = pgTable(
  "wiki_pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references((): AnyPgColumn => wikiPages.id, { onDelete: "set null" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    visibility: pageVisibility("visibility").notNull().default("campaign"),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    updatedById: uuid("updated_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    campaignSlugIdx: uniqueIndex("wiki_pages_campaign_slug_unique").on(table.campaignId, table.slug),
    campaignIdx: index("wiki_pages_campaign_id_idx").on(table.campaignId)
  })
);

export const campaignInvites = pgTable(
  "campaign_invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: campaignRole("role").notNull().default("member"),
    tokenHash: text("token_hash").notNull(),
    status: inviteStatus("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    acceptedById: uuid("accepted_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    tokenIdx: uniqueIndex("campaign_invites_token_hash_unique").on(table.tokenHash),
    campaignIdx: index("campaign_invites_campaign_id_idx").on(table.campaignId)
  })
);

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    objectKey: text("object_key").notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    visibility: pageVisibility("visibility").notNull().default("campaign"),
    uploadedById: uuid("uploaded_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    objectKeyIdx: uniqueIndex("assets_object_key_unique").on(table.objectKey),
    campaignIdx: index("assets_campaign_id_idx").on(table.campaignId)
  })
);

export type User = typeof users.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type CampaignMember = typeof campaignMembers.$inferSelect;
export type WikiPage = typeof wikiPages.$inferSelect;
export type CampaignRole = (typeof campaignRole.enumValues)[number];
export type CampaignVisibility = (typeof campaignVisibility.enumValues)[number];
export type PageVisibility = (typeof pageVisibility.enumValues)[number];
