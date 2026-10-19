param([string]$RegistryMirror = 'docker.m.daocloud.io')

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

try {
    $configJson = & docker compose -f docker-compose.yml config --format json
    if ($LASTEXITCODE -ne 0) { throw 'Invalid Compose configuration.' }
    $config = $configJson | ConvertFrom-Json
    $images = [System.Collections.Generic.HashSet[string]]::new()
    foreach ($service in $config.services.PSObject.Properties.Value) {
        if (-not $service.build) {
            [void]$images.Add($service.image)
            continue
        }
        $dockerfile = Join-Path $service.build.context $service.build.dockerfile
        # Current Dockerfiles use literal tagged base images; stage names have no colon.
        foreach ($line in Get-Content -LiteralPath $dockerfile) {
            if ($line -match '^FROM\s+(\S+:\S+)') { [void]$images.Add($Matches[1]) }
        }
    }
    foreach ($image in ($images | Sort-Object)) {
        $available = & docker image ls --quiet $image
        if ($LASTEXITCODE -ne 0) { throw 'Docker Engine is not available.' }
        if ($available) {
            Write-Host "Already available: $image"
            continue
        }
        $source = $image
        if ($RegistryMirror -and $image -notmatch '/') {
            $source = "$RegistryMirror/library/$image"
        }
        Write-Host "Downloading $image from $source"
        & docker pull --platform linux/amd64 $source
        if ($LASTEXITCODE -ne 0) { throw "Image download failed: $image" }
        if ($source -ne $image) {
            & docker tag $source $image
            if ($LASTEXITCODE -ne 0) { throw "Could not apply the original image tag: $image" }
        }
        & docker image inspect $image *> $null
        if ($LASTEXITCODE -ne 0) { throw "Imported image is missing its expected tag: $image" }
    }
    Write-Host 'Base images are available. Run .\start.ps1 to build and start the project.'
} catch {
    Write-Host "Image preparation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
