# XO Arena API

For commercial production, this API also serves the React build from `wwwroot` on the same Azure App Service. See the repository [Azure deployment guide](../../docs/AZURE_DEPLOYMENT.md).

Initial ASP.NET Core backend for XO Arena. It runs separately from the Vite frontend and does not include database, authentication, or full room management yet.

## Run

```powershell
dotnet restore server/XoArena.Api
dotnet build server/XoArena.Api
dotnet run --project server/XoArena.Api
```

To run the API on the local URL expected by the frontend:

```powershell
dotnet run --project .\server\XoArena.Api --urls http://localhost:5243
```

The local HTTP URL from `Properties/launchSettings.json` is:

```text
http://localhost:5243
```

## Hosting Hazirligi

This branch prepares the API for hosting, but does not deploy it.

### Local calistirma

```powershell
dotnet run --project .\server\XoArena.Api --urls http://localhost:5243
```

### Health check

```text
GET /health
```

The response is production-safe and returns service status, service name, environment name, and a UTC timestamp. It does not return secrets, connection strings, stack traces, room data, or host internals.

### Frontend env

The single App Service frontend uses same-origin requests. Build it with an empty `VITE_API_BASE_URL` and Online enabled:

```env
VITE_API_BASE_URL=
VITE_ENABLE_ONLINE=true
```

For local development, `.env.example` stays:

```env
VITE_API_BASE_URL=http://localhost:5243
VITE_ENABLE_ONLINE=true
```

Do not commit a real `.env` file.

### CORS

Allowed frontend origins are configured in `Cors:AllowedOrigins`.

Same-origin App Service hosting does not need CORS configuration. If a future separate frontend is used, configure only its origin through the App Service setting `Cors__AllowedOrigins__0`:

```text
https://YOUR_SEPARATE_FRONTEND.example.com
```

Origins do not include paths, so do not add `https://rabiaunllu.github.io/react-tic-tac-toe`. Do not use wildcard CORS for production.

### Runtime host and port

ASP.NET Core hosting providers commonly set the listening address through `ASPNETCORE_URLS`, for example:

```text
ASPNETCORE_URLS=http://0.0.0.0:${PORT}
```

Some providers expose only `PORT`; in that case configure the provider start command or environment so Kestrel binds to that port. Locally, `--urls http://localhost:5243` is enough.

Production enables both `UseHttpsRedirection` and HSTS. Keep HTTPS-only enforcement enabled at the hosting/provider layer as well, and terminate TLS with a valid certificate there so browser and WebSocket traffic use HTTPS/WSS end to end.

`AllowedHosts` is still provider-dependent because the backend hostname is not selected in this branch. Before the first live deploy, set it to the deployed backend host through production configuration or the hosting provider environment instead of guessing a hostname in source.

### In-memory room store

Rooms are stored in memory. If the backend restarts, active rooms are lost. For multiple instances, scale-out, or long-lived rooms, replace the in-memory store with Redis or a database-backed store.

For the first commercial MVP, use:

- Single backend instance.
- Open health check.
- CORS restricted to the frontend origin.
- No secrets or API keys in source.
- No connection strings in source.

### Deployment target notlari

Render or Railway are fast for demos and simple deploys, but free tiers may sleep or hit quotas.

Azure App Service is a professional fit for .NET hosting, but cost and credit usage should be watched.

No provider-specific config file is committed in this branch.

### Ilk deploy oncesi manual checklist

- Pick the hosting provider and backend URL.
- Set `ASPNETCORE_ENVIRONMENT=Production`.
- Set `ASPNETCORE_URLS` or provider start command so the API binds to the provider port.
- Restrict `AllowedHosts` to the deployed backend host when the host is known.
- For same-origin hosting, leave `Cors__AllowedOrigins__0` unset; for a separate frontend, set it to that exact origin with no wildcard.
- Verify `GET /health` returns 200 from the public backend URL.
- Build the frontend with `VITE_API_BASE_URL=https://YOUR_BACKEND_URL` and `VITE_ENABLE_ONLINE=true`.
- Confirm no `.env`, secrets, API keys, or connection strings are committed.

## Frontend API URL

The Vite frontend reads the backend URL from `VITE_API_BASE_URL`.

For local development, create a local `.env` file in the repository root:

```env
VITE_API_BASE_URL=http://localhost:5243
VITE_ENABLE_ONLINE=true
```

The committed `.env.example` documents the same values. Do not commit `.env` or other secret-bearing environment files. In development, if `.env` is absent, the frontend can fall back to `http://localhost:5243` and keep Online enabled for local testing.

When the GitHub Pages frontend should call a live backend, set `VITE_ENABLE_ONLINE=true` and `VITE_API_BASE_URL` during the frontend build to the deployed backend origin, for example:

```env
VITE_API_BASE_URL=https://api.example.com
VITE_ENABLE_ONLINE=true
```

For the single App Service production build, an empty `VITE_API_BASE_URL` means same-origin API calls and Online remains available when `VITE_ENABLE_ONLINE=true`.

## CORS

Allowed frontend origins are configured in `Cors:AllowedOrigins`.

Local Vite uses:

```text
http://localhost:5173
```

A future separate frontend origin is configured through the App Service setting `Cors__AllowedOrigins__0`:

```text
https://YOUR_SEPARATE_FRONTEND.example.com
```

CORS origins do not include URL paths. `Program.cs` reads allowed origins from configuration; localhost values are defined only in `appsettings.Development.json`.

Health check:

```text
GET /health
```

Expected response:

```json
{
  "status": "ok",
  "service": "xo-arena-api",
  "environment": "Development",
  "utc": "2026-08-07T09:00:00.0000000+00:00"
}
```

SignalR rooms hub:

```text
/hubs/rooms
```

Create an in-memory room:

```text
POST /api/rooms
```

```json
{
  "playerName": "Rabia",
  "boardSize": 3,
  "winLength": 3,
  "gameMode": "classic",
  "targetValue": 5
}
```

Fetch an in-memory room:

```text
GET /api/rooms/{roomCode}
```

Room responses include the current game state with `squares`, `xIsNext`, `scores`, `roundNumber`, `winner`, `isDraw`, and `winningLine`.

Creating or joining a room returns `{ room, playerSecret }`. Store `playerSecret` only in browser `sessionStorage`; it is never included in subsequent room reads or broadcasts. Every state-changing request must include both the public `playerId` and that secret.

Join an in-memory room:

```text
POST /api/rooms/{roomCode}/join
```

```json
{
  "playerName": "Mert"
}
```

Play a move:

```text
POST /api/rooms/{roomCode}/moves
```

```json
{
  "playerId": "46ece7a1f7714a0fbe114bec814b18b9",
  "playerSecret": "issued-secret-from-create-or-join-response",
  "index": 4
}
```

Arena room responses also include public multipliers, shields, boosts, and per-player remaining power counts. Black Hole positions stay server-only and are never included in room responses.

Use an Online Arena power:

```text
POST /api/rooms/{roomCode}/powers
```

```json
{
  "playerId": "46ece7a1f7714a0fbe114bec814b18b9",
  "playerSecret": "issued-secret-from-create-or-join-response",
  "powerId": "boost",
  "targetIndex": 4
}
```

Online Arena supports `bomb`, `shield`, `boost`, and `trap`. Bomb, Shield, and Trap consume the turn. Boost prepares an empty square without consuming the turn, so the same player can place a stone afterward.

Start the next round after a win or draw:

```text
POST /api/rooms/{roomCode}/next-round
```

```json
{
  "playerId": "46ece7a1f7714a0fbe114bec814b18b9",
  "playerSecret": "issued-secret-from-create-or-join-response"
}
```
