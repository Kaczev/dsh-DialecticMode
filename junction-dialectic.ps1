# dialectic 预设的 junction
#
# 方向：仓库的 dialectic/ 是一个 junction，指回**本机那个 DSH home** 的
# `.agent-presets\dialectic\` —— 仓库里的这个入口只是"另一条路径"，
# 用来在资源管理器/编辑器里一眼看到它接的是哪个 home 的哪一份。
#
#   dialectic/  ->  <home>\.agent-presets\dialectic      例如 .dsh
#
# 为什么不能反过来（junction 放在预设根）：
#   `dsh-agent-presets` 的发现用 `readdir(..., { withFileTypes: true })` 之后判
#   `child.isDirectory()`，而 Windows 上 **junction 在 Node 里是 symbolic link**
#   （实测：dirent.isDirectory=false / isSymbolicLink=true，stat 才说它是目录）。
#   于是放在预设根里的 junction 不是"预设"，而是被跳过的一行 —— 表现为预设从选择器里消失。
#
# 用法：
#   powershell -ExecutionPolicy Bypass -File .\junction-dialectic.ps1
#   powershell -ExecutionPolicy Bypass -File .\junction-dialectic.ps1 -DshHome "$env:USERPROFILE\.dsh" -LinkName dialectic
#   powershell -ExecutionPolicy Bypass -File .\junction-dialectic.ps1 -Status
#   powershell -ExecutionPolicy Bypass -File .\junction-dialectic.ps1 -Remove
#
# 注意：本仓库里的 dialectic\ 是 junction，别在仓库里跑
# `git clean -fdx` / `git checkout -f` —— 那类命令会顺着 junction 写坏目标。
#
# 2026-10-01：测试区（`dialectic-test\` -> `C:\Users\Kaczev\.dsh-test\.agent-presets\dialectic`）
# 按用户决定整个删除：`.dsh-test` 与两个启动器已在更早一次清理里删掉（释放 1.81 GB），
# 仓库里只剩一个断链 junction。scripts 与文档随之收窄成单区；`-DshHome` 的默认值
# 也从 `.dsh-test` 改回主 home `.dsh`（旧默认现在只会因目录不存在而直接报错）。
# **不要再重建 `.dsh-test` 或 `dialectic-test/`**；要试新想法就走一次性 profile 或
# 以 bundle 装进桌面端。本仓库里那几份仍写着两区的旧文档（README.md、
# ds发布dialectic.ps1、ds安装dialectic.ps1）属于**已退役的网页端（CLI）那条线**，
# 不在这次收窄的范围内，改不改由用户另行决定。

param(
  [string]$DshHome = (Join-Path $env:USERPROFILE '.dsh'),
  [string]$LinkName = 'dialectic',
  [switch]$Status,
  [switch]$Remove,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$Repo = $PSScriptRoot
$LinkPath = Join-Path $Repo $LinkName

function Get-Link([string]$Path) {
  if (-not (Test-Path $Path)) { return $null }
  return Get-Item $Path -Force
}

if ($Status) {
  Write-Host "repo      : $Repo"
  Write-Host "home      : $DshHome"
  foreach ($name in @('dialectic')) {
    $p = Join-Path $Repo $name
    $item = Get-Link $p
    if ($null -eq $item) { Write-Host ("{0,-15}: absent" -f $name); continue }
    $target = if ($item.LinkType) { [string]@($item.Target)[0] } else { '(real directory - not a link)' }
    Write-Host ("{0,-15}: {1} -> {2}" -f $name, $item.LinkType, $target)
  }
  $preset = Join-Path $DshHome ".agent-presets\$LinkName"
  $pItem = Get-Link $preset
  if ($null -eq $pItem) { Write-Host "home preset : absent ($preset)" }
  else {
    Write-Host ("home preset : {0}  linkType={1}" -f $preset, $(if ($pItem.LinkType) { $pItem.LinkType } else { 'none (real dir = correct)' }))
  }
  exit 0
}

if ($Remove) {
  $item = Get-Link $LinkPath
  if ($null -eq $item) { Write-Host "nothing to remove: $LinkPath"; exit 0 }
  if (-not $item.LinkType) { throw "refusing to remove a real directory: $LinkPath" }
  if ($DryRun) { Write-Host "would remove junction: $LinkPath"; exit 0 }
  cmd /c rmdir "$LinkPath" | Out-Null
  Write-Host "removed junction: $LinkPath"
  exit 0
}

$target = Join-Path $DshHome '.agent-presets'
$target = [System.IO.Path]::GetFullPath($target)
if (-not (Test-Path $target)) { throw "preset root not found: $target" }

$existing = Get-Link $LinkPath
if ($null -ne $existing) {
  if ($existing.LinkType) {
    $current = [string]@($existing.Target)[0]
    if ($current.TrimEnd('\') -ieq $target.TrimEnd('\')) {
      Write-Host "already linked: $LinkPath -> $target"
      exit 0
    }
    Write-Host "refreshing junction (was -> $current)"
    if (-not $DryRun) { cmd /c rmdir "$LinkPath" | Out-Null } else { Write-Host "would refresh: $LinkPath -> $target"; exit 0 }
  }
  else {
    throw "a real directory already occupies $LinkPath ; remove it yourself if you want the junction there"
  }
}

if ($DryRun) { Write-Host "would link: $LinkPath -> $target"; exit 0 }
New-Item -ItemType Junction -Path $LinkPath -Target $target | Out-Null
Write-Host "linked: $LinkPath -> $target"
