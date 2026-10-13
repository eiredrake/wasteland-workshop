# Isolated command mocks: never build images or modify real containers.
$ErrorActionPreference = 'Stop'
$global:testDeployScenario = 'success'
$global:testDeployBuilds = 0
$global:testDeployUpdates = 0
$number = (Get-Content "$PSScriptRoot/../package.json" -Raw | ConvertFrom-Json).version
function docker {
    $global:LASTEXITCODE = 0
    if ($args -contains 'compose') {
        if ($args[2] -cne 'workshop-test' -or $args[4] -notlike '*docker-compose.test.yml') { throw 'Wrong Compose target.' }
        if ($args -contains 'config') { return '{"name":"workshop-test","services":{"workshop-test":{"container_name":"workshop-test","image":"workshop-test:latest"}}}' }
        if ($args -contains 'up') {
            if ($args[-1] -cne 'workshop-test' -or !($args -contains '--no-build') -or !($args -contains '--no-deps')) { throw 'Unsafe update.' }
            $global:testDeployUpdates++; return
        }
    }
    if ($args[0] -eq 'network') {
        if ($global:testDeployScenario -eq 'network-missing') { $global:LASTEXITCODE = 1 }
        return
    }
    if ($args[0] -eq 'build') {
        if ($args -notcontains 'workshop-test:latest') { throw 'Wrong build image.' }
        $global:testDeployBuilds++
        if ($global:testDeployScenario -eq 'build-failed') { $global:LASTEXITCODE = 1 }
        return
    }
    if ($args[0] -eq 'image') { return '[{"Id":"sha256:test"}]' }
    if ($args[0] -eq 'inspect') {
        if ($args[1] -cne 'workshop-test') { throw 'Wrong container.' }
        if ($global:testDeployScenario -eq 'first') { $global:LASTEXITCODE = 1; $global:testDeployScenario = 'success'; return }
        $project = if ($global:testDeployScenario -eq 'wrong-project') { 'production' } else { 'workshop-test' }
        return (@(@{Image='sha256:test'; State=@{Running=$true}; Config=@{Labels=@{'com.docker.compose.project'=$project}}}) | ConvertTo-Json -Depth 8)
    }
    if ($args[0] -eq 'exec') {
        if ($args[1] -cne 'workshop-test' -or $args[-1] -cne 'http://127.0.0.1:80/version.json') { throw 'Wrong health target.' }
        return (@{version=$number} | ConvertTo-Json)
    }
    throw "Unexpected Docker command: $args"
}
& "$PSScriptRoot/deploy-test.ps1" -Preview
if ($global:testDeployBuilds -or $global:testDeployUpdates) { throw 'Preview mutated Docker.' }
foreach ($scenario in @('wrong-project', 'network-missing', 'build-failed')) {
    $global:testDeployScenario = $scenario
    $rejected = $false
    try { & "$PSScriptRoot/deploy-test.ps1" } catch { $rejected = $true }
    if (!$rejected -or $global:testDeployUpdates) { throw "Failed guard: $scenario" }
}
$global:testDeployScenario = 'first'
& "$PSScriptRoot/deploy-test.ps1"
if ($global:testDeployUpdates -ne 1) { throw 'First deployment did not update test.' }
Write-Host 'PASS: test isolation, preview, ownership, network/build failure guards, first deployment and health target.'
