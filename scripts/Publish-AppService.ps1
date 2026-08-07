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
try {
    if (-not $SkipFrontendBuild) {
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

    Write-Host "App Service publish output is ready: $publishDirectory"
}
finally {
    Pop-Location
}
