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

Local Vite is allowed by CORS via `http://localhost:5173`. Add the future GitHub Pages origin to `Cors:AllowedOrigins` in `appsettings.json` when the frontend starts calling the API from Pages.
