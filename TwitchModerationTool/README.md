# German Slot Ban List - Twitch Bot & Stream Overlay

Ein minimales Stream-Overlay für Streamlabs OBS mit automatischem Twitch-Bot für deutsche Slot-Requests mit 10-Tage-Ban-System.

## Features

- **Stream Overlay** (`/`) - Minimales Overlay für OBS
- **Admin Panel** (`/admin`) - Vollständige Verwaltung
- **Twitch Bot Integration** - Automatische Chat-Befehle
- **10-Tage Auto-Expiration** - Bans laufen automatisch ab
- **Real-time Updates** - Live WebSocket Updates
- **Deutsche Oberfläche** - Vollständig auf Deutsch

## Chat Befehle

- `!ban [slot-name]` - Slot für 10 Tage bannen (alle User)
- `!banlist` - Aktuelle Ban-Liste im Chat anzeigen
- `!unban [slot-name]` - Slot entbannen (nur Moderatoren)

## Setup für Deployment

### 1. Twitch Bot Setup

1. Gehe zu [Twitch Developers Console](https://dev.twitch.tv/console)
2. Erstelle eine neue Anwendung
3. Notiere dir die **Client ID**
4. Generiere einen **OAuth Token** auf [twitchapps.com/tmi](https://twitchapps.com/tmi/)

### 2. Environment Variables

Für den Twitch Bot benötigst du folgende Umgebungsvariablen:

```env
TWITCH_BOT_USERNAME=dein_bot_username
TWITCH_BOT_TOKEN=oauth:dein_oauth_token
TWITCH_CHANNEL=dein_channel_name
```

### 3. Render.com Deployment

1. **Repository vorbereiten**:
   - Pushe den Code zu GitHub
   - Stelle sicher, dass alle Dateien committed sind

2. **Render Service erstellen**:
   - Gehe zu [render.com](https://render.com)
   - Erstelle einen neuen "Web Service"
   - Verbinde dein GitHub Repository

3. **Build & Start Commands**:
   ```
   Build Command: npm install
   Start Command: npm run dev
   ```

4. **Environment Variables in Render setzen**:
   - `TWITCH_BOT_USERNAME` = Dein Bot Username
   - `TWITCH_BOT_TOKEN` = oauth:dein_oauth_token (mit "oauth:" Prefix!)
   - `TWITCH_CHANNEL` = Dein Twitch Channel Name (ohne #)
   - `NODE_ENV` = production

### 4. OBS Integration

1. **Browser Source hinzufügen**:
   - Füge eine neue "Browser Source" in OBS hinzu
   - URL: `https://deine-render-url.onrender.com/`
   - Breite: 400px
   - Höhe: 600px

2. **CSS für transparenten Hintergrund** (optional):
   ```css
   body { 
     background: transparent !important; 
   }
   ```

## Lokale Entwicklung

```bash
# Dependencies installieren
npm install

# Development Server starten
npm run dev

# Läuft auf http://localhost:5000
```

## API Endpoints

- `GET /api/banned-slots` - Alle gebannten Slots
- `GET /api/status` - App Status (Bot-Verbindung, etc.)
- `POST /api/ban-slot` - Manuell bannen
- `DELETE /api/ban-slot/:id` - Ban entfernen
- `POST /api/toggle-requests` - Anfragen öffnen/schließen

## WebSocket Events

- `BAN_ADDED` - Neuer Ban hinzugefügt
- `BAN_REMOVED` - Ban entfernt
- `BAN_EXPIRED` - Bans automatisch abgelaufen
- `STATUS_CHANGED` - Request-Status geändert
- `BOT_STATUS` - Bot-Verbindungsstatus

## Technische Details

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Express.js + TypeScript
- **Storage**: In-Memory (für einfaches Deployment)
- **Real-time**: WebSockets
- **Twitch API**: tmi.js

## Troubleshooting

### Bot verbindet sich nicht
- Überprüfe TWITCH_BOT_TOKEN (muss mit "oauth:" beginnen)
- Überprüfe TWITCH_CHANNEL (ohne # Symbol)
- Bot-Account muss im Channel anwesend sein

### Overlay lädt nicht
- Browser-Cache leeren
- URL in OBS überprüfen
- Console-Logs in OBS Browser Source überprüfen

### Bans werden nicht gespeichert
- Render-Service neu starten (In-Memory Storage)
- Für persistente Speicherung: PostgreSQL-Integration erforderlich