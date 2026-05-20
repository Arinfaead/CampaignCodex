# CampaignCodex

CampaignCodex ist ein kleines Open-Source-MVP für D&D Dungeon Master und Spielergruppen. Es bietet ein webbares Kampagnen-Wiki mit mehreren Kampagnen, DM-sichtbaren Bereichen und persönlichen Session-Notizen für Spieler.

## Funktionen

- Mehrere Kampagnen auf derselben Installation
- DM- und Spieleransichten
- Wiki-Abschnitte für Weltübersicht, Orte, NSCs, Fraktionen, Kreaturen, Artefakte, Plots, Lore und Regeln
- Privater DM-Bereich für Spielerakten und geheime Vorbereitungsnotizen
- Vorgefertigte Artikel-Templates für typische Worldbuilding-Einträge
- Session-Notizen pro Spieler
- PostgreSQL-Persistenz
- Docker- und Docker-Compose-Setup mit App- und Datenbankcontainer

## Lokal starten

Setze zuerst eine PostgreSQL-Datenbank auf und stelle `DATABASE_URL` bereit:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql://campaign_codex:campaign_codex@localhost:5432/campaign_codex
python3 app/server.py
```

Danach ist die App unter <http://localhost:8080> erreichbar.

## Mit Docker starten

```bash
docker compose up --build
```

Die Datenbank liegt im Docker-Volume `campaign-codex-postgres`.

## Projektstruktur

```text
app/server.py       Backend, REST API und PostgreSQL-Modell
static/index.html   Weboberfläche
static/styles.css   Styling
static/app.js       Frontend-Logik
Dockerfile          Container-Image
docker-compose.yml  Server-Deployment
requirements.txt    Python-Abhängigkeiten
```

## Nächste sinnvolle Ausbaustufen

- Login mit Passwort oder OAuth
- Einladungslinks für Spieler
- Markdown-Editor mit Vorschau
- Volltextsuche
- Dateianhänge und Bilder pro Kampagne
- Rechte pro Wiki-Seite und Charakter
- Export/Import für Kampagnen
