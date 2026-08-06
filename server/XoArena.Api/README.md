# XO Arena API

Initial ASP.NET Core backend for XO Arena. It runs separately from the Vite frontend and does not include database, authentication, or full room management yet.

## Run

```powershell
dotnet restore server/XoArena.Api
dotnet build server/XoArena.Api
dotnet run --project server/XoArena.Api
```

The local HTTP URL from `Properties/launchSettings.json` is:

```text
http://localhost:5243
```

## Frontend API URL

The Vite frontend reads the backend URL from `VITE_API_BASE_URL`.

For local development, create a local `.env` file in the repository root:

```env
VITE_API_BASE_URL=http://localhost:5243
```

The committed `.env.example` documents the same value. Do not commit `.env` or other secret-bearing environment files. If `.env` is absent, the frontend falls back to `http://localhost:5243`.

When the GitHub Pages frontend should call a live backend, set `VITE_API_BASE_URL` during the frontend build to the deployed backend origin, for example:

```env
VITE_API_BASE_URL=https://api.example.com
```

## CORS

Allowed frontend origins are configured in `Cors:AllowedOrigins`.

Local Vite uses:

```text
http://localhost:5173
```

GitHub Pages uses the origin only:

```text
https://rabiaunllu.github.io
```

CORS origins do not include URL paths, so `https://rabiaunllu.github.io/react-tic-tac-toe` must not be listed as a separate origin. `Program.cs` reads the allowed origins from configuration and keeps `http://localhost:5173` as the development fallback.

Health check:

```text
GET /health
```

Expected response:

```json
{
  "status": "ok",
  "service": "xo-arena-api"
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
  "index": 4
}
```

Move validation currently uses Classic board win rules even when the room `gameMode` is `arena`. Arena multipliers and powers are intentionally not part of the backend game state yet.

Start the next round after a win or draw:

```text
POST /api/rooms/{roomCode}/next-round
```

```json
{
  "playerId": "46ece7a1f7714a0fbe114bec814b18b9"
}
```
