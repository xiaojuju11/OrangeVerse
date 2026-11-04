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
