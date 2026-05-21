# CampaignCodex

CampaignCodex is a self-hosted open-source web app for pen-and-paper groups. Dungeon Masters and players can maintain campaign wikis, store lore as Markdown, invite members, and control access through campaign roles and page visibility.

The project is built for local and self-hosted operation:

```bash
nano .env
nano docker-compose.yml
docker compose up -d
```

Paste the `.env` and `docker-compose.yml` from this repository into those files. No `git clone`, local Node.js, npm, or build step is required for operators. Docker Compose pulls the published CampaignCodex image and runs database migrations, PostgreSQL, and MinIO inside containers.

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

`docker compose up -d` works with only the copied `.env` and `docker-compose.yml` files. Before exposing an instance beyond a local machine, edit the placeholder secrets in `.env`. Important settings:

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

## Standalone Setup

Create `.env`, paste the following content, and adjust the placeholder secrets when needed.

```env
# CampaignCodex image
CAMPAIGNCODEX_IMAGE=ghcr.io/arinfaead/campaigncodex:v1.1.0
CAMPAIGNCODEX_PLATFORM=linux/amd64

# Web app
APP_PORT=8080
PORT=3000
PUBLIC_URL=http://localhost:8080
COOKIE_SECURE=false
ALLOW_REGISTRATION=true
SESSION_SECRET=change-this-to-a-long-random-secret

# PostgreSQL
POSTGRES_IMAGE=postgres:16-alpine
POSTGRES_DB=campaign_codex
POSTGRES_USER=campaign_codex
POSTGRES_PASSWORD=change-this-password

# MinIO
MINIO_IMAGE=minio/minio:RELEASE.2025-04-22T22-12-26Z
MINIO_MC_IMAGE=minio/mc:RELEASE.2025-04-16T18-13-26Z
MINIO_API_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_ROOT_USER=campaigncodex
MINIO_ROOT_PASSWORD=change-this-minio-root-password

# S3-compatible app storage
S3_ENDPOINT=http://minio:9000
S3_REGION=us-east-1
S3_BUCKET=campaigncodex
S3_ACCESS_KEY=campaigncodex-app
S3_SECRET_KEY=change-this-minio-secret
S3_FORCE_PATH_STYLE=true
```

Create `docker-compose.yml`, paste the following content, save, and run `docker compose up -d`.

```yaml
services:
  app:
    image: ${CAMPAIGNCODEX_IMAGE}
    platform: ${CAMPAIGNCODEX_PLATFORM}
    environment:
      DATABASE_URL: postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      SESSION_SECRET: ${SESSION_SECRET}
      PUBLIC_URL: ${PUBLIC_URL}
      COOKIE_SECURE: ${COOKIE_SECURE}
      ALLOW_REGISTRATION: ${ALLOW_REGISTRATION}
      S3_ENDPOINT: ${S3_ENDPOINT}
      S3_REGION: ${S3_REGION}
      S3_BUCKET: ${S3_BUCKET}
      S3_ACCESS_KEY: ${S3_ACCESS_KEY}
      S3_SECRET_KEY: ${S3_SECRET_KEY}
      S3_FORCE_PATH_STYLE: ${S3_FORCE_PATH_STYLE}
      PORT: ${PORT}
    ports:
      - "${APP_PORT}:${PORT}"
    depends_on:
      postgres:
        condition: service_healthy
      minio:
        condition: service_healthy
      minio-init:
        condition: service_completed_successfully
    restart: unless-stopped

  postgres:
    image: ${POSTGRES_IMAGE}
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 10
    restart: unless-stopped

  minio:
    image: ${MINIO_IMAGE}
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    ports:
      - "${MINIO_API_PORT}:9000"
      - "${MINIO_CONSOLE_PORT}:9001"
    volumes:
      - minio-data:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 10s
      timeout: 5s
      retries: 10
    restart: unless-stopped

  minio-init:
    image: ${MINIO_MC_IMAGE}
    depends_on:
      minio:
        condition: service_healthy
    environment:
      S3_BUCKET: ${S3_BUCKET}
      S3_ACCESS_KEY: ${S3_ACCESS_KEY}
      S3_SECRET_KEY: ${S3_SECRET_KEY}
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
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
