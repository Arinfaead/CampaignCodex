# CampaignCodex 1.1

Release 1.1 ist ein architektureller Neustart von CampaignCodex als self-hosted Fullstack-Webapp.

## Enthaltene Änderungen

- Neues Next.js-App-Router-Projekt mit TypeScript strict mode.
- PostgreSQL als primäre Datenbank.
- Drizzle ORM Schema für Benutzer, Sessions, Kampagnen, Rollen, Seiten, Einladungen und Assets.
- Auditierbare SQL-Migration `0001_initial`.
- MinIO als S3-kompatibler Objektspeicher.
- Docker Compose Stack für App, PostgreSQL, MinIO und Bucket/User-Initialisierung.
- Admin-Start ohne lokale Node.js- oder npm-Installation; Docker installiert App-Abhängigkeiten im Container.
- Standalone-Installation über eine kopierte `docker-compose.yml` ohne `git clone`.
- Authentifizierung mit scrypt-Passwort-Hashing und HttpOnly-Session-Cookies.
- Kampagnen-Wiki mit Markdown-Speicherung und serverseitig sanitisiertem HTML-Rendering.
- Rollenmodell: Owner, GM, Player, Viewer.
- Sichtbarkeitsmodell: Public, Campaign, GM-only, Private.
- Einladungslinks für Kampagnenmitglieder.
- Asset-Upload und autorisierte Asset-Auslieferung über die Webapp.
- Aktualisierte Dokumentation, `.env.example`, Dockerfile und GitHub Workflows.
- Stabilisiertes Docker-Image-Publishing in GitHub Actions mit robuster `public/`-Behandlung.
- CI-Lint-Konfiguration ignoriert generierte Next.js-Typdateien.

## Upgrade-Hinweis

Die vorherige Implementierung nutzte eine kleine Flask/Static-Struktur. Release 1.1 ersetzt diese Struktur durch den Zielstack. Bestehende SQLite- oder lokale Dateidaten werden nicht automatisch migriert.

## Betrieb

```bash
nano docker-compose.yml
docker compose up -d
```

Die Compose-Datei kann direkt aus der README kopiert werden. Danach ist CampaignCodex unter `http://localhost:8080` erreichbar.
