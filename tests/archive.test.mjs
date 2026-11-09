import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categories, profile } from '../src/content.js';
import articles from '../public/juejin_articles.json' with { type: 'json' };
import { buildArchive, filterArchive } from '../src/archive-content.js';

test('archive reuses portfolio entries and deduplicates cross-listed writing', () => {
  const entries = buildArchive(profile, categories, articles);
  assert.deepEqual([...new Set(entries.map(({ section }) => section))], ['resume', 'repos', 'learning', 'writing']);
  const urls = entries.map(({ url }) => url).filter(Boolean);
  assert.equal(urls.length, new Set(urls).size);
  assert.ok(entries.some(({ title }) => title.includes('AI-Daily-Learning')));
});

test('archive search matches multiple words and respects the current section', () => {
  const entries = buildArchive(profile, categories, articles);
  assert.ok(filterArchive(entries, 'writing', '  react 动效 ').length > 0);
  assert.deepEqual(filterArchive(entries, 'repos', '私域 校准'), []);
});

test('cross-listed writing with tracking params or a trailing slash is deduplicated', () => {
  const dupCategories = [{
    id: 'knowledge',
    items: [
      { title: 'React 动效', summary: '客户端动效', url: 'https://juejin.cn/post/7695579556079321122?utm_source=share' },
      { title: '另一篇', summary: '笔记', url: 'https://juejin.cn/post/7644369679423242282/' },
    ],
  }];
  const dupArticles = [
    { id: '7695579556079321122', title: 'React 动效', brief: '客户端动效' },
    { id: '7644369679423242282', title: '另一篇', brief: '笔记' },
  ];
  const writing = buildArchive({ name: 'Demo' }, dupCategories, dupArticles)
    .filter(({ section }) => section === 'writing');
  assert.equal(writing.length, 2);
  assert.equal(new Set(writing.map(({ url }) => url)).size, 2);
  assert.ok(writing.every(({ url }) => /^https:\/\/juejin\.cn\/post\/\d+$/.test(url)));
});

test('archive search tolerates a missing or empty query', () => {
  const entries = buildArchive(profile, categories, articles);
  assert.equal(filterArchive(entries, 'all', undefined).length, entries.length);
  assert.equal(filterArchive(entries, 'all', null).length, entries.length);
  assert.equal(filterArchive(entries, 'all', '   ').length, entries.length);
});
