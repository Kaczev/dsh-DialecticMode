# Dialectic 模式

Dialectic 是 DeepSeek Harness（DSH）的一个编码代理预设。它在标准模式的基础上加入辩证判断的工作指令：先检查关键假设，保留仍然成立的部分，只针对具体缺陷修改方案。

当前版本 **0.0.5**。支持 **DSH v0.2.1-rc.3 及以上版本**，npm 包名为 `dsh-dialecticmode`。

## 什么时候用

当你需要判断一个方案是否值得重写、排查需求中的冲突，或者担心模型只是顺着你的说法回答时，可以选择 Dialectic。预设要求模型把用户的主张和实际代码、数据、文档分开核对，按任务已经接受的目标与约束作判断。

能用测试、编译器、类型或明确文档直接核对的问题，仍然直接做、直接检查。只有请求依赖未经检查的假设、方案来自表面相似的经验、准备替换仍能工作的实现，或模型察觉自己在迎合用户时，才进行反例检验。

反例检验有明确的停止条件：

- 每次处理一个会改变实施方向的主要矛盾，其他问题说明暂缓的原因。
- 最多两轮；仍然无法判断，就补充事实或询问缺失的决定，不再反复辩论。
- 只有指出具体缺陷，才推翻此前的答案。没有新证据，不重新打开已经确定的决定。
- 对外报告决定与理由，不展示「正题—反题—合题」式的过程。检查改变了答案，就说明改了什么、为什么；没有改变，也说明原答案通过了检查。

这些规则通过提示词约束模型，不是独立的裁判系统，也不保证模型每次都能发现错误。

## 安装与使用

1. 在 DSH 桌面端插件页添加 `dsh-dialecticmode`，安装并启用。需要固定当前版本时，输入 `dsh-dialecticmode@0.0.5`。
2. 新建会话，在模式列表中选择 **Dialectic 模式**，预设 ID 为 `dialectic`。
3. 照常提出任务，并提供目标、约束和已有材料。模型应先读相关材料，再决定是否需要反例检验。

本地开发可安装 [dialectic 包目录](https://github.com/Kaczev/dsh-DialecticMode/tree/main/dialectic/)。更新后按插件管理器提示重载或重启，并用新会话确认新预设；不要假定已挂载的会话会立即采用新的修订。若管理器不能直接替换已有安装，可先卸载再重新安装。

## 预设里有什么

[装配补丁](https://github.com/Kaczev/dsh-DialecticMode/blob/main/dialectic/cordis.patch.yml)定义整个预设。设计上，它相对 DSH 标准模式只增加两项内容：在标准 persona 开场句之后追加辩证指令，以及注册本包的技能目录。宿主身份说明保留，工具组合、计划模式、目标工具、上下文压缩和代理委派等配置按标准模式对齐。

补丁插入的那一行由本包自己持有（`name: dsh-dialecticmode`），插件实现仍是上游的 `@deepseek-ai/dsh-agent-preset`：[preset.js](https://github.com/Kaczev/dsh-DialecticMode/blob/main/dialectic/preset.js) 把它的默认导出原样再导出一次。插件页的「包含的组件」按行的包名取标题与图标，没有按行覆盖的余地；行归本包，[图标](https://github.com/Kaczev/dsh-DialecticMode/blob/main/dialectic/icon.svg)与 [locale/](https://github.com/Kaczev/dsh-DialecticMode/tree/main/dialectic/locale/) 里的名称才落在那一行上。包清单把该上游包列为可选 peer，链接安装时宿主只把声明为 peer 的包路由到应用自带的那份。

Dialectic 随包提供两条按需加载的技能：

### 动手前：dialectic-counter-case

[技能原文](https://github.com/Kaczev/dsh-DialecticMode/blob/main/dialectic/skills/dialectic-counter-case/SKILL.md)用于检查任务前提。模型从几种动作中选取有用的一两项：说清准备采用的主张和能推翻它的事实，区分用户陈述与环境证据，按用户给出的标准检查方案，或找出会改变实现的需求冲突。

检查没有发现具体缺陷，就保留当前答案，不为了显得谨慎而制造异议。

### 交付或修订前：dialectic-verify

[技能原文](https://github.com/Kaczev/dsh-DialecticMode/blob/main/dialectic/skills/dialectic-verify/SKILL.md)用于决定是否修改、改到什么程度，以及如何验收。模型应指出具体缺陷，保留还能通过检查的部分，处理当前阻碍验收的约束；核验时先根据材料独立回答检查问题，再与草稿比较，改动后检查受影响的调用方和下游。

两条技能的适用方法及来源注释都保留在技能文件中。常驻人格负责判断是否需要检验，技能提供具体做法，不要求每次任务都把所有动作执行一遍。

## 确认安装生效

新会话中应能选中 Dialectic 模式，且预设没有加载错误。检查系统提示词时，应能看到标准模式的模型开场句，以及后接的 `You are a dialectical synthesizer`；技能列表应包含 `dialectic-counter-case` 和 `dialectic-verify`，两者都能加载。

如果模式缺失、显示损坏或找不到技能，维护者可以运行下面的装配检查。它会区分预设配置差异和技能路径解析问题。

## 维护与验证

版本同时记录在 [VERSION](https://github.com/Kaczev/dsh-DialecticMode/blob/main/dialectic/VERSION) 和[包清单](https://github.com/Kaczev/dsh-DialecticMode/blob/main/dialectic/package.json)中，两处必须一致。根 README 是文档源，npm 包内的 README 由[同步脚本](https://github.com/Kaczev/dsh-DialecticMode/blob/main/scripts/sync-readme.mjs)生成；相对链接会转换为 GitHub 链接。

在仓库根目录运行文档检查和打包预检：

```sh
node scripts/sync-readme.mjs
node scripts/sync-readme.mjs --verify
node --test tests/*.test.mjs
npm pack ./dialectic --dry-run
```

[装配检查脚本](https://github.com/Kaczev/dsh-DialecticMode/blob/main/check-composition.mjs)读取本机已安装的官方标准预设，逐项比较插件顺序与配置，只允许 persona 和技能目录两处差异；同时检查版本、技能元数据及技能目录解析。Windows 默认安装路径下，在仓库根目录用 PowerShell 运行：

```powershell
$env:ELECTRON_RUN_AS_NODE = '1'
try {
    & "$env:LOCALAPPDATA\Programs\DeepSeek Harness\DeepSeek Harness.exe" .\check-composition.mjs
} finally {
    Remove-Item Env:ELECTRON_RUN_AS_NODE
}
```

脚本需要桌面端运行时读取 `app.asar` 内的文件，普通 Node 无法代替。技能路径检查会使用 desktop profile 中安装的包；要检查本地源码，应先把本地包安装到该 profile。

DSH 升级后应重新运行装配检查。Dialectic 保存了标准模式的配置副本，不会自动继承未来的标准预设变动；若检查发现额外差异，应先对齐新版标准配置，再保留上述两项定制。

## 许可

本项目采用 [MIT 许可](https://github.com/Kaczev/dsh-DialecticMode/blob/main/LICENSE)。
