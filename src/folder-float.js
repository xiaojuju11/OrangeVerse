// FolderFloat Micro-interaction Component for OrangeVerse.
// Inspired by React Bits (David Haz) & Framesbase /reactbits/micro/folder-float.
// Implements 3D folder perspective flap opening and zero-gravity floating card fan-out.

import { modalManager } from './modal-manager.js';

export function createFolderFloat(options = {}) {
  const {
    audio,
    container = null,
    title = '宇宙档案夹',
    items = [
      {
        icon: '🚀',
        title: '童心智伴',
        desc: 'React 19 · DeepSeek · Coze',
        action: () => modalManager.open('resume'),
      },
      {
        icon: '💻',
        title: '代码沙箱',
        desc: 'TypeScript · Monaco Editor',
        action: () => modalManager.open('resume'),
      },
      {
        icon: '📚',
        title: 'AI 知识书架',
        desc: '《AI-Daily-Learning》',
        action: () => window.open('./bookshelf.html', '_blank'),
      },
      {
        icon: '💎',
        title: '掘金高赞专栏',
        desc: '1.5W+ 阅读 · 动效基建',
        action: () => modalManager.open('articles'),
      },
      {
        icon: '🌌',
        title: '完整档案',
        desc: '全量知识与仓库索引 ↗',
        action: () => (window.location.href = './archive.html'),
      },
    ],
  } = options;

  const folderEl = document.createElement('div');
  folderEl.className = 'folder-float-wrap';
  folderEl.setAttribute('aria-label', title);

  folderEl.innerHTML = `
    <!-- Floating cloud cards that spring outward when folder opens -->
    <div class="folder-floating-cloud">
      ${items
        .map(
          (it, idx) => `
        <div class="folder-float-card" data-idx="${idx}" style="--i: ${idx};">
          <span class="ff-icon">${it.icon}</span>
          <div class="ff-info">
            <span class="ff-title">${it.title}</span>
            <span class="ff-desc">${it.desc}</span>
          </div>
        </div>
      `,
        )
        .join('')}
    </div>

    <!-- 3D Folder Graphic Trigger -->
    <div class="folder-icon-body" role="button" tabindex="0" title="${title}">
      <span class="folder-tab"></span>
      <div class="folder-back">
        <span class="folder-paper p1"></span>
        <span class="folder-paper p2"></span>
      </div>
      <div class="folder-front">
        <span class="folder-badge">📁</span>
      </div>
      <span class="folder-dock-tooltip">${title}</span>
    </div>
  `;

  let isOpen = false;

  function setOpen(open) {
    if (isOpen === open) return;
    isOpen = open;
    folderEl.classList.toggle('is-open', isOpen);
    if (audio) {
      audio.playHaptic(isOpen ? 'open' : 'close');
    }
  }

  // Toggle on click
  const trigger = folderEl.querySelector('.folder-icon-body');
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(!isOpen);
  });

  // Desktop hover opening with grace delay
  let hoverTimer = null;
  folderEl.addEventListener('mouseenter', () => {
    clearTimeout(hoverTimer);
    setOpen(true);
  });

  folderEl.addEventListener('mouseleave', () => {
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      setOpen(false);
    }, 280);
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (isOpen && !folderEl.contains(e.target)) {
      setOpen(false);
    }
  });

  // Card click actions
  const cards = folderEl.querySelectorAll('.folder-float-card');
  cards.forEach((card, idx) => {
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      audio?.playHaptic('tap');
      setOpen(false);
      items[idx]?.action?.();
    });
  });

  if (container) {
    container.appendChild(folderEl);
  }

  return {
    element: folderEl,
    open: () => setOpen(true),
    close: () => setOpen(false),
  };
}
