#!/usr/bin/env node
// 打包清单守卫 — 源码级,零依赖,无需先构建。
//
// 不变式:凡是被打包 HTML 在运行时引用的本地 .js/.css,必须自己也在
// package.json `build.files` 白名单里;每个渲染 HTML 自身同理。
//
// 由来(2026-07-12,P4 dogfood):index.html 有
// `<script src="eyeflow-reminder-engine.js">`,但该模块从没被加进 build.files
// 这个显式白名单 → `npm start`(从工作目录加载)照跑,而打包版 asar 不含它
// → 脚本 404、整套压力引擎在装机版上是死的。这个洞靠人肉 asar 解包才发现。
// 本守卫把「引用了却没登记」变成红灯,不该再靠肉眼抓第二次。
//
// build.files 是 glob 白名单——本守卫支持 `*` / `**` / `?`,不止精确名。

const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const buildFiles = (pkg.build && pkg.build.files) || [];

let failures = 0;
let checks = 0;
function assert(cond, label) {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${label}`);
  }
}

// glob(`*`=非/单段任意,`**`=跨段任意,`?`=单字符)→ RegExp。build.files 用
// 的就是 electron-builder 的 minimatch 语义,这里覆盖实际会用到的子集。
function globToRegExp(glob) {
  let re = "^";
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        re += ".*";
        i += 1;
        if (glob[i + 1] === "/") i += 1; // `**/` 也吞掉紧邻的斜杠
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else if (".+^${}()|[]\\".includes(c)) {
      re += `\\${c}`;
    } else {
      re += c;
    }
  }
  return new RegExp(re + "$");
}

// electron-builder 允许 `!pattern` 排除;本守卫只关心正向覆盖,忽略排除项
// (若将来真用排除去掉运行时引用的资源,那是另一类错,交给打包版 smoke 抓)。
const includeMatchers = buildFiles
  .filter((p) => typeof p === "string" && !p.startsWith("!"))
  .map((p) => globToRegExp(p.replace(/^\.\//, "")));

function isBundled(relPath) {
  const clean = relPath.replace(/^\.\//, "");
  return includeMatchers.some((re) => re.test(clean));
}

// 根目录下的渲染 HTML(main 通过 loadFile 装载的那几张)。新加的渲染 HTML
// 落在根目录即自动纳入,不用改本守卫。
const htmlFiles = fs
  .readdirSync(root)
  .filter((f) => f.endsWith(".html"))
  .sort();

assert(htmlFiles.length > 0, "找到至少一张渲染 HTML");

let refCount = 0;
for (const html of htmlFiles) {
  // HTML 自身必须在白名单里,否则整张页面进不了包。
  assert(isBundled(html), `${html} 自身在 build.files 白名单`);

  const src = fs.readFileSync(path.join(root, html), "utf8");
  const refs = new Set();
  const re = /(?:src|href)\s*=\s*"([^"]+\.(?:js|css))"/gi;
  let m;
  while ((m = re.exec(src)) !== null) {
    const ref = m[1];
    // 只查本地相对引用;外链 / 协议相对 / 绝对路径不归打包管。
    if (/^(?:https?:)?\/\//i.test(ref)) continue;
    if (ref.startsWith("/") || ref.startsWith("data:")) continue;
    refs.add(ref);
  }

  for (const ref of [...refs].sort()) {
    refCount += 1;
    assert(isBundled(ref), `${html} 引用的本地资源 "${ref}" 已登记进 build.files`);
  }
}

// main.js 的本地 require("./x") 也必须在 build.files —— 与 HTML <script> 同一类洞的
// node 侧孪生:漏登记则打包版 require 抛 MODULE_NOT_FOUND(不像 HTML 只是 404)。
const mainEntry = pkg.main || "main.js";
if (fs.existsSync(path.join(root, mainEntry))) {
  const mainSrc = fs.readFileSync(path.join(root, mainEntry), "utf8");
  const reqRe = /require\(\s*["'](\.\/[^"']+)["']\s*\)/g;
  const seen = new Set();
  let rm;
  while ((rm = reqRe.exec(mainSrc)) !== null) {
    let ref = rm[1].replace(/^\.\//, "");
    if (!/\.[cm]?js$/.test(ref)) ref += ".js"; // require 省略的 .js 后缀补齐
    if (seen.has(ref)) continue;
    seen.add(ref);
    refCount += 1;
    assert(isBundled(ref), `${mainEntry} require 的本地模块 "${ref}" 已登记进 build.files`);
  }
}

if (failures > 0) {
  console.error(
    `\n[smoke:build-manifest] RED — ${failures}/${checks} 项未过。` +
      `有 HTML 引用的本地资源没进 build.files 白名单,打包版会 404。` +
      `补进 package.json 的 build.files 再跑。`
  );
  process.exit(1);
}

console.log(
  `[smoke:build-manifest] PASSED. ${checks} checks green — ` +
    `${htmlFiles.length} 张渲染 HTML、${refCount} 个本地引用全部已登记进 build.files。`
);
