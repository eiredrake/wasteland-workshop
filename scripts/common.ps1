$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$repo = Split-Path $PSScriptRoot -Parent
function Invoke-Checked {
    param([string]$Command, [string[]]$Arguments)
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Command failed (exit $LASTEXITCODE)." }
}
function Get-AppVersion {
    (Get-Content -LiteralPath (Join-Path $repo 'package.json') -Raw | ConvertFrom-Json).version
}
function Resolve-Version([string]$Value) {
    if ($Value -cnotmatch '^v?(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$') { throw 'Use a version such as 0.1.0 or v0.1.0.' }
    $Value.TrimStart('v')
}

function Assert-ScannerBranch {
    param([string]$ExpectedBranch = 'scanner-implementation')
    $branch = & git -C $repo branch --show-current
    if ($LASTEXITCODE -ne 0) { throw 'Cannot verify active Git branch. Build/deployment stopped.' }
    if ($branch -cne $ExpectedBranch) { throw "DEV scanner build/deployment requires $ExpectedBranch. Active branch: $branch" }
    Write-Host "Verified active branch: $branch"
}
