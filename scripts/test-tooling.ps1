# Read-only checks: no Git publishing or Docker daemon access.
. "$PSScriptRoot/common.ps1"
foreach ($valid in @('0.1.0','v1.2.3','10.0.0')) { $null = Resolve-Version $valid }
foreach ($invalid in @('1.02.3','latest','1.2','-1.2.3','1.2.3-beta')) {
    $rejected = $false
    try { $null = Resolve-Version $invalid } catch { $rejected = $true }
    if (!$rejected) { throw "Invalid version accepted: $invalid" }
}
$package = Get-Content (Join-Path $repo 'package.json') -Raw | ConvertFrom-Json
$lockPath = Join-Path $repo 'package-lock.json'
$versions = & node -e 'const l = require(process.argv[1]); console.log(JSON.stringify([l.version, l.packages[String()].version]))' $lockPath
if ($LASTEXITCODE -ne 0) { throw 'Cannot read lockfile versions.' }
$lockVersions = $versions | ConvertFrom-Json
if ($package.version -cne $lockVersions[0] -or $package.version -cne $lockVersions[1]) { throw 'Package and lockfile versions differ.' }
foreach ($file in Get-ChildItem $PSScriptRoot -Filter '*.ps1') {
    $tokens=$null; $errors=$null
    $null = [Management.Automation.Language.Parser]::ParseFile($file.FullName, [ref]$tokens, [ref]$errors)
    if ($errors.Count) { throw "PowerShell parse errors in $($file.Name): $errors" }
}
Write-Host 'PASS: version validation, package/lockfile consistency, and PowerShell syntax.'
& "$PSScriptRoot/test-workflows.ps1"
