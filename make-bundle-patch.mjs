// make-bundle-patch.mjs —— 从 dialectic 的**单一事实源**生成 profile bundle 需要的两个文件。
//
// 生成物（都在 `dialectic\` 里，都与 Kaz 那份一样**不入库**）：
//   dialectic\package.json      版本号取自 dialectic\VERSION，声明 dsh.bundle.patch
//   dialectic\cordis.patch.yml  一行 insert：把预设声明成 `preset-dialectic`
//
// 为什么要生成而不是手写：这个补丁层的 `plugins:` 是 `dialectic\agent.cordis.yml` 的**逐行副本**
// （预设声明里的 plugins 必须是行内条目，没有"引用外部文件"这回事），而那份文件有 250+ 行、
// 含一大段 persona 块标量。手抄一次就多一份会走形的副本；生成器让它每次都可复现。
//
// 与事实源**故意不同**的一处改写，写死在下面的 RENAMES 里：
//   1. 相对 name（`./suppress-harness-identity.mjs`）换成**绝对 file URL**。
//      相对 name 的锚点在两处不一致：离线组合（`--dump-config`）按补丁文件所在目录锚定，
//      而真实挂载时按**进程工作目录**解析——绝对地址在两种路径下都是同一个地址。
//      （这条是 Kaz 那份生成物的头注释里记录的实测结论，照抄。）
//
// 另有一处**曾经在这里补偿、2026-10-01 起改在事实源里修掉了**：
// `@deepseek-ai/dsh-workflow-worker-thread` -> `@deepseek-ai/dsh-workflow-ptc`（行 id 同步改名）。
// 旧包名在 0.1.7 与桌面端 0.2.0-rc.2 的包表里都不存在，本机 farm 里那条是个断链——留着它会让
// 整个 delegation 组挂载失败。现在 `dialectic\agent.cordis.yml` 自己写着 workflow-ptc，
// 生成器只保留下面 `knownGone` 那道守卫，防止旧名再被写回来。
//
// 跑法（桌面端没有独立的 node.exe，用它自己的运行时）：
//   $env:ELECTRON_RUN_AS_NODE=1; & "<安装目录>\DeepSeek Harness.exe" <本文件绝对路径>
// 或者任何一份 Node 24。

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = dirname(fileURLToPath(import.meta.url));
const PRESET_DIR = join(REPO, "dialectic");
const SOURCE = join(PRESET_DIR, "agent.cordis.yml");
const PRESET_YML = join(PRESET_DIR, "preset.yml");
const VERSION_FILE = join(PRESET_DIR, "VERSION");
const OUT_PACKAGE = join(PRESET_DIR, "package.json");
const OUT_PATCH = join(PRESET_DIR, "cordis.patch.yml");

/** 补丁层里 `plugins:` 与它下面的条目共用的缩进（与官方预设的写法一致）。 */
const INDENT = "        ";

/** 相对 name -> 绝对 file URL。锚点是**本仓库的** dialectic 目录，不是某个 home。 */
const RENAMES = [
  {
    match: /^(\s*)name: \.\/suppress-harness-identity\.mjs\s*$/u,
    to: (indent) => `${indent}name: ${pathToFileURL(join(PRESET_DIR, "suppress-harness-identity.mjs")).href}`,
    why: "相对 name 换成绝对 file URL",
  },
];

/** 包名/行 id 的改名。2026-10-01 起全部改在事实源里，这里留空；`knownGone` 负责守。 */
const PACKAGE_RENAMES = [];

const fail = (message) => {
  console.error(`FAIL ${message}`);
  process.exit(1);
};

const readText = (path) => {
  if (!existsSync(path)) fail(`missing ${path}`);
  return readFileSync(path, "utf8");
};

// ── 事实源读取 ──────────────────────────────────────────────────────────────

const presetText = readText(PRESET_YML);
const field = (key) => {
  const match = new RegExp(`^${key}:\\s*(.+)$`, "mu").exec(presetText);
  if (match === null) fail(`preset.yml: no \`${key}:\` line`);
  return match[1].trim();
};
const presetName = field("name");
const presetDescription = field("description");
const presetOrder = field("order");

if (!/^\d+$/u.test(presetOrder)) fail(`preset.yml: order must be an integer, got ${presetOrder}`);

const version = readText(VERSION_FILE).trim();
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?$/u.test(version)) fail(`VERSION: unexpected shape ${JSON.stringify(version)}`);

// ── 逐行变换 ────────────────────────────────────────────────────────────────

const allLines = readText(SOURCE).split(/\r?\n/u);
const firstRow = allLines.findIndex((line) => /^- id:/u.test(line));
if (firstRow < 0) fail(`${SOURCE}: no top-level \`- id:\` row found`);

const rawRows = allLines.slice(firstRow);
while (rawRows.length > 0 && rawRows[rawRows.length - 1].trim() === "") rawRows.pop();
if (rawRows.some((line) => line.length > 0 && !/^\s/u.test(line) && !/^- id:/u.test(line) && !/^#/u.test(line))) {
  fail(`${SOURCE}: a non-indented, non-comment line appeared after the first row — the file is not a flat row list`);
}

const rows = rawRows.map((line) => (line.length === 0 ? "" : INDENT + line));

const counts = { renames: 0, packageRenames: 0 };
for (const [index, line] of rows.entries()) {
  for (const rename of RENAMES) {
    const match = rename.match.exec(line);
    if (match === null) continue;
    rows[index] = rename.to(match[1]);
    counts.renames += 1;
  }
}
for (const rename of PACKAGE_RENAMES) {
  const idPattern = new RegExp(`^(\\s*)- id: ${rename.idFrom}\\s*$`, "u");
  const namePattern = new RegExp(`^(\\s*)name: '${rename.nameFrom.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}'\\s*$`, "u");
  let sawId = false;
  let sawName = false;
  for (const [index, line] of rows.entries()) {
    const idMatch = idPattern.exec(line);
    if (idMatch !== null) {
      rows[index] = `${idMatch[1]}- id: ${rename.idTo}`;
      sawId = true;
      continue;
    }
    const nameMatch = namePattern.exec(line);
    if (nameMatch !== null) {
      rows[index] = `${nameMatch[1]}name: '${rename.nameTo}'`;
      sawName = true;
    }
  }
  if (!sawId || !sawName) fail(`${SOURCE}: expected both \`id: ${rename.idFrom}\` and \`name: '${rename.nameFrom}'\` (${rename.why})`);
  counts.packageRenames += 1;
}

// 剩下的相对 name 一律是错误：这条补丁层只能用绝对地址（见文件头第 1 条）。
const relative = rows.filter((line) => /^\s*name: \.\//u.test(line));
if (relative.length > 0) fail(`${SOURCE}: ${relative.length} relative \`name:\` row(s) left; add them to RENAMES — ${relative[0].trim()}`);

// 旧包名一个都不许留下（含 workflow-worker-thread 之外的已知改名）。
// 只看真正的行，不看注释：事实源里会**解释**这些改名，注释里出现旧名是应该的。
const codeRows = rows.filter((line) => !/^\s*#/u.test(line));
const knownGone = ["@deepseek-ai/dsh-workflow-worker-thread", "@deepseek-ai/dsh-agent-presets", "@deepseek-ai/dsh-tool-plugin-manager"];
for (const gone of knownGone) {
  if (codeRows.some((line) => line.includes(gone))) fail(`${SOURCE}: still references ${gone}, which does not exist in desktop 0.2.0-rc.2`);
}

// ── 写出 ────────────────────────────────────────────────────────────────────

const header = [
  "# Generated by make-bundle-patch.mjs -- do not edit by hand; re-run the generator.",
  "#",
  "# dialectic 的 profile bundle 补丁层。它只做一件事：把预设声明成 `preset-dialectic`，",
  "# 让它在桌面端（dsh 0.2.0-rc.2）的模式选择器里出现。",
  "#",
  "# `plugins:` 是 `dialectic\\agent.cordis.yml` 的逐行副本（预设声明里的 plugins 必须是",
  "# 行内条目，没有引用外部文件这回事）。事实源仍然是那个文件；这一份是它的生成物。",
  "#",
  "# 与事实源故意不同的一处（生成器里的 RENAMES 是它的唯一出处）：",
  "#   `./suppress-harness-identity.mjs` -> 绝对 file URL：相对 name 的锚点在",
  "#   `--dump-config` 的离线组合（按补丁文件所在目录）与真实挂载（按进程 CWD）",
  "#   两处不一致，绝对地址在两种路径下都是同一个地址。",
  "#",
  "# 注意 `skill-filesystem` 那行的 customSkillDirs 用的是 `!!js ... new URL('skills/', baseUrl)`：",
  "# `baseUrl` 是**本补丁文件所在目录**，也就是 dialectic\\，所以它指的是 dialectic\\skills\\。",
  "- insert:",
  "    - id: preset-dialectic",
  "      name: '@deepseek-ai/dsh-agent-preset'",
  "      config:",
  "        id: dialectic",
  `        name: '${presetName.replace(/'/gu, "''")}'`,
  `        description: '${presetDescription.replace(/'/gu, "''")}'`,
  `        order: ${presetOrder}`,
  "        plugins:",
];

writeFileSync(OUT_PATCH, `${[...header, ...rows].join("\n")}\n`);

const pkg = {
  name: "dialectic-preset-bundle",
  version,
  private: true,
  dsh: { bundle: { patch: ["./cordis.patch.yml"] } },
};
writeFileSync(OUT_PACKAGE, `${JSON.stringify(pkg, null, 4)}\n`);

console.log(`wrote ${OUT_PACKAGE} (version ${version})`);
console.log(`wrote ${OUT_PATCH} (${rows.length} plugin lines, ${counts.renames} path rewrite(s), ${counts.packageRenames} package rename(s))`);
