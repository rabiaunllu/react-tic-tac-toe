param(
    [switch]$SkipFrontendBuild
)

$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$apiProject = Join-Path $repositoryRoot 'server\XoArena.Api\XoArena.Api.csproj'
$distDirectory = Join-Path $repositoryRoot 'dist'
$wwwrootDirectory = Join-Path $repositoryRoot 'server\XoArena.Api\wwwroot'
$publishDirectory = Join-Path $repositoryRoot 'server\XoArena.Api\publish'

Push-Location $repositoryRoot

# Backup current environment variables to restore later
$origOnline = $env:VITE_ENABLE_ONLINE
$origBasePath = $env:VITE_BASE_PATH
$origApiBaseUrl = $env:VITE_API_BASE_URL

try {
    if (-not $SkipFrontendBuild) {
        # Azure App Service requires same-origin API, root base path, and online mode enabled
        $env:VITE_ENABLE_ONLINE = 'true'
        $env:VITE_BASE_PATH = '/'
        $env:VITE_API_BASE_URL = ''

        npm.cmd run build
    }

    if (-not (Test-Path -LiteralPath (Join-Path $distDirectory 'index.html'))) {
        throw "Frontend build output was not found at $distDirectory. Run npm run build first."
    }

    if (Test-Path -LiteralPath $wwwrootDirectory) {
        Remove-Item -LiteralPath $wwwrootDirectory -Recurse -Force
    }

    New-Item -ItemType Directory -Path $wwwrootDirectory | Out-Null
    Copy-Item -Path (Join-Path $distDirectory '*') -Destination $wwwrootDirectory -Recurse -Force

    dotnet publish $apiProject -c Release -o $publishDirectory -p:UseAppHost=false

    $publishedIndex = Join-Path $publishDirectory 'wwwroot\index.html'
    if (-not (Test-Path -LiteralPath $publishedIndex)) {
        throw "Publish output is missing $publishedIndex."
    }

    Write-Host "App Service publish output is ready: $publishDirectory" -ForegroundColor Green
}
finally {
    # Restore original environment variables or clean them up
    if ($null -ne $origOnline) { $env:VITE_ENABLE_ONLINE = $origOnline } else { Remove-Item Env:\VITE_ENABLE_ONLINE -ErrorAction SilentlyContinue }
    if ($null -ne $origBasePath) { $env:VITE_BASE_PATH = $origBasePath } else { Remove-Item Env:\VITE_BASE_PATH -ErrorAction SilentlyContinue }
    if ($null -ne $origApiBaseUrl) { $env:VITE_API_BASE_URL = $origApiBaseUrl } else { Remove-Item Env:\VITE_API_BASE_URL -ErrorAction SilentlyContinue }
    Pop-Location
}
