import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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

function linkTags(html) {
  return html.match(/<link\b[^>]*>/gi) ?? [];
}

test('No page ships a render-blocking Google Fonts stylesheet', () => {
  for (const page of pages) {
    const html = readFileSync(path.join(root, page), 'utf8');
    for (const tag of linkTags(html)) {
      if (!tag.includes('fonts.googleapis.com')) continue;
      assert.ok(
        !/rel\s*=\s*["']?stylesheet/i.test(tag),
        `${page} 仍包含阻塞式字体样式表: ${tag.trim()}`
      );
    }
  }
});

test('Pages referencing Google Fonts inject the stylesheet after load', () => {
  for (const page of pages) {
    const html = readFileSync(path.join(root, page), 'utf8');
    if (!html.includes('fonts.googleapis.com')) continue;
    assert.ok(
      html.includes('addEventListener("load"') ||
        html.includes("addEventListener('load'"),
      `${page} 缺少 load 事件后的字体注入`
    );
    assert.ok(
      /createElement\(["']link["']\)/.test(html),
      `${page} 缺少动态创建 link 的注入逻辑`
    );
    assert.ok(
      !/fonts\.googleapis\.com[^"']*rel\s*=\s*["']?stylesheet/i.test(html),
      `${page} 的字体 URL 仍以静态 stylesheet 形式出现`
    );
  }
});

test('Preconnect hints stay in place so reachable users keep fast font fetch', () => {
  for (const page of pages) {
    const html = readFileSync(path.join(root, page), 'utf8');
    assert.ok(
      /rel\s*=\s*["']?preconnect["']?[^>]*fonts\.googleapis\.com|fonts\.googleapis\.com[^>]*rel\s*=\s*["']?preconnect/i.test(
        html
      ),
      `${page} 缺少 fonts.googleapis.com 的 preconnect`
    );
  }
});
