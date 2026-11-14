// 把 three 核心 + 独立页需要的 addons 打包成 public/vendor/three.bundle.js。
//
// 背景：public/404.html、fox-view.html、vulpa.html 是纯静态页面，原本靠
// <script type="importmap"> 指向 cdn.jsdelivr.net。国内网络经常连不上该 CDN，
// 三个页面的 3D 场景会一直卡在加载遮罩上（模块解析失败，控制台只报
// "Failed to fetch dynamically imported module"）。这里改成本地自托管。
//
// 产物是生成物，不要手改；升级 three 后跑一次 `npm run vendor:three` 即可。

import { build } from "vite";
import { access, readFile, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entry = path.join(root, "scripts/three-entry.js");
const outDir = path.join(root, "public/vendor");
const outFile = path.join(outDir, "three.bundle.js");
const force = process.argv.includes("--force");

// three 的 exports 没有暴露 ./package.json，直接按目录读。
const threePkgPath = path.join(root, "node_modules/three/package.json");
const threeVersion = JSON.parse(await readFile(threePkgPath, "utf8")).version;

async function mtime(file) {
  try {
    return (await stat(file)).mtimeMs;
  } catch {
    return 0;
  }
}

const newestSource = Math.max(await mtime(entry), await mtime(threePkgPath));
const bundleTime = await mtime(outFile);

if (!force && bundleTime > newestSource) {
  console.log(`[vendor:three] ${path.relative(root, outFile)} 已是最新，跳过。`);
  process.exit(0);
}

await build({
  configFile: false,
  root,
  logLevel: "warn",
  // 产物目录就在 public 里：关掉 publicDir，否则 Vite 会把整份 public 复制进 vendor/；
  // 同时清空 outDir，保证这里只有生成物。
  publicDir: false,
  build: {
    target: "es2020",
    minify: "esbuild",
    emptyOutDir: true,
    outDir,
    copyPublicDir: false,
    lib: {
      entry,
      formats: ["es"],
      fileName: () => "three.bundle.js",
    },
    rollupOptions: {
      output: {
        // 只有一个入口，不需要拆 chunk。
        inlineDynamicImports: true,
        banner: `/*! three.js r${threeVersion.split(".")[1]} + GLTFLoader / DRACOLoader / MeshoptDecoder\n *  由 scripts/vendor-three.mjs 从本地 node_modules 生成，请勿手改。\n *  重新生成：npm run vendor:three\n */`,
      },
    },
  },
});

// Vite 的 lib 模式在部分版本会给产物补 `.mjs`，这里统一成 three.bundle.js。
for (const candidate of ["three.bundle.mjs", "three.bundle.js"]) {
  const p = path.join(outDir, candidate);
  try {
    await access(p);
  } catch {
    continue;
  }
  if (candidate !== "three.bundle.js") {
    await writeFile(outFile, await readFile(p, "utf8"));
  }
}

const size = (await stat(outFile)).size;
console.log(
  `[vendor:three] three@${threeVersion} → ${path.relative(root, outFile)} (${(size / 1024).toFixed(0)} KB)`
);
