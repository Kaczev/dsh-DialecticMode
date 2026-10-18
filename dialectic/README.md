# dsh-dialecticmode

给 **DeepSeek Harness（dsh）桌面端**用的 agent preset：标准模式加一段辩证人格，再加两条按需加载的技能（`dialectic-counter-case`、`dialectic-verify`）。preset id 是 `dialectic`，模式列表里显示为 **Dialectic 模式**。

## 安装

在桌面端打开 **添加插件**，输入：

```
dsh-dialecticmode
```

装完在插件页启用，然后**开一个新会话**，模式列表里就会出现 Dialectic 模式。命令行等价物是 `dsh plugin add dsh-dialecticmode`。

更新走「先卸载、再装」：先卸载 `dsh-dialecticmode`，再装一次。

## 需要什么

- dsh 桌面端，Windows。
- 能连上 npm 或配好的镜像源。
- 没有运行时依赖，不 import 任何 `@deepseek-ai/*`。

## 更多

完整说明、与标准模式的差集清单和维护约定在仓库里：<https://github.com/Kaczev/dsh-DialecticMode>。

MIT。
