[CmdletBinding()]
param([switch]$Preview)
. "$PSScriptRoot/common.ps1"
Assert-ScannerBranch
$number = Get-AppVersion
$image = 'workshop-test:latest'
function Invoke-TestDockerProbe {
    # Windows PowerShell 5.1 promotes native stderr to terminating errors under Stop.
    # Missing containers and a not-yet-ready HTTP server are expected probe results.
    $ErrorActionPreference = 'Continue'
    & docker @args 2>$null
}
Push-Location $repo
try {
    $compose = @('compose', '--project-name', 'workshop-test', '-f', (Join-Path $repo 'docker-compose.test.yml'))
    $raw = & docker @compose config --format json
    if ($LASTEXITCODE -ne 0) { throw 'Cannot resolve test Compose configuration.' }
    $config = $raw | ConvertFrom-Json
    $service = $config.services.'workshop-test'
    if ($config.name -cne 'workshop-test' -or $service.container_name -cne 'workshop-test' -or $service.image -cne $image) { throw 'Unexpected test Compose target.' }
    $null = Invoke-Checked docker @('network', 'inspect', 'proxy-tier')
    $existing = Invoke-TestDockerProbe container inspect workshop-test
    if ($LASTEXITCODE -eq 0) {
        $app = @($existing | ConvertFrom-Json)[0]
        $projectLabel = $null
        if ($null -ne $app.Config.Labels) { $projectLabel = $app.Config.Labels.PSObject.Properties['com.docker.compose.project'] }
        if ($null -eq $projectLabel) { throw 'Existing workshop-test container has no Compose ownership label. Inspect it before replacing it.' }
        if ($projectLabel.Value -cne 'workshop-test') { throw 'Existing test container belongs to another Compose project.' }
    }
    Write-Host "Build current working tree ($number) and deploy $image to https://workshop-test.foundationsrpg.org via proxy-tier, container port 80."
    if ($Preview) { Write-Host 'Preview passed. No images or containers changed.'; return }
    Assert-ScannerBranch
    Invoke-Checked docker @('build', '--label', "org.opencontainers.image.version=$number", '-t', $image, '.')
    $raw = & docker image inspect $image
    if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect built test image.' }
    $built = @($raw | ConvertFrom-Json)[0]
    Assert-ScannerBranch
    Invoke-Checked docker ($compose + @('up', '-d', '--no-deps', '--no-build', '--pull', 'never', 'workshop-test'))
    for ($attempt=0; $attempt -lt 30; $attempt++) {
        # Probe inside the container so this also works with a remote Docker context.
        $raw = Invoke-TestDockerProbe exec workshop-test wget -q -O - http://127.0.0.1:80/version.json
        if ($LASTEXITCODE -eq 0) {
            try {
                $served = $raw | ConvertFrom-Json
                $runningRaw = & docker container inspect workshop-test
                if ($LASTEXITCODE -eq 0) {
                    $running = @($runningRaw | ConvertFrom-Json)[0]
                    if ($served.version -ceq $number -and $running.Image -ceq $built.Id -and $running.State.Running) {
                        Write-Host 'Healthy: workshop-test:80. Open https://workshop-test.foundationsrpg.org on your device.'
                        return
                    }
                }
            } catch { }
        }
        Start-Sleep -Seconds 2
        if (($attempt+1) % 5 -eq 0) { Write-Host "Waiting for test container; check $($attempt+1)/30." }
    }
    throw 'Test deployment health check failed. Inspect docker logs workshop-test.'
} finally { Pop-Location }
