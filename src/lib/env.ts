import { z } from "zod";

const booleanFromString = z
  .string()
  .optional()
  .transform((value) => value === "true");

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(24),
  PUBLIC_URL: z.string().url().default("http://localhost:8080"),
  COOKIE_SECURE: booleanFromString,
  ALLOW_REGISTRATION: booleanFromString.default("true"),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1).default("us-east-1"),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: booleanFromString.default("true"),
  OAUTH_GOOGLE_CLIENT_ID: z.string().optional(),
  OAUTH_GOOGLE_CLIENT_SECRET: z.string().optional(),
  OAUTH_GITHUB_CLIENT_ID: z.string().optional(),
  OAUTH_GITHUB_CLIENT_SECRET: z.string().optional()
});

const buildDefaults =
  process.env.CAMPAIGNCODEX_BUILD === "1"
    ? {
        DATABASE_URL: "postgres://campaign_codex:change-this-password@localhost:5432/campaign_codex",
        SESSION_SECRET: "build-time-session-secret-value",
        PUBLIC_URL: "http://localhost:8080",
        S3_ENDPOINT: "http://localhost:9000",
        S3_REGION: "us-east-1",
        S3_BUCKET: "campaigncodex",
        S3_ACCESS_KEY: "campaigncodex",
        S3_SECRET_KEY: "build-time-minio-secret",
        S3_FORCE_PATH_STYLE: "true"
      }
    : {};

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL ?? buildDefaults.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET ?? buildDefaults.SESSION_SECRET,
  PUBLIC_URL: process.env.PUBLIC_URL ?? buildDefaults.PUBLIC_URL,
  COOKIE_SECURE: process.env.COOKIE_SECURE,
  ALLOW_REGISTRATION: process.env.ALLOW_REGISTRATION,
  S3_ENDPOINT: process.env.S3_ENDPOINT ?? buildDefaults.S3_ENDPOINT,
  S3_REGION: process.env.S3_REGION ?? buildDefaults.S3_REGION,
  S3_BUCKET: process.env.S3_BUCKET ?? buildDefaults.S3_BUCKET,
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY ?? buildDefaults.S3_ACCESS_KEY,
  S3_SECRET_KEY: process.env.S3_SECRET_KEY ?? buildDefaults.S3_SECRET_KEY,
  S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE ?? buildDefaults.S3_FORCE_PATH_STYLE,
  OAUTH_GOOGLE_CLIENT_ID: process.env.OAUTH_GOOGLE_CLIENT_ID,
  OAUTH_GOOGLE_CLIENT_SECRET: process.env.OAUTH_GOOGLE_CLIENT_SECRET,
  OAUTH_GITHUB_CLIENT_ID: process.env.OAUTH_GITHUB_CLIENT_ID,
  OAUTH_GITHUB_CLIENT_SECRET: process.env.OAUTH_GITHUB_CLIENT_SECRET
});
