[CmdletBinding()]
param([Parameter(Position=0)][string]$Version, [switch]$Preview)
. "$PSScriptRoot/common.ps1"
if (!$Version) { $Version = Get-AppVersion }
$number = Resolve-Version $Version
$tag = "v$number"
$image = "wasteland-workshop:$tag"
$oldVersion = [Environment]::GetEnvironmentVariable('WORKSHOP_VERSION', 'Process')
Push-Location $repo
try {
    $env:WORKSHOP_VERSION = $tag
    $compose = @('compose', '--project-name', 'wasteland-workshop', '-f', (Join-Path $repo 'docker-compose.yml'))
    $raw = & docker image inspect $image
    if ($LASTEXITCODE -ne 0) { throw "Local image $image is missing. Release this version on this Docker host first." }
    $built = @($raw | ConvertFrom-Json)[0]
    if ($built.Config.Labels.'org.opencontainers.image.version' -cne $number) { throw 'Image version label does not match the requested version.' }
    $raw = & docker @compose config --format json
    if ($LASTEXITCODE -ne 0) { throw 'Cannot resolve Compose configuration.' }
    $config = $raw | ConvertFrom-Json
    if ($config.services.'wasteland-workshop'.image -cne $image) { throw 'Compose image does not match the requested version.' }
    Invoke-Checked docker @('network', 'inspect', 'proxy-tier')
    # A fixed container name must never replace another Compose project's app.
    $existing = & docker inspect wasteland-workshop 2>$null
    $hasExisting = $LASTEXITCODE -eq 0
    $previous = '(first deployment)'
    if ($hasExisting) {
        $app = @($existing | ConvertFrom-Json)[0]
        if ($app.Config.Labels.'com.docker.compose.project' -cne 'wasteland-workshop') { throw 'Existing container belongs to another Compose project.' }
        $previous = $app.Config.Image
    }
    Write-Host "Deploy $image on port 805. Previous image: $previous"
    if ($Preview) { Write-Host 'Preview passed. No containers changed.'; return }
    Invoke-Checked docker ($compose + @('up', '-d', '--no-deps', '--no-build', '--pull', 'never', 'wasteland-workshop'))
    for ($attempt=0; $attempt -lt 30; $attempt++) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:805/version.json' -TimeoutSec 3 -Headers @{ 'Cache-Control'='no-cache' }
            $served = $response.Content | ConvertFrom-Json
            $runningRaw = & docker inspect wasteland-workshop
            if ($LASTEXITCODE -eq 0) {
                $running = @($runningRaw | ConvertFrom-Json)[0]
                if ($served.version -ceq $number -and $running.Image -ceq $built.Id -and $running.State.Running) {
                    Write-Host "Healthy: $tag at http://localhost:805"; return
                }
            }
        } catch { }
        Start-Sleep -Seconds 2
        if (($attempt+1) % 5 -eq 0) { Write-Host "Waiting for $tag; check $($attempt+1)/30." }
    }
    throw "Deployment version check failed. Inspect container logs. Previous image: $previous"
} finally {
    [Environment]::SetEnvironmentVariable('WORKSHOP_VERSION', $oldVersion, 'Process')
    Pop-Location
}
