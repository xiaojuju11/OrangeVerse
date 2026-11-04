import { safeUrl } from './schema.js';

export function buildArchive(profile, categories, articles) {
  const find = (id) => categories.find((category) => category.id === id);
  const repos = find('opensource')?.items ?? [];
  const knowledge = find('knowledge')?.items ?? [];
  const fromItem = (section, item) => ({
    section, title: item.title, summary: item.summary, url: safeUrl(item.url),
  });
  const isWriting = (item) => /^https:\/\/juejin\.cn\/post\//.test(item.url ?? '');
  const writing = new Map();
  for (const item of knowledge.filter(isWriting)) {
    const entry = fromItem('writing', item);
    writing.set(entry.url, entry);
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
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return entries.filter((entry) => {
    if (section !== 'all' && entry.section !== section) return false;
    const content = `${entry.title} ${entry.summary ?? ''}`.toLowerCase();
    return words.every((word) => content.includes(word));
  });
}
