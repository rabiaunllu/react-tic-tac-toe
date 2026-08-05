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

Local Vite is allowed by CORS via `http://localhost:5173`. Add the future GitHub Pages origin to `Cors:AllowedOrigins` in `appsettings.json` when the frontend starts calling the API from Pages.
