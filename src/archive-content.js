import { safeUrl } from './schema.js';

const WRITING_PREFIX = /^https:\/\/juejin\.cn\/post\//;
// 掘金分享链接常带 ?utm_source=... 、尾斜杠或 # 锚点，文章 id 是纯数字。
// 归一化后作为 Map key，跨栏目收录的同一篇文章才不会在归档里重复出现。
const WRITING_POST_ID = /^https:\/\/juejin\.cn\/post\/(\d+)(?:[/?#]|$)/;

function canonicalWritingUrl(url) {
  const match = WRITING_POST_ID.exec(url);
  return match ? `https://juejin.cn/post/${match[1]}` : url;
}

export function buildArchive(profile, categories, articles) {
  const find = (id) => categories.find((category) => category.id === id);
  const repos = find('opensource')?.items ?? [];
  const knowledge = find('knowledge')?.items ?? [];
  const fromItem = (section, item) => ({
    section, title: item.title, summary: item.summary, url: safeUrl(item.url),
  });
  const isWriting = (item) => WRITING_PREFIX.test(item.url ?? '');
  const writing = new Map();
  for (const item of knowledge.filter(isWriting)) {
    const safe = safeUrl(item.url);
    if (!safe) continue;
    const url = canonicalWritingUrl(safe);
    writing.set(url, { section: 'writing', title: item.title, summary: item.summary, url });
  }
  for (const article of articles) {
    if (!/^\d+$/.test(article?.id) || typeof article.title !== 'string') continue;
    const url = `https://juejin.cn/post/${article.id}`;
    writing.set(url, { section: 'writing', title: article.title.trim(), summary: article.brief, url });
  }
  return [
    { section: 'resume', title: `${profile.name} · 在线简历`, summary: '开发技能、代表项目、学习书本和技术专栏。' },
    ...repos.map((item) => fromItem('repos', item)),
    ...knowledge.filter((item) => !isWriting(item)).map((item) => fromItem('learning', item)),
    ...writing.values(),
  ];
}

export function filterArchive(entries, section, query) {
  const words = String(query ?? '').toLowerCase().trim().split(/\s+/).filter(Boolean);
  return entries.filter((entry) => {
    if (section !== 'all' && entry.section !== section) return false;
    const content = `${entry.title ?? ''} ${entry.summary ?? ''}`.toLowerCase();
    return words.every((word) => content.includes(word));
  });
}
