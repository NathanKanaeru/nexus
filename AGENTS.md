# Agent Instructions for Nexus Panel

## Commands

- **Start the panel**: `npm start`
- **No test, lint, or typecheck scripts** are defined in this repository.

## Environment Setup

1. Copy `.env.example` to `.env` and populate all required values:
   ```env
   TOKEN=your_discord_bot_token_here
   CLIENT_ID=your_application_id_here
   GUILD_ID=your_server_id_here
   CHANNEL_ID=default_voice_channel_id_here
   PANEL_PORT=3000
   PANEL_USERNAME=admin
   PANEL_PASSWORD=changeme123
   API_KEY=your-secret-api-key-here
   SESSION_SECRET=your-random-session-secret-here
   QASIMDEV_API_KEY=your-qasimdev-api-key-here
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Key Architecture Notes

- **Single-entrypoint**: All bot logic, Express server, Socket.IO handlers, and auth middleware are consolidated in `main.js`.
- **Frontend**: Single-page app (`public/index.html`) using Tailwind CSS and Lucide Icons.
- **Storage**: Local JSON files (`chats.json`, `settings.json`) for persistence. These are auto-generated and excluded from Git.
- **Auth**: Session-based (cookie, 8-hour expiry) + API key (`x-api-key` header) for REST endpoints.
- **Real-time**: Socket.IO powers live updates (dashboard, voice control, DMs, logs).

## Socket.IO Events

### Client → Server
- `bot_action`: `{ action }` (e.g., `connect`, `disconnect`, `reconnect`, `move_bot`)
- `member_action`: `{ userId, action, targetChannelId? }` (e.g., `mute`, `deafen`, `kick`, `move`)
- `bulk_action`: `{ action }` (e.g., `mute_all`, `unmute_all`, `deafen_all`, `undeafen_all`, `kick_all`)
- `send_dm`: `{ userId, message, replyTo? }`
- `save_settings`: `{ ...settingsFields }`

### Server → Client
- `dashboard_update`: Full dashboard refresh
- `activity_log`: New log entry
- `dm_received`: Incoming DM
- `settings_data`: Current settings + bot info

## Critical Constraints

- **Never commit `.env`, `chats.json`, or `settings.json`** (all are `.gitignore`d).
- **Session + API key required** for all REST endpoints and Socket.IO connections.
- **Rate-limited login**: 10 attempts/IP/minute.
- **Privileged Gateway Intents** required in Discord Developer Portal:
  - `Server Members Intent`
  - `Presence Intent`
  - `Message Content Intent`

## Testing Quirks

- No automated test suite exists. Verify changes manually via:
  1. Panel UI interactions (voice control, DMs, announcements).
  2. Socket.IO event flows (check browser console for errors).
  3. REST API endpoints (e.g., `/api/dashboard`).

## Style Conventions

- **Frontend**: Tailwind CSS classes (no custom CSS files).
- **Backend**: Vanilla JavaScript (no TypeScript).
- **Icons**: Lucide icon set (loaded via CDN).