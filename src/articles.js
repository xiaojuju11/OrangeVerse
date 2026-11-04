// ═════════════════════════════════════════════════════════════════════════
// OrangeVerse 掘金专栏 & 个人学习书本交互控制器
// ═════════════════════════════════════════════════════════════════════════
import { modalManager } from "./modal-manager.js";

export function initJuejinArticleViewer() {
  const modal = document.getElementById("article-modal");
  const openBtn = document.getElementById("articles-nav-btn");
  const closeBtn = document.getElementById("close-article-modal");
  const backdrop = document.getElementById("close-article-backdrop");
  const listContainer = document.getElementById("juejin-list-container");
  const readerContainer = document.getElementById("article-reader");
  const backToListBtn = document.getElementById("back-to-list");

  let articlesData = [];

  // 获取掘金文章数据
  async function loadArticles() {
    try {
      const res = await fetch("/juejin_articles.json");
      articlesData = await res.json();
      renderArticleList();
    } catch (e) {
      console.warn("Load juejin articles failed", e);
    }
  }

  function renderArticleList() {
    if (!listContainer) return;
    listContainer.innerHTML = articlesData.map((art, idx) => `
      <div class="juejin-card" data-idx="${idx}">
        <div class="juejin-card-header">
          <span class="juejin-badge">掘金专栏</span>
          <span class="juejin-meta">👁️ ${art.views} · 👍 ${art.likes}</span>
        </div>
        <h4 class="juejin-card-title">${art.title}</h4>
        <p class="juejin-card-brief">${art.brief}</p>
        <div class="juejin-card-footer">
          <button class="juejin-read-btn">深度阅读 📖</button>
          <a href="https://juejin.cn/post/${art.id}" target="_blank" rel="noopener" class="juejin-link-btn" onclick="event.stopPropagation()">掘金原作 ↗</a>
        </div>
      </div>
    `).join("");

    listContainer.querySelectorAll(".juejin-card").forEach(card => {
      card.addEventListener("click", () => {
        const idx = Number(card.dataset.idx);
        openReader(articlesData[idx]);
      });
    });
  }

  function openReader(art) {
    if (!readerContainer || !listContainer) return;
    listContainer.hidden = true;
    readerContainer.hidden = false;

    document.getElementById("reader-title").textContent = art.title;
    document.getElementById("reader-meta").textContent = `阅读量: ${art.views} | 点赞: ${art.likes} | 原文链接: juejin.cn/post/${art.id}`;
    document.getElementById("reader-content").innerHTML = `
      <div class="reader-callout">
        <b>💡 掘金同步长文</b>
        <p>${art.brief}</p>
      </div>
      <div class="reader-full-link">
        <p>本文已在掘金正式发表，阅读排版与源码交互：</p>
        <a href="https://juejin.cn/post/${art.id}" target="_blank" rel="noopener" class="reader-cta">在掘金阅读完整正文 ↗</a>
      </div>
    `;
  }

  if (backToListBtn) {
    backToListBtn.addEventListener("click", () => {
      readerContainer.hidden = true;
      listContainer.hidden = false;
    });
  }

  // 集中接入 ModalManager 调度
  if (modal) {
    modalManager.register("articles", {
      element: modal,
      trigger: openBtn,
      closeBtn: closeBtn,
      backdrop: backdrop,
      onOpen: () => {
        if (!articlesData.length) loadArticles();
      },
      onClose: () => {
        // 关闭时重置回列表视图
        if (readerContainer) readerContainer.hidden = true;
        if (listContainer) listContainer.hidden = false;
      }
    });
  }
}
