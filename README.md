# CampaignCodex

CampaignCodex ist ein kleines Open-Source-MVP für D&D Dungeon Master und Spielergruppen. Es bietet ein webbasiertes Kampagnen-Wiki mit mehreren Kampagnen, DM-sichtbaren Bereichen und persönlichen Session-Notizen für Spieler.

## Funktionen

- Mehrere Kampagnen auf derselben Installation
- DM- und Spieleransichten
- Wiki-Abschnitte für Weltübersicht, Orte, NSCs, Fraktionen, Kreaturen, Artefakte, Plots, Lore und Regeln
- Privater DM-Bereich für Spielerakten und geheime Vorbereitungsnotizen
- Vorgefertigte Artikel-Templates für typische Worldbuilding-Einträge
- Session-Notizen pro Spieler
- PostgreSQL-Persistenz
- Docker-Compose-Setup mit fertigem App-Image und PostgreSQL-Datenbank

## Starten

Du brauchst nur Docker und Docker Compose. Python muss auf dem Server nicht installiert sein.

```bash
docker compose up -d
```

Danach ist die App unter <http://localhost:8080> erreichbar.

## Port und Passwort anpassen

Die Compose-Datei hat sinnvolle Defaults. Optional kannst du eine `.env` anlegen:

```bash
cp .env.example .env
```

Wichtige Variablen:

```env
APP_PORT=8080
CAMPAIGN_CODEX_IMAGE=ghcr.io/arinfaead/campaigncodex:latest
POSTGRES_DB=campaign_codex
POSTGRES_USER=campaign_codex
POSTGRES_PASSWORD=change-this-password
```

Wenn `APP_PORT=3000` gesetzt ist, ist die App unter <http://localhost:3000> erreichbar.

Die PostgreSQL-Datenbank liegt im Docker-Volume `campaign-codex-postgres`.

## Image

Das App-Image wird automatisch über GitHub Actions gebaut und in der GitHub Container Registry veröffentlicht:

```text
ghcr.io/arinfaead/campaigncodex:latest
```

Für normale Installation reicht die [docker-compose.yml](docker-compose.yml). Der Quellcode und das `Dockerfile` werden nur benötigt, wenn du selbst ein Image bauen oder entwickeln möchtest.

## Projektstruktur

```text
app/server.py       Backend, REST API und PostgreSQL-Modell
static/index.html   Weboberfläche
static/styles.css   Styling
static/app.js       Frontend-Logik
Dockerfile          Container-Image
docker-compose.yml  Server-Deployment
requirements.txt    Python-Abhängigkeiten
.github/workflows   Automatischer Image-Build für GHCR
```

## Nächste sinnvolle Ausbaustufen

- Login mit Passwort oder OAuth
- Einladungslinks für Spieler
- Markdown-Editor mit Vorschau
- Volltextsuche
- Dateianhänge und Bilder pro Kampagne
- Rechte pro Wiki-Seite und Charakter
- Export/Import für Kampagnen
