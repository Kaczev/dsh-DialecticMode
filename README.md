# dsh-DialecticMode

给 DeepSeek Harness（dsh）桌面端用的一个 agent preset：标准模式加一段辩证人格，再加两条按需加载的技能。

当前版本 **0.0.3**，版本号写在 `dialectic\VERSION`。

## 这是什么

它是标准模式的一个变体。与官方 `standard` 预设相比，只有两处不同。

第一处是人格。prefix 先逐字保留标准模式的开场句 `You are a coding agent powered by the {{model}} model.`，空一行，然后接上 dialectic 人格。host 注入的 `You are an AI agent powered by DeepSeek Harness.` 也留着。0.0.1 曾用一个小模块遮掉这句话，0.0.2 起不再遮。

第二处是技能。`dialectic-counter-case` 给出动手前的四条动作：说清主张和能推翻它的那一个事实、把用户的主张和环境显示的情况分开、拿用户自己说过的标准来检验、只报会改变实现的矛盾。`dialectic-verify` 给出交付前的四条动作：指得出具体缺陷才改且只改它要求的部分、留下还能通过检验的、找出当前卡住验收的那条约束、先独立作答再回归全量。这两条技能通过 `skill-filesystem` 的 `customSkillDirs` 加进来。

其余 row 与 `@deepseek-ai/dsh-web-app/presets/standard.patch.yml` 逐条一致，包括工具面、goal、plan 模式、compaction、子代理与工作流、`disabled` 标记和顺序。`check-composition.mjs` 拿安装目录里的 standard 做差集，专门守这一条。

工具面保持完整是有意的：这样对照实验比的是一套工具面加一段人格。

预设本体就是 `dialectic\` 这个目录，里面有 `cordis.patch.yml`（唯一事实源）、`package.json`（bundle 元数据）、`VERSION`，以及 `skills\` 下的两条技能。

## 安装

前提是 Windows、dsh 桌面端（本机实测宿主运行时 0.2.1-rc.2），并且仓库在本机上。`check-composition.mjs` 会按你实际装的那一份 standard 校验。

在桌面端开一个会话，让代理调用 `plugin_manager`：

```json
{ "action": "install_bundle", "target": "<仓库的绝对路径>\\dialectic" }
```

更新已有安装时，先用 `remove_bundle`（`target: "dialectic-preset-bundle"`）卸掉，再装一次。`install_bundle` 对已经装着的同一个 bundle 不幂等。

bundle 以 `link:` 装进 profile，所以 `dialectic\` 就是生效的那份，改文件即改行为。补丁层由 HMR 监视、即时重载，但新的预设修订要开一个新会话才拿得到，已挂载的会话保留它启动时的插件修订。

0.0.2 起没有生成步骤。0.0.1 的 `make-bundle-patch.mjs`、`agent.cordis.yml`、`preset.yml` 都已删除，它们服务于 dsh 0.2.0 的预设目录机制（`.agent-presets\<id>\` 目录发现）。0.2.1 改成「预设就是一条 `@deepseek-ai/dsh-agent-preset` 补丁行」，既没有目录发现，也没有第二个文件要同步。

## 用起来是什么样

- 答案能用测试、编译器、类型、规范或文档机械核对时，它直接做并核对，不会硬跑一轮反例检验。
- 请求建立在没审过的假设上、第一版来自「看起来像」的模式匹配、要换掉一个还能用的东西，或者它察觉自己在因为你想听而附和，这时才做一轮反例检验，至多两轮。
- 输出只有结论与理由：改了什么、为什么。改过了会讲清楚改了什么，没改会说「经得起检查」。
- 材料里的说法要么核过，要么标明没核，猜测不会被讲成事实。
- 原有的两句话都还在，dialectic 人格以 `You are a dialectical synthesizer: …` 接在后面。0.0.3 起人格与两条技能全篇用第二人称，不再用 "We"，与官方 skill 一样对读者说 "you"；只有《矛盾论》出处那一行以来源注释（"the mapping … this mode adds"）说明映射是本项目加的，不指向模型。

## 验证

1. 调 `plugin_manager` 的 `list_plugins`，应看到 `include:preset-dialectic`，`fiberPhase` 为 `active`。这一步只证明声明行装上了，子插件的挂载结果看第 2 步。
2. 开一个新会话。模式列表里应有 Dialectic 模式（id 是 `dialectic`），选中后不报 broken；系统提示里 dialectic 人格在，前面那两句也都在；技能目录里有 `dialectic-counter-case` 与 `dialectic-verify` 两条。
3. 离线检查，连会话都不用开，用的是安装目录里的官方 standard：

   ```powershell
   $env:ELECTRON_RUN_AS_NODE='1'
   & "$env:LOCALAPPDATA\Programs\DeepSeek Harness\DeepSeek Harness.exe" .\check-composition.mjs
   ```

   最后一行是 `OK` 即通过。脚本核对补丁层与 bundle 元数据、与 standard 的 row 列表逐条相同、差集只有 `persona.config.prefix` 与 `skill-filesystem.config` 两处、persona 不带 `suffix`、全文不出现 `{{cwd}}`、两条技能的 frontmatter 合格，以及 `customSkillDirs` 表达式在 profile 目录上真的解析到本目录。

如果它没出现在模式列表里，或者出现了但被标成 broken，先跑第 3 步。差集多了、row 少了、skills 路径解析不到，脚本都会点名，它验的是同一个组合，比肉眼看模式列表更早发现问题。

## 维护

- `dialectic\cordis.patch.yml` 是装配的唯一事实源，也是 bundle 的补丁层（`package.json` 的 `dsh.bundle.patch` 指它）。`VERSION` 与 `package.json.version` 必须一致，检查脚本会核对。
- dsh 升级时，把新版本 `…\resources\app.asar\dsh\node_modules\@deepseek-ai\dsh-web-app\presets\standard.patch.yml` 的行抄过来，重新套上那两处改动，再跑 `check-composition.mjs`。对不上时脚本会逐条说明差在哪。
- 0.2.1 有三个坑，都是这次改动里踩过的：
  1. `{{cwd}}` 不再是已注册变量。persona 不能再写 `suffix: Your working directory is {{cwd}}.`，写了提示装配会直接失败。工作目录由 runtime context（`Current working directory`）提供，与标准模式一致。
  2. 预设行在挂载时的 `baseUrl` 是 profile 目录，不是补丁文件目录。`new URL('skills/', baseUrl)` 会指向 `<profile>\skills`，那里什么都没有，而且不报错，技能就这么悄悄消失了。必须用 `createRequire(baseUrl).resolve('dialectic-preset-bundle/package.json')` 反查本项目录，bundle 以 `link:` 装着，profile 里能解析到。
  3. 0.2.0 的写法不再跟 standard 一致：`backgroundMode: continuable`、`tool-ralph`、`tool-subagent-codex` / `claude-code` 这些 extra row 都不是 standard 的一部分，已随本次对齐删除；`time-context` 与 `tool-schedule` 是 standard 新加的，已补上。
- `dialectic\` 没有运行时依赖。预设里没有自己的 `.mjs` 插件，`check-composition.mjs` 只在维护时用安装目录里的 `yaml`。
- 历史：0.0.1 的 `suppress-harness-identity.mjs` 用同名空段遮住 host 开场白，`agent.cordis.yml` / `preset.yml` 走目录预设，`make-bundle-patch.mjs` 负责把它复制成补丁层。这些随 0.2.1 的机制变化一并退役，需要时从 git 历史取。0.0.3 把人格与两条技能的人称统一成第二人称（原人格用 "We"），并把版本号从误发的 `0.2.1` 改回 `0.0.3`，那个同名标签与提交已从远端撤掉。0.0.3 这一版后来又重写过一次这份 README，预设本体的行为没有变化，所以版本号不动。

## 许可

见 `LICENSE`。
