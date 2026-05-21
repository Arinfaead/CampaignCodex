# Changelog

## 1.1.0 - 2026-05-21

### Hinzugefügt

- Vollständiger Neuaufbau als Next.js-App-Router-Anwendung mit TypeScript strict mode.
- PostgreSQL-Datenmodell mit Drizzle ORM für Benutzer, Sessions, Kampagnen, Mitgliedschaften, Wiki-Seiten, Einladungen und Assets.
- SQL-Migrationssystem für self-hosted Deployments.
- MinIO/S3-kompatible Storage-Schicht für Uploads statt lokaler Dateien oder Datenbank-BLOBs.
- Docker Compose Stack mit App, PostgreSQL, MinIO und Bucket-Initialisierung.
- Admin-Start ohne lokale Node.js- oder npm-Installation; Docker installiert App-Abhängigkeiten im Container.
- Standalone-Compose-Betrieb ohne `git clone`; Admins legen nur `.env` und `docker-compose.yml` an und starten Docker Compose.
- Anpassbare Docker-Compose-Werte wurden in eine `.env` ausgelagert.
- Serverseitige Authentifizierung mit scrypt-Passwort-Hashes und gehashten Session-Tokens.
- Rollen- und Sichtbarkeitsmodell für Owner, GM, Player und Viewer.
- Sichere Markdown-Verarbeitung mit serverseitiger HTML-Sanitization.
- Release-Dokumentation für Version 1.1.
- Stabilerer Docker-Image-Publish fuer GitHub Actions, inklusive robuster `public/`-Behandlung im Dockerfile.
- CI-Lint-Konfiguration ignoriert generierte Next.js-Typdateien.

### Geändert

- Das bisherige Flask/Static-Projekt wurde durch die Zielarchitektur Next.js + PostgreSQL + Drizzle + MinIO ersetzt.
- Die Startanleitung ist jetzt konsequent auf `.env`, `docker-compose.yml` und `docker compose up -d` ausgerichtet.
- Docker Image Publishing referenziert die neue App-Architektur.

### Sicherheit

- Serverseitige Berechtigungsprüfungen schützen Wiki-Seiten, Einladungen und Asset-Zugriff.
- Uploads werden über eine S3-Abstraktion gespeichert und über eine autorisierte Route ausgeliefert.
- Standardkonfiguration dokumentiert Secret-Rotation und HTTPS-Cookie-Betrieb.
