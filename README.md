# CampaignCodex

CampaignCodex is a self-hosted open-source web app for pen-and-paper groups. Dungeon Masters and players can maintain campaign wikis, store lore as Markdown, invite members, and control access through campaign roles and page visibility.

The project is built for local and self-hosted operation:

```bash
git clone <repository-url>
cd campaigncodex
docker compose up -d
```

No local Node.js or npm installation is required for operators. Docker Compose builds the Next.js app image and runs dependency installation, database migrations, PostgreSQL, and MinIO inside containers.

The web app is available at `http://localhost:8080`. MinIO's console is available at `http://localhost:9001`.

## Stack

- Next.js App Router with TypeScript strict mode
- PostgreSQL as the primary database
- Drizzle ORM schema definitions
- SQL migrations executed on container startup
- MinIO as S3-compatible object storage
- Docker Compose for local and self-hosted deployment

## Core Features

- Email/password authentication with scrypt password hashing and hashed session tokens
- Campaign creation with owner, GM, player, and viewer roles
- Markdown wiki pages with server-side sanitization
- Page visibility levels: public, campaign, GM-only, and private
- Invitation links for adding users to campaigns
- Asset uploads stored through a MinIO/S3 abstraction
- Docker-first local startup with PostgreSQL and MinIO

## Development

For local development outside Docker, install dependencies and run checks:

```bash
npm install
npm run lint
npm run typecheck
npm run build
```

Run migrations against the configured database:

```bash
npm run db:migrate
```

Add schema changes as explicit SQL files in `migrations/` and keep `src/db/schema.ts` aligned with the database shape.

## Configuration

`docker compose up -d` works without a local `.env` file by using development-safe defaults from `docker-compose.yml`. Before exposing an instance beyond a local machine, copy `.env.example` to `.env` and change all placeholder secrets. Important settings:

- `DATABASE_URL` points the app at PostgreSQL.
- `SESSION_SECRET` is mixed into session-token hashes.
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, and `S3_SECRET_KEY` configure S3-compatible storage.
- `COOKIE_SECURE=true` should be used behind HTTPS.
- `ALLOW_REGISTRATION=false` disables open sign-up after the first admin account exists.

## Architecture Decisions

1. Markdown is stored as text in PostgreSQL and rendered server-side through `markdown-it` plus `sanitize-html`.
2. Uploaded files never live in the database or app filesystem. The app stores object metadata in PostgreSQL and binary content in MinIO through the S3 API.
3. Authorization is checked server-side in page loaders, server actions, and asset routes.
4. The first registered user becomes an instance admin. Campaign access is still membership-based.
5. Migrations are plain SQL files in `migrations/` so self-hosted operators can audit database changes easily.

## License

CampaignCodex is licensed under the GNU Affero General Public License v3.0 only. See `LICENSE`.
