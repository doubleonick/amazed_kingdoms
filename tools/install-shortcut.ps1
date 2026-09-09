<#
.SYNOPSIS
Put an "Am+zed Kingdoms" icon on the Windows desktop that opens the game in
its own window.

.DESCRIPTION
The shortcut runs Edge or Chrome in app mode, so the game opens with no
address bar and no tabs - which is the point when a five-year-old is holding
the mouse.

Nothing needs to be cloned. The icon is fetched from the published site, the
same place the game itself is served from, so a new machine needs only this
one file. Run it again any time to repoint or repair the shortcut.

.EXAMPLE
powershell -ExecutionPolicy Bypass -File tools\install-shortcut.ps1

.EXAMPLE
powershell -ExecutionPolicy Bypass -File tools\install-shortcut.ps1 -Icon maze
#>
[CmdletBinding()]
param(
  # castle matches the icon an installed tablet shows; maze is the alternate.
  [ValidateSet('castle', 'maze')]
  [string]$Icon = 'castle',

  [string]$Url = 'https://doubleonick.github.io/amazed_kingdoms/',

  [string]$Name = 'Am+zed Kingdoms',

  # auto prefers whichever installed browser can give a window with no address
  # bar. Opera is supported but cannot: see the note where it is resolved.
  [ValidateSet('auto', 'edge', 'chrome', 'opera')]
  [string]$Browser = 'auto'
)

$ErrorActionPreference = 'Stop'

# ---- pick a browser --------------------------------------------------------
# Only Edge and Chrome implement --app=, which is what strips the address bar
# and the tab strip. Opera accepts the flag on its command line and then opens
# Speed Dial regardless - tested on Opera 135, including against a clean
# profile, so it is not a stale-instance artefact. Opera therefore gets a
# plain URL shortcut: same icon, same game, ordinary browser window.
$known = [ordered]@{
  edge   = @("$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
             "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe")
  chrome = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
             "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
             "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe")
  opera  = @("$env:LOCALAPPDATA\Programs\Opera\opera.exe",
             "$env:ProgramFiles\Opera\opera.exe",
             "${env:ProgramFiles(x86)}\Opera\opera.exe")
}

function Find-Browser([string]$key) {
  $known[$key] | Where-Object { Test-Path $_ } | Select-Object -First 1
}

if ($Browser -eq 'auto') {
  # Deliberately not the default browser: app mode is worth more here than
  # matching what the rest of the machine opens links with.
  foreach ($k in 'edge', 'chrome', 'opera') {
    $found = Find-Browser $k
    if ($found) { $Browser = $k; $exe = $found; break }
  }
} else {
  $exe = Find-Browser $Browser
}

if (-not $exe) {
  throw "No supported browser found. Install Edge or Chrome for a window with no address bar, or pass -Browser opera if Opera is installed elsewhere."
}

$appMode = $Browser -ne 'opera'

# ---- the icon --------------------------------------------------------------
# Kept outside the desktop so nobody deletes it by tidying up, and outside any
# clone so the shortcut survives the repo being moved.
$dir = Join-Path $env:LOCALAPPDATA 'AmazedKingdoms'
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }

$icoName = "icon-$Icon.ico"
$icoPath = Join-Path $dir $icoName

# Prefer a copy sitting beside this script's repo; fall back to the live site.
$local = Join-Path (Split-Path (Split-Path $PSCommandPath -Parent) -Parent) $icoName
if (Test-Path $local) {
  Copy-Item $local $icoPath -Force
  Write-Host "icon      : $icoPath (from the repo)"
} else {
  $src = ($Url.TrimEnd('/')) + "/$icoName"
  try {
    Invoke-WebRequest -Uri $src -OutFile $icoPath -UseBasicParsing
    Write-Host "icon      : $icoPath (downloaded)"
  } catch {
    throw "Could not get $src - if the branch adding $icoName is not merged yet, the published site does not have it. Run this from a clone instead, or merge first."
  }
}

# A truncated or HTML-404 download would silently give a blank icon.
if ((Get-Item $icoPath).Length -lt 1024) {
  Remove-Item $icoPath -Force
  throw "The icon that arrived is too small to be real. Nothing installed."
}

# ---- the shortcut ----------------------------------------------------------
$lnk = Join-Path ([Environment]::GetFolderPath('Desktop')) "$Name.lnk"
$shell = New-Object -ComObject WScript.Shell
$s = $shell.CreateShortcut($lnk)
$s.TargetPath       = $exe
$s.Arguments        = $(if ($appMode) { "--app=$Url" } else { $Url })
$s.IconLocation     = "$icoPath,0"
$s.Description      = 'Am+zed Kingdoms - arithmetic and sight-reading maze'
$s.WorkingDirectory = Split-Path $exe
$s.Save()

Write-Host "shortcut  : $lnk"
Write-Host "browser   : $Browser ($exe)"
Write-Host "opens     : $Url"
if ($appMode) {
  Write-Host "window    : app mode - no address bar, no tabs"
} else {
  Write-Host "window    : ordinary Opera window - Opera has no app mode."
  Write-Host "            Install Edge or Chrome and re-run this for a"
  Write-Host "            chromeless window. Your default browser is untouched"
  Write-Host "            either way; only this shortcut is affected."
}
Write-Host ""
Write-Host "Done. If the desktop still shows the old picture, press F5 on the"
Write-Host "desktop - Windows caches icons and sometimes needs telling."
