// ═════════════════════════════════════════════════════════════════════════
// OrangeVerse Cyber Companion (全息交互伴侣系统)
// ═════════════════════════════════════════════════════════════════════════

export function initCyberCompanion() {
  const container = document.getElementById('cyber-companion');
  if (!container) return;

  const wrap = document.getElementById('companion-wrap');
  const imgs = Array.from(container.querySelectorAll('.companion-pose'));
  const halo = document.getElementById('companion-halo');
  const widget = document.getElementById('companion-widget');
  const toggleBtn = document.getElementById('companion-toggle');

  let activeIdx = 0;
  let mx = 0, my = 0;
  let lx = 0, ly = 0;
  let lastMove = performance.now();

  function setActive(idx) {
    if (idx === activeIdx || !imgs[idx]) return;
    imgs[activeIdx].classList.remove('active');
    activeIdx = idx;
    imgs[activeIdx].classList.add('active');
  }

  // 映射鼠标到姿态
  function updatePose(nx, ny) {
    if (ny < -0.1) {
      if (nx < -0.25) return 1; // 往左看/左手微抬
      if (nx > 0.25) return 3;  // 往右看/右手微抬
      return 0;                 // 正上方抬手打字
    }
    return 2;                   // 居中/轻微俯视
  }

  window.addEventListener('pointermove', (e) => {
    if (container.hidden) return;
    const rect = wrap.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const reach = Math.max(window.innerWidth, window.innerHeight) * 0.55;

    mx = Math.max(-1, Math.min(1, (e.clientX - cx) / reach));
    my = Math.max(-1, Math.min(1, (e.clientY - cy) / reach));
    lastMove = performance.now();

    setActive(updatePose(mx, my));
  }, { passive: true });

  // 动效循环：平滑视差 + 呼吸
  let prevT = null;
  function loop(t) {
    if (prevT === null) prevT = t;
    const dt = Math.min((t - prevT) / 1000, 0.05);
    prevT = t;
    const elapsed = t / 1000;

    // 空闲轻微眼神游走
    if (performance.now() - lastMove > 3000) {
      mx = Math.sin(elapsed * 0.5) * 0.5;
      my = Math.sin(elapsed * 0.8 + 1) * 0.2;
      const idlePose = [0, 1, 0, 3, 0, 2][Math.floor(elapsed * 0.35) % 6];
      setActive(idlePose);
    }

    // 平滑插值 (Lerp)
    const k = 1 - Math.exp(-dt * 7);
    lx += (mx - lx) * k;
    ly += (my - ly) * k;

    // 2.5D 视差倾斜与位移
    const tx = lx * 18;
    const ty = ly * 10;
    const rx = -ly * 6;
    const ry = lx * 6;

    if (wrap) {
      wrap.style.transform = `perspective(800px) translate3d(${tx}px, ${ty}px, 0) rotateX(${rx}deg) rotateY(${ry}deg)`;
    }

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // 折叠 / 展开切换
  if (toggleBtn && widget) {
    toggleBtn.addEventListener('click', () => {
      widget.classList.toggle('minimized');
      toggleBtn.setAttribute('aria-expanded', !widget.classList.contains('minimized'));
    });
  }
}
