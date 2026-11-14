import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(path.join(root, 'src/style.css'), 'utf8');
const dock = readFileSync(path.join(root, 'src/dock.js'), 'utf8');

test('悬浮 Dock 与页脚营地导航不再共用同一条底部轨道', () => {
  // Dock 的 bottom 必须带上实测抬升量，否则会压在 category-nav 上
  const dockRule = css.match(/\.floating-dock \{[\s\S]*?\}/);
  assert.ok(dockRule, '缺少 .floating-dock 规则');
  assert.match(
    dockRule[0],
    /bottom:\s*calc\(var\(--dock-bottom\)\s*\+\s*var\(--dock-lift\)\)/,
    '悬浮 Dock 未给页脚让位'
  );
});

test('漫游状态条跟着 Dock 一起抬高', () => {
  const statusRules = [...css.matchAll(/\.walk-status \{[\s\S]*?\}/g)]
    .map((m) => m[0])
    .filter((rule) => /bottom:/.test(rule));
  assert.ok(statusRules.length >= 2, '状态条应包含默认与窄屏两处定位');
  for (const rule of statusRules) {
    assert.match(rule, /bottom:[^;]*var\(--dock-lift\)/, `状态条未跟随 Dock 抬高: ${rule}`);
  }
});

test('dock.js 实测页脚与自身高度后写入 CSS 变量', () => {
  assert.match(dock, /--dock-lift/, 'dock.js 未写入 --dock-lift');
  assert.match(dock, /--dock-h/, 'dock.js 未写入 --dock-h');
  assert.match(dock, /ResizeObserver/, '页脚/ Dock 尺寸变化后没有重算让位');
});
