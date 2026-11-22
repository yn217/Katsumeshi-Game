# PowerShell 7 / Windows 10+
# usage: ./scripts/import_mockups.ps1 -ArchivePath "C:\\Downloads\\Katsumeshi-Game_UI_v03.zip"
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ArchivePath)
$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if (-not (Test-Path (Join-Path $repoRoot '.git'))) { throw "Git repository not found: $repoRoot" }
if (-not (Test-Path -LiteralPath $ArchivePath)) { throw "ZIP file not found: $ArchivePath" }
$dest = Join-Path $repoRoot 'public/assets/mockups/v03'
$tmp = Join-Path ([IO.Path]::GetTempPath()) ('katsumeshi-ui-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tmp -Force | Out-Null
try {
    Expand-Archive -LiteralPath $ArchivePath -DestinationPath $tmp -Force
    $src = Join-Path $tmp 'Katsumeshi-Game_UI_v03'
    if (-not (Test-Path (Join-Path $src '00_title.png'))) { throw "Archive does not contain expected title image" }
    New-Item -ItemType Directory -Path $dest -Force | Out-Null
    # Export only generated mockups. Do not publish the user's reference image.
    Get-ChildItem -Path $src -Filter '*.png' | Where-Object {
        $_.BaseName -match '^0[0-7]_' 
    } | Copy-Item -Destination $dest -Force
    # Keep the public manifest aligned with the generated mockups copied above.
    # In particular, exclude character_reference_user.png from both file export and manifest.
    $manifest = Get-Content -LiteralPath (Join-Path $src 'manifest.json') -Raw -Encoding utf8 | ConvertFrom-Json
    $manifest.files = @($manifest.files | Where-Object { $_.file -match '^0[0-7]_.+\.png$' })
    $manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $dest 'manifest.json') -Encoding utf8NoBOM
    Copy-Item -Path (Join-Path $src 'README.md') -Destination $dest -Force
    Write-Host "Copied UI mockup assets to $dest"
    Write-Host "To register on GitHub, review assets and run:"
    Write-Host "  git add public/assets/mockups/v03"
    Write-Host "  git commit -m 'assets: add katsumeshi UI mockups v0.3'"
    Write-Host "  git push origin main"
} finally {
    if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
}
