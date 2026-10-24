// check-composition.mjs —— 把本预设与**本机已安装的** dsh 的官方 standard 预设做差集。
//
// 为什么需要它：这个预设的契约是「标准模式 + 两处改动」。dsh 升级时 standard 会加 row、
// 改 config、删包，漏跟一步就可能让预设挂不上（或者静默少一个工具）。这个脚本直接读
// 安装目录里的 `presets/standard.patch.yml`，逐 row 比形状与配置，只放行两处差异。
//
// 跑法（桌面端没有独立 node.exe；asar 里的文件只有它自己的运行时能读）：
//   $env:ELECTRON_RUN_AS_NODE='1'
//   & "$env:LOCALAPPDATA\Programs\DeepSeek Harness\DeepSeek Harness.exe" .\check-composition.mjs
//
// 退出码 0 = 通过；1 = 有 FAIL 行。

import { readFileSync, readdirSync, existsSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { npmReadme } from "./scripts/sync-readme.mjs";

const REPO = dirname(fileURLToPath(import.meta.url));
const PRESET_DIR = join(REPO, "dialectic");
const PATCH = join(PRESET_DIR, "cordis.patch.yml");
const INSTALL = join(process.env.LOCALAPPDATA ?? "", "Programs", "DeepSeek Harness");
const APP = join(INSTALL, "resources", "app.asar", "dsh") + "\\";
const STANDARD = join(APP, "node_modules", "@deepseek-ai", "dsh-web-app", "presets", "standard.patch.yml");

const problems = [];
const notes = [];
const fail = (message) => problems.push(message);

if (!existsSync(STANDARD)) {
  console.error(`FAIL cannot read the installed standard preset: ${STANDARD}`);
  console.error("     run this through the desktop runtime (plain node cannot read inside app.asar):");
  console.error('       $env:ELECTRON_RUN_AS_NODE=\'1\'; & "$env:LOCALAPPDATA\\Programs\\DeepSeek Harness\\DeepSeek Harness.exe" .\\check-composition.mjs');
  process.exit(1);
}

if (!existsSync(PATCH)) {
  console.error(`FAIL missing ${PATCH}`);
  process.exit(1);
}

const YAML = createRequire(APP)("yaml");

/** Parse an installable patch after blanking the `!!js` tag, which the offline reader cannot evaluate. */
const load = (path) => YAML.parse(readFileSync(path, "utf8").replaceAll("!!js ", ""));

const dshVersion = JSON.parse(readFileSync(join(APP, "package.json"), "utf8")).version;
const standardPatch = load(STANDARD);
const dialecticPatch = load(PATCH);

// ── 1. 补丁层与 bundle 元数据 ───────────────────────────────────────────────

const rowsOf = (patch) => {
  if (!Array.isArray(patch) || patch.length !== 1) throw new Error(`expected one top-level patch entry, got ${patch?.length}`);
  const entry = patch[0];
  if (!Array.isArray(entry?.insert) || entry.insert.length !== 1) throw new Error("expected one inserted row");
  return entry.insert[0];
};

let row;
try {
  row = rowsOf(dialecticPatch);
} catch (error) {
  console.error(`FAIL cordis.patch.yml: ${error.message}`);
  process.exit(1);
}

if (row.id !== "preset-dialectic") fail(`row id is ${JSON.stringify(row.id)}, expected "preset-dialectic"`);
if (row.name !== "@deepseek-ai/dsh-agent-preset") fail(`row name is ${JSON.stringify(row.name)}`);
if (row.config?.id !== "dialectic") fail(`preset id is ${JSON.stringify(row.config?.id)}`);
if (row.config?.order !== 10) fail(`preset order is ${JSON.stringify(row.config?.order)}`);
if (typeof row.config?.name !== "string" || row.config.name.length === 0) fail("preset display name is missing");
if (typeof row.config?.description !== "string" || row.config.description.length === 0) fail("preset description is missing");

const pkg = JSON.parse(readFileSync(join(PRESET_DIR, "package.json"), "utf8"));
if (pkg.name !== "dsh-dialecticmode") fail(`package.json name is ${JSON.stringify(pkg.name)}, expected "dsh-dialecticmode" (the npm package name)`);
if (pkg.private === true) fail("package.json is private, so `npm publish` would refuse it");
if (pkg.dsh?.bundle?.patch?.length !== 1 || pkg.dsh.bundle.patch[0] !== "./cordis.patch.yml") {
  fail(`package.json dsh.bundle.patch is ${JSON.stringify(pkg.dsh?.bundle?.patch)}`);
}
if (!Array.isArray(pkg.files) || !pkg.files.includes("cordis.patch.yml") || !pkg.files.includes("skills")) {
  fail(`package.json files is ${JSON.stringify(pkg.files)}; the tarball must carry cordis.patch.yml and skills`);
}
const version = readFileSync(join(PRESET_DIR, "VERSION"), "utf8").trim();
if (pkg.version !== version) fail(`package.json version ${pkg.version} != VERSION ${version}`);
const readme = readFileSync(join(REPO, "README.md"), "utf8");
if (readFileSync(join(PRESET_DIR, "README.md"), "utf8") !== npmReadme(readme)) {
  fail("npm README is out of sync; run node scripts/sync-readme.mjs");
}
if (/当前版本 \*\*([^*]+)\*\*/u.exec(readme)?.[1] !== version) {
  fail(`README current version does not match VERSION ${version}`);
}

// ── 2. 与 standard 逐 row 做差集 ────────────────────────────────────────────

const standardRows = rowsOf(standardPatch).config.plugins;
const rows = row.config?.plugins;

if (!Array.isArray(rows)) {
  console.error("FAIL preset declares no plugin list");
  process.exit(1);
}

const shape = (list) => list.map((entry) => `${entry.id} :: ${entry.name}`);
if (JSON.stringify(shape(rows)) !== JSON.stringify(shape(standardRows))) {
  fail(`row list differs from standard:\n  ours: ${shape(rows).join(", ")}\n  std:  ${shape(standardRows).join(", ")}`);
}

const diffPaths = [];
const compare = (left, right, path) => {
  if (left === right) return;
  const bothObjects = typeof left === "object" && left !== null && typeof right === "object" && right !== null;
  if (!bothObjects) {
    diffPaths.push(path);
    return;
  }
  for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
    if (!(key in left) || !(key in right)) diffPaths.push(`${path}.${key}`);
    else compare(left[key], right[key], `${path}.${key}`);
  }
};

for (const [index, entry] of rows.entries()) compare(entry, standardRows[index], `plugins[${entry.id}]`);

const EXPECTED_DIFFS = ["plugins[persona].config.prefix", "plugins[skill-filesystem].config"];
for (const path of diffPaths) if (!EXPECTED_DIFFS.includes(path)) fail(`unexpected difference from standard at ${path}`);
for (const path of EXPECTED_DIFFS) if (!diffPaths.includes(path)) fail(`expected a difference at ${path}, found none`);

// ── 3. persona：只插入，不删除，不写 {{cwd}} ────────────────────────────────

const persona = rows.find((entry) => entry.id === "persona");
const standardPersona = standardRows.find((entry) => entry.id === "persona");
const prefix = persona?.config?.prefix ?? "";
const opener = standardPersona.config.prefix;
const dialecticText = prefix.startsWith(`${opener}\n\n`) ? prefix.slice(opener.length + 2) : prefix;

if (!prefix.startsWith(`${opener}\n\n`)) fail(`persona prefix does not start with the standard opener ${JSON.stringify(opener)}`);
if ("suffix" in (persona?.config ?? {})) fail("persona config carries a suffix; standard has none, and a {{cwd}} suffix fails prompt assembly");
for (const fragment of [
  "You are a dialectical synthesizer",
  "At most two counter-rounds",
  "Revise an earlier answer only when you can point to a specific defect",
  "Keep the counter-pass internal",
]) {
  if (!dialecticText.includes(fragment)) fail(`persona text is missing ${JSON.stringify(fragment)}`);
}
if (prefix.endsWith("\n")) fail("persona prefix ends with a newline (it would add a stray blank line)");
for (const match of prefix.matchAll(/\{\{([^}]*)\}\}/gu)) {
  if (match[1].trim() !== "model") fail(`persona prefix references the unregistered prompt variable ${JSON.stringify(match[0])}`);
}

// The host opener must survive: no suppression row, no empty-section shadowing module.
const raw = readFileSync(PATCH, "utf8");
if (raw.includes("suppress-harness-identity")) fail("patch still references suppress-harness-identity");
const strings = [];
const collect = (value) => {
  if (typeof value === "string") strings.push(value);
  else if (Array.isArray(value)) for (const item of value) collect(item);
  else if (typeof value === "object" && value !== null) for (const item of Object.values(value)) collect(item);
};
collect(dialecticPatch);
if (strings.some((text) => text.includes("{{cwd}}"))) fail("patch references {{cwd}}, which 0.2.1 no longer registers");

// ── 4. skills：目录、frontmatter、以及加载时的解析结果 ──────────────────────

const skillRoot = join(PRESET_DIR, "skills");
const skillDirs = existsSync(skillRoot) ? readdirSync(skillRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()) : [];
const expectedSkills = ["dialectic-counter-case", "dialectic-verify"];
for (const name of expectedSkills) {
  if (!skillDirs.some((entry) => entry.name === name)) {
    fail(`missing skill directory ${name}`);
    continue;
  }
  const text = readFileSync(join(skillRoot, name, "SKILL.md"), "utf8");
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/u.exec(text);
  if (frontmatter === null) {
    fail(`skills/${name}/SKILL.md has no frontmatter`);
    continue;
  }
  const meta = YAML.parse(frontmatter[1]);
  if (meta.name !== name) fail(`skills/${name}/SKILL.md names ${JSON.stringify(meta.name)}`);
  if (typeof meta.description !== "string" || meta.description.length < 40) fail(`skills/${name}/SKILL.md description is missing or short`);
}
for (const entry of skillDirs) if (!expectedSkills.includes(entry.name)) fail(`unexpected skill directory ${entry.name}`);

const skillRow = rows.find((entry) => entry.id === "skill-filesystem");
const configured = skillRow?.config?.customSkillDirs;
if (!Array.isArray(configured) || configured.length !== 1) fail(`customSkillDirs is ${JSON.stringify(configured)}`);
else {
  const keys = Object.keys(skillRow.config).join(",");
  if (keys !== "customSkillDirs") fail(`skill-filesystem config has extra keys: ${keys}`);
  if (!configured[0].includes(`${pkg.name}/package.json`)) fail(`customSkillDirs does not resolve the bundle's own package.json (${pkg.name})`);

  // Evaluate the expression exactly as the loader does at mount time: baseUrl is the profile directory.
  const dshHome = process.env.DSH_HOME || join(homedir(), ".dsh");
  const profileDir = join(dshHome, "profiles", "desktop");
  if (existsSync(profileDir)) {
    try {
      const evaluate = new Function("baseUrl", `return (${configured[0]})`);
      const resolved = realpathSync(evaluate(pathToFileURL(profileDir).href + "/"));
      const ours = realpathSync(skillRoot);
      if (resolved !== ours) fail(`customSkillDirs resolves to ${resolved}, expected ${ours}`);
      else notes.push(`customSkillDirs resolves to ${resolved} (baseUrl = ${profileDir})`);
    } catch (error) {
      fail(`customSkillDirs fails to resolve from ${profileDir}: ${error.code ?? error.message} — install the bundle first (plugin_manager install_bundle)`);
    }
  } else {
    notes.push(`skipped customSkillDirs resolution: ${profileDir} does not exist`);
  }
}

// ── 5. 结论 ────────────────────────────────────────────────────────────────

console.log(`dsh ${dshVersion} · ${pathToFileURL(STANDARD).href}`);
console.log(`rows: ${rows.length} (standard: ${standardRows.length}), differences: ${diffPaths.length ? diffPaths.join(", ") : "(none)"}`);
for (const note of notes) console.log(`note: ${note}`);
if (problems.length === 0) console.log("OK composition is standard + the persona insert + the skills dir");
else for (const problem of problems) console.error(`FAIL ${problem}`);
process.exit(problems.length === 0 ? 0 : 1);
