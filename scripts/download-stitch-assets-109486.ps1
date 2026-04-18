$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$exportDir = Join-Path $root "stitch_exports/10948673372392243782"
$manifestPath = Join-Path $exportDir "manifest.json"
$screensDir = Join-Path $exportDir "screens"

if (!(Test-Path $manifestPath)) {
  throw "Manifest not found: $manifestPath"
}

if (!(Test-Path $screensDir)) {
  New-Item -ItemType Directory -Path $screensDir | Out-Null
}

$manifest = Get-Content -Raw -Path $manifestPath | ConvertFrom-Json

function Get-Slug([string]$value) {
  $slug = $value.ToLowerInvariant()
  $slug = $slug -replace "[^a-z0-9]+", "-"
  $slug = $slug.Trim("-")
  if ([string]::IsNullOrWhiteSpace($slug)) {
    return "screen"
  }
  return $slug
}

foreach ($screen in $manifest.screens) {
  $slug = Get-Slug $screen.title
  $screenFolder = Join-Path $screensDir "$($screen.id)_$slug"
  if (!(Test-Path $screenFolder)) {
    New-Item -ItemType Directory -Path $screenFolder | Out-Null
  }

  $pngOut = Join-Path $screenFolder "screenshot.png"
  $htmlOut = Join-Path $screenFolder "screen.html"
  $metaOut = Join-Path $screenFolder "meta.json"

  Write-Host "Downloading screenshot: $($screen.title)"
  & curl.exe -L "$($screen.screenshotUrl)" -o "$pngOut"

  Write-Host "Downloading HTML code: $($screen.title)"
  & curl.exe -L "$($screen.htmlUrl)" -o "$htmlOut"

  $meta = @{
    id = $screen.id
    title = $screen.title
    screenshotUrl = $screen.screenshotUrl
    htmlUrl = $screen.htmlUrl
    downloadedAt = (Get-Date).ToString("o")
    files = @{
      screenshot = "screenshot.png"
      html = "screen.html"
    }
  }
  $meta | ConvertTo-Json -Depth 5 | Set-Content -Path $metaOut -Encoding UTF8
}

Write-Host "Done. Files saved under: $screensDir"
