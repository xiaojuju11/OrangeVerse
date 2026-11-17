// 将页面用到的 Google Fonts（拉丁子集 woff2）下载到 public/fonts 自托管，
// 并生成对应的 fonts.css。中文（Noto Sans/Serif SC）体量过大，不下发，
// 由系统字体栈回退（font-family 已带 system-ui/sans-serif 兜底）。
// 用法：node scripts/vendor-fonts.mjs（需能访问 fonts.googleapis.com / fonts.gstatic.com）
import {mkdirSync, writeFileSync, existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'fonts');

// 与历史页面使用的字体族/字重保持一致（拉丁子集）
const FAMILIES = [
  {family: 'Cormorant Garamond', axes: 'ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500;1,600'},
  {family: 'Instrument Serif', axes: 'ital@0;1'},
  {family: 'Plus Jakarta Sans', axes: 'ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400'},
  {family: 'Inter Tight', axes: 'wght@500;600;700'},
  {family: 'Newsreader', axes: 'ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400'},
  {family: 'Manrope', axes: 'wght@500;600;700'},
  {family: 'Quicksand', axes: 'wght@700'},
];

// Chrome UA 才能拿到 woff2 而不是 ttf
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function parseBlocks(css) {
  const blocks = [];
  const re = /@font-face\s*\{([\s\S]*?)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const body = m[1];
    const grab = (key) => {
      const mm = body.match(new RegExp(`${key}\\s*:\\s*([^;]+)`));
      return mm ? mm[1].trim().replace(/^['"]|['"]$/g, '') : '';
    };
    const urlMatch = body.match(/url\((https:[^)]+)\)/);
    if (!urlMatch) continue;
    blocks.push({
      family: grab('font-family'),
      style: grab('font-style') || 'normal',
      weight: grab('font-weight') || '400',
      unicodeRange: grab('unicode-range'),
      url: urlMatch[1],
    });
  }
  return blocks;
}

async function main() {
  const faces = [];
  for (const {family, axes} of FAMILIES) {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:${axes}&display=swap`;
    const res = await fetch(cssUrl, {headers: {'User-Agent': UA}});
    if (!res.ok) throw new Error(`${family}: CSS 请求失败 ${res.status}`);
    const css = await res.text();
    const blocks = parseBlocks(css);
    // 只保留 latin 子集（unicode-range 含 U+0000-00FF），中文等其余子集交给系统字体
    for (const b of blocks) {
      if (/U\+0000-00FF/.test(b.unicodeRange)) faces.push(b);
    }
  }
  if (!faces.length) throw new Error('未解析到任何 latin 子集 @font-face');

  mkdirSync(outDir, {recursive: true});
  const seen = new Map(); // url -> filename
  let cssOut = `/* 由 scripts/vendor-fonts.mjs 生成：自托管 Google Fonts 拉丁子集（woff2）。\n   中文字形不打包，回退到系统字体栈。font-display: swap 避免 FOUT 阻塞观感。 */\n\n`;
  for (const f of faces) {
    let file = seen.get(f.url);
    if (!file) {
      const base = `${slug(f.family)}-${f.weight.replace(/\s+/g, '')}-${f.style}`;
      file = `${base}.woff2`;
      let i = 2;
      while (existsSync(path.join(outDir, file)) && seen.get(f.url) !== file) {
        file = `${base}-${i++}.woff2`;
      }
      const bin = Buffer.from(await (await fetch(f.url, {headers: {'User-Agent': UA}})).arrayBuffer());
      writeFileSync(path.join(outDir, file), bin);
      seen.set(f.url, file);
    }
    cssOut += `@font-face {\n  font-family: '${f.family}';\n  font-style: ${f.style};\n  font-weight: ${f.weight};\n  font-display: swap;\n  src: url('./${file}') format('woff2');\n  unicode-range: ${f.unicodeRange};\n}\n\n`;
  }
  writeFileSync(path.join(outDir, 'fonts.css'), cssOut);
  console.log(`完成：${seen.size} 个 woff2 → public/fonts/，@font-face ${faces.length} 条 → fonts.css`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
