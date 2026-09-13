# dsh-DialecticMode

> 给 DeepSeek Harness（dsh）做的一个 **agent preset**：把"辩证的反例检验"做成一套**有门槛的固定动作**——第一版可能错、且错得代价高的场合才启动，两轮内必须出结论，输出只给决策与理由。
>
> 当前版本 **0.0.1**。

## 一、这是什么

一个 **标准模式的变体**：工具面与官方 `standard` 预设逐条对齐（含 goal、plan 模式、子代理、工作流），只差三处——

1. **persona** 换成 dialectic 人格（`We are a dialectical synthesizer: …`）；
2. **自带两条按需加载的技能**，按**使用时机**拆：`dialectic-counter-case`（动手前四条：可证伪点、用户主张 vs 环境、对照既定标准、只报会改变实现的矛盾）、`dialectic-verify`（交付前四条：只按具体缺陷改、保留还能通过检验的、找卡住验收的那条约束、独立作答并回归全量）。每条都注明治什么病、怎么误用、以及出处；
3. **去掉 host 注入的开场白** `You are an AI agent powered by DeepSeek Harness.`（只在预设作用域内去掉，不影响别的预设）。

保留完整工具面是刻意的：这样对照实验比的是"同一套工具面 + 一个 persona"，而不是"两套工具面"。

## 二、两个版本

| 目录 | 是什么 | 装它的人 |
|---|---|---|
| **`dialectic/`** | **正式版**，稳定、可长期用 | 普通用户装这个 |
| `dialectic-test/` | **实验版**，随时会改、可能挂不上，只用于试新想法 | 想跟着一起试的人 |

两个目录里的内容就是预设本体（`preset.yml`、`agent.cordis.yml`、两个 `SKILL.md`、`suppress-harness-identity.mjs`、`VERSION`）。正式版与实验版的差别只在里面那份内容，用法完全一样。

## 三、安装

前置：Windows；dsh 运行时 `0.1.5-rc.2`；你的 DSH home 下已有 profile（`<home>\profiles\<profile>\node_modules`）。默认 home 是 `%USERPROFILE%\.dsh`。

```powershell
# 装正式版（默认）
powershell -ExecutionPolicy Bypass -File .\ds安装dialectic.ps1

# 指定 home
powershell -ExecutionPolicy Bypass -File .\ds安装dialectic.ps1 -DshHome "$env:USERPROFILE\.dsh-test"

# 装实验版（不稳定）
powershell -ExecutionPolicy Bypass -File .\ds安装dialectic.ps1 -Source dialectic-test

# 只看它会做什么，不写入
powershell -ExecutionPolicy Bypass -File .\ds安装dialectic.ps1 -DryRun
```

脚本把预设**复制**进 `<home>\.agent-presets\dialectic\`，复制完逐文件核对一遍，不一致就报错退出。

装完**开一个新会话**，在预设选择器里选 **Dialectic 模式**（预设是热加载的，不用重启进程）。

不想用脚本也可以手工装：把 `dialectic\` 目录里的文件整个复制到 `<home>\.agent-presets\dialectic\` 即可——一个预设就是这么一个文件夹（`preset.yml`、`agent.cordis.yml`、`suppress-harness-identity.mjs`、`VERSION` 和 `skills\`）。

## 四、用起来是什么样

- **该干活就干活**：答案能用测试、编译器、类型、规范或文档机械核对时，它直接做并核对，不会硬跑一轮"反例检验"。
- **前提可疑才启动**：请求建立在没审过的假设上、第一版来自"看起来像"的模式匹配、要替换一个还能用的东西、或者它察觉自己在因为你想听而附和——这时才做一轮反例检验，**至多两轮**。
- **输出只有结论与理由**：不给"正题—反题—合题"的过程稿，只说明改了什么、为什么；改过了会讲清楚改了什么，没改会说"经得起检查"。
- **不确定就标出来**：材料里的说法要么核过、要么标明没核，不把猜测讲成事实。

## 五、验证装好了没有

1. **开一个新会话**，在预设选择器里能看到 **Dialectic 模式**（id 是 `dialectic`，列表里排在其他用户预设之间）。
2. 选它、随便聊一句，看行为对不对：该机械核对的任务直接做，不会硬演一轮"辩证过程"。
3. 想确认是否装成功，看安装目录：`<home>\.agent-presets\dialectic\` 里应有 `preset.yml`、`agent.cordis.yml`、`suppress-harness-identity.mjs`、`VERSION` 和 `skills\`。

如果它**没出现**在选择器里：先看 `preset.yml` 的 `name`/`description` 有没有被改坏（格式错了这个预设会从列表里消失），再看目录名是不是 `dialectic`。重新跑一次安装脚本最省事——脚本会先删掉旧的再复制。

## 六、维护者请看

本仓库有两个目录名看起来像"两份一样的东西"，实际不是：

- `dialectic\` —— **正式版**（用户装这个）
- `dialectic-test\` —— **实验版**（不稳定，随时会改）

它们在本机是两张"活的"视图，内容分别对应开发者机器上的两个 dsh home；`ds安装dialectic.ps1`、`ds发布dialectic.ps1`、`junction-dialectic.ps1` 是配套的脚本，用法写在各自脚本头部。**接线细节（哪边是源、怎么发布、校验脚本清单、为什么某个目录必须是真目录而不是链接）不在 README 里**——那是本机的事，写在开发者本地的维护笔记中。

改预设请改 `dialectic-test\` 那一侧，验证通过后再同步到 `dialectic\`，两边都要提交——只提交一边，回退时另一边就是空的。

## 七、许可

见 `LICENSE`。
