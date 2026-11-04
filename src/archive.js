import './archive.css';
import { categories, profile } from './content.js';
import { buildArchive, filterArchive } from './archive-content.js';

const sections = {
  resume: { label: '简历', action: '打开完整简历', entryAction: '查看简历', url: './#resume' },
  repos: { label: '仓库', action: '打开 GitHub 主页', entryAction: '查看仓库', url: profile.links.find((link) => link.label === 'GitHub')?.url },
  learning: { label: '学习', action: '打开 3D 知识书架', entryAction: '查看笔记', url: './bookshelf.html' },
  writing: { label: '写作', action: '打开掘金主页', entryAction: '阅读原文', url: profile.links.find((link) => link.label === '掘金主页')?.url },
};
const list = document.getElementById('archive-list');
const search = document.getElementById('archive-search');
const status = document.getElementById('archive-status');
const sectionLink = document.getElementById('section-link');
const filters = [...document.querySelectorAll('[data-section]')];
let entries = buildArchive(profile, categories, []);

function render() {
  const hash = location.hash.slice(1);
  const current = filters.some((filter) => filter.dataset.section === hash) ? hash : 'all';
  for (const filter of filters) {
    if (filter.dataset.section === current) filter.setAttribute('aria-current', 'true');
    else filter.removeAttribute('aria-current');
  }

  const section = sections[current];
  sectionLink.hidden = !section?.url;
  if (section?.url) {
    sectionLink.href = section.url;
    sectionLink.textContent = `${section.action} ↗`;
  }
  const results = filterArchive(entries, current, search.value);
  status.textContent = results.length ? `${results.length} 条档案` : '没有找到相关档案，试试别的关键词。';
  list.replaceChildren(...results.map((entry) => {
    const item = document.createElement('li');
    const label = document.createElement('span');
    label.className = 'entry-label';
    label.textContent = sections[entry.section].label;
    const content = document.createElement('div');
    const title = document.createElement('h2');
    title.textContent = entry.title;
    const summary = document.createElement('p');
    summary.textContent = entry.summary ?? '';
    content.append(title, summary);
    item.append(label, content);
    const url = entry.url || sections[entry.section].url;
    if (url) {
      const action = document.createElement('a');
      action.className = 'entry-link';
      action.href = url;
      action.textContent = `${sections[entry.section].entryAction} ↗`;
      action.setAttribute('aria-label', `${action.textContent} ${entry.title}`);
      item.append(action);
    }
    return item;
  }));
}

search.addEventListener('input', render);
window.addEventListener('hashchange', render);
render();

async function loadWriting() {
  try {
    const response = await fetch('./juejin_articles.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const articles = await response.json();
    if (Array.isArray(articles)) {
      entries = buildArchive(profile, categories, articles);
      render();
    }
  } catch (error) {
    console.warn('文章列表暂未同步，显示已收录的写作。', error);
  }
}

loadWriting();
