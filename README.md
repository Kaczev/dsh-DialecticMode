# dsh-DialecticMode

> 给 DeepSeek Harness（dsh）**桌面端**做的一个 **agent preset**：把"辩证的反例检验"做成一套**有门槛的固定动作**——第一版可能错、且错得代价高的场合才启动，两轮内必须出结论，输出只给决策与理由。
>
> 当前版本 **0.0.1**（写在 `dialectic\VERSION`，实际值是 `0.0.1-b`）。

## 一、这是什么

一个 **标准模式的变体**：工具面与官方 `standard` 预设逐条对齐（含 goal、plan 模式、子代理、工作流），只差三处——

1. **persona** 换成 dialectic 人格（`We are a dialectical synthesizer: …`）；
2. **自带两条按需加载的技能**，按**使用时机**拆：`dialectic-counter-case`（动手前四条：可证伪点、用户主张 vs 环境、对照既定标准、只报会改变实现的矛盾）、`dialectic-verify`（交付前四条：只按具体缺陷改、保留还能通过检验的、找卡住验收的那条约束、独立作答并回归全量）。每条都注明治什么病、怎么误用、以及出处；
3. **去掉 host 注入的开场白** `You are an AI agent powered by DeepSeek Harness.`（只在预设作用域内去掉，不影响别的预设）。

保留完整工具面是刻意的：这样对照实验比的是"同一套工具面 + 一个 persona"，而不是"两套工具面"。

预设本体就是 `dialectic\` 这一个目录：`preset.yml`、`agent.cordis.yml`、`suppress-harness-identity.mjs`、`VERSION`，加上 `skills\` 里的两条技能。

## 二、装它（桌面端，两步）

前提：Windows；dsh **桌面端**（宿主运行时 0.2.0-rc.2 或更新）；仓库在本机。

**第 1 步：生成 bundle 文件**（在仓库根目录跑）

```powershell
$env:ELECTRON_RUN_AS_NODE='1'
& "$env:LOCALAPPDATA\Programs\DeepSeek Harness\DeepSeek Harness.exe" .\make-bundle-patch.mjs
```

它会写出两个**生成物**（都不入库，别手改）：`dialectic\cordis.patch.yml`（一行 `insert`，把预设声明成 `preset-dialectic`）与 `dialectic\package.json`（`dialectic-preset-bundle` 的包元数据，版本号取自 `dialectic\VERSION`）。

**第 2 步：在桌面端里装它**

在桌面端的一个会话里让代理调用 `plugin_manager`：

```json
{ "action": "install_bundle", "target": "<仓库的绝对路径>\\dialectic" }
```

**更新已有安装**时先 `remove_bundle`（`target: "dialectic-preset-bundle"`）再 `install_bundle`——`install_bundle` 对已经装着的同一个 bundle 不是幂等的。

**生效**：补丁层即时重载；改 `suppress-harness-identity.mjs` 这类**代码**要重启桌面端。装完**开一个新会话**才看得到新模式（已挂载的会话保留它启动时的插件修订）。

## 三、用起来是什么样

- **该干活就干活**：答案能用测试、编译器、类型、规范或文档机械核对时，它直接做并核对，不会硬跑一轮"反例检验"。
- **前提可疑才启动**：请求建立在没审过的假设上、第一版来自"看起来像"的模式匹配、要替换一个还能用的东西、或者它察觉自己在因为你想听而附和——这时才做一轮反例检验，**至多两轮**。
- **输出只有结论与理由**：不给"正题—反题—合题"的过程稿，只说明改了什么、为什么；改过了会讲清楚改了什么，没改会说"经得起检查"。
- **不确定就标出来**：材料里的说法要么核过、要么标明没核，不把猜测讲成事实。

## 四、验证装好了没有

1. `plugin_manager`，`action: list_plugins`：应有 `include:preset-dialectic`，`fiberPhase` 为 `active`，**没有 diagnostic**。
2. **开一个新会话**，模式列表里能看到 **Dialectic 模式**（id 是 `dialectic`）。
3. 选它、随便聊一句：persona 是辩证人格，而且 host 注入的那句 `You are an AI agent powered by …` 开场白**不出现**（`suppress-harness-identity.mjs` 生效）。

如果它**没出现**在模式列表里：先看 `preset.yml` 的 `name`／`description` 有没有被改坏（格式错了这个预设会从列表里消失），再看 `list_plugins` 里那条 row 的 diagnostic。

## 五、维护者

- **`dialectic\agent.cordis.yml` 是装配的唯一事实源**；`dialectic\cordis.patch.yml` 与 `dialectic\package.json` 是 `make-bundle-patch.mjs` 的生成物（都不入库）。改了事实源就重跑生成器——生成器会断言每个相对 `name` 都已被改写成绝对 file URL，漏一个就报错。
- `dialectic\` 在本机是**真目录**（不再是 junction）。桌面端 profile 的 `node_modules\dialectic-preset-bundle` 是指向它的符号链接——改仓库就是改生效的那份。
- 2026-10-01 起**没有"两个版本"这件事**：实验版（`dialectic-test\`）与配套的 `.dsh-test` home、`ds安装dialectic.ps1`、`ds发布dialectic.ps1`、`junction-dialectic.ps1` 都已删除（前两者是网页端/CLI 交付的工具，需要时从 git 历史取）。要试新想法就在这个目录里试，或者另开一个一次性 profile。
- 这一版在**事实源**上修掉了一个坏包名：`@deepseek-ai/dsh-workflow-worker-thread` 在 dsh 0.1.7 与 0.2.0-rc.2 的包表里都不存在（本机依赖树里那条还是个断链），已改成 `@deepseek-ai/dsh-workflow-ptc`、行 id 同步改成 `workflow-ptc`。留着旧名会让整个 delegation 组挂载失败。
- 这个预设**没有自己的运行时依赖**：`suppress-harness-identity.mjs` 只 import 平台提供的东西，所以 `dialectic\` 下不需要 `node_modules`。

## 六、许可

见 `LICENSE`。
