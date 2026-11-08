import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SOUND,
  DEFAULT_THEME,
  SOUND_STORAGE_KEY,
  THEME_STORAGE_KEY,
  applyTheme,
  createPreferenceStore,
  normalizeSound,
  normalizeTheme,
} from "../src/preferences.js";

const themes = {
  forest: { english: "FOREST ISLAND", caption: "森林", accent: "#3f7761" },
  desert: { english: "DESERT OASIS", caption: "沙洲", accent: "#aa6d3e" },
  ocean: { english: "OCEAN AT DUSK", caption: "浅海", accent: "#527ea4" },
};

/** 极简内存 storage，行为对齐 localStorage 且可注入抛错。 */
function memoryStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    dump: () => Object.fromEntries(data),
  };
}

function throwingStorage() {
  return {
    getItem() {
      throw new Error("SecurityError: storage disabled");
    },
    setItem() {
      throw new Error("QuotaExceededError: storage full");
    },
  };
}

/** 记录调用并暴露 aria-pressed 状态的假 document。 */
function fakeDocument() {
  const pressed = new Map();
  const elements = new Map([
    ["theme-english", { textContent: "" }],
    ["theme-caption", { textContent: "" }],
  ]);
  return {
    body: { dataset: {} },
    documentElement: { style: { values: {}, setProperty(k, v) { this.values[k] = v; } } },
    querySelectorAll: () => [
      {
        dataset: { theme: "forest" },
        setAttribute: (k, v) => pressed.set("forest", v),
      },
      {
        dataset: { theme: "ocean" },
        setAttribute: (k, v) => pressed.set("ocean", v),
      },
    ],
    getElementById: (id) => elements.get(id) ?? null,
    pressed,
    elements,
  };
}

test("normalizeTheme falls back for unknown or hostile values", () => {
  assert.equal(normalizeTheme("ocean", themes), "ocean");
  assert.equal(normalizeTheme("forest", themes), "forest");
  assert.equal(normalizeTheme("nebula", themes), DEFAULT_THEME);
  assert.equal(normalizeTheme(null, themes), DEFAULT_THEME);
  assert.equal(normalizeTheme(42, themes), DEFAULT_THEME);
  assert.equal(normalizeTheme("__proto__", themes), DEFAULT_THEME);
  assert.equal(normalizeTheme("toString", themes), DEFAULT_THEME);
  assert.equal(normalizeTheme("ocean", null), DEFAULT_THEME);
  assert.equal(normalizeTheme("ocean", themes, "desert"), "ocean");
  assert.equal(normalizeTheme("bad", themes, "desert"), "desert");
});

test("normalizeSound accepts only affirmative values", () => {
  assert.equal(normalizeSound(true), true);
  assert.equal(normalizeSound("true"), true);
  assert.equal(normalizeSound("1"), true);
  assert.equal(normalizeSound(false), false);
  assert.equal(normalizeSound(DEFAULT_SOUND), false);
  assert.equal(normalizeSound("false"), false);
  assert.equal(normalizeSound("yes"), false);
  assert.equal(normalizeSound(null), false);
  assert.equal(normalizeSound(undefined), false);
});

test("preference store round-trips values under namespaced keys", () => {
  const storage = memoryStorage();
  const store = createPreferenceStore(storage);
  assert.equal(store.get(THEME_STORAGE_KEY), null);
  assert.equal(store.set(THEME_STORAGE_KEY, "ocean"), true);
  assert.equal(store.get(THEME_STORAGE_KEY), "ocean");
  assert.equal(storage.dump()[THEME_STORAGE_KEY], "ocean");
  assert.match(THEME_STORAGE_KEY, /^orangeverse:/);
  assert.match(SOUND_STORAGE_KEY, /^orangeverse:/);
  assert.notEqual(THEME_STORAGE_KEY, SOUND_STORAGE_KEY);
});

test("preference store degrades when storage throws or is unavailable", () => {
  const broken = createPreferenceStore(throwingStorage());
  assert.equal(broken.get(THEME_STORAGE_KEY), null);
  assert.equal(broken.set(THEME_STORAGE_KEY, "desert"), false);

  const missing = createPreferenceStore(null);
  assert.equal(missing.get(SOUND_STORAGE_KEY), null);
  assert.equal(missing.set(SOUND_STORAGE_KEY, "true"), false);
});

test("applyTheme updates DOM, accent variable, island and persistence", () => {
  const storage = memoryStorage();
  const doc = fakeDocument();
  const calls = [];

  const applied = applyTheme("ocean", {
    themes,
    document: doc,
    island: { setTheme: (id) => calls.push(id) },
    persist: false,
  });

  assert.equal(applied, "ocean");
  assert.equal(doc.body.dataset.theme, "ocean");
  assert.equal(doc.documentElement.style.values["--accent"], "#527ea4");
  assert.equal(doc.pressed.get("ocean"), "true");
  assert.equal(doc.pressed.get("forest"), "false");
  assert.equal(doc.elements.get("theme-english").textContent, "OCEAN AT DUSK");
  assert.equal(doc.elements.get("theme-caption").textContent, "浅海");
  assert.deepEqual(calls, ["ocean"]);
  assert.deepEqual(storage.dump(), {}, "persist:false must not write storage");
});

test("applyTheme refuses unknown themes and keeps the fallback palette", () => {
  const doc = fakeDocument();
  const calls = [];
  const applied = applyTheme("nebula", {
    themes,
    document: doc,
    island: { setTheme: (id) => calls.push(id) },
    persist: false,
  });
  assert.equal(applied, DEFAULT_THEME);
  assert.equal(doc.body.dataset.theme, DEFAULT_THEME);
  assert.equal(doc.pressed.get("forest"), "true");
  assert.deepEqual(calls, [DEFAULT_THEME]);
});

test("applyTheme works without any DOM or island (WebGL failure path)", () => {
  const applied = applyTheme("desert", { themes, persist: false });
  assert.equal(applied, "desert");
});
