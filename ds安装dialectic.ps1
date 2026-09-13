<#
ds安装dialectic.ps1 - 把仓库里的 dialectic 预设装进 DSH home。

用法：
  powershell -ExecutionPolicy Bypass -File .\ds安装dialectic.ps1
  powershell -ExecutionPolicy Bypass -File .\ds安装dialectic.ps1 -DshHome "$env:USERPROFILE\.dsh-test"
  powershell -ExecutionPolicy Bypass -File .\ds安装dialectic.ps1 -Source dialectic-test   # 装实验版
  powershell -ExecutionPolicy Bypass -File .\ds安装dialectic.ps1 -DryRun

前置：Windows；home 下已有 profile（<home>\profiles\<profile>\node_modules）。
装完**开一个新会话**，在预设选择器里选 "Dialectic 模式"（预设是热加载的，不用重启进程）。

说明：装进去的是**真目录**。预设发现判的是 dirent.isDirectory()，而 Windows 上 junction 在
Node 里是 symbolic link —— 放 junction 到预设根会被静默跳过（预设直接不出现在选择器里）。
#>

param(
  [string]$DshHome = (Join-Path $env:USERPROFILE '.dsh'),
  [string]$Source = 'dialectic',
  [string]$PresetId = 'dialectic',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$sourceDir = Join-Path $PSScriptRoot $Source
if (-not (Test-Path $sourceDir)) { throw "source preset not found: $sourceDir" }
if (-not (Test-Path (Join-Path $sourceDir 'agent.cordis.yml'))) {
  throw "source is not a preset (no agent.cordis.yml): $sourceDir"
}

$DshHome = [System.IO.Path]::GetFullPath($DshHome)
if (-not (Test-Path $DshHome)) { throw "DSH home not found: $DshHome" }
$presetRoot = Join-Path $DshHome '.agent-presets'
$target = Join-Path $presetRoot $PresetId

# 源与目标指向同一个目录时必须停下：本仓库的 dialectic\ 可能是指向 live 预设的链接，
# 那种情况下“安装”会先把目标删掉 —— 也就是把自己的源删掉。
$sameDir = $false
try {
  $sourceReal = (Get-Item $sourceDir -Force).Target
  if ($sourceReal) { $sourceReal = [System.IO.Path]::GetFullPath([string]@($sourceReal)[0]) } else { $sourceReal = [System.IO.Path]::GetFullPath($sourceDir) }
  $sameDir = $sourceReal.TrimEnd('\') -ieq ([System.IO.Path]::GetFullPath($target)).TrimEnd('\')
}
catch { $sameDir = $false }
if ($sameDir) {
  throw "source and target are the same directory ($target) - nothing to install; that copy IS this source"
}

Write-Host "source : $sourceDir"
Write-Host "target : $target"

if (Test-Path $target) {
  $item = Get-Item $target -Force
  if ($item.LinkType) {
    throw "target is a $($item.LinkType); the preset root needs a real directory. Remove it first: $target"
  }
  Write-Host 'existing install found - it will be replaced'
}

if ($DryRun) {
  Write-Host '(dry run - nothing written)'
  Write-Host 'would create the preset, then verify it against the harness discovery'
  exit 0
}

if (Test-Path $target) { Remove-Item -Recurse -Force $target }
New-Item -ItemType Directory -Force -Path $target | Out-Null

# 逐文件复制：只复制预设本体，跳过 junction 里可能出现的 node_modules
$files = Get-ChildItem $sourceDir -Recurse -File -Force | Where-Object { $_.FullName -notmatch '\\node_modules\\' }
foreach ($file in $files) {
  $rel = $file.FullName.Substring($sourceDir.Length).TrimStart('\')
  $to = Join-Path $target $rel
  New-Item -ItemType Directory -Force -Path (Split-Path $to -Parent) | Out-Null
  Copy-Item $file.FullName $to -Force
}
Write-Host ("installed {0} file(s)" -f $files.Count)

# 装完立刻核对：目标是真目录、文件齐全
$installed = Get-ChildItem $target -Recurse -File -Force
$missing = @()
foreach ($file in $files) {
  $rel = $file.FullName.Substring($sourceDir.Length).TrimStart('\')
  if (-not (Test-Path (Join-Path $target $rel))) { $missing += $rel }
}
if ($missing.Count -gt 0) { throw "install verification failed, missing: $($missing -join ', ')" }
$version = if (Test-Path (Join-Path $target 'VERSION')) { (Get-Content (Join-Path $target 'VERSION') -Raw).Trim() } else { '(no VERSION file)' }

Write-Host ("installed version : {0}" -f $version)
Write-Host 'next: open a NEW session and pick "Dialectic 模式" in the preset picker'
