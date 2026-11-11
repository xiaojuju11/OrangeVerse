// ═════════════════════════════════════════════════════════════════════════
// 用户偏好持久化 (Persistence for island theme & ambient sound)
// -------------------------------------------------------------------------
// 说明：
// 1. 岛上主题与「环境音」开关此前只存在于当次页面会话，刷新后会被重置，
//    与「回到自己上次离开时的样子」的体验预期不符。
// 2. localStorage 在隐私模式 / 被禁用 / 配额写满时可能抛错，因此这里做
//    防御式封装：任何一次读写失败都静默降级为内存态默认值，不影响主流程。
// 3. 纯函数 + 依赖注入，便于在 Node 下用假 storage / 假 document 覆盖测试。
// ═════════════════════════════════════════════════════════════════════════

export const THEME_STORAGE_KEY = "orangeverse:theme";
export const SOUND_STORAGE_KEY = "orangeverse:sound";
export const DEFAULT_THEME = "forest";
export const DEFAULT_SOUND = false;

/**
 * 把任意存储值归一化为已知主题 id。
 * @param {unknown} value 待校验的值
 * @param {Record<string, unknown>} themes 主题表
 * @param {string} [fallback] 非法值时的回退
 * @returns {string}
 */
export function normalizeTheme(value, themes, fallback = DEFAULT_THEME) {
  return typeof value === "string" && Object.hasOwn(themes ?? {}, value) ? value : fallback;
}

/**
 * 把存储值归一化为布尔开关（只接受 true / "true"，其余一律视为关闭）。
 * @param {unknown} value
 * @returns {boolean}
 */
export function normalizeSound(value) {
  return value === true || value === "true" || value === "1";
}

/**
 * 创建一个带安全降级的偏好存取器。
 * - 传入的 storage 可调用失败（例如 Safari 隐私模式抛 SecurityError）。
 * - 写入前不会抛错，读取失败时返回 null 由调用方回退到默认值。
 *
 * @param {Storage|null} storage 通常是 window.localStorage
 * @param {{getItem?: Function, setItem?: Function}} [options]
 * @returns {{get: (key: string) => string|null, set: (key: string, value: string) => boolean}}
 */
export function createPreferenceStore(storage, { getItem = "getItem", setItem = "setItem" } = {}) {
  const read = typeof storage?.[getItem] === "function" ? storage[getItem].bind(storage) : null;
  const write = typeof storage?.[setItem] === "function" ? storage[setItem].bind(storage) : null;

  return {
    get(key) {
      if (!read) return null;
      try {
        const value = read(key);
        return typeof value === "string" ? value : null;
      } catch {
        return null;
      }
    },
    set(key, value) {
      if (!write) return false;
      try {
        write(key, String(value));
        return true;
      } catch {
        return false;
      }
    },
  };
}

let defaultStore;

/** 惰性获取浏览器默认存储（测试环境 / SSR 下无 window 时返回 null 存储）。 */
function browserStore() {
  if (defaultStore) return defaultStore;
  let storage = null;
  try {
    storage = typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    storage = null; // 某些浏览器在访问 localStorage 属性时就会抛错
  }
  defaultStore = createPreferenceStore(storage);
  return defaultStore;
}

/** 读取上次访问时的小岛主题。 */
export function loadTheme(themes) {
  return normalizeTheme(browserStore().get(THEME_STORAGE_KEY), themes);
}

/** 保存小岛主题（非法主题不写入）。 */
export function saveTheme(theme, themes) {
  if (!Object.hasOwn(themes ?? {}, theme)) return false;
  return browserStore().set(THEME_STORAGE_KEY, theme);
}

/** 读取上次访问时的环境音开关。 */
export function loadSoundEnabled() {
  return normalizeSound(browserStore().get(SOUND_STORAGE_KEY));
}

/** 保存环境音开关。 */
export function saveSoundEnabled(enabled) {
  return browserStore().set(SOUND_STORAGE_KEY, enabled ? "true" : "false");
}

/**
 * 解析要操作的文档：优先使用显式注入的 document（测试友好），
 * 其次回退到浏览器全局 document（SSR / Node 下为 undefined）。
 *
 * 之所以需要这层回退：调用方一旦漏传 `document`，`body[data-theme]`
 * 与主题文案就会静默失效——只有 3D 岛屿换肤、整站皮肤不动。
 *
 * @param {Document} [doc]
 * @returns {Document|undefined}
 */
export function resolveDocument(doc) {
  if (doc) return doc;
  return typeof document !== "undefined" ? document : undefined;
}

/**
 * 把主题应用到 DOM、CSS 变量与（可选的）3D 岛屿。
 * 不依赖 `island` 一定存在：WebGL 初始化失败时仍可切换配色与文案。
 *
 * @param {string} id 主题 id
 * @param {object} options
 * @param {Record<string, any>} options.themes 主题表
 * @param {Document} [options.document] 注入的文档（测试用；缺省取全局 document）
 * @param {{setTheme?: (id: string) => void}} [options.island] 岛屿实例
 * @param {boolean} [options.persist] 是否写入偏好存储
 * @returns {string} 实际生效的主题 id
 */
export function applyTheme(id, { themes, document: doc, island, persist = true } = {}) {
  const theme = normalizeTheme(id, themes);
  const themeConfig = themes?.[theme];
  if (!themeConfig) return theme;

  const target = resolveDocument(doc);
  if (target) {
    if (target.body?.dataset) target.body.dataset.theme = theme;
    if (target.documentElement?.style?.setProperty) {
      target.documentElement.style.setProperty("--accent", themeConfig.accent);
    }
    target.querySelectorAll?.(".theme-picker button").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset?.theme === theme));
    });
    const english = target.getElementById?.("theme-english");
    if (english) english.textContent = themeConfig.english;
    const caption = target.getElementById?.("theme-caption");
    if (caption) caption.textContent = themeConfig.caption;
  }

  island?.setTheme?.(theme);
  if (persist) saveTheme(theme, themes);
  return theme;
}
