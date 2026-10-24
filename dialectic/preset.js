// 这一行的插件类属于上游 @deepseek-ai/dsh-agent-preset，本包只把它的默认导出重新导出一次。
//
// 为什么不让补丁直接插上游包名：插件页「包含的组件」按行的 name 去取 meta
// （readPluginMeta(row.name)），行图标与行标题都只来自那个模块。直插上游，行上就只有
// 上游的默认占位图与「Agent 预设定义」。这一行归本包，行图标（icon.svg）与行标题
// （locale/）才落在 Dialectic 身上。
//
// 类本身仍是上游那一个：Config、inject、EntryGroup 全随类，预设行为一字不变。
export { default } from '@deepseek-ai/dsh-agent-preset';
