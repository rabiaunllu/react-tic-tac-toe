# Azure single App Service deployment

XO Arena's commercial production path is one Azure App Service: the ASP.NET Core API and the React build run under the same hostname. Azure Static Web Apps is not used because the current Azure policy blocks its deployment. The former Static Web Apps workflow was removed to prevent an unusable deployment path from running. GitHub Pages remains in the repository for its existing site, but is not the commercial production target.

The existing Windows, .NET 8, Free F1 App Service can host this first release. Do not create Application Insights, Log Analytics, autoscale, a database, Redis, CDN, Front Door, or another App Service for this deployment. The API keeps rooms in memory, so use one instance; active rooms are lost if the app restarts.

## URLs on the single App Service

For an App Service hostname such as `https://xo-arena.azurewebsites.net`:

| URL | Purpose |
| --- | --- |
| `https://xo-arena.azurewebsites.net/` | React frontend (`wwwroot/index.html`) |
| `https://xo-arena.azurewebsites.net/health` | Open API health check |
| `https://xo-arena.azurewebsites.net/api/...` | Room and gameplay API |
| `https://xo-arena.azurewebsites.net/hubs/rooms` | SignalR rooms hub |
| `https://xo-arena.azurewebsites.net/<frontend-route>` | React SPA fallback to `index.html` |
| `https://xo-arena.azurewebsites.net/robots.txt` | Search crawler rules and sitemap location |
| `https://xo-arena.azurewebsites.net/sitemap.xml` | Production home page sitemap |

Production serves static files and the SPA fallback from `wwwroot`. Development keeps the existing API-first local behavior: it does not serve `wwwroot` and does not register the SPA fallback.

## Search indexing after deployment

The repository's SEO files use `https://xo-arena.azurewebsites.net` as the production URL. If the actual App Service hostname differs, or when a custom domain is added, update all three values before rebuilding and deploying:

- `public/robots.txt` — sitemap URL
- `public/sitemap.xml` — home page URL
- `index.html` — `og:url`

In Google Search Console, add and verify the exact production site property, submit the deployed `/sitemap.xml` in **Sitemaps**, then inspect the home URL with **URL Inspection** and choose **Request indexing**. Indexing is not immediate or guaranteed; Google decides when to crawl and show the site.

## Exact local build and publish commands

Run these from the repository root in PowerShell:

```powershell
$env:VITE_BASE_PATH = '/'
$env:VITE_ENABLE_ONLINE = 'true'
Remove-Item Env:VITE_API_BASE_URL -ErrorAction SilentlyContinue
npm run build

Remove-Item .\server\XoArena.Api\wwwroot -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory .\server\XoArena.Api\wwwroot | Out-Null
Copy-Item .\dist\* .\server\XoArena.Api\wwwroot -Recurse -Force

dotnet publish .\server\XoArena.Api -c Release -o .\server\XoArena.Api\publish -p:UseAppHost=false
Test-Path .\server\XoArena.Api\publish\wwwroot\index.html
```

The final command must return `True`. Alternatively, the repository script performs the same sequence and verifies the file:

```powershell
.\scripts\Publish-AppService.ps1
```

`wwwroot` and `publish` are generated and ignored by Git. Do not commit them.

## Frontend API configuration

For the single App Service build, leave `VITE_API_BASE_URL` empty and set `VITE_ENABLE_ONLINE=true`. The frontend then calls relative URLs such as `/api/rooms`, so browser calls stay on the same origin and do not need CORS.

`VITE_BASE_PATH=/` is the default and is required for this root-hosted deployment. The existing GitHub Pages workflow explicitly sets `VITE_BASE_PATH=/react-tic-tac-toe/`, preserving its asset paths.

`VITE_API_BASE_URL`, `VITE_ENABLE_ONLINE`, and `VITE_BASE_PATH` are public Vite build-time values, not secrets. They are compiled into the browser bundle; rebuild and redeploy after changing them. Keep keys, passwords, connection strings, and all sensitive values out of `VITE_*` variables.

For a future separate frontend (including GitHub Pages), set `VITE_API_BASE_URL=https://<api-host>` during its build. The existing absolute API URL behavior remains supported. In that case set `Cors__AllowedOrigins__0` in the API App Service to the separate frontend origin; never use `*` and do not include a path.

## Deploy to the existing Windows App Service

1. In Azure Portal, confirm the existing Web App is **Windows**, **.NET 8**, **Free F1**, and is running as a single instance. Use an allowed region such as France Central if the resource must be recreated.
2. In **Settings** > **Environment variables** > **App settings**, set `ASPNETCORE_ENVIRONMENT=Production` and `AllowedHosts=xo-arena.azurewebsites.net` (replace with the actual App Service hostname). No `Cors__AllowedOrigins__0` setting is required for same-origin hosting. In **Settings** > **Configuration**, keep **HTTPS Only** enabled; App Service's managed certificate protects the `azurewebsites.net` hostname and the application additionally redirects HTTP and sends HSTS.
3. In **Monitoring** > **Health check**, set the path to `/health`.
4. Run `.\scripts\Publish-AppService.ps1` locally. It creates `server\XoArena.Api\publish` with both API files and `wwwroot\index.html`.
5. In VS Code, use the Azure App Service extension's **Deploy to Web App** command and choose the `server\XoArena.Api\publish` folder. Confirm the target Web App before accepting the deployment.
6. Open `/health`, then `/`, then test an online room from two browser sessions.

## Cost controls

- [ ] Keep the existing Free F1 plan and one instance while it meets the product need.
- [ ] Create a Cost Management budget and low alerts for Azure Student's $100 credit; alerts are not spending caps.
- [ ] Do not enable Application Insights, Log Analytics, autoscale, database, Redis, private endpoints, CDN, Front Door, or custom domains for this stage.
- [ ] Review Cost Analysis after the first day and weekly thereafter.

## Pre-merge manual smoke test

1. Run the publish script and confirm `publish/wwwroot/index.html` exists.
2. On Azure, `/health` returns HTTP 200 with `environment: Production`.
3. `/` loads the React UI; refresh a client-side frontend route and confirm it returns the UI rather than a 404.
4. Test `/api/rooms` and `/hubs/rooms` through the deployed frontend; confirm no CORS or CSP errors occur.
5. Create, join, and play an Online Arena room from two browser sessions.
6. Confirm the GitHub Pages site still loads assets beneath `/react-tic-tac-toe/`.
