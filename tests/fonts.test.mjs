import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const pages = [
  'index.html',
  'archive.html',
  'public/404.html',
  'public/bookshelf.html',
  'public/fox-view.html',
  'public/vulpa.html',
];

// 全站不允许再出现的外部资源域名（字体 / CDN / Draco 解码器）
const forbiddenHosts = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'www.gstatic.com',
  'cdn.jsdelivr.net',
  'unpkg.com',
  'cdnjs.cloudflare.com',
];

const scannedFiles = [
  ...pages,
  'src/fox-companion.js',
  'src/main.js',
  'src/archive.js',
  'src/island.js',
];

function localFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir, {withFileTypes: true})) {
    if (name.name.startsWith('.')) continue;
    const full = path.join(dir, name.name);
    if (name.isDirectory()) out.push(...localFiles(full));
    else out.push(full);
  }
  return out;
}

test('No page or script references external font/CDN hosts', () => {
  for (const file of scannedFiles) {
    const full = path.join(root, file);
    if (!existsSync(full)) continue;
    const text = readFileSync(full, 'utf8');
    for (const host of forbiddenHosts) {
      assert.ok(
        !text.includes(host),
        `${file} 仍引用外部域名 ${host}，应改为本地自托管资源`
      );
    }
  }
});

test('Every page links the local self-hosted font stylesheet', () => {
  for (const page of pages) {
    const html = readFileSync(path.join(root, page), 'utf8');
    assert.ok(
      /<link[^>]*rel=["']?stylesheet["']?[^>]*href=["']\/fonts\/fonts\.css/i.test(html) ||
        html.includes('href="/fonts/fonts.css"'),
      `${page} 缺少本地字体样式表 /fonts/fonts.css`
    );
    assert.ok(
      !html.includes('fonts.googleapis.com'),
      `${page} 仍残留 Google Fonts 引用`
    );
  }
});

test('fonts.css exists and every url() resolves to a shipped woff2 file', () => {
  const fontsDir = path.join(root, 'public', 'fonts');
  const cssPath = path.join(fontsDir, 'fonts.css');
  assert.ok(existsSync(cssPath), 'public/fonts/fonts.css 不存在');
  const css = readFileSync(cssPath, 'utf8');
  const urls = [...css.matchAll(/url\('\.\/([^']+)'\)/g)].map((m) => m[1]);
  assert.ok(urls.length >= 10, `fonts.css 只声明了 ${urls.length} 个字体文件，疑似生成不完整`);
  for (const file of urls) {
    assert.ok(
      existsSync(path.join(fontsDir, file)),
      `fonts.css 引用的 ${file} 未随仓库提供`
    );
    assert.ok(!file.startsWith('http'), 'fonts.css 不应引用远程地址');
  }
  assert.ok(
    css.includes('font-display: swap'),
    '自托管字体仍需 font-display: swap 避免 FOUT 白屏'
  );
});

test('Draco decoder is vendored locally for fox pages', () => {
  const dracoDir = path.join(root, 'public', 'vendor', 'draco');
  for (const file of ['draco_wasm_wrapper.js', 'draco_decoder.wasm']) {
    assert.ok(
      existsSync(path.join(dracoDir, file)),
      `public/vendor/draco/${file} 缺失，GLTF 加载会退回 gstatic CDN`
    );
  }
  for (const file of ['src/fox-companion.js', 'public/fox-view.html']) {
    const text = readFileSync(path.join(root, file), 'utf8');
    assert.ok(
      text.includes('setDecoderPath("/vendor/draco/")'),
      `${file} 的 Draco 解码器路径未指向本地 /vendor/draco/`
    );
  }
});
