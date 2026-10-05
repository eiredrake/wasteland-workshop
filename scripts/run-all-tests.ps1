. "$PSScriptRoot/common.ps1"
Push-Location $repo
try {
    Invoke-Checked npm.cmd @('test')
    Invoke-Checked (Get-Process -Id $PID).Path @('-NoProfile', '-File', "$PSScriptRoot/test-tooling.ps1")
} finally { Pop-Location }
