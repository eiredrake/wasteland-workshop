. "$PSScriptRoot/common.ps1"
Push-Location $repo
try { Invoke-Checked npm.cmd @('run', 'build') }
finally { Pop-Location }
