import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/db/schema";
import { env } from "@/lib/env";

declare global {
  var campaignCodexSql: ReturnType<typeof postgres> | undefined;
}

const client =
  globalThis.campaignCodexSql ??
  postgres(env.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.campaignCodexSql = client;
}

export const db = drizzle(client, { schema });
export { schema };
