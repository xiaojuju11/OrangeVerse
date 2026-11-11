// Ethereal macOS-style floating magnification Dock for OrangeVerse.
// Inspired by frontendfyi/macos-dock and CatsJuice/dockbar.
// Features React Bits / Framesbase FolderFloat micro-interaction.

import { modalManager } from './modal-manager.js';
import { createFolderFloat } from './folder-float.js';
import { describeSoundState } from './sound-state.js';

const MAX_DISTANCE = 110;
const MAX_SCALE = 1.45;
/** 相邻两帧缩放差小于该阈值时不再写样式，避免无意义的合成层刷新。 */
const SCALE_EPSILON = 0.002;

export function initFloatingDock(options = {}) {
  const { audio, island, onSoundChange } = options;

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
    { id: 'dock-folder-slot', isFolder: true },
    {
      id: 'dock-sound',
      label: '潮汐声景',
      icon: '🎵',
      // 图标 / 文案由 syncSound 统一维护，这里只负责切换音频并广播结果
      action: async () => {
        if (!audio) return;
        try {
          const enabled = await audio.toggle();
          if (typeof onSoundChange === 'function') onSoundChange(enabled);
          else syncSound(enabled);
        } catch {
          // 自动播放被拦截或音频上下文不可用时保持静默，由上层决定是否提示
        }
      }
    },
  ];

  dockContainer.innerHTML = `
    <div class="dock-inner">
      ${items.map(it => {
        if (it.isFolder) {
          return `<div id="dock-folder-mount" class="dock-folder-mount"></div>`;
        }
        const pressed = it.id === 'dock-sound' ? ' aria-pressed="false"' : '';
        return `
          <button id="${it.id}" class="dock-item" aria-label="${it.label}" data-label="${it.label}"${pressed}>
            <span class="dock-tooltip">${it.label}</span>
            <span class="dock-icon">${it.icon}</span>
          </button>
        `;
      }).join('')}
    </div>
  `;

  document.body.appendChild(dockContainer);

  // Mount the 3D FolderFloat into the dock slot
  const folderMount = dockContainer.querySelector('#dock-folder-mount');
  if (folderMount) {
    createFolderFloat({
      audio,
      container: folderMount,
      title: '宇宙档案夹 📁',
    });
  }

  const inner = dockContainer.querySelector('.dock-inner');
  const dockItems = [...dockContainer.querySelectorAll('.dock-item')];

  // Action listeners for standard buttons
  items.filter(it => !it.isFolder).forEach((it, idx) => {
    const btn = dockItems[idx];
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        audio?.playHaptic('tap');
        it.action(btn);
      });
    }
  });

  /** 把环境音开关同步到 Dock 自己的按钮上（被顶栏按钮与 Dock 自身共用）。 */
  function syncSound(enabled) {
    const state = describeSoundState(enabled);
    const btn = dockContainer.querySelector('#dock-sound');
    if (!btn) return;
    btn.setAttribute('aria-pressed', state.ariaPressed);
    btn.setAttribute('aria-label', state.ariaLabel);
    const iconEl = btn.querySelector('.dock-icon');
    if (iconEl) iconEl.textContent = state.dockIcon;
    const tooltip = btn.querySelector('.dock-tooltip');
    if (tooltip) tooltip.textContent = state.dockTooltip;
  }

  // ───────────────────────────────────────────────────────────────────────
  // 放大动效：此前每次 mousemove 都要对每个按钮做一次 getBoundingClientRect，
  // 逐项读取会强制反复重排（layout thrashing）。改为：
  //   1) 几何信息只在初始化 / 尺寸变化 / 指针进入时测量一次；
  //   2) 指针位置按帧合并，一帧最多算一次；
  //   3) 缩放值未实质变化时跳过 style 写入。
  // ───────────────────────────────────────────────────────────────────────
  let centers = null;
  let pendingX = null;
  let frameId = 0;
  const applied = new Map();
  const reduced = typeof matchMedia === 'function'
    ? matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  function measure() {
    if (!inner) return;
    centers = dockItems.map((btn) => {
      const rect = btn.getBoundingClientRect();
      return rect.left + rect.width / 2;
    });
  }

  function setTransform(btn, value) {
    if (applied.get(btn) === value) return;
    applied.set(btn, value);
    btn.style.transform = value;
  }

  function applyMagnification(x) {
    if (!centers || centers.length !== dockItems.length) measure();
    dockItems.forEach((btn, i) => {
      const dist = Math.abs(x - centers[i]);
      if (dist >= MAX_DISTANCE) {
        setTransform(btn, 'scale(1) translateY(0)');
        return;
      }
      const factor = Math.cos((dist / MAX_DISTANCE) * (Math.PI / 2));
      const scale = 1 + (MAX_SCALE - 1) * factor;
      if (scale - 1 < SCALE_EPSILON) {
        setTransform(btn, 'scale(1) translateY(0)');
        return;
      }
      setTransform(
        btn,
        `scale(${scale.toFixed(3)}) translateY(${(-8 * factor).toFixed(1)}px)`,
      );
    });
  }

  function flush() {
    frameId = 0;
    if (pendingX === null) return;
    const x = pendingX;
    pendingX = null;
    applyMagnification(x);
  }

  function resetAll() {
    pendingX = null;
    applied.clear();
    dockItems.forEach((btn) => {
      btn.style.transform = 'scale(1) translateY(0)';
    });
  }

  if (inner) {
    inner.addEventListener('mouseenter', () => measure(), { passive: true });
    inner.addEventListener('mousemove', (e) => {
      if (reduced?.matches) return;
      pendingX = e.clientX;
      if (!frameId) frameId = requestAnimationFrame(flush);
    }, { passive: true });
    inner.addEventListener('mouseleave', resetAll, { passive: true });
    // 布局变化后缓存失效，下一次移动重新测量
    window.addEventListener('resize', () => {
      centers = null;
      resetAll();
    }, { passive: true });
    window.addEventListener('scroll', () => {
      centers = null;
    }, { passive: true });
  }

  // 初始图标按当前静音状态渲染，避免与顶栏按钮不一致
  syncSound(typeof audio?.enabled === 'boolean' ? audio.enabled : false);

  return { element: dockContainer, syncSound };
}
