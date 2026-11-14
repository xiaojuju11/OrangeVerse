import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync, statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundlePath = path.join(root, 'public/vendor/three.bundle.js');

// public/ 下的独立页不经过 Vite 模块图，必须引用同源打包产物。
const vendorPages = ['public/404.html', 'public/fox-view.html', 'public/vulpa.html'];

function read(page) {
  return readFileSync(path.join(root, page), 'utf8');
}

test('three 的本地打包产物存在且导出独立页需要的模块', () => {
  assert.ok(existsSync(bundlePath), '缺少 public/vendor/three.bundle.js，请执行 npm run vendor:three');
  const source = readFileSync(bundlePath, 'utf8');
  for (const name of ['GLTFLoader', 'DRACOLoader', 'MeshoptDecoder', 'WebGLRenderer', 'Scene']) {
    assert.ok(
      new RegExp(`as ${name}\\b`).test(source) || new RegExp(`\\b${name}\\b`).test(source),
      `打包产物缺少导出 ${name}`
    );
  }
});

test('打包产物的 three 版本与 package.json 保持一致', () => {
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  const expected = `three.js r${pkg.dependencies.three.split('.')[1]}`;
  const banner = readFileSync(bundlePath, 'utf8').slice(0, 200);
  assert.ok(
    banner.includes(expected),
    `产物版本与依赖不一致：期望 ${expected}，实际横幅为 ${banner.split('\n')[0]}`
  );
});

test('独立页引用同源 three 打包产物，不再走 importmap / 外部 CDN', () => {
  for (const page of vendorPages) {
    const html = read(page);
    assert.ok(
      html.includes('from "/vendor/three.bundle.js"'),
      `${page} 未引用 /vendor/three.bundle.js`
    );
    assert.ok(!html.includes('type="importmap"'), `${page} 仍在使用 importmap`);
    assert.ok(!/cdn\.jsdelivr\.net|unpkg\.com|esm\.sh/i.test(html), `${page} 仍引用外部 CDN`);
  }
});

test('独立页不再出现 three 的 bare import', () => {
  for (const page of vendorPages) {
    const html = read(page);
    for (const match of html.matchAll(/^\s*import[^\n]*from\s+["']([^"']+)["']/gm)) {
      const spec = match[1];
      assert.ok(
        !spec.startsWith('three') && !spec.startsWith('three/'),
        `${page} 仍存在 bare import: ${spec}`
      );
    }
  }
});

test('打包开关在 dev / build / test 前自动执行，产物不会变陈旧', () => {
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  for (const hook of ['predev', 'prebuild', 'pretest']) {
    assert.equal(pkg.scripts[hook], 'npm run vendor:three', `缺少 ${hook} 钩子`);
  }
  assert.ok(statSync(bundlePath).size > 500 * 1024, '打包产物体积异常，可能未包含 three 核心');
});
