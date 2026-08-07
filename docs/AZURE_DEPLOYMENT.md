# Azure production deployment

Azure is the primary production path for XO Arena. The existing GitHub Pages workflow remains available for the current Pages site, but it is not the commercial production deployment path.

This guide deliberately does not provision Application Insights, Log Analytics, autoscale, a database, or Redis. The API currently keeps rooms in memory, so the first release should run as one App Service instance. Creating those resources now would consume Azure Student credit and does not make the current in-memory game state durable.

## Before creating Azure resources

- Use an allowed region such as **France Central**. Confirm that App Service and Static Web Apps are available for the selected subscription and region before creating a resource; availability, including Azure Student eligibility, can vary.
- Use a single resource group, for example `xo-arena-prod-rg`, to make costs and cleanup clear.
- Keep an Azure Student subscription's $100 credit in mind. Set a Cost Management budget and a low alert threshold before deployment. A budget alerts; it does not enforce a spend cap.
- Do not add Application Insights, Log Analytics, autoscale, a database, or Redis for this initial deployment. Review these only when the product needs telemetry, durable rooms, or scale-out.
- Choose a unique backend name such as `xo-arena-api-<unique>`. Its public URL will be `https://xo-arena-api-<unique>.azurewebsites.net`.

## 1. Deploy the API to Azure App Service

In the Azure portal, create **App Services** > **Web App** with these values:

| Portal field | Value |
| --- | --- |
| Publish | Code |
| Runtime stack | .NET 8 (LTS) |
| Operating System | Linux |
| Region | France Central (or another allowed region) |
| App Service plan | Start with the least-cost plan that meets the subscription's availability; keep **one instance** |

After deployment, open **Settings** > **Environment variables** > **App settings** and add:

| Name | Value |
| --- | --- |
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `AllowedHosts` | `xo-arena-api-<unique>.azurewebsites.net` |
| `Cors__AllowedOrigins__0` | `https://<your-static-web-app>.azurestaticapps.net` |

Use the exact Static Web Apps **origin**: `https` plus hostname only—no trailing slash and no path. Add a second indexed value only if an intentional custom frontend domain also needs browser access. Never use `*`. `localhost` is present only in `appsettings.Development.json`, so it is not enabled in the production configuration.

Set the App Service **Health check** path to `/health` after publish. It must return HTTP 200 at `https://<your-api>.azurewebsites.net/health`. The endpoint is mapped regardless of environment, including Production.

For a portal-based code deploy, build the publish output locally and upload the contents of the output folder through **Deployment Center** (or use its generated GitHub Actions workflow):

```powershell
dotnet publish .\server\XoArena.Api -c Release -o .\server\XoArena.Api\publish -p:UseAppHost=false
```

Do not configure a database connection string, Redis connection string, Application Insights connection string, or an autoscale rule for this stage.

## 2. Deploy the frontend to Azure Static Web Apps

In the Azure portal, create **Static Web Apps** and choose the same subscription/resource group. Choose **GitHub** as the deployment source and select this repository and the branch that will become production (`main` after approval). Select the React/Vite preset, then use these build settings exactly:

| Static Web Apps setting | Value |
| --- | --- |
| App location | `/` |
| API location | *(empty)* |
| Output location | `dist` |
| App build command | `npm run build` |

The repository also includes `.github/workflows/deploy-azure-static-web-apps.yml` with these same settings. Set the repository **Actions variable** `VITE_API_BASE_URL` to the API origin, for example `https://xo-arena-api-<unique>.azurewebsites.net`; do not include a trailing slash. The workflow reads the Azure deployment token from the `AZURE_STATIC_WEB_APPS_API_TOKEN` repository secret created by Azure.

Set `VITE_ENABLE_ONLINE=true` and `VITE_BASE_PATH=/` for the Azure build. They are public, build-time Vite variables—not secrets—and are compiled into the frontend bundle. A rebuild/redeploy is required whenever either value changes. Do not place credentials, keys, connection strings, or any sensitive data in `VITE_*` variables.

After the Static Web App has a public hostname, return to the API App Service and set `Cors__AllowedOrigins__0` to that exact hostname, then save/restart. The order matters: the frontend's API URL is needed at build time, while the API's allowed browser origin is only known after the frontend is created.

## GitHub Pages compatibility and Azure base path

Vite now defaults to `VITE_BASE_PATH=/`, which is correct for an Azure root domain or subdomain. The existing GitHub Pages workflow explicitly supplies `VITE_BASE_PATH=/react-tic-tac-toe/`, so its asset paths keep working. This lets both deployment paths use the same source without a hard-coded Pages path.

## Static Web Apps fallback: App Service static hosting

If Static Web Apps is unavailable, publish the Vite `dist` output to a separate Azure App Service/static-site-capable host. Build it with:

```powershell
$env:VITE_BASE_PATH = '/'
$env:VITE_API_BASE_URL = 'https://xo-arena-api-<unique>.azurewebsites.net'
$env:VITE_ENABLE_ONLINE = 'true'
npm run build
```

Use a separate frontend hostname and configure the backend `Cors__AllowedOrigins__0` to that frontend origin. Do not deploy the Vite `dist` folder into the API App Service without deliberately adding static-file hosting and SPA fallback; that is not part of this change.

## Cost-control checklist

- [ ] Cost Management budget and alert created before deployment.
- [ ] One App Service instance only; no autoscale.
- [ ] Application Insights and Log Analytics not created.
- [ ] No database, cache, Redis, private endpoint, CDN, Front Door, or custom domain purchased for the first release.
- [ ] Check Cost Analysis after the first day and weekly thereafter.
- [ ] Stop/delete unused resource groups when testing is complete; confirm the exact resource group first.

## Pre-merge manual smoke test

1. From the deployed API URL, open `/health` and confirm HTTP 200 and `environment: Production`.
2. Open the Azure frontend and inspect the built asset URLs: they must start at `/assets/`, not `/react-tic-tac-toe/assets/`.
3. Create and join an Online Arena room from two browser sessions; verify room updates and gameplay still work.
4. Confirm the browser Network panel has no CSP or CORS errors for API calls.
5. Confirm an unlisted origin is rejected by CORS; do not test by adding a wildcard.
6. Confirm the existing GitHub Pages deployment still loads assets under `/react-tic-tac-toe/`.
