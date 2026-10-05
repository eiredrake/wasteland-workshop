. "$PSScriptRoot/common.ps1"
Push-Location $repo
try { Invoke-Checked npm.cmd @('run', 'dev', '--', '--port', '5173', '--strictPort') }
finally { Pop-Location }
