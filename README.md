# CampaignCodex

CampaignCodex ist ein kleines Open-Source-MVP für D&D Dungeon Master und Spielergruppen. Es bietet ein webbasiertes Kampagnen-Wiki mit mehreren Kampagnen, DM-sichtbaren Bereichen und persönlichen Session-Notizen für Spieler.

## Funktionen

- Mehrere Kampagnen auf derselben Installation
- Lokale Userverwaltung mit Admin-, DM- und Spielergruppen
- Optionaler OAuth2/OIDC-Login, z. B. mit Authentik
- Einladungslinks für Kampagnen
- DM- und Spieleransichten mit Seitenrechten
- Wiki-Abschnitte für Weltübersicht, Orte, NSCs, Fraktionen, Kreaturen, Artefakte, Plots, Lore und Regeln
- Privater DM-Bereich für Spielerakten und geheime Vorbereitungsnotizen
- Vorgefertigte Artikel-Templates für typische Worldbuilding-Einträge
- Markdown-Editor mit Vorschau
- Berechtigungsgebundene Volltextsuche
- Dateianhänge und Bilder pro Seite oder Session-Notiz
- Export und Import ganzer Kampagnen
- PostgreSQL-Persistenz
- Docker-Compose-Setup mit fertigem App-Image und PostgreSQL-Datenbank

## Starten

Du brauchst nur Docker und Docker Compose. Python muss auf dem Server nicht installiert sein.

```bash
docker compose up -d
```

Danach ist die App unter <http://localhost:8080> erreichbar.

## Erste Einrichtung

Beim allerersten Start zeigt CampaignCodex eine Einrichtungsseite. Dort erstellst du den ersten Admin-Account direkt in der Weboberfläche und entscheidest, ob CampaignCodex mit der Beispielkampagne „Die Splitterkrone“ oder ohne Beispielkampagne starten soll. Es müssen keine Benutzer oder Passwörter in der `.env` hinterlegt werden.

Danach ist die freie Registrierung deaktiviert. Neue Benutzer werden von Admins lokal angelegt, per OAuth angemeldet oder über Einladungslinks in Kampagnen aufgenommen.

## Port und Einstellungen anpassen

Die Compose-Datei hat sinnvolle Defaults. Optional kannst du eine `.env` anlegen:

```bash
cp .env.example .env
```

Wichtige Variablen:

```env
APP_PORT=8080
CAMPAIGN_CODEX_IMAGE=ghcr.io/arinfaead/campaigncodex:latest
PUBLIC_URL=http://localhost:8080
COOKIE_SECURE=false

POSTGRES_DB=campaign_codex
POSTGRES_USER=campaign_codex
POSTGRES_PASSWORD=change-this-password
```

Wenn `APP_PORT=3000` gesetzt ist, ist die App unter <http://localhost:3000> erreichbar.

Die PostgreSQL-Datenbank liegt im Docker-Volume `campaign-codex-postgres`.

## Lokale Userverwaltung

Der erste Admin wird über die Einrichtungsseite erstellt. Danach können Admins in den Einstellungen weitere lokale User erstellen. Eine öffentliche Selbstregistrierung gibt es nicht.

Rollen:

- `Admin`: darf User erstellen, Kampagnen importieren/exportieren und alle Kampagnen sowie Inhalte systemweit einsehen und verwalten.
- `DM`: darf eigene Kampagnen verwalten, Einladungen erstellen, Mitglieder hinzufügen und DM-Bereiche sehen.
- `Spieler`: darf nur Kampagnen sehen, in denen er Mitglied ist, eigene Seiten/Notizen erstellen und Sichtbarkeit für eigene Seiten einschränken.

## OAuth2/OIDC mit Authentik

CampaignCodex kann zusätzlich lokale Accounts mit OAuth2/OIDC-Logins verbinden. Getestet ist die Struktur gegen Authentiks OAuth2/OpenID-Provider-Endpunkte. Authentik dokumentiert die relevanten Endpunkte als `/application/o/authorize/`, `/application/o/token/` und `/application/o/userinfo/` in der offiziellen Dokumentation: <https://docs.goauthentik.io/add-secure-apps/providers/oauth2/>.

### In Authentik einrichten

1. Öffne Authentik als Admin.
2. Gehe zu `Applications` und erstelle eine neue Application mit Provider.
3. Wähle als Provider-Typ `OAuth2/OpenID Provider`.
4. Setze einen Namen, z. B. `CampaignCodex`.
5. Setze als Redirect URI:

```text
https://deine-campaigncodex-domain.example/api/auth/oauth/callback
```

Für lokale Tests:

```text
http://localhost:8080/api/auth/oauth/callback
```

6. Notiere `Client ID` und `Client Secret`.
7. Stelle sicher, dass die Scopes `openid`, `email`, `profile` und optional `groups` verfügbar sind.
8. Lege optional Gruppen in Authentik an:
   - `CampaignCodex Admins`
   - `CampaignCodex DMs`

CampaignCodex ordnet User automatisch zu:

- Mitglied in `CampaignCodex Admins` wird `Admin`.
- Mitglied in `CampaignCodex DMs` wird `DM`.
- Alle anderen OAuth-User werden `Spieler`.

### In CampaignCodex einstellen

Trage in deiner `.env` die Werte ein:

```env
PUBLIC_URL=https://deine-campaigncodex-domain.example
COOKIE_SECURE=true

OIDC_ISSUER=https://authentik.example
OIDC_CLIENT_ID=deine-client-id
OIDC_CLIENT_SECRET=dein-client-secret
OIDC_REDIRECT_URI=https://deine-campaigncodex-domain.example/api/auth/oauth/callback
OIDC_ADMIN_GROUP=CampaignCodex Admins
OIDC_DM_GROUP=CampaignCodex DMs
```

Danach neu starten:

```bash
docker compose up -d
```

Wenn diese Variablen gesetzt sind, erscheint auf der Login-Seite der OAuth-Button.

## Einladungslinks

DMs und Admins können in den Einstellungen Einladungslinks erstellen. Optional kann eine E-Mail-Adresse hinterlegt werden. Ist eine E-Mail gesetzt, kann nur ein eingeloggter Account mit genau dieser E-Mail die Einladung annehmen.

Der Ablauf ist:

1. User erstellt lokalen Account oder meldet sich per OAuth an.
2. User öffnet den Einladungslink.
3. User bestätigt die Einladung.
4. CampaignCodex fügt den User automatisch mit der ausgewählten Rolle zur Kampagne hinzu.

## Seitenrechte

Wiki-Seiten unterstützen mehrere Sichtbarkeiten:

- `Alle Kampagnenmitglieder`: alle Mitglieder der Kampagne können lesen.
- `Nur ausgewählte Spieler`: nur ausgewählte Spieler plus DMs/Admins können lesen.
- `Nur ich und DMs`: Besitzer, DMs und Admins können lesen.
- `Nur DMs`: nur DMs und Admins können lesen.

Spieler können eigene Seiten erstellen und deren Sichtbarkeit einschränken. DMs und Admins können alle Seiten der Kampagne verwalten.
Admins können unabhängig von Kampagnenmitgliedschaften alle Kampagnen und Inhalte einsehen. DMs und Spieler sehen nur Kampagnen, in denen sie Mitglied sind.

## Markdown, Anhänge und Suche

Wiki-Seiten und Session-Notizen werden als Markdown geschrieben. Der Editor zeigt rechts eine Live-Vorschau. Dateianhänge und Bilder können beim Speichern einer Seite oder Notiz hinzugefügt werden.

Die Suchleiste durchsucht Wiki-Seiten und Notizen, zeigt aber nur Ergebnisse an, die der eingeloggte User lesen darf.

## Export / Import

DMs und Admins können Kampagnen in den Einstellungen als JSON exportieren und später wieder importieren. Exportiert werden Kampagne, Wiki-Seiten, Notizen, Mitgliedschaften und Anhänge.

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
