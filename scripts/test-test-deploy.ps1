# Isolated command mocks: never build images or modify real containers.
$ErrorActionPreference = 'Stop'
$versionState = Join-Path ([IO.Path]::GetTempPath()) ('workshop-test-version-'+[guid]::NewGuid()+'.json')
'{"nextVersion":"0.0.0"}' | Set-Content -LiteralPath $versionState
$global:testBuiltVersion = '0.0.0'
$global:testDeployScenario = 'success'
$global:testDeployBuilds = 0
$global:testDeployUpdates = 0
$number = (Get-Content "$PSScriptRoot/../package.json" -Raw | ConvertFrom-Json).version
$global:testScannerBranch = 'scanner-implementation'
$global:testDockerCalls = 0
function git {
    $global:LASTEXITCODE = 0
    if ($args[-2] -cne 'branch' -or $args[-1] -cne '--show-current') { throw 'Unexpected Git command.' }
    return $global:testScannerBranch
}
function docker {
    $global:testDockerCalls++
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
        $buildArg = @($args | Where-Object { $_ -like 'TEST_VERSION=*' })[0]
        $global:testBuiltVersion = $buildArg.Substring('TEST_VERSION='.Length)
        $global:testDeployBuilds++
        if ($global:testDeployScenario -eq 'build-failed') { $global:LASTEXITCODE = 1 }
        return
    }
    if ($args[0] -eq 'image') { return '[{"Id":"sha256:test"}]' }
    if ($args[0] -eq 'container' -and $args[1] -eq 'inspect') {
        if ($args[2] -cne 'workshop-test') { throw 'Wrong container.' }
        if ($global:testDeployScenario -eq 'first') { $global:LASTEXITCODE = 1; $global:testDeployScenario = 'success'; return }
        if ($global:testDeployScenario -eq 'unlabeled') { return '[{"Config":{"Labels":{"maintainer":"nginx"}}}]' }
        if ($global:testDeployScenario -eq 'null-labels') { return '[{"Config":{"Labels":null}}]' }
        $project = if ($global:testDeployScenario -eq 'wrong-project') { 'production' } else { 'workshop-test' }
        return (@(@{Image='sha256:test'; State=@{Running=$true}; Config=@{Labels=@{'com.docker.compose.project'=$project}}}) | ConvertTo-Json -Depth 8)
    }
    if ($args[0] -eq 'exec') {
        if ($args[1] -cne 'workshop-test' -or $args[-1] -cne 'http://127.0.0.1:80/version.json') { throw 'Wrong health target.' }
        return (@{version=$number;testVersion=$global:testBuiltVersion} | ConvertTo-Json)
    }
    throw "Unexpected Docker command: $args"
}
foreach ($branch in @('main','development','')) {
    $global:testScannerBranch = $branch
    $rejected = $false
    try { & "$PSScriptRoot/deploy-test.ps1" -VersionStatePath $versionState -Preview } catch { $rejected = $_.Exception.Message -like '*requires scanner-implementation*' }
    if (!$rejected -or $global:testDockerCalls) { throw 'Wrong/detached branch reached Docker.' }
    $rejected = $false
    try { & "$PSScriptRoot/dev-build.ps1" } catch { $rejected = $_.Exception.Message -like '*requires scanner-implementation*' }
    if (!$rejected) { throw 'DEV build allowed wrong/detached branch.' }
}
$global:testScannerBranch = 'scanner-implementation'
& "$PSScriptRoot/deploy-test.ps1" -VersionStatePath $versionState -Preview
if ($global:testDeployBuilds -or $global:testDeployUpdates) { throw 'Preview mutated Docker.' }
foreach ($scenario in @('wrong-project', 'unlabeled', 'null-labels', 'network-missing', 'build-failed')) {
    $global:testDeployScenario = $scenario
    $rejected = $false
    try { & "$PSScriptRoot/deploy-test.ps1" -VersionStatePath $versionState } catch { $rejected = $true }
    if (!$rejected -or $global:testDeployUpdates) { throw "Failed guard: $scenario" }
}
$global:testDeployScenario = 'first'
& "$PSScriptRoot/deploy-test.ps1" -VersionStatePath $versionState
if ($global:testDeployUpdates -ne 1) { throw 'First deployment did not update test.' }
Write-Host 'PASS: scanner branch guards, workshop-test target, test isolation, preview, typed container inspection, missing/null ownership labels, network/build failure guards, first deployment and health target.'

$deploymentSource = Get-Content "$PSScriptRoot/deploy-test.ps1" -Raw
if ($deploymentSource -notmatch 'https://workshop-test\.foundationsrpg\.org') { throw 'Incorrect public DEV URL.' }
Write-Host 'PASS: workshop-test container uses workshop-test public URL.'

if ((Get-Content $versionState -Raw | ConvertFrom-Json).nextVersion -cne '0.0.1') { throw 'First deployment must advance next TEST version to 0.0.1.' }
& "$PSScriptRoot/deploy-test.ps1" -VersionStatePath $versionState
if ($global:testBuiltVersion -cne '0.0.1' -or (Get-Content $versionState -Raw | ConvertFrom-Json).nextVersion -cne '0.0.2') { throw 'TEST version did not increment.' }
& "$PSScriptRoot/deploy-test.ps1" -VersionStatePath $versionState -TestVersion 0.2.9
if ((Get-Content $versionState -Raw | ConvertFrom-Json).nextVersion -cne '0.2.10') { throw 'Explicit override did not advance correctly.' }
Remove-Item -LiteralPath $versionState
Write-Host 'PASS: TEST starts at 0.0.0, increments after healthy deployment, supports explicit overrides.'
