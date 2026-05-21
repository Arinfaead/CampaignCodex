# CampaignCodex

CampaignCodex ist eine Webanwendung zur Verwaltung, Dokumentation und kollaborativen Ausarbeitung von Kampagnen. Der erste Sprint legt das technische Fundament: lokale E-Mail/Passwort-Authentifizierung, serverseitige Sessions, PostgreSQL mit Drizzle ORM, Kampagnenerstellung und ein zentrales Rollen- und Berechtigungssystem.

## Stack

- Next.js App Router mit TypeScript
- PostgreSQL
- Drizzle ORM
- Lokale Authentifizierung mit gehashten Passwoertern
- Serverseitige Session-Cookies
- Zod fuer zentrale Eingabevalidierung
- MinIO/S3-kompatibler Speicher ist fuer vorhandene Asset-Funktionen angebunden

## Setup

```bash
cp .env.example .env
# Platzhalter-Secrets in .env anpassen
docker compose up -d
```

Die App laeuft standardmaessig unter `http://localhost:8080`. MinIOs Konsole ist unter `http://localhost:9001` erreichbar.

Fuer lokale Entwicklung ausserhalb von Docker:

```bash
npm install
npm run db:migrate
npm run dev
```

## Umgebungsvariablen

Wichtige Werte aus `.env.example`:

- `DATABASE_URL`: PostgreSQL-Verbindung der App.
- `SESSION_SECRET`: Secret fuer Hashing der Session-Tokens. In echten Umgebungen lang und zufaellig setzen.
- `COOKIE_SECURE`: In HTTPS-Umgebungen auf `true` setzen.
- `ALLOW_REGISTRATION`: Steuert offene Registrierung nach dem ersten Admin-Account.
- `PUBLIC_URL`: Externe Basis-URL, unter anderem fuer Einladungslinks.
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`: S3/MinIO-Konfiguration.
- `OAUTH_GOOGLE_CLIENT_ID`, `OAUTH_GOOGLE_CLIENT_SECRET`, `OAUTH_GITHUB_CLIENT_ID`, `OAUTH_GITHUB_CLIENT_SECRET`: Platzhalter fuer spaetere OAuth-Anbindung.

`.env` wird nicht versioniert. Nur `.env.example` gehoert ins Repository.

## Datenbank

Migrationen liegen als auditierbare SQL-Dateien in `migrations/`.

```bash
npm run db:migrate
```

Das aktuelle Fundament enthaelt unter anderem:

- `users` mit `email`, `password_hash`, `display_name`, `role`
- `sessions` mit eigener `id`, gehashtem Token, Ablaufzeit und Nutzerbezug
- `campaigns` mit `created_by_user_id`, `visibility`, Name und Beschreibung
- `campaign_members` mit eigener `id`, Kampagnen-/Nutzerbezug und Kampagnenrolle
- `oauth_accounts` als vorbereitete Struktur fuer spaetere OAuth-Provider

## Rollenmodell

Instanzrollen:

- `instance_admin`: darf administrative Aktionen auf Instanzebene ausfuehren.
- `user`: normaler angemeldeter Nutzer.

Kampagnenrollen:

- `campaign_admin`: darf die eigene Kampagne administrieren.
- `member`: darf als berechtigtes Mitglied Kampagneninhalte sehen und vorbereitete Inhalte bearbeiten.
- `viewer`: darf berechtigte Kampagneninhalte lesen.

Jeder angemeldete Nutzer darf eine eigene Kampagne erstellen. Der Ersteller wird automatisch als `campaign_admin` in `campaign_members` eingetragen. Private Kampagnen werden nur ueber serverseitig gepruefte Mitgliedschaften angezeigt.

## Sicherheitsentscheidungen

- Passwoerter werden nie im Klartext gespeichert, sondern per `scrypt` mit Salt gehasht.
- Session-Tokens werden nur gehasht in PostgreSQL gespeichert.
- Session-Cookies sind `httpOnly`, `sameSite=lax` und koennen per `COOKIE_SECURE=true` auf HTTPS-only gesetzt werden.
- Geschuetzte Seiten nutzen serverseitige Guards wie `requireUser()`, `requireCampaignAccess()` und `requireCampaignAdmin()`.
- Rollenpruefungen liegen zentral in `src/lib/permissions.ts` und `src/lib/campaign-access.ts`.
- Eingaben fuer Registrierung, Login, Kampagnenerstellung und weitere Server Actions werden mit Zod validiert.
- Datenbankzugriffe laufen ueber Drizzle und parametrisierte Queries.
- Fehlermeldungen an Nutzer bleiben bewusst allgemein und geben keine internen Details preis.

## Wichtige Pfade

- `src/db/schema.ts`: Drizzle-Schema.
- `migrations/`: SQL-Migrationen.
- `src/lib/auth.ts`: Session- und Nutzer-Guards.
- `src/lib/campaign-access.ts`: Kampagnenzugriff und Kampagnen-Admin-Guards.
- `src/lib/permissions.ts`: Rollen- und Sichtbarkeitsregeln.
- `src/lib/validation.ts`: Zentrale Zod-Schemas.
- `src/app/dashboard/page.tsx`: Geschuetztes Dashboard.
- `src/app/campaigns/page.tsx`: Geschuetzte Kampagnenliste.
- `src/app/campaigns/new/page.tsx`: Kampagnenerstellung.

## Qualitaetssicherung

Ausgefuehrte Checks:

```bash
tsc --noEmit
eslint .
```

Manuelle Pruefungen nach Datenbankstart:

1. Ersten Nutzer registrieren und pruefen, dass er `instance_admin` wird.
2. Zweiten Nutzer registrieren und pruefen, dass er `user` wird.
3. Als eingeloggter Nutzer eine Kampagne erstellen.
4. In der Datenbank pruefen, dass der Ersteller `campaign_admin` in `campaign_members` ist.
5. Ausloggen und pruefen, dass `/dashboard`, `/campaigns`, `/campaigns/new` und Kampagnendetails nicht erreichbar sind.
6. Als anderer Nutzer pruefen, dass private Kampagnen ohne Mitgliedschaft nicht sichtbar sind.

Der Produktionsbuild kann in dieser Codex-Shell blockieren, wenn Next.js ein macOS-SWC-Paket nachladen moechte und kein `npm` im Shell-Pfad verfuegbar ist. In einer normalen Node/npm-Umgebung sollte `npm run build` nach Installation der optionalen Next-SWC-Abhaengigkeiten ausgefuehrt werden.

## Lizenz

CampaignCodex ist unter der GNU Affero General Public License v3.0 only lizenziert. Siehe `LICENSE`.
