# dsh-DialecticMode

> 给 DeepSeek Harness（dsh）做的一个 **agent preset**：把"辩证的反例检验"做成一套**有门槛的固定动作**——第一版可能错、且错得代价高的场合才启动，两轮内必须出结论，输出只给决策与理由。
>
> 当前版本 **0.0.1**（预设自带的 `VERSION` 文件）。已发布到主区 `.dsh`，同时留在测试区 `.dsh-test`——真实源是测试区那份，见 §二。

## 一、这是什么

一个 **标准模式的变体**：工具面与官方 `standard` 预设逐条对齐（含 goal、plan 模式、子代理、工作流），只差三处——

1. **persona** 换成 dialectic 人格（`We are a dialectical synthesizer: …`）；
2. **自带两条按需加载的技能**（`skills/dialectic-counter-case` 开场四条 / `skills/dialectic-verify` 收尾四条，各带治什么病、误用风险与来源归属）——按**使用时机**拆，不按方法拆：skill 是整篇进上下文的，一份装八条，加载就是双倍；
3. **去掉 host 注入的开场白** `You are an AI agent powered by DeepSeek Harness.`（作用域内遮掉，只影响本预设）。

保留完整工具面是刻意的：这样 A/B 比的是"同一套工具面 + 一个 persona"，而不是"两套工具面"。

## 二、拓扑（改文件前先读这节）

```
真实源   %USERPROFILE%\.dsh-test\.agent-presets\dialectic\   ← 唯一要维护的地方
                                                    ↑ junction（指向主区副本）
仓库根   dsh-DialecticMode\dialectic\                        ← 查看/编辑入口（.gitignore 排除）
主区副本 %USERPROFILE%\.dsh\.agent-presets\dialectic\        ← 已发布（VERSION 0.0.1）
```

- **改预设就改真实源**（测试区那份）。
- **仓库根的 `dialectic\` junction 指向「当前发布的那一边」**：发布后指向主区副本，未发布时指向测试区真实源。所以从仓库进去看到的永远是"生效中的那一份"，而改动请回测试区改。
- 仓库里**没有** `presets/` 目录：预设内容不在 git 追踪范围内，**唯一的版本历史在真实源本身**——别删 `.dsh-test\.agent-presets\dialectic\`。
- 预设自带的 `VERSION`（一行版本号，随目录发布）就是预设自己的版本，手工维护。
- ⚠️ 仓库根的 `dialectic\` 是指向 live 预设的 junction，**别在仓库里跑 `git clean -fdx` / `git checkout -f`**——那类命令会顺着 junction 写坏预设。

## 三、发布到主区

```powershell
# 只看差异（默认，不写入）
powershell -ExecutionPolicy Bypass -File .\ds发布dialectic.ps1

# 真正发布：测试区 -> 主区
powershell -ExecutionPolicy Bypass -File .\ds发布dialectic.ps1 -Release
```

脚本行为：逐文件 SHA256 比对 → 只复制差异 → 删除主区多余的 → 复制后再复验一次，不一致就报错退出；主区目标若是链接会直接拒绝（避免写穿 junction）。

发布后**记得把仓库 junction 指回主区**（让仓库入口等于"生效中的那一份"）：

```powershell
$r = "C:\Users\Kaczev\Documents\GitHub\dsh-DialecticMode"
cmd /c rmdir "$r\dialectic"
New-Item -ItemType Junction -Path "$r\dialectic" -Target "$env:USERPROFILE\.dsh\.agent-presets\dialectic"
```

两边的 roster 各自独立，所以分开验：

```powershell
node "$d\check-presets.mjs"        # 测试区（也用 harnessBase=.dsh-test）
node "$d\check-presets-main.mjs"   # 主区（用主区自己的安装与 harnessBase）
```

**为什么主区必须是真目录**：预设发现用的是 `readdir(..., { withFileTypes: true })` 之后判 `child.isDirectory()`，而 **Windows 上 junction 在 Node 里是 symbolic link**（实测 `dirent.isDirectory=false / isSymbolicLink=true`）。把 junction 放在预设根里，它不是"预设"而是被静默跳过的一行——表现为预设从选择器里消失。DSH home 的预设根都必须是真目录。

## 四、验证

```powershell
$d = ".\不入库文件\0.0.1 设计想法"
node "$d\check-presets.mjs"           # roster：列出每个预设 + broken 原因
node "$d\check-dialectic-preset.mjs"  # 组合 / persona / SKILL 的静态校验（20 项）
node "$d\check-deployed-preset.mjs"   # 与官方 standard 逐 row 差集、部署版与源是否一致
node "$d\check-row-configs.mjs"       # 逐 row 比 config：漏抄必填 config、值被改短都会红
node "$d\check-harness-identity.mjs"  # 遮开场白的模块实际注册了什么（14 项）
node "$d\check-persona-text.mjs"      # persona 词数与文档自称是否一致
```

这些脚本走发布实现自己的解析器与 schema（`entryListSchema` / `evaluate` / `discoverPresets`），不是复刻判定逻辑。改完预设先跑这几条，再开新会话看效果（预设热加载，不用重启进程）。

**为什么有 `check-row-configs.mjs`**：抄官方 `standard` 组合时最容易犯的错是"漏掉必填的 config"——`plan-mode` 的 `section` 就是必填，我第一次抄漏了整段，结果是挂载时直接失败（`failed to apply loader entry plan-mode: PlanModeConfig needs a non-empty section`）。体检发现不了这类错，只有真去挂载才炸。这个脚本逐 row 比 config 的**键集合**与**字符串值**：键缺了、值被改短都会红（两种都实测验证过会失败）。

## 五、目录

```
dsh-DialecticMode/
  dialectic/                              ← junction -> 当前生效那一份的 live 预设（不入库）
  不入库文件/0.0.1 设计想法/                 ← 设计文档与校验脚本（不入库）
    方案v0.2.md                             # 定稿
    方案.md                                 # 过程记录（含被推翻的判断）
  ds发布dialectic.ps1                       # 测试区 -> 主区，兼对齐仓库入口（不入库）
  junction-dialectic.ps1                    # 单独重建那个 junction 时用（不入库）
  README.md
```

三个 `.mjs`／`_kazcheck` 之类的临时探针脚本请不要提交，`.gitignore` 已覆盖仓库根的常见项。

live 预设自身（真实源）的内容：

```text
.agent-presets\dialectic\
  preset.yml                                    # 显示名与描述
  agent.cordis.yml                              # 组合（standard 的变体）
  suppress-harness-identity.mjs                 # 遮掉 host 开场白
  VERSION                                       # 预设自己的版本号（一行）
  skills/dialectic-counter-case/SKILL.md        # 开场四条（~1.0k tokens）
  skills/dialectic-verify/SKILL.md              # 收尾四条（~1.1k tokens）
```

**两区都有这份预设**：测试区 `.dsh-test`（真实源，改这里）与主区 `.dsh`（发布副本，别手改——下次发布会被覆盖）。两边的 roster 各自独立，用 `check-presets.mjs` / `check-presets-main.mjs` 分别验。

## 六、许可

见 `LICENSE`。
