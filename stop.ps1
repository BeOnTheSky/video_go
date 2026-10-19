$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

& docker compose -f docker-compose.yml stop
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Shutdown failed. Check whether Docker Desktop is running.' -ForegroundColor Red
    exit 1
}
Write-Host 'Xilixili stopped. All persistent data is preserved.'
