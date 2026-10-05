[CmdletBinding()]
param([Parameter(Mandatory, Position=0)][string]$Version, [string]$Remote='origin', [switch]$Preview)
. "$PSScriptRoot/common.ps1"
$number = Resolve-Version $Version
$tag = "v$number"
if ($Remote.StartsWith('-')) { throw 'Invalid remote name.' }
$gitExecutable = (Get-Command git -CommandType Application | Select-Object -First 1).Source
function Git {
    $result = & $gitExecutable -C $repo @args
    if ($LASTEXITCODE -ne 0) { throw "Git $($args[0]) failed. Inspect repository state before retrying." }
    $result
}
$null = Git remote get-url $Remote
if (Git tag --list $tag) { throw "Tag $tag already exists locally." }
if (Git ls-remote --tags $Remote "refs/tags/$tag") { throw "Tag $tag already exists remotely." }
if (Git status --porcelain --untracked-files=all) { throw 'Commit or stash existing changes before releasing.' }
if ((Git branch --show-current) -ne 'main') { throw 'Release must be made from main.' }
$head = Git rev-parse HEAD
$remoteHead = @(Git ls-remote --heads $Remote refs/heads/main)
if ($remoteHead.Count -ne 1 -or ($remoteHead[0] -split '\s+')[0] -ne $head) { throw 'Local main must match remote main.' }
if ([version]$number -le [version](Get-AppVersion)) { throw 'Choose a version newer than the current package version.' }
Write-Host "Release ${tag}: validate, build local Docker image, commit, tag, and push to $Remote."
if ($Preview) { Write-Host 'Preview only. No changes made.'; return }
Push-Location $repo
try {
    Invoke-Checked npm.cmd @('ci')
    Invoke-Checked npm.cmd @('version', $number, '--no-git-tag-version', '--ignore-scripts')
    & "$PSScriptRoot/run-all-tests.ps1"
    Invoke-Checked npm.cmd @('run', 'lint')
    Invoke-Checked npm.cmd @('run', 'build')
    # Build before publishing the Git release. Version is embedded by Vite.
    Invoke-Checked docker @('build', '--label', "org.opencontainers.image.version=$number", '-t', "wasteland-workshop:$tag", '.')
    $null = Git add -- package.json package-lock.json
    $null = Git commit -m "Release $tag" --only -- package.json package-lock.json
    $null = Git tag -a $tag -m "Release $tag"
    try { $null = Git push --atomic $Remote 'HEAD:refs/heads/main' "refs/tags/${tag}:refs/tags/$tag" }
    catch { throw "Push failed or its result is uncertain. The local commit, tag and image remain. Inspect remote refs before retrying. $_" }
    Write-Host "Published $tag to GitHub; local image wasteland-workshop:$tag is ready. Production has not changed."
} catch {
    Write-Host 'Release stopped. Inspect package files, Git refs and local images before retrying; no automatic rollback was performed.'
    throw
} finally { Pop-Location }
