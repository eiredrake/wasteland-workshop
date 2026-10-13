. "$PSScriptRoot/common.ps1"
Assert-ScannerBranch
Push-Location $repo
try { Invoke-Checked npm.cmd @('run', 'build') }
finally { Pop-Location }
