import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['public/404.html', 'public/vulpa.html'];

function read(page) {
  return readFileSync(path.join(root, page), 'utf8');
}

test('狐狸取景用归一化后的宽度，不会只剩一张怼脸特写', () => {
  for (const page of pages) {
    const html = read(page);
    // 模型按高度缩放到 2 个单位，相机距离必须用缩放后的宽度
    assert.match(
      html,
      /const s = 2 \/ size\.y;\s*\n\s*foxWidth = size\.x \* s;/,
      `${page} 的 foxWidth 仍在用缩放前的尺寸`
    );
    // 高度与宽度两个方向都要参与，取较大距离才不会裁掉耳朵/尾巴
    assert.match(html, /const distY =/, `${page} 缺少按高度取景的距离`);
    assert.match(html, /const distX =/, `${page} 缺少按宽度取景的距离`);
    assert.match(html, /Math\.max\(distY, distX\)/, `${page} 未在两个方向中取较大距离`);
  }
});

test('树洞回复不会被摸头对白覆盖', () => {
  for (const page of pages) {
    const html = read(page);
    const body = html.slice(html.indexOf('function handleTreehole'));
    const replyAt = body.indexOf('say(reply');
    const petAt = body.indexOf('triggerPet({ silent: true })');
    assert.ok(petAt > -1, `${page} 的树洞应当静默触发摸头动画`);
    assert.ok(
      replyAt > -1 && petAt < replyAt,
      `${page} 的树洞回复会在摸头对白之前被覆盖`
    );
  }
});

test('独立页在窄屏下压缩顶栏与互动舱，给角色留出取景区', () => {
  for (const page of pages) {
    const html = read(page);
    assert.match(html, /@media \(max-width: 620px\)/, `${page} 缺少窄屏适配`);
    assert.match(html, /\.pet-topbar \{[\s\S]{0,200}?flex-wrap: wrap;/, `${page} 顶栏窄屏未换行`);
  }
});
