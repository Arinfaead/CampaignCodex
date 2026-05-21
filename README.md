# CampaignCodex

CampaignCodex is a self-hosted open-source web app for pen-and-paper groups. Dungeon Masters and players can maintain campaign wikis, store lore as Markdown, invite members, and control access through campaign roles and page visibility.

The project is built for local and self-hosted operation:

```bash
nano docker-compose.yml
docker compose up -d
```

Paste the `docker-compose.yml` from this repository into that file. No `git clone`, local Node.js, npm, or build step is required for operators. Docker Compose pulls the published CampaignCodex image and runs database migrations, PostgreSQL, and MinIO inside containers.

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

`docker compose up -d` works with only the copied `docker-compose.yml` file. Before exposing an instance beyond a local machine, edit the placeholder secrets directly in `docker-compose.yml` or provide the same variables through an `.env` file. Important settings:

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

## Standalone Docker Compose

Create `docker-compose.yml`, paste the following content, save, and run `docker compose up -d`.

```yaml
services:
  app:
    image: ghcr.io/arinfaead/campaigncodex:v1.1.0
    platform: linux/amd64
    environment:
      DATABASE_URL: postgres://campaign_codex:change-this-password@postgres:5432/campaign_codex
      SESSION_SECRET: change-this-to-a-long-random-secret
      PUBLIC_URL: http://localhost:8080
      COOKIE_SECURE: "false"
      ALLOW_REGISTRATION: "true"
      S3_ENDPOINT: http://minio:9000
      S3_REGION: us-east-1
      S3_BUCKET: campaigncodex
      S3_ACCESS_KEY: campaigncodex-app
      S3_SECRET_KEY: change-this-minio-secret
      S3_FORCE_PATH_STYLE: "true"
      PORT: "3000"
    ports:
      - "8080:3000"
    depends_on:
      postgres:
        condition: service_healthy
      minio:
        condition: service_healthy
      minio-init:
        condition: service_completed_successfully
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: campaign_codex
      POSTGRES_USER: campaign_codex
      POSTGRES_PASSWORD: change-this-password
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 10
    restart: unless-stopped

  minio:
    image: minio/minio:RELEASE.2025-04-22T22-12-26Z
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: campaigncodex
      MINIO_ROOT_PASSWORD: change-this-minio-root-password
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio-data:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 10s
      timeout: 5s
      retries: 10
    restart: unless-stopped

  minio-init:
    image: minio/mc:RELEASE.2025-04-16T18-13-26Z
    depends_on:
      minio:
        condition: service_healthy
    environment:
      S3_BUCKET: campaigncodex
      S3_ACCESS_KEY: campaigncodex-app
      S3_SECRET_KEY: change-this-minio-secret
      MINIO_ROOT_USER: campaigncodex
      MINIO_ROOT_PASSWORD: change-this-minio-root-password
    entrypoint:
      - /bin/sh
      - -c
      - |
        mc alias set local http://minio:9000 "$$MINIO_ROOT_USER" "$$MINIO_ROOT_PASSWORD"
        mc mb --ignore-existing "local/$$S3_BUCKET"
        mc admin user add local "$$S3_ACCESS_KEY" "$$S3_SECRET_KEY" || true
        mc admin policy attach local readwrite --user "$$S3_ACCESS_KEY"

volumes:
  postgres-data:
  minio-data:
```

## License

CampaignCodex is licensed under the GNU Affero General Public License v3.0 only. See `LICENSE`.
