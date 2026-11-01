[CmdletBinding()]
param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
  [switch]$Force
)

$ErrorActionPreference = 'Stop'

$SkillName = 'dsh-mermaid-charts'
$Source = Join-Path $ProjectRoot "skills\$SkillName"
$LinkRoot = Join-Path $ProjectRoot '.dsh\skills'
$Link = Join-Path $LinkRoot $SkillName
$HookSource = Join-Path $PSScriptRoot 'git-hooks\pre-push'
$HookDest = Join-Path $ProjectRoot '.git\hooks\pre-push'
$MySkills = if ($env:MY_SKILLS) { $env:MY_SKILLS } else { 'E:\repos\my-skills' }

if (-not (Test-Path $Source)) { throw "skill source not found: $Source" }
if (-not (Test-Path (Join-Path $MySkills '.git'))) {
  Write-Warning "my-skills repository not found at $MySkills; the hook will fail until it exists"
}

New-Item -ItemType Directory -Force $LinkRoot | Out-Null

$item = Get-Item $Link -ErrorAction SilentlyContinue
if ($null -eq $item) {
  cmd /c mklink /J "$Link" "$Source" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "mklink /J failed with exit code $LASTEXITCODE" }
  Write-Output "junction created: $Link -> $Source"
} else {
  if ($item.LinkType -ne 'Junction') { throw "$Link exists but is not a junction; remove it or choose another path" }
  $target = @($item.Target)[0]
  if ($target) {
    $normalized = ($target -replace '^\\\\\?\\', '').TrimEnd('\')
    $expected = [IO.Path]::GetFullPath($Source).TrimEnd('\')
    if ([IO.Path]::GetFullPath($normalized).TrimEnd('\') -ne $expected) {
      throw "$Link points to $target, expected $Source"
    }
  }
  Write-Output "junction already present: $Link -> $Source"
}

$HookDir = Split-Path -Parent $HookDest
New-Item -ItemType Directory -Force $HookDir | Out-Null
$desired = (Get-Content -Raw -Encoding UTF8 $HookSource) -replace "`r`n", "`n"
if ((Test-Path $HookDest) -and -not $Force) {
  $existing = (Get-Content -Raw -Encoding UTF8 $HookDest) -replace "`r`n", "`n"
  if ($existing -ne $desired) {
    throw "$HookDest already exists and differs; rerun with -Force to replace"
  }
}
[IO.File]::WriteAllText($HookDest, $desired, [Text.UTF8Encoding]::new($false))
Write-Output "hook installed: $HookDest"
Write-Output "my-skills: $MySkills"
Write-Output "skill branch: $('skill/' + $SkillName)"
Write-Output "next: open a new DSH session in $ProjectRoot and check the skill catalog"
