/**
 * 去掉 host 注入的开场白 "You are an AI agent powered by DeepSeek Harness."
 *
 * 为什么需要一个小模块而不是一行配置：
 *   `dsh-system-prompt` 服务由 host 组合持有（预设不能重新挂它，那样会声明一个进程级服务），
 *   而 `harness:identity` 这个段是它在构造时注册进 **global 层**的；它的
 *   `includeHarnessIdentity` 开关也只在该服务的配置里。预设能用的口子是
 *   **同名段覆盖**：scoped 段会遮住 global 的同名段（`SystemPrompt.section()` 的注释原文），
 *   而渲染时 `text.length === 0` 的段会被丢掉（renderPrompt 的 filter）。
 *   所以"注册一个同名空段"等于把这句话去掉。
 *
 * 代价与边界：
 *   * 这是**预设作用域**内的删除，只影响本预设的会话；别的预设照旧。
 *   * 它依赖上游的段名 `"harness:identity"`。上游改名的话这里会静默失效
 *     （空段遮不住，那句话又回来了）——所以 `check-harness-identity.mjs` 会核对这个名字。
 *   * 删掉的只是"你是谁"这句；工具指引、环境快照、persona 段落都照常装配。
 */

export const name = 'suppress-harness-identity'

/** 需要提示注册表；缺失时本行保持 pending，不会静默失败。 */
export const inject = ['systemPrompt']

/**
 * 在本预设的作用域里注册一个空的 harness:identity 段，遮住 host 那句开场白。
 * @param {import('@deepseek-ai/cordis').Context} ctx - 预设挂载时的 agent 作用域上下文。
 */
export function apply(ctx) {
  ctx.effect(() => ctx.systemPrompt.section({
    name: 'harness:identity',
    order: ctx.systemPrompt.getSectionOrder('HARNESS_IDENTITY'),
    text: '',
  }), 'suppress-harness-identity')
}
