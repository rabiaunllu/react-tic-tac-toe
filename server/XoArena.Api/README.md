# XO Arena API

Initial ASP.NET Core backend for XO Arena. It runs separately from the Vite frontend and does not include database, authentication, or full room management yet.

## Run

```powershell
dotnet restore server/XoArena.Api
dotnet build server/XoArena.Api
dotnet run --project server/XoArena.Api
```

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

Join an in-memory room:

```text
POST /api/rooms/{roomCode}/join
```

```json
{
  "playerName": "Mert"
}
```

Local Vite is allowed by CORS via `http://localhost:5173`. Add the future GitHub Pages origin to `Cors:AllowedOrigins` in `appsettings.json` when the frontend starts calling the API from Pages.
