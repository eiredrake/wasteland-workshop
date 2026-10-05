# Disposable Git remote and mocked commands: never push to GitHub or use Docker.
$ErrorActionPreference = 'Stop'
$fixture = Join-Path ([IO.Path]::GetTempPath()) ('workshop-tooling-test-' + [guid]::NewGuid())
$fixtureRepo = Join-Path $fixture 'repo'
$fixtureRemote = Join-Path $fixture 'remote.git'
function Test-Git {
    & git @args | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Fixture Git failed.' }
}
function Expect-Rejection([scriptblock]$Action, [string]$Pattern) {
    try { & $Action } catch { if ($_.Exception.Message -notlike "*$Pattern*") { throw }; return }
    throw "Expected rejection: $Pattern"
}
try {
    New-Item -ItemType Directory -Path "$fixtureRepo/scripts" -Force | Out-Null
    Copy-Item -LiteralPath "$PSScriptRoot/common.ps1", "$PSScriptRoot/release.ps1", "$PSScriptRoot/deploy.ps1" -Destination "$fixtureRepo/scripts"
    Set-Content "$fixtureRepo/scripts/run-all-tests.ps1" '# App tests mocked in this fixture'
    Set-Content "$fixtureRepo/package.json" '{"version":"0.1.0"}'
    Set-Content "$fixtureRepo/package-lock.json" '{"version":"0.1.0","packages":{"":{"version":"0.1.0"}}}'
    Set-Content "$fixtureRepo/.gitignore" 'node_modules/'
    New-Item -ItemType Directory -Path "$fixtureRepo/node_modules/.bin" -Force | Out-Null
    Set-Content "$fixtureRepo/node_modules/.bin/vite.cmd" '@echo off'
    Test-Git init --bare $fixtureRemote
    Test-Git -C $fixtureRepo init -b main
    Test-Git -C $fixtureRepo config user.name 'Workshop Test'
    Test-Git -C $fixtureRepo config user.email 'test@example.invalid'
    Test-Git -C $fixtureRepo config commit.gpgSign false
    Test-Git -C $fixtureRepo config tag.gpgSign false
    Test-Git -C $fixtureRepo config core.hooksPath "$fixture/no-hooks"
    Test-Git -C $fixtureRepo add .
    Test-Git -C $fixtureRepo commit -m Initial
    Test-Git -C $fixtureRepo remote add origin $fixtureRemote
    Test-Git -C $fixtureRepo push origin main
    $before = & git -C $fixtureRepo rev-parse HEAD
    & "$fixtureRepo/scripts/release.ps1" -Version 0.1.1 -Preview
    if ((& git -C $fixtureRepo rev-parse HEAD) -ne $before -or (Get-Content "$fixtureRepo/package.json" -Raw | ConvertFrom-Json).version -ne '0.1.0') { throw 'Release preview mutated fixture.' }
    Set-Content "$fixtureRepo/dirty.txt" 'dirty'
    Expect-Rejection { & "$fixtureRepo/scripts/release.ps1" -Version 0.1.1 } 'Commit or stash'
    Remove-Item -LiteralPath "$fixtureRepo/dirty.txt"
    Expect-Rejection { & "$fixtureRepo/scripts/release.ps1" -Version 0.1.0 } 'newer'
    function npm.cmd {
        if ($args[0] -eq 'version') {
            Set-Content "$fixtureRepo/package.json" (@{version=$args[1]} | ConvertTo-Json)
            Set-Content "$fixtureRepo/package-lock.json" (@{version=$args[1];packages=@{''=@{version=$args[1]}}} | ConvertTo-Json -Depth 5)
        }
        $global:LASTEXITCODE = 0
    }
    function docker { $global:LASTEXITCODE = 0 }
    & "$fixtureRepo/scripts/release.ps1" -Version v0.1.1
    $local = & git -C $fixtureRepo rev-parse HEAD
    $published = & git --git-dir=$fixtureRemote rev-parse refs/heads/main
    $tagged = & git --git-dir=$fixtureRemote rev-parse 'refs/tags/v0.1.1^{}'
    if ($local -ne $published -or $local -ne $tagged) { throw 'Release branch and tag differ.' }
    if (((Get-Content "$fixtureRepo/package-lock.json" -Raw) -replace '"":', '"root":' | ConvertFrom-Json).packages.root.version -ne '0.1.1') { throw 'Release did not update lockfile.' }
    Expect-Rejection { & "$fixtureRepo/scripts/release.ps1" -Version 0.1.1 } 'already exists'
    $global:workshopTestUpdates = 0
    $global:workshopTestScenario = 'success'
    function docker {
        $global:LASTEXITCODE=0
        if ($args[0] -eq 'image') {
            if ($global:workshopTestScenario -eq 'missing') { $global:LASTEXITCODE=1; return }
            return '[{"Id":"sha256:fixture","Config":{"Labels":{"org.opencontainers.image.version":"0.1.1"}}}]'
        }
        if ($args -contains 'config') { return '{"services":{"wasteland-workshop":{"image":"wasteland-workshop:v0.1.1"}}}' }
        if ($args[0] -eq 'network') { return }
        if ($args -contains 'up') { $global:workshopTestUpdates++; return }
        if ($args[0] -eq 'inspect') {
            $project = if ($global:workshopTestScenario -eq 'wrong-project') { 'other' } else { 'wasteland-workshop' }
            return (@(@{Image='sha256:fixture';State=@{Running=$true};Config=@{Image='wasteland-workshop:v0.1.1';Labels=@{'com.docker.compose.project'=$project}}}) | ConvertTo-Json -Depth 8)
        }
        throw 'Unexpected Docker command in test.'
    }
    function Invoke-WebRequest { [pscustomobject]@{ Content='{"version":"0.1.1"}' } }
    $old = 'test-sentinel'
    $env:WORKSHOP_VERSION = $old
    & "$fixtureRepo/scripts/deploy.ps1" -Version 0.1.1 -Preview
    if ($global:workshopTestUpdates -ne 0) { throw 'Deploy preview updated container.' }
    $global:workshopTestScenario='missing'
    Expect-Rejection { & "$fixtureRepo/scripts/deploy.ps1" -Version 0.1.1 } 'missing'
    $global:workshopTestScenario='wrong-project'
    Expect-Rejection { & "$fixtureRepo/scripts/deploy.ps1" -Version 0.1.1 } 'another Compose'
    if ($global:workshopTestUpdates -ne 0) { throw 'Failed preflight updated container.' }
    $global:workshopTestScenario='success'
    & "$fixtureRepo/scripts/deploy.ps1" -Version 0.1.1
    if ($global:workshopTestUpdates -ne 1 -or [Environment]::GetEnvironmentVariable('WORKSHOP_VERSION','Process') -cne $old) { throw 'Deploy update or environment restoration failed.' }
    Write-Host 'PASS: release preview/guards/atomic push/lockfile; deploy preview/missing image/project guard/version health/environment restoration.'
} finally {
    $resolved = [IO.Path]::GetFullPath($fixture)
    $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    if (!$resolved.StartsWith($tempRoot) -or !([IO.Path]::GetFileName($resolved).StartsWith('workshop-tooling-test-'))) { throw 'Unsafe fixture cleanup path.' }
    Remove-Item -LiteralPath $resolved -Recurse -Force
}
