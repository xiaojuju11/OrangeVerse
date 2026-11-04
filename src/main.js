import { mountVaporType } from "./vapor-type.js";
import "./style.css";
import "./exhibits.css";
import { mountExhibit } from "./exhibits.js";
import { categories, themes, profile } from "./content.js";
import { escapeHTML } from "./schema.js";
import { createIsland } from "./island.js";
import { ForestAudio } from "./audio.js";
import { modalManager } from "./modal-manager.js";

const $ = (id) => document.getElementById(id),
  visited = new Set(),
  audio = new ForestAudio();
let island,
  active = -1,
  started = false,
  toastTimer,
  webglFailed = false;

document.title = `${profile.title} · 个人作品集`;
const brand = document.querySelector('.brand > span:last-child');
if (brand) brand.innerHTML = `${escapeHTML(profile.title)}<small>${escapeHTML(profile.subtitle || 'A WORLD OF CURIOSITY')}</small>`;

const welcomeH1 = document.querySelector('.welcome h1');
if (welcomeH1) {
  welcomeH1.innerHTML = `<span class="welcome-lead-small">欢迎来到</span><span id="vapor-brand-heading" class="vapor-brand-heading" title="点击或拂过产生烟雾粒子交互"></span>`;
  const vaporEl = document.getElementById("vapor-brand-heading");
  if (vaporEl) {
    mountVaporType(vaporEl, {
      words: ["橘域", "OrangeVerse"],
      color: "#FFFFFF",
      vaporColor: "#aae0e4",
      align: "left",
      density: 1.25,
      particleSize: 1.4,
      spread: 1.5,
      rise: 1.2,
      turbulence: 0.85,
      hold: 3.2,
      interactive: true,
      breath: 1.2,
      clickAdvance: true,
      area: "parent",
    });
  }
}

document.querySelector('.welcome-story').textContent = profile.intro || `你好，我是${profile.name}。欢迎来看看我的作品与经历。`;
document.querySelector('meta[name="description"]').content = profile.intro || `${profile.name}的个人作品集`;
$("world").setAttribute('aria-label', `${profile.title}三维场景`);
$("camp-total").textContent = String(categories.length).padStart(2,'0');
$("channel").hidden = !profile.links.length;
if(profile.links.length) $("channel").textContent = `${profile.links[0].label} ↗`;

categories.forEach((c, i) => {
  const label = document.createElement("button");
  label.className = "camp-label";
  label.dataset.camp = i;
  label.setAttribute("aria-label", `走向${escapeHTML(c.name)}`);
  label.innerHTML = `<span>${c.number}</span>${escapeHTML(c.short)}<i></i>`;
  $("camp-labels").append(label);

  const nav = document.createElement("button");
  nav.dataset.camp = i;
  nav.innerHTML = `<span>${c.number}</span>${escapeHTML(c.name)}`;
  nav.setAttribute("aria-label", `前往${escapeHTML(c.name)}`);
  $("category-nav").append(nav);

  const dot = document.createElement("button");
  dot.className = "map-site";
  dot.dataset.camp = i;
  dot.style.left = `${50 + (c.arrival[0] / 28) * 100}%`;
  dot.style.top = `${50 + (c.arrival[1] / 28) * 100}%`;
  dot.setAttribute("aria-label", `地图：${escapeHTML(c.name)}`);
  $("map-sites").append(dot);
});

function toast(text) {
  clearTimeout(toastTimer);
  $("toast").textContent = text;
  $("toast").hidden = false;
  toastTimer = setTimeout(() => ($("toast").hidden = true), 3600);
}

function begin() {
  started = true;
  document.body.classList.add("exploring");
  $("welcome").setAttribute("inert", "");
  $("walk-status").textContent = "点击地面行走 · 拖动环顾 · 走近微光发现故事";
}

// ═════════════════════════════════════════════════════════════════════════
// 展品营地面板与统一弹窗调度
// ═════════════════════════════════════════════════════════════════════════
function closeWork() {
  modalManager.close("work");
}

function openWork(i) {
  const c = categories[i];
  begin();
  active = i;
  visited.add(i);

  $("panel-number").textContent = c.number;
  $("panel-english").textContent = c.english;
  $("panel-category").textContent = `FIELD NOTES / ${c.number}`;
  $("work-title").textContent = c.name;
  $("work-intro").textContent = c.intro;
  $("work-description").textContent = c.description;
  mountExhibit($("work-sections"), c.id);
  $("work").scrollTop = 0;
  $("visited-count").textContent = String(visited.size).padStart(2, "0");

  document.querySelectorAll("[data-camp]").forEach((b) => {
    const idx = Number(b.dataset.camp);
    b.classList.toggle("visited", visited.has(idx));
    b.classList.toggle("active", idx === i);
  });
  $("walk-status").textContent = `已抵达 · ${c.short}`;

  modalManager.open("work");
}

// 注册面板与弹窗到 ModalManager (统一调度、互斥与层级管理)
modalManager.register("work", {
  element: $("work"),
  closeBtn: [$("close-work"), $("continue")],
  exclusive: true,
  onOpen: () => {
    audio.playHaptic("open");
    document.body.classList.add("panel-open");
  },
  onClose: () => {
    audio.playHaptic("close");
    active = -1;
    document.body.classList.remove("panel-open");
    document.querySelectorAll("#category-nav button").forEach((b) => b.classList.remove("active"));
  }
});

modalManager.register("help", {
  element: $("help-dialog"),
  trigger: $("help"),
  closeBtn: [$("close-help"), $("help-done")],
  isDialog: true,
  onOpen: () => {
    audio.playHaptic("open");
    island?.stop();
  },
  onClose: () => audio.playHaptic("close")
});

modalManager.register("resume", {
  element: $("resume-modal"),
  trigger: $("resume-btn"),
  closeBtn: $("close-resume"),
  backdrop: $("close-resume-backdrop"),
  exclusive: true,
  onOpen: () => audio.playHaptic("open"),
  onClose: () => audio.playHaptic("close")
});

$("print-resume")?.addEventListener("click", () => window.print());

modalManager.register("fox", {
  element: $("fox-modal"),
  trigger: $("fox-portal-btn"),
  closeBtn: $("close-fox-btn"),
  backdrop: $("close-fox-backdrop"),
  exclusive: true,
  onOpen: () => audio.playHaptic("open"),
  onClose: () => audio.playHaptic("close")
});

// 全局微触感音效：点击按钮与胶囊标签触发柔和木质马林巴触音
document.addEventListener("click", (e) => {
  if (e.target.closest("button, [data-magnetic], .theme-picker button, .camp-label, .overview-button")) {
    audio.playHaptic("tap");
  }
}, { passive: true });

function navigate(i) {
  begin();
  closeWork();
  if (webglFailed) {
    openWork(i);
    return;
  }
  island?.travelTo(i);
  $("walk-status").textContent = `正在走向 · ${categories[i].short}`;
}

document.querySelectorAll("[data-camp]").forEach((b) =>
  b.addEventListener("click", () => navigate(Number(b.dataset.camp))),
);

$("explore").addEventListener("click", begin);
$("overview").addEventListener("click", () => {
  closeWork();
  island?.overview();
  $("walk-status").textContent = `全岛视角 · ${categories.length} 个营地，随心出发`;
});

$("home").addEventListener("click", () => {
  closeWork();
  island?.stop();
  island?.overview();
  started = false;
  document.body.classList.remove("exploring");
  $("welcome").removeAttribute("inert");
});

$("channel").addEventListener("click", () => {
  const link = profile.links[0];
  if(link) window.open(link.url, "_blank", "noopener,noreferrer");
});

// ═════════════════════════════════════════════════════════════════════════
// 主题切换与环境音
// ═════════════════════════════════════════════════════════════════════════
document.querySelectorAll(".theme-picker button").forEach((b) =>
  b.addEventListener("click", () => {
    const id = b.dataset.theme;
    document.body.dataset.theme = id;
    document.documentElement.style.setProperty("--accent", themes[id].accent);
    document
      .querySelectorAll(".theme-picker button")
      .forEach((btn) => btn.setAttribute("aria-pressed", String(btn === b)));
    $("theme-english").textContent = themes[id].english;
    $("theme-caption").textContent = themes[id].caption;
    const art = $("panel-art");
    const drawings = {
      forest:
        '<path d="m38 98 74-75 76 75H38Zm74-75v75m0-47-30 47m30-47 28 47M27 99h178"/><circle cx="184" cy="30" r="12"/>',
      desert:
        '<path d="M8 94q45-44 90-5t130-9M7 110q80-43 146-5M121 81V31m0 20q-19 0-19-18m19 7q17 0 17-17"/><circle cx="190" cy="31" r="17"/>',
      ocean:
        '<path d="M12 84q18-12 36 0t36 0t36 0t36 0t36 0t36 0M12 104q18-12 36 0t36 0t36 0t36 0t36 0t36 0M91 65l20-17-20-17q49-24 72 17-23 39-72 17Z"/><circle cx="147" cy="45" r="2"/><circle cx="187" cy="22" r="5"/>',
    };
    art.innerHTML = `<g stroke="currentColor" stroke-width="1.5" fill="none">${drawings[id]}</g>`;
    island?.setTheme(id);
    audio.setNight(id === "ocean");
  }),
);

$("sound").addEventListener("click", async () => {
  try {
    const enabled = await audio.toggle();
    $("sound").setAttribute("aria-pressed", String(enabled));
    $("sound").setAttribute(
      "aria-label",
      enabled ? "关闭环境音" : "开启环境音",
    );
    $("sound-waves").setAttribute(
      "d",
      enabled ? "M15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14" : "m16 9 5 6m0-6-5 6",
    );
  } catch {
    toast("当前浏览器暂时无法播放环境音。");
  }
});

document.addEventListener("visibilitychange", () => {
  if (audio.context) {
    if (document.hidden) audio.context.suspend();
    else if (audio.enabled) audio.context.resume();
  }
});

document.querySelectorAll(".touch-pad button").forEach((b) => {
  const [x, z] = b.dataset.dir.split(",").map(Number);
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    begin();
    island?.setTouchDirection(x, z);
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    b.addEventListener(event, () => island?.setTouchDirection(0, 0));
});

// ═════════════════════════════════════════════════════════════════════════
// 初始化 3D 岛屿引擎
// ═════════════════════════════════════════════════════════════════════════
try {
  island = createIsland($("world"), {
    onReady: () => {
      $("loading").classList.add("loaded");
      setTimeout(() => ($("loading").hidden = true), 800);
    },
    onArrive: openWork,
    onLeave: () => {
      if (active >= 0) closeWork();
    },
    onMove: () => {
      begin();
      closeWork();
    },
    onBoundary: toast,
    audio,
    toast,
  });
} catch (error) {
  console.error(error);
  webglFailed = true;
  $("loading").hidden = true;
  $("fallback").hidden = false;
  $("camp-labels").hidden = true;
}

// ═════════════════════════════════════════════════════════════════════════
// 模块启动 (伴侣、掘金阅读器、磁吸悬浮动效)
// ═════════════════════════════════════════════════════════════════════════
import { initCyberCompanion } from "./companion.js";
import { initJuejinArticleViewer } from "./articles.js";
import { initMagneticHover } from "./magnetic.js";
import { initFloatingDock } from "./dock.js";

initCyberCompanion();
initJuejinArticleViewer();
initFloatingDock({ audio, island });

if (location.hash === "#resume") modalManager.open("resume");
if (location.hash === "#ocean") {
  document.querySelector('.theme-picker [data-theme="ocean"]')?.click();
  if (!webglFailed) begin();
}

// 对顶部胶囊按钮、行动呼吁大按钮以及营地气泡启用磁吸
initMagneticHover("[data-magnetic]", {
  distance: 70,
  strength: 0.36,
  damping: 0.16,
  tilt: 0.12
});
