<#
ds发布dialectic.ps1 - 把 dialectic 预设从测试区发布到主区，并把仓库入口对齐到"当前发布的那一边"。

拓扑：
  真实源（唯一要维护的地方） = %USERPROFILE%\.dsh-test\.agent-presets\dialectic
  主区（正式版位置）         = %USERPROFILE%\.dsh\.agent-presets\dialectic
  仓库入口                   = <repo>\dialectic\  ← junction，指向上面两者中"当前生效的那一个"

本脚本默认只报差异不写入，加 -Release 才真正发布。两件事都做：
  1. 把仓库根的 junction 指到主区副本（发布后它才等于"生效中的那一份"；未发布时指测试区）；
  2. 逐文件 SHA256 比对，把差异复制过去、删掉主区多余的，复制后再复验一次。

预设目录必须是**真目录**：预设发现判的是 dirent.isDirectory()，而 Windows 上 junction 在
Node 里是 symbolic link —— 放在预设根里的 junction 会被静默跳过，表现为预设从选择器里消失。
所以这个 junction 只放在仓库里当查看入口，绝不放预设根。

用法：
  powershell -ExecutionPolicy Bypass -File .\ds发布dialectic.ps1            # 只看差异与入口方向
  powershell -ExecutionPolicy Bypass -File .\ds发布dialectic.ps1 -Release   # 真正发布
  powershell -ExecutionPolicy Bypass -File .\ds发布dialectic.ps1 -Release -TargetHome "$env:USERPROFILE\.dsh"

注意：仓库根的 dialectic\ 是 junction，别在仓库里跑 git clean -fdx / git checkout -f。
#>

param(
  [string]$SourceHome = (Join-Path $env:USERPROFILE '.dsh-test'),
  [string]$TargetHome = (Join-Path $env:USERPROFILE '.dsh'),
  [string]$Id = 'dialectic',
  [switch]$Release
)

$ErrorActionPreference = 'Stop'

function Get-Manifest([string]$Root) {
  $manifest = @{}
  foreach ($f in Get-ChildItem $Root -Recurse -File -Force | Where-Object { $_.FullName -notmatch '\\node_modules\\' }) {
    $manifest[$f.FullName.Substring($Root.Length).TrimStart('\')] = (Get-FileHash $f.FullName -Algorithm SHA256).Hash
  }
  return $manifest
}

$source = Join-Path ([System.IO.Path]::GetFullPath($SourceHome)) ".agent-presets\$Id"
$target = Join-Path ([System.IO.Path]::GetFullPath($TargetHome)) ".agent-presets\$Id"
if (-not (Test-Path $source)) { throw "source preset not found: $source" }

Write-Host "source     : $source"
Write-Host "target     : $target"
if (-not $Release) { Write-Host 'mode       : dry run (pass -Release to publish)' }

$targetItem = if (Test-Path $target) { Get-Item $target -Force } else { $null }
if ($null -ne $targetItem -and $targetItem.LinkType) {
  throw "target is a link ($($targetItem.LinkType)); the preset root needs a real directory: $target"
}

# ── 1. 仓库入口对齐（与文件有没有差异无关，所以放在早退之前）────────────────────
# 仓库根有两个 junction，各自固定指向自己那一边；它们**故意入库**——git 会把 junction
# 当目录走进去，于是两个区的内容都进入版本历史，这就是备份。这里只保证方向没被指反。
$links = @(
  @{ Name = $Id; Target = $target },
  @{ Name = "$Id-test"; Target = $source }
)
foreach ($link in $links) {
  $linkPath = Join-Path $PSScriptRoot $link.Name
  $item = if (Test-Path $linkPath) { Get-Item $linkPath -Force } else { $null }
  $wanted = ([System.IO.Path]::GetFullPath($link.Target)).TrimEnd('\')
  if ($null -eq $item) {
    if (-not $Release) { Write-Host "repo entry : $($link.Name) absent - would create"; continue }
    New-Item -ItemType Junction -Path $linkPath -Target $link.Target | Out-Null
    Write-Host "repo entry : $($link.Name) created -> $($link.Target)"
    continue
  }
  if (-not $item.LinkType) {
    Write-Host "repo entry : WARNING - $($link.Name) is a real directory, not a junction; leaving it alone"
    continue
  }
  $current = ([string]@($item.Target)[0]).TrimEnd('\')
  if ($current -ieq $wanted) {
    Write-Host "repo entry : $($link.Name) already points at its zone"
    continue
  }
  if (-not $Release) {
    Write-Host "repo entry : $($link.Name) would re-point (currently $current)"
    continue
  }
  cmd /c rmdir "$linkPath" | Out-Null
  New-Item -ItemType Junction -Path $linkPath -Target $link.Target | Out-Null
  Write-Host "repo entry : $($link.Name) re-pointed -> $($link.Target)"
}

# ── 2. 文件同步 ────────────────────────────────────────────────────────────────
$sourceManifest = Get-Manifest $source
$targetManifest = if ($null -ne $targetItem) { Get-Manifest $target } else { @{} }
$missing = @($sourceManifest.Keys | Where-Object { -not $targetManifest.ContainsKey($_) })
$changed = @($sourceManifest.Keys | Where-Object { $targetManifest.ContainsKey($_) -and $targetManifest[$_] -ne $sourceManifest[$_] })
$extra = @($targetManifest.Keys | Where-Object { -not $sourceManifest.ContainsKey($_) })

if ($missing.Count -eq 0 -and $changed.Count -eq 0 -and $extra.Count -eq 0) {
  Write-Host 'files      : already identical - nothing to publish'
  exit 0
}
foreach ($name in $missing) { Write-Host "  + $name" }
foreach ($name in $changed) { Write-Host "  ~ $name" }
foreach ($name in $extra) { Write-Host "  - $name (will be removed)" }
if (-not $Release) {
  Write-Host "files      : differs ($($missing.Count) new, $($changed.Count) changed, $($extra.Count) extra)"
  exit 0
}

New-Item -ItemType Directory -Force -Path $target | Out-Null
foreach ($name in @($missing + $changed)) {
  $to = Join-Path $target $name
  New-Item -ItemType Directory -Force -Path (Split-Path $to -Parent) | Out-Null
  Copy-Item (Join-Path $source $name) $to -Force
}
foreach ($name in $extra) { Remove-Item (Join-Path $target $name) -Force }

$after = Get-Manifest $target
$drift = @($sourceManifest.Keys | Where-Object { -not $after.ContainsKey($_) -or $after[$_] -ne $sourceManifest[$_] })
if ($drift.Count -gt 0) { throw "publish verification failed, still differing: $($drift -join ', ')" }
Write-Host ("PUBLISHED  ({0} copied, {1} removed, verified)" -f ($missing.Count + $changed.Count), $extra.Count)
Write-Host 'Open a NEW session to see it; no process restart is needed.'
