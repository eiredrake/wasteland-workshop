# Dependency-free packaging for this small VS Code extension.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$output = Join-Path $PSScriptRoot 'tentacles-control-panel-1.0.1.vsix'
$stream = [IO.File]::Open($output, [IO.FileMode]::Create)
$zip = New-Object IO.Compression.ZipArchive($stream, [IO.Compression.ZipArchiveMode]::Create)
function Add-Text([string]$Name, [string]$Text) {
    $entry = $zip.CreateEntry($Name)
    $writer = New-Object IO.StreamWriter($entry.Open())
    try { $writer.Write($Text) } finally { $writer.Dispose() }
}
try {
    Add-Text '[Content_Types].xml' '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="json" ContentType="application/json"/><Default Extension="js" ContentType="application/javascript"/><Default Extension="svg" ContentType="image/svg+xml"/><Default Extension="vsixmanifest" ContentType="text/xml"/></Types>'
    Add-Text 'extension.vsixmanifest' '<?xml version="1.0"?><PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011"><Metadata><Identity Language="en-US" Id="tentacles-control-panel" Version="1.0.1" Publisher="eiredrake"/><DisplayName>Tentacles Control Panel</DisplayName><Description xml:space="preserve">Workspace task controls with Deploy DEV support.</Description><Categories>Other</Categories><Properties><Property Id="Microsoft.VisualStudio.Code.Engine" Value="^1.100.0"/></Properties></Metadata><Installation><InstallationTarget Id="Microsoft.VisualStudio.Code"/></Installation><Dependencies/><Assets><Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/></Assets></PackageManifest>'
    foreach ($file in @('package.json', 'extension.js', 'tentacles.svg')) {
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, (Join-Path $PSScriptRoot $file), "extension/$file") | Out-Null
    }
} finally { $zip.Dispose(); $stream.Dispose() }
Write-Host "Created $output"
