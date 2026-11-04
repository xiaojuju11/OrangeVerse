// Ethereal macOS-style floating magnification Dock for OrangeVerse.
// Inspired by frontendfyi/macos-dock and CatsJuice/dockbar.

import { modalManager } from './modal-manager.js';

export function initFloatingDock(options = {}) {
  const { audio, island } = options;

  // Create dock container
  const dockContainer = document.createElement('nav');
  dockContainer.id = 'floating-dock';
  dockContainer.className = 'floating-dock';
  dockContainer.setAttribute('aria-label', '宇宙漫游快捷悬浮 Dock');

  const items = [
    { id: 'dock-island', label: '全岛漫游', icon: '🏝️', action: () => island?.overview() },
    { id: 'dock-fox', label: '情绪狐狸', icon: '🦊', action: () => modalManager.open('fox') },
    { id: 'dock-resume', label: '在线简历', icon: '📄', action: () => modalManager.open('resume') },
    { id: 'dock-articles', label: '掘金专栏', icon: '📚', action: () => modalManager.open('articles') },
    { id: 'dock-bookshelf', label: '3D 实体书架', icon: '📼', action: () => window.open('./bookshelf.html', '_blank') },
    { id: 'dock-archive', label: '宇宙档案', icon: '🌌', action: () => window.location.href = './archive.html' },
    {
      id: 'dock-sound',
      label: '潮汐声景',
      icon: '🎵',
      action: async (btn) => {
        if (!audio) return;
        const enabled = await audio.toggle();
        const iconEl = btn.querySelector('.dock-icon');
        if (iconEl) iconEl.textContent = enabled ? '🌊' : '🎵';
        const tooltip = btn.querySelector('.dock-tooltip');
        if (tooltip) tooltip.textContent = enabled ? '关闭声景' : '潮汐声景';
      }
    },
  ];

  dockContainer.innerHTML = `
    <div class="dock-inner">
      ${items.map(it => `
        <button id="${it.id}" class="dock-item" aria-label="${it.label}" data-label="${it.label}">
          <span class="dock-tooltip">${it.label}</span>
          <span class="dock-icon">${it.icon}</span>
        </button>
      `).join('')}
    </div>
  `;

  document.body.appendChild(dockContainer);

  const inner = dockContainer.querySelector('.dock-inner');
  const dockItems = [...dockContainer.querySelectorAll('.dock-item')];

  // Action listeners
  items.forEach((it, idx) => {
    const btn = dockItems[idx];
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      audio?.playHaptic('tap');
      it.action(btn);
    });
  });

  // Smooth magnification math
  const MAX_DISTANCE = 110;
  const MAX_SCALE = 1.45;

  inner.addEventListener('mousemove', (e) => {
    const mouseX = e.clientX;

    dockItems.forEach((btn) => {
      const rect = btn.getBoundingClientRect();
      const itemCenterX = rect.left + rect.width / 2;
      const dist = Math.abs(mouseX - itemCenterX);

      if (dist < MAX_DISTANCE) {
        const factor = Math.cos((dist / MAX_DISTANCE) * (Math.PI / 2));
        const scale = 1.0 + (MAX_SCALE - 1.0) * factor;
        btn.style.transform = `scale(${scale.toFixed(3)}) translateY(${(-8 * factor).toFixed(1)}px)`;
      } else {
        btn.style.transform = 'scale(1) translateY(0)';
      }
    });
  });

  inner.addEventListener('mouseleave', () => {
    dockItems.forEach((btn) => {
      btn.style.transform = 'scale(1) translateY(0)';
    });
  });

  return dockContainer;
}
