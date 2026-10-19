$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

function Wait-Http([string]$Url) {
    $deadline = (Get-Date).AddSeconds(180)
    do {
        # Container start includes certificate generation and application initialization.
        & curl.exe --noproxy '*' --insecure --silent --fail --max-time 3 --output NUL $Url
        if ($LASTEXITCODE -eq 0) { return }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)
    throw "Health check failed: $Url"
}

try {
    if (-not (Test-Path -LiteralPath '.env')) {
        throw 'Create .env from .env.example and set your credentials first.'
    }
    & docker compose -f docker-compose.yml config --quiet
    if ($LASTEXITCODE -ne 0) { throw 'Invalid Docker Compose configuration.' }
    & docker compose -f docker-compose.yml up -d --build --wait --wait-timeout 180
    if ($LASTEXITCODE -ne 0) { throw 'Deployment failed. Inspect docker compose logs and the build output.' }
    foreach ($url in @('https://localhost:8443/', 'https://localhost:8443/api/v1/categories/')) {
        # The bundled Nginx generates a self-signed certificate for local use.
        Wait-Http $url
    }
    Write-Host 'Xilixili is ready: https://localhost:8443/'
    Write-Host 'The local HTTPS certificate is self-signed. Run .\stop.ps1 to stop services.'
} catch {
    Write-Host "Startup failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
