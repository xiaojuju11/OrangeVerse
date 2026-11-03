// ═════════════════════════════════════════════════════════════════════════
// Jhey Tompkins 风格流体物理粘性下拉菜单 (Viscous Gooey Dropdown & Physics Lab)
// ═════════════════════════════════════════════════════════════════════════

export function initViscousMenu(options = {}) {
  const container = document.getElementById("viscous-menu-container");
  if (!container) return;

  // 1. 注入核心 HTML 骨架（触发按钮 + 液体连接层 + 高清内容卡片 + 粘度调参实验室）
  container.innerHTML = `
    <!-- SVG Gooey Filter 滤镜定义 (高对比度 Alpha 阈值 + 动态高斯模糊) -->
    <svg width="0" height="0" style="position:absolute;pointer-events:none;" aria-hidden="true">
      <defs>
        <filter id="jh3y-gooey-viscosity" x="-40%" y="-40%" width="180%" height="200%" color-interpolation-filters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="11" id="viscous-fe-blur" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="
            1 0 0 0 0
            0 1 0 0 0
            0 0 1 0 0
            0 0 0 22 -9.5" id="viscous-fe-matrix" result="goo" />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>

    <div class="viscous-menu-wrapper" id="viscous-menu-wrap">
      <!-- 顶部主触发胶囊按钮 (支持点击与向下拖拽拉扯) -->
      <button class="viscous-trigger-btn" id="viscous-trigger" data-magnetic aria-expanded="false" aria-haspopup="true" aria-label="展开橘域流体导航菜单" title="点击展开，或按住向下拖拽拉扯">
        <span class="liquid-icon">💧</span>
        <span class="viscous-trigger-text">流体探索</span>
        <span class="caret-icon">▼</span>
      </button>

      <!-- 粘性液体背景舞台（应用 Goo 滤镜） -->
      <div class="viscous-liquid-stage" id="viscous-stage">
        <div class="viscous-fluid-canvas" id="viscous-fluid-canvas">
          <svg class="viscous-svg-mesh" id="viscous-svg" viewBox="0 0 320 460">
            <!-- 动态流体连通颈道与液滴 -->
            <path id="viscous-path" d="" />
            <!-- 顶部触发基座球体 -->
            <circle id="viscous-top-bulb" cx="160" cy="20" r="18" fill="#11201c" />
            <!-- 悬浮微小分离卫星液滴 (Satellite Droplet) -->
            <circle id="viscous-droplet" cx="160" cy="20" r="0" fill="#11201c" />
          </svg>
        </div>

        <!-- 高清清晰内容卡片（不受 goo 滤镜影响，文字与图标极致锐利） -->
        <div class="viscous-menu-card" id="viscous-card">
          <header class="viscous-menu-header">
            <div class="viscous-menu-title">
              <span>✦</span> 橘域流体导航
            </div>
            <span class="viscous-status-pill" id="viscous-status-pill">μ: 0.45 · 蜂蜜</span>
          </header>

          <ul class="viscous-item-list">
            <li>
              <button class="viscous-item-btn" data-action="explore-island">
                <span class="viscous-item-icon">🏞️</span>
                <div class="viscous-item-meta">
                  <span class="viscous-item-label">漫游主岛 · 鸟瞰全景</span>
                  <span class="viscous-item-sub">重置相机并俯瞰全岛营地</span>
                </div>
                <span class="viscous-item-tag">3D</span>
              </button>
            </li>
            <li>
              <button class="viscous-item-btn" data-action="open-bookshelf">
                <span class="viscous-item-icon">📼</span>
                <div class="viscous-item-meta">
                  <span class="viscous-item-label">3D 沉浸式实体书架</span>
                  <span class="viscous-item-sub">VHS 磁带盒拟读与书籍翻阅</span>
                </div>
                <span class="viscous-item-tag">Hero</span>
              </button>
            </li>
            <li>
              <button class="viscous-item-btn" data-action="open-articles">
                <span class="viscous-item-icon">📚</span>
                <div class="viscous-item-meta">
                  <span class="viscous-item-label">掘金专栏 & 学习笔记</span>
                  <span class="viscous-item-sub">1.5万+ 阅读高赞技术长文</span>
                </div>
                <span class="viscous-item-tag">专栏</span>
              </button>
            </li>
            <li>
              <button class="viscous-item-btn" data-action="open-resume">
                <span class="viscous-item-icon">📄</span>
                <div class="viscous-item-meta">
                  <span class="viscous-item-label">个人在线交互简历</span>
                  <span class="viscous-item-sub">万界科技 AI 全栈与代表作</span>
                </div>
                <span class="viscous-item-tag">Resume</span>
              </button>
            </li>
            <li>
              <button class="viscous-item-btn" data-action="open-fox">
                <span class="viscous-item-icon">🦊</span>
                <div class="viscous-item-meta">
                  <span class="viscous-item-label">3D 守护狐狸交互室</span>
                  <span class="viscous-item-sub">Vulpa 眼神追踪与全息共鸣</span>
                </div>
                <span class="viscous-item-tag">404</span>
              </button>
            </li>
            <li>
              <button class="viscous-item-btn" data-action="toggle-theme">
                <span class="viscous-item-icon">🎨</span>
                <div class="viscous-item-meta">
                  <span class="viscous-item-label">切换小岛生态主题</span>
                  <span class="viscous-item-sub" id="viscous-theme-desc">当前: 森屿 (Forest)</span>
                </div>
                <span class="viscous-item-tag">主题</span>
              </button>
            </li>
          </ul>

          <!-- 底部物理拉伸手柄 -->
          <div class="viscous-drag-handle" id="viscous-drag-handle" title="按住可向下拖拽拉伸流体">
            <div class="viscous-handle-bar"></div>
            <span class="viscous-handle-hint">↕ 拖拽拉伸感受粘滞力</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 🌟 粘度物理实验室 (Viscosity Parameter Lab) 浮窗 -->
    <aside class="viscosity-lab-widget" id="viscosity-lab" aria-label="流体粘度物理控制台">
      <div class="viscosity-lab-card" id="viscosity-lab-card">
        <header class="viscosity-lab-header">
          <div class="viscosity-lab-title">
            <span>🧪</span> Viscosity Lab (粘度调参)
          </div>
          <button id="viscosity-lab-toggle" class="viscosity-lab-toggle-btn" aria-label="收起/展开调参面板" title="收起/展开">_</button>
        </header>

        <div class="viscosity-lab-body">
          <div class="viscosity-param-row">
            <div class="viscosity-slider-labels">
              <span class="viscosity-slider-name">粘度参数 (Viscosity μ)</span>
              <span class="viscosity-val-badge" id="viscosity-val-text">0.45</span>
            </div>
            <input type="range" id="viscosity-slider" class="viscosity-range-input" min="0.05" max="1.0" step="0.01" value="0.45" />
          </div>

          <!-- 4 种典型流体预设 -->
          <div class="viscosity-presets">
            <button class="preset-btn" data-preset="water" title="极低阻尼，水弹回弹，高频涟漪">💧 水</button>
            <button class="preset-btn active" data-preset="honey" title="黄金粘度，丝滑拉伸，柔和沉降">🍯 蜂蜜</button>
            <button class="preset-btn" data-preset="syrup" title="高粘滞阻力，厚重拉丝，缓落回弹">🍮 糖浆</button>
            <button class="preset-btn" data-preset="gel" title="超高粘度，极大拉扯，强力吸附">🧪 凝胶</button>
          </div>

          <!-- 实时物理参量遥测 -->
          <div class="viscosity-readout-row">
            <div class="viscosity-readout-item">阻尼比: <span id="readout-zeta">0.68</span></div>
            <div class="viscosity-readout-item">形变: <span id="readout-stretch">0%</span></div>
            <div class="viscosity-readout-item">状态: <span id="readout-state">静止</span></div>
          </div>
        </div>
      </div>
    </aside>
  `;

  // 2. 获取 DOM 节点引用
  const wrap = document.getElementById("viscous-menu-wrap");
  const triggerBtn = document.getElementById("viscous-trigger");
  const card = document.getElementById("viscous-card");
  const path = document.getElementById("viscous-path");
  const droplet = document.getElementById("viscous-droplet");
  const topBulb = document.getElementById("viscous-top-bulb");
  const dragHandle = document.getElementById("viscous-drag-handle");
  const statusPill = document.getElementById("viscous-status-pill");

  // Lab 节点
  const labWidget = document.getElementById("viscosity-lab-card");
  const labToggle = document.getElementById("viscosity-lab-toggle");
  const slider = document.getElementById("viscosity-slider");
  const valText = document.getElementById("viscosity-val-text");
  const presetBtns = Array.from(document.querySelectorAll(".preset-btn"));
  const readoutZeta = document.getElementById("readout-zeta");
  const readoutStretch = document.getElementById("readout-stretch");
  const readoutState = document.getElementById("readout-state");
  const blurElement = document.getElementById("viscous-fe-blur");

  // 3. 物理系统核心状态
  const state = {
    viscosity: 0.45,       // 粘度参数 μ ∈ [0.05, 1.0]
    isOpen: false,
    isDragging: false,
    currentY: 0,           // 菜单卡片当前垂直位移
    targetY: 0,            // 目标垂直位移 (展开时约 210px)
    velocityY: 0,
    openY: 210,            // 展开状态基准高度
    dragPointerStartY: 0,
    dragElementStartY: 0,
    rippleTime: 0,         // 涟漪衰减计时
    rippleAmp: 0,          // 涟漪振幅
    lastTime: performance.now(),
    hasPlayedSettleSound: false,
  };

  // 预设参数配置表
  const PRESETS = {
    water: { val: 0.10, name: "水 (Water)", blur: 9 },
    honey: { val: 0.45, name: "蜂蜜 (Honey)", blur: 11 },
    syrup: { val: 0.78, name: "糖浆 (Syrup)", blur: 14 },
    gel:   { val: 0.95, name: "凝胶 (Gel)", blur: 16 }
  };

  // 合成流体水滴 / 气泡微音效 (Web Audio API)
  function playLiquidSound(type = "snap", mu = 0.45) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === "snap") {
        // 液滴拉伸断开或弹出
        const baseFreq = 420 + (1 - mu) * 280;
        osc.type = "sine";
        osc.frequency.setValueAtTime(baseFreq * 0.75, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.35, now + 0.05);
        osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.11);

        gain.gain.setValueAtTime(0.045, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
      } else {
        // 沉降涟漪水珠回落
        const baseFreq = 540 + (1 - mu) * 220;
        osc.type = "sine";
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.48, now + 0.14);

        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
      setTimeout(() => {
        try { ctx.close(); } catch(e){}
      }, 300);
    } catch (e) {
      // 允许静音模式忽略
    }
  }

  function setViscosity(v, presetKey = null) {
    state.viscosity = Math.max(0.05, Math.min(1.0, v));
    slider.value = state.viscosity.toFixed(2);
    valText.textContent = state.viscosity.toFixed(2);

    // 计算阻尼比 ζ
    const zeta = 0.22 + 0.92 * Math.pow(state.viscosity, 0.85);
    if (readoutZeta) readoutZeta.textContent = zeta.toFixed(2);

    // 动态调整 SVG 模糊核，实现粘稠液桥视觉扩散
    const blur = 8 + state.viscosity * 8;
    if (blurElement) blurElement.setAttribute("stdDeviation", blur.toFixed(1));

    // 更新标签与高亮按钮
    let label = "自定义";
    presetBtns.forEach(b => {
      if (presetKey && b.dataset.preset === presetKey) {
        b.classList.add("active");
        label = PRESETS[presetKey].name;
      } else if (!presetKey && Math.abs(parseFloat(slider.value) - PRESETS[b.dataset.preset]?.val) < 0.05) {
        b.classList.add("active");
        label = PRESETS[b.dataset.preset].name;
      } else {
        b.classList.remove("active");
      }
    });

    if (statusPill) {
      statusPill.textContent = `μ: ${state.viscosity.toFixed(2)} · ${label.split(' ')[0]}`;
    }
  }

  // 4. 物理模拟核心：流体弹簧-粘滞阻尼-液桥几何构建
  function updatePhysics(dt) {
    const mu = state.viscosity;
    // 刚度 k：低粘度硬而弹，高粘度柔韧
    const k = 230 * (1 - 0.38 * mu);
    // 阻尼比 zeta：控制回弹振荡次数 (水震颤多次，糖浆近临界阻尼沉降)
    const zeta = 0.22 + 0.92 * Math.pow(mu, 0.85);
    const c = 2 * zeta * Math.sqrt(k);

    if (state.isDragging) {
      // 拖拽模式：受粘滞阻力牵引，产生真实的液体滞后手感
      const dragLag = 1 - Math.exp(-dt / (0.018 + 0.14 * mu));
      const prevY = state.currentY;
      state.currentY += (state.targetY - state.currentY) * dragLag;
      state.velocityY = (state.currentY - prevY) / dt;
      state.hasPlayedSettleSound = false;
      if (readoutState) readoutState.textContent = "拉伸拖拽中";
    } else {
      // 自由回弹模式：二阶阻尼弹簧运动
      const springF = -k * (state.currentY - state.targetY);
      const dampF = -c * state.velocityY;
      const accel = springF + dampF;

      state.velocityY += accel * dt;
      state.currentY += state.velocityY * dt;

      // 处于目标位置微小范围内且速度接近零时，收敛沉降
      const dist = Math.abs(state.currentY - state.targetY);
      if (dist < 0.5 && Math.abs(state.velocityY) < 1.0) {
        state.currentY = state.targetY;
        state.velocityY = 0;
        if (!state.hasPlayedSettleSound && state.isOpen) {
          playLiquidSound("settle", mu);
          state.hasPlayedSettleSound = true;
        }
        if (readoutState) readoutState.textContent = state.isOpen ? "已展开沉降" : "已闭合静止";
      } else {
        if (readoutState) readoutState.textContent = state.velocityY > 0 ? "下落流动" : "粘性回缩";
      }
    }

    // 更新伸长率遥测
    const stretchPct = Math.round((state.currentY / state.openY) * 100);
    if (readoutStretch) readoutStretch.textContent = `${stretchPct}%`;

    // 涟漪阻尼波推进
    if (state.rippleAmp > 0.1) {
      state.rippleTime += dt;
      state.rippleAmp *= Math.exp(-dt * (2.5 + mu * 4.5));
    }
  }

  // 5. 动态生成 SVG 液体连通轮廓 (Liquid Bridge & Droplet Meniscus)
  function renderLiquid() {
    const y = Math.max(0, state.currentY);
    const mu = state.viscosity;

    // 同步卡片实际渲染位置
    card.style.transform = `translate3d(0, ${y}px, 0)`;

    // 当位移极小时，隐藏液体桥
    if (y < 8) {
      path.setAttribute("d", "");
      droplet.setAttribute("r", "0");
      topBulb.setAttribute("r", "18");
      return;
    }

    // 几何拓扑定义：
    // 上基座中心 (160, 20)
    const topW = 120;
    const topX1 = 160 - topW / 2;
    const topX2 = 160 + topW / 2;
    const topY = 24;

    // 下卡片中心 (160, y + 20)
    const botW = 260;
    const botX1 = 160 - botW / 2;
    const botX2 = 160 + botW / 2;
    const botY = y + 16;
    const botH = 140; // 虚拟下托流体深度

    // 液桥颈部缩减（模拟流体截面体积守恒 Plateau-Rayleigh 伸长变细）
    const stretchDist = Math.max(0, y - 24);
    const breakThreshold = 145 * (1 + 1.25 * mu); // 高粘度断裂距离大两倍以上
    const isBroken = stretchDist > breakThreshold;

    if (isBroken) {
      // 液桥断裂，绘制分离液滴与回缩半球
      const dropY = topY + stretchDist * 0.42;
      const dropRadius = Math.max(4, 14 * (1 - (stretchDist - breakThreshold) / 100));
      droplet.setAttribute("cx", "160");
      droplet.setAttribute("cy", dropY.toFixed(1));
      droplet.setAttribute("r", dropRadius.toFixed(1));

      // 仅保留卡片本身的外包流体
      path.setAttribute("d", `
        M ${botX1} ${botY}
        Q 160 ${botY - 12} ${botX2} ${botY}
        L ${botX2} ${botY + botH}
        Q 160 ${botY + botH + 16} ${botX1} ${botY + botH}
        Z
      `);
      return;
    }

    // 正常拉伸流动：连接上下两端形成连续流体双曲凹液面
    droplet.setAttribute("r", "0");

    // 颈部最窄处宽度
    const neckRatio = 1 / (1 + (stretchDist / 95) * (1 - 0.65 * mu));
    const neckW = Math.max(16, (topW * 0.72) * neckRatio);
    const neckX1 = 160 - neckW / 2;
    const neckX2 = 160 + neckW / 2;
    const neckY = topY + stretchDist * 0.48;

    // 涟漪波动项：根据粘度调节波动衰减与频率
    const rippleWave = state.rippleAmp * Math.sin(state.rippleTime * (14 - mu * 8));

    // 构造光滑三次贝塞尔曲线流体轮廓
    const d = `
      M ${topX1} ${topY}
      C ${topX1 + 10} ${topY + stretchDist * 0.25}, ${neckX1} ${neckY - stretchDist * 0.15}, ${neckX1} ${neckY}
      C ${neckX1} ${neckY + stretchDist * 0.2}, ${botX1 + 20} ${botY - 20}, ${botX1} ${botY}
      L ${botX1} ${botY + botH}
      Q 160 ${botY + botH + 20 + rippleWave} ${botX2} ${botY + botH}
      L ${botX2} ${botY}
      C ${botX2 - 20} ${botY - 20}, ${neckX2} ${neckY + stretchDist * 0.2}, ${neckX2} ${neckY}
      C ${neckX2} ${neckY - stretchDist * 0.15}, ${topX2 - 10} ${topY + stretchDist * 0.25}, ${topX2} ${topY}
      Z
    `;
    path.setAttribute("d", d);
  }

  // 6. 交互动画主循环 (60+ FPS)
  function animationLoop(now) {
    const dt = Math.min((now - state.lastTime) / 1000, 0.05);
    state.lastTime = now;

    updatePhysics(dt);
    renderLiquid();

    requestAnimationFrame(animationLoop);
  }
  requestAnimationFrame(animationLoop);

  // 7. 开关与触发逻辑
  function openMenu() {
    state.isOpen = true;
    state.targetY = state.openY;
    state.hasPlayedSettleSound = false;
    wrap.classList.add("open");
    triggerBtn.setAttribute("aria-expanded", "true");
    state.rippleAmp = 18 * (1 - state.viscosity * 0.5);
    state.rippleTime = 0;
    playLiquidSound("snap", state.viscosity);
  }

  function closeMenu() {
    state.isOpen = false;
    state.targetY = 0;
    state.hasPlayedSettleSound = false;
    wrap.classList.remove("open");
    triggerBtn.setAttribute("aria-expanded", "false");
    state.rippleAmp = 10;
    state.rippleTime = 0;
    playLiquidSound("settle", state.viscosity);
  }

  function toggleMenu() {
    if (state.isOpen) closeMenu();
    else openMenu();
  }

  // 点击触发
  triggerBtn.addEventListener("click", (e) => {
    // 忽略刚刚完成拖拽的手势
    if (Math.abs(state.currentY - (state.isOpen ? state.openY : 0)) > 25) return;
    toggleMenu();
  });

  // 8. 拖拽拉伸流体交互 (Pointer Drag & Pull Physics)
  function handlePointerDown(e) {
    state.isDragging = true;
    state.dragPointerStartY = e.clientY;
    state.dragElementStartY = state.currentY;
    wrap.classList.add("dragging");
    triggerBtn.classList.add("dragging");
    document.body.style.userSelect = "none";

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp, { once: true });
    window.addEventListener("pointercancel", handlePointerUp, { once: true });
  }

  function handlePointerMove(e) {
    if (!state.isDragging) return;
    e.preventDefault();
    const deltaY = e.clientY - state.dragPointerStartY;
    // 允许向上微推或向下大幅拉扯 (最大拉伸到 340px)
    state.targetY = Math.max(0, Math.min(340, state.dragElementStartY + deltaY));
  }

  function handlePointerUp() {
    if (!state.isDragging) return;
    state.isDragging = false;
    wrap.classList.remove("dragging");
    triggerBtn.classList.remove("dragging");
    document.body.style.userSelect = "";

    window.removeEventListener("pointermove", handlePointerMove);

    // 根据释放时的距离和瞬时速度决定吸附到展开还是闭合
    const threshold = state.openY * 0.45;
    if (state.currentY > threshold || state.velocityY > 120) {
      openMenu();
    } else {
      closeMenu();
    }
  }

  // 绑定拖拽发起点（胶囊按钮与卡片底部的物理手柄）
  triggerBtn.addEventListener("pointerdown", (e) => {
    if (e.button === 0) handlePointerDown(e);
  });
  if (dragHandle) {
    dragHandle.addEventListener("pointerdown", (e) => {
      if (e.button === 0) handlePointerDown(e);
    });
  }

  // 点击外部收起
  document.addEventListener("pointerdown", (e) => {
    if (!wrap.contains(e.target) && !document.getElementById("viscosity-lab").contains(e.target)) {
      if (state.isOpen) closeMenu();
    }
  });

  // ESC 键收起
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.isOpen) {
      closeMenu();
    }
  });

  // 9. 粘度实验室交互绑定
  slider.addEventListener("input", (e) => {
    setViscosity(parseFloat(e.target.value));
  });

  presetBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const p = btn.dataset.preset;
      if (PRESETS[p]) {
        setViscosity(PRESETS[p].val, p);
        playLiquidSound("snap", PRESETS[p].val);
      }
    });
  });

  if (labToggle && labWidget) {
    labToggle.addEventListener("click", () => {
      labWidget.classList.toggle("minimized");
      labToggle.textContent = labWidget.classList.contains("minimized") ? "+" : "_";
    });
  }

  // 10. 绑定菜单项实际业务动作 (深链到 OrangeVerse 已有体系)
  card.querySelectorAll(".viscous-item-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const act = btn.dataset.action;
      closeMenu();

      switch (act) {
        case "explore-island": {
          const homeBtn = document.getElementById("home");
          if (homeBtn) homeBtn.click();
          break;
        }
        case "open-bookshelf": {
          window.open("/bookshelf.html", "_blank", "noopener");
          break;
        }
        case "open-articles": {
          const articlesBtn = document.getElementById("articles-nav-btn");
          if (articlesBtn) articlesBtn.click();
          break;
        }
        case "open-resume": {
          const resumeBtn = document.getElementById("resume-btn");
          if (resumeBtn) resumeBtn.click();
          break;
        }
        case "open-fox": {
          const foxBtn = document.getElementById("fox-portal-btn");
          if (foxBtn) foxBtn.click();
          break;
        }
        case "toggle-theme": {
          const themeBtns = Array.from(document.querySelectorAll(".theme-picker button"));
          const activeIndex = themeBtns.findIndex(b => b.getAttribute("aria-pressed") === "true");
          const nextIndex = (activeIndex + 1) % themeBtns.length;
          themeBtns[nextIndex].click();
          const desc = document.getElementById("viscous-theme-desc");
          if (desc) desc.textContent = `当前: ${themeBtns[nextIndex].textContent.trim()}`;
          break;
        }
      }
    });
  });

  // 初始化设定为默认蜂蜜粘度
  setViscosity(0.45, "honey");
  console.log("🍊 Viscous Gooey Dropdown & Viscosity Lab mounted successfully.");
}
