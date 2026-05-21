import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run migrations.");
}

const sql = postgres(databaseUrl, { max: 1 });
const migrationsDir = path.join(process.cwd(), "migrations");

await sql`
  CREATE TABLE IF NOT EXISTS _campaigncodex_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`;

const appliedRows = await sql`SELECT name FROM _campaigncodex_migrations`;
const applied = new Set(appliedRows.map((row) => row.name));
const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();

for (const file of files) {
  if (applied.has(file)) {
    continue;
  }

  const migration = await readFile(path.join(migrationsDir, file), "utf8");
  await sql.begin(async (tx) => {
    await tx.unsafe(migration);
    await tx`INSERT INTO _campaigncodex_migrations (name) VALUES (${file})`;
  });
  console.log(`Applied migration ${file}`);
}

await sql.end();
