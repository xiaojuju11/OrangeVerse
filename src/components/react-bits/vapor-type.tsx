"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type Ref,
} from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";

export type VaporTypeTag = "span" | "div" | "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
export type VaporTypeAlign = "start" | "center" | "end";
export type VaporTypeSweep = "left" | "right" | "center" | "top" | "scatter";
export type VaporTypeArea = "parent" | "self" | "window";

export interface VaporTypeProps {
  words?: string[];
  as?: VaporTypeTag;
  align?: VaporTypeAlign;
  color?: string;
  vaporColor?: string;
  density?: number;
  particleSize?: number;
  spread?: number;
  rise?: number;
  turbulence?: number;
  diffusion?: number;
  grain?: number;
  sweep?: VaporTypeSweep;
  stagger?: number;
  condense?: number;
  hold?: number;
  dissolve?: number;
  overlap?: number;
  loop?: boolean;
  startOnView?: boolean;
  interactive?: boolean;
  breath?: number;
  breathRadius?: number;
  recovery?: number;
  clickAdvance?: boolean;
  pauseOnHover?: boolean;
  area?: VaporTypeArea;
  paused?: boolean;
  dpr?: number;
  onWordChange?: (index: number) => void;
  className?: string;
  style?: CSSProperties;
}

export interface VaporTypeHandle {
  next: () => void;
  replay: () => void;
}

type Settings = Required<Omit<VaporTypeProps, "as" | "className" | "style" | "onWordChange">> & {
  onWordChange?: (index: number) => void;
};

interface Word {
  texture: THREE.CanvasTexture;
  geometry: THREE.BufferGeometry;
  center: [number, number];
  size: [number, number];
  bounds: [number, number, number, number];
}

interface Layer {
  own: {
    uBounds: { value: THREE.Vector4 };
    uOrigin: { value: THREE.Vector2 };
    uSweep: { value: number };
    uPhase: { value: number };
    uMode: { value: number };
    uText: { value: THREE.Texture | null };
  };
  text: THREE.Mesh;
  points: THREE.Points;
  textMaterial: THREE.ShaderMaterial;
  particleMaterial: THREE.ShaderMaterial;
  word: number;
  mode: number;
  elapsed: number;
  radial: boolean;
}

interface Controller {
  sync: () => void;
  next: () => void;
  replay: () => void;
  destroy: () => void;
}

interface Line {
  top: number;
  bottom: number;
  left: number;
  right: number;
  text: string;
}

const DEFAULT_WORDS = ["Imagine", "Create", "Inspire"];
const SWEEPS: VaporTypeSweep[] = ["left", "right", "center", "top", "scatter"];
const CONDENSE = 0;
const HOLD = 1;
const DISSOLVE = 2;
const RADIAL = 5;
const FIELD_SCALE = 6;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const subscribeToMotion = (notify: () => void) => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};

const readMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const hiddenStyle: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

const sizerStyle: CSSProperties = { display: "grid" };

const passVertexShader = `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const fieldFragmentShader = `
precision highp float;

uniform sampler2D uPrevious;
uniform vec2 uResolution;
uniform vec2 uCanvas;
uniform float uFollow;
uniform float uDrain;
uniform vec2 uFrom;
uniform vec2 uTo;
uniform float uRadius;
uniform float uAmount;
uniform vec2 uWind;

float segmentDistance(vec2 p, vec2 a, vec2 b) {
  vec2 e = b - a;
  float t = clamp(dot(p - a, e) / max(dot(e, e), 1e-4), 0.0, 1.0);
  return length(p - a - e * t);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 p = (uv - 0.5) * uCanvas;
  vec4 previous = texture2D(uPrevious, uv);
  float d = segmentDistance(p, uFrom, uTo) / uRadius;
  float paint = exp(-d * d * 2.0) * uAmount;
  float target = max(previous.a - uDrain, paint);
  float strength = previous.r + (target - previous.r) * uFollow;
  vec2 wind = mix(previous.gb, uWind, clamp(paint * 3.0, 0.0, 1.0));
  gl_FragColor = vec4(max(strength, 0.0), wind, max(target, 0.0));
}
`;

const commonChunk = `
uniform vec2 uCanvas;
uniform vec4 uBounds;
uniform vec2 uOrigin;
uniform float uSweep;
uniform float uStagger;
uniform float uPhase;
uniform float uMode;
uniform float uGrain;
uniform float uDpr;
uniform float uEm;
uniform float uBreath;
uniform sampler2D uField;

const float TRAVEL = 0.75;

float hash12(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float orderAt(vec2 p) {
  vec2 size = max(uBounds.zw - uBounds.xy, vec2(1.0));
  vec2 q = clamp((p - uBounds.xy) / size, 0.0, 1.0);
  float o;
  if (uSweep < 0.5) {
    o = q.x;
  } else if (uSweep < 1.5) {
    o = 1.0 - q.x;
  } else if (uSweep < 2.5) {
    o = abs(q.x - 0.5) * 2.0;
  } else if (uSweep < 3.5) {
    o = 1.0 - q.y;
  } else if (uSweep < 4.5) {
    o = noise(p / (uEm * 0.5) + 3.7);
  } else {
    o = clamp(length(p - uOrigin) / max(length(size), 1.0) * 1.5, 0.0, 1.0);
  }
  return clamp(mix(o, noise(p / (uEm * 0.35) + 11.0), 0.2), 0.0, 1.0);
}

float frontAt(vec2 p) {
  if (abs(uMode - 1.0) < 0.5) return 0.0;
  float t = clamp(uPhase * (1.0 + uStagger) - orderAt(p) * uStagger, 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);
  return uMode < 0.5 ? 1.0 - t : t;
}

float releaseAt(vec2 p) {
  float g = noise(p / uGrain) * 0.6 + hash12(floor(p * uDpr) + 0.5) * 0.4;
  return 0.02 + 0.98 * clamp((g - 0.5) * 1.4 + 0.5, 0.0, 1.0);
}

vec4 fieldAt(vec2 p) {
  return texture2D(uField, p / uCanvas + 0.5);
}

float blowAt(float strength) {
  return clamp(strength * uBreath - 0.03, 0.0, 0.6);
}

vec3 toSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
`;

const textVertexShader = `
varying vec2 vUv;
varying vec2 vWorld;

void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xy;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const textFragmentShader = `
precision highp float;
${commonChunk}
uniform sampler2D uText;
uniform vec3 uColor;
varying vec2 vUv;
varying vec2 vWorld;

void main() {
  float ink = texture2D(uText, vUv).a;
  if (ink < 0.004) discard;
  float lift = max(frontAt(vWorld), blowAt(fieldAt(vWorld).r));
  if (lift >= releaseAt(vWorld) * (1.0 - TRAVEL)) discard;
  gl_FragColor = vec4(toSrgb(uColor), ink);
}
`;

const particleVertexShader = `
${commonChunk}
attribute vec4 aSeed;
uniform float uTime;
uniform float uSpread;
uniform float uRise;
uniform float uTurbulence;
uniform float uDiffusion;
uniform float uSize;
varying float vAlpha;
varying float vTint;

vec2 flow(vec2 p, float t) {
  p += 0.45 * sin(p.yx * vec2(1.3, 1.7) + vec2(t * 0.21, -t * 0.17));
  vec2 v = vec2(0.0);
  vec2 k = normalize(vec2(1.0, 0.6));
  v += vec2(k.y, -k.x) * cos(dot(k, p) * 1.1 + t * 0.55 + 1.3);
  k = normalize(vec2(-0.7, 1.1));
  v += vec2(k.y, -k.x) * cos(dot(k, p) * 1.9 - t * 0.47 + 4.1) * 0.55;
  k = normalize(vec2(1.3, -0.4));
  v += vec2(k.y, -k.x) * cos(dot(k, p) * 3.3 + t * 0.71 + 2.2) * 0.3;
  return v;
}

void main() {
  vec2 home = position.xy;
  vec4 field = fieldAt(home);
  float front = frontAt(home);
  float blow = blowAt(field.r);
  float s = clamp((max(front, blow) - releaseAt(home) * (1.0 - TRAVEL)) / TRAVEL, 0.0, 1.0);
  if (s <= 0.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vAlpha = 0.0;
    vTint = 0.0;
    return;
  }
  float blown = smoothstep(-0.04, 0.04, blow - front);
  float eased = uMode < 0.5 ? s * s : 1.0 - (1.0 - s) * (1.0 - s);
  eased = mix(eased, s, blown);
  float angle = aSeed.x * 6.2831853;
  vec2 jitter = vec2(cos(angle), sin(angle) * 0.7);
  vec2 drift = mix(vec2(0.0, uRise), field.gb * 2.2 + vec2(0.0, uRise * 0.3), blown);
  float reach = uSpread * eased * (0.3 + 0.7 * sqrt(aSeed.y));
  float stride = reach / 6.0;
  vec2 p = home;
  for (int i = 0; i < 6; i++) {
    vec2 f = flow(p / uEm * 0.9 + aSeed.z * 0.06, uTime);
    vec2 direction = drift + f * uTurbulence + jitter * uDiffusion * (0.2 + s);
    p += direction / max(length(direction), 0.35) * stride;
  }
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 0.0, 1.0);
  gl_PointSize = max(uSize * uDpr * mix(1.0, 1.25, s), 1.0);
  vAlpha = (1.0 - smoothstep(mix(0.45, 0.7, blown), 1.0, s)) * (0.5 + 0.5 * aSeed.w);
  vTint = smoothstep(0.0, 0.5, s);
}
`;

const particleFragmentShader = `
precision highp float;
uniform vec3 uColor;
uniform vec3 uVaporColor;
varying float vAlpha;
varying float vTint;

vec3 toSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

void main() {
  float d = length(gl_PointCoord - 0.5);
  float soft = 1.0 - smoothstep(0.3, 0.5, d);
  vec3 color = mix(uColor, uVaporColor, vTint);
  gl_FragColor = vec4(toSrgb(color), vAlpha * soft);
}
`;

const seeded = (seed: number) => {
  let state = Math.imul(seed + 1, 2654435761) >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
};

const transformText = (text: string, transform: string) => {
  if (transform === "uppercase") return text.toUpperCase();
  if (transform === "lowercase") return text.toLowerCase();
  if (transform === "capitalize") {
    return text.replace(
      /(^|\s)(\S)/gu,
      (match, space: string, letter: string) => `${space}${letter.toUpperCase()}`,
    );
  }
  return text;
};

const createTarget = (width: number, height: number) =>
  new THREE.WebGLRenderTarget(width, height, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  });

const disposeWord = (word: Word) => {
  word.texture.dispose();
  word.geometry.dispose();
};

const createVapor = (
  host: HTMLElement,
  stage: HTMLElement,
  settingsRef: { current: Settings },
): Controller | null => {
  const doc = host.ownerDocument;
  const canvas = doc.createElement("canvas");
  canvas.style.cssText =
    "position:absolute;left:0;top:0;display:block;pointer-events:none";
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
      powerPreference: "high-performance",
    });
  } catch {
    return null;
  }
  stage.appendChild(canvas);
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);

  const shared = {
    uCanvas: { value: new THREE.Vector2(1, 1) },
    uStagger: { value: 1 },
    uGrain: { value: 2 },
    uDpr: { value: 1 },
    uEm: { value: 16 },
    uBreath: { value: 1 },
    uField: { value: null as THREE.Texture | null },
    uColor: { value: new THREE.Color(1, 1, 1) },
  };
  const vapor = {
    uTime: { value: 0 },
    uSpread: { value: 40 },
    uRise: { value: 1 },
    uTurbulence: { value: 1 },
    uDiffusion: { value: 0.35 },
    uSize: { value: 1.2 },
    uVaporColor: { value: new THREE.Color(1, 1, 1) },
  };
  const fieldUniforms = {
    uPrevious: { value: null as THREE.Texture | null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uCanvas: shared.uCanvas,
    uFollow: { value: 1 },
    uDrain: { value: 0 },
    uFrom: { value: new THREE.Vector2() },
    uTo: { value: new THREE.Vector2() },
    uRadius: { value: 40 },
    uAmount: { value: 0 },
    uWind: { value: new THREE.Vector2() },
  };

  const fieldMaterial = new THREE.ShaderMaterial({
    uniforms: fieldUniforms,
    vertexShader: passVertexShader,
    fragmentShader: fieldFragmentShader,
    depthTest: false,
    depthWrite: false,
  });

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
  const plane = new THREE.PlaneGeometry(1, 1);
  const emptyGeometry = new THREE.BufferGeometry();
  const createLayer = (): Layer => {
    const own = {
      uBounds: { value: new THREE.Vector4(0, 0, 1, 1) },
      uOrigin: { value: new THREE.Vector2() },
      uSweep: { value: 0 },
      uPhase: { value: 0 },
      uMode: { value: HOLD },
      uText: { value: null as THREE.Texture | null },
    };
    const textMaterial = new THREE.ShaderMaterial({
      uniforms: { ...shared, ...own },
      vertexShader: textVertexShader,
      fragmentShader: textFragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: { ...shared, ...vapor, ...own },
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const text = new THREE.Mesh(plane, textMaterial);
    text.frustumCulled = false;
    text.visible = false;
    const points = new THREE.Points(emptyGeometry, particleMaterial);
    points.frustumCulled = false;
    points.renderOrder = 1;
    points.visible = false;
    scene.add(text, points);
    return {
      own,
      text,
      points,
      textMaterial,
      particleMaterial,
      word: -1,
      mode: HOLD,
      elapsed: 0,
      radial: false,
    };
  };
  const layers = [createLayer(), createLayer()];

  const fieldScene = new THREE.Scene();
  const fieldQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fieldMaterial);
  fieldQuad.frustumCulled = false;
  fieldScene.add(fieldQuad);

  const probe = doc.createElement("canvas");
  probe.width = 1;
  probe.height = 1;
  const probeContext = probe.getContext("2d", { willReadFrequently: true });
  const segmenter =
    typeof Intl !== "undefined" && "Segmenter" in Intl
      ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
      : null;

  let targets: THREE.WebGLRenderTarget[] = [];
  let flip = 0;
  let words: Word[] = [];
  let layoutKey = "";
  let colorKey = "";
  let width = 0;
  let height = 0;
  let dpr = 1;
  let em = 16;
  let fontsVersion = 0;
  let fontsReady = false;
  let current = 0;
  let started = false;
  let visible = false;
  let lost = false;
  let destroyed = false;
  let raf = 0;
  let timer = 0;
  let last = 0;
  let clock = 0;
  let lastPaint = -Infinity;
  let pendingNext = false;
  let pendingTarget = -1;
  let click: { x: number; y: number } | null = null;
  const pointer = {
    x: 0,
    y: 0,
    fromX: 0,
    fromY: 0,
    vx: 0,
    vy: 0,
    at: 0,
    fresh: true,
    moved: false,
    over: false,
  };

  const resolveColor = (value: string, fallback: string, target: THREE.Color) => {
    if (!probeContext) return;
    probeContext.clearRect(0, 0, 1, 1);
    probeContext.fillStyle = fallback;
    probeContext.fillStyle = value;
    probeContext.fillRect(0, 0, 1, 1);
    const [r, g, b] = probeContext.getImageData(0, 0, 1, 1).data;
    target.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
  };

  const refreshColors = () => {
    const settings = settingsRef.current;
    const text =
      settings.color === "currentColor" ? getComputedStyle(host).color : settings.color;
    const vaporValue = settings.vaporColor === "currentColor" ? text : settings.vaporColor;
    const key = `${text}|${vaporValue}`;
    if (key === colorKey) return false;
    colorKey = key;
    resolveColor(text, "#ffffff", shared.uColor.value);
    resolveColor(vaporValue, text, vapor.uVaporColor.value);
    return true;
  };

  const assign = (layer: Layer, next: number) => {
    const word = words[next];
    layer.word = next;
    if (!word) {
      layer.text.visible = false;
      layer.points.visible = false;
      return;
    }
    layer.own.uText.value = word.texture;
    layer.own.uBounds.value.set(...word.bounds);
    layer.text.position.set(word.center[0], word.center[1], 0);
    layer.text.scale.set(word.size[0], word.size[1], 1);
    layer.text.visible = true;
    layer.points.geometry = word.geometry;
    layer.points.visible = true;
  };

  const release = (layer: Layer) => {
    layer.word = -1;
    layer.text.visible = false;
    layer.points.visible = false;
    layer.points.geometry = emptyGeometry;
    layer.own.uText.value = null;
  };

  const rasterize = (
    node: HTMLElement,
    wordIndex: number,
    box: DOMRect,
    font: string,
    spacing: number,
    transform: string,
    direction: CanvasDirection,
    range: Range,
  ): Word | null => {
    const source = node.firstChild;
    if (!source || source.nodeType !== Node.TEXT_NODE) return null;
    const content = (source as Text).data;
    const pieces = segmenter
      ? Array.from(segmenter.segment(content), (part) => part.segment)
      : Array.from(content);
    const lines: Line[] = [];
    let offset = 0;
    for (const piece of pieces) {
      range.setStart(source, offset);
      range.setEnd(source, offset + piece.length);
      offset += piece.length;
      const rect = range.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      const line = lines[lines.length - 1];
      if (line && rect.top < line.bottom - rect.height * 0.5) {
        line.text += piece;
        line.left = Math.min(line.left, rect.left);
        line.right = Math.max(line.right, rect.right);
        line.top = Math.min(line.top, rect.top);
        line.bottom = Math.max(line.bottom, rect.bottom);
      } else {
        lines.push({
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          text: piece,
        });
      }
    }
    if (!lines.length) return null;
    const pad = em * 0.3;
    const left = Math.min(...lines.map((line) => line.left)) - box.left - pad;
    const top = Math.min(...lines.map((line) => line.top)) - box.top - pad;
    const right = Math.max(...lines.map((line) => line.right)) - box.left + pad;
    const bottom = Math.max(...lines.map((line) => line.bottom)) - box.top + pad;
    const originX = Math.floor(left * dpr) / dpr;
    const originY = Math.floor(top * dpr) / dpr;
    const pixelWidth = Math.max(1, Math.ceil((right - originX) * dpr));
    const pixelHeight = Math.max(1, Math.ceil((bottom - originY) * dpr));
    const surface = doc.createElement("canvas");
    surface.width = pixelWidth;
    surface.height = pixelHeight;
    const context = surface.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.setTransform(dpr, 0, 0, dpr, -originX * dpr, -originY * dpr);
    context.font = font;
    context.fillStyle = "#ffffff";
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    context.direction = direction;
    context.letterSpacing = `${spacing}px`;
    for (const line of lines) {
      const text = transformText(line.text.replace(/\s+$/u, ""), transform);
      if (!text) continue;
      const metrics = context.measureText(text);
      const ascent = metrics.fontBoundingBoxAscent || em * 0.8;
      const descent = metrics.fontBoundingBoxDescent || em * 0.2;
      const baseline = line.top + ((line.bottom - line.top) * ascent) / (ascent + descent);
      context.fillText(text, line.left - box.left, baseline - box.top);
    }
    const data = context.getImageData(0, 0, pixelWidth, pixelHeight).data;
    const step = 1 / Math.sqrt(clamp(settingsRef.current.density, 0.1, 4));
    const random = seeded(wordIndex);
    const homes: number[] = [];
    const cssWidth = pixelWidth / dpr;
    const cssHeight = pixelHeight / dpr;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let y = step / 2; y < cssHeight; y += step) {
      for (let x = step / 2; x < cssWidth; x += step) {
        const sampleX = x + (random() - 0.5) * step;
        const sampleY = y + (random() - 0.5) * step;
        const px = Math.min(pixelWidth - 1, Math.max(0, Math.floor(sampleX * dpr)));
        const py = Math.min(pixelHeight - 1, Math.max(0, Math.floor(sampleY * dpr)));
        if (data[(py * pixelWidth + px) * 4 + 3] < 96) continue;
        const worldX = originX + sampleX - width / 2;
        const worldY = height / 2 - (originY + sampleY);
        homes.push(worldX, worldY, 0);
        minX = Math.min(minX, worldX);
        maxX = Math.max(maxX, worldX);
        minY = Math.min(minY, worldY);
        maxY = Math.max(maxY, worldY);
      }
    }
    const count = homes.length / 3;
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = random();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(homes, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
    const texture = new THREE.CanvasTexture(surface);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.colorSpace = THREE.NoColorSpace;
    return {
      texture,
      geometry,
      center: [originX + cssWidth / 2 - width / 2, height / 2 - (originY + cssHeight / 2)],
      size: [cssWidth, cssHeight],
      bounds: count ? [minX, minY, maxX, maxY] : [0, 0, 1, 1],
    };
  };

  const layout = () => {
    if (lost) return false;
    const settings = settingsRef.current;
    const box = stage.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) return false;
    const computed = getComputedStyle(host);
    const nextDpr = Math.min(window.devicePixelRatio || 1, Math.max(settings.dpr, 0.5));
    const nodes = Array.from(host.querySelectorAll<HTMLElement>("[data-vapor-word]"));
    const key = [
      Math.round(box.width * 4),
      Math.round(box.height * 4),
      nextDpr,
      fontsVersion,
      computed.fontStyle,
      computed.fontVariantCaps,
      computed.fontWeight,
      computed.fontSize,
      computed.fontFamily,
      computed.letterSpacing,
      computed.textTransform,
      computed.direction,
      settings.density,
      settings.align,
      nodes.map((node) => node.textContent ?? "").join("\u0000"),
    ].join("|");
    if (key === layoutKey) return false;
    layoutKey = key;
    dpr = nextDpr;
    em = Number.parseFloat(computed.fontSize) || 16;
    const bufferWidth = Math.max(2, Math.ceil((box.width * dpr) / 2) * 2);
    const bufferHeight = Math.max(2, Math.ceil((box.height * dpr) / 2) * 2);
    width = bufferWidth / dpr;
    height = bufferHeight / dpr;
    renderer.setSize(bufferWidth, bufferHeight, false);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    camera.left = -width / 2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.updateProjectionMatrix();
    shared.uCanvas.value.set(width, height);
    shared.uDpr.value = dpr;
    shared.uEm.value = em;

    const fieldWidth = Math.max(8, Math.ceil(width / FIELD_SCALE));
    const fieldHeight = Math.max(8, Math.ceil(height / FIELD_SCALE));
    targets.forEach((target) => target.dispose());
    targets = [createTarget(fieldWidth, fieldHeight), createTarget(fieldWidth, fieldHeight)];
    fieldUniforms.uResolution.value.set(fieldWidth, fieldHeight);
    for (const target of targets) {
      renderer.setRenderTarget(target);
      renderer.clear();
    }
    renderer.setRenderTarget(null);
    flip = 0;
    shared.uField.value = targets[0].texture;

    const font = [
      computed.fontStyle,
      computed.fontVariantCaps === "small-caps" ? "small-caps" : "",
      computed.fontWeight,
      `${em}px`,
      computed.fontFamily,
    ]
      .filter(Boolean)
      .join(" ");
    const spacing = Number.parseFloat(computed.letterSpacing) || 0;
    const direction: CanvasDirection = computed.direction === "rtl" ? "rtl" : "ltr";
    const range = doc.createRange();
    words.forEach(disposeWord);
    words = [];
    nodes.forEach((node, wordIndex) => {
      const word = rasterize(
        node,
        wordIndex,
        box,
        font,
        spacing,
        computed.textTransform,
        direction,
        range,
      );
      if (word) words.push(word);
    });
    layers.forEach((layer, slot) => {
      if (layer.word < 0) return;
      if (layer.word < words.length) assign(layer, layer.word);
      else if (slot === current) assign(layer, 0);
      else release(layer);
    });
    return true;
  };

  const schedule = () => {
    if (destroyed || lost || !visible || !started || raf) return;
    if (timer) {
      window.clearTimeout(timer);
      timer = 0;
    }
    raf = requestAnimationFrame(frame);
  };

  const begin = () => {
    if (started || !fontsReady) return;
    if (!visible && settingsRef.current.startOnView) return;
    started = true;
    current = 0;
    release(layers[1]);
    const layer = layers[0];
    assign(layer, 0);
    layer.mode = settingsRef.current.paused ? HOLD : CONDENSE;
    layer.elapsed = 0;
    layer.radial = false;
    settingsRef.current.onWordChange?.(0);
  };

  const nearWord = () => {
    const word = words[layers[current].word];
    if (!word) return false;
    const reach = Math.max(settingsRef.current.breathRadius, 0.05) * em * 1.5;
    const [minX, minY, maxX, maxY] = word.bounds;
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const x = pointer.fromX + (pointer.x - pointer.fromX) * t;
      const y = pointer.fromY + (pointer.y - pointer.fromY) * t;
      if (Math.max(minX - x, 0, x - maxX) + Math.max(minY - y, 0, y - maxY) < reach) {
        return true;
      }
    }
    return false;
  };

  function frame(now: number) {
    raf = 0;
    if (destroyed || lost || !words.length) return;
    const settings = settingsRef.current;
    const dt = last ? Math.max(0, (now - last) / 1000) : 0;
    last = now;
    const step = Math.min(dt, 1 / 10);
    const count = words.length;
    const running = !settings.paused;
    const durations = [
      Math.max(settings.condense, 0.05),
      Math.max(settings.hold, 0),
      Math.max(settings.dissolve, 0.05),
    ];
    const handoff = durations[DISSOLVE] * (1 - clamp(settings.overlap, 0, 1));
    let active = layers[current];
    const hovering = settings.pauseOnHover && settings.interactive && pointer.over;
    const holdForever =
      !settings.loop && active.word >= count - 1 && !pendingNext && pendingTarget < 0;

    if (running) {
      clock += step;
      const outgoing = layers[1 - current];
      if (outgoing.word >= 0) {
        outgoing.elapsed += step;
        if (outgoing.elapsed >= durations[DISSOLVE]) release(outgoing);
      }
      if (active.mode === HOLD) {
        if (!hovering) active.elapsed += dt;
        const clicked = click !== null && settings.clickAdvance && settings.interactive;
        if (
          clicked ||
          pendingNext ||
          pendingTarget >= 0 ||
          (!holdForever && active.elapsed >= durations[HOLD])
        ) {
          active.mode = DISSOLVE;
          active.elapsed = 0;
          active.radial = clicked;
          if (click && clicked) active.own.uOrigin.value.set(click.x, click.y);
        }
        pendingNext = false;
      } else if (active.mode === CONDENSE) {
        active.elapsed += step;
        if (active.elapsed >= durations[CONDENSE]) {
          active.mode = HOLD;
          active.elapsed = 0;
          active.radial = false;
        }
      } else {
        active.elapsed += step;
      }
      if (active.mode === DISSOLVE && active.elapsed >= handoff) {
        const next = pendingTarget >= 0 ? pendingTarget % count : (active.word + 1) % count;
        pendingTarget = -1;
        const incoming = layers[1 - current];
        assign(incoming, next);
        incoming.mode = CONDENSE;
        incoming.elapsed = 0;
        incoming.radial = false;
        current = 1 - current;
        active = incoming;
        settings.onWordChange?.(next);
      }
    }
    click = null;

    const recovery = Math.max(settings.recovery, 0.05);
    const painting =
      pointer.moved && running && settings.interactive && settings.breath > 0 && nearWord();
    const fieldActive = now - lastPaint < (recovery + 1) * 1000;
    if ((painting || fieldActive) && targets.length === 2) {
      const speed = Math.hypot(pointer.vx, pointer.vy);
      const strength = painting ? clamp(speed / 1600, 0, 1) : 0;
      const windScale = speed > 1 ? Math.min(speed / 1200, 1) / speed : 0;
      fieldUniforms.uPrevious.value = targets[flip].texture;
      fieldUniforms.uFollow.value = 1 - Math.exp(-step / 0.14);
      fieldUniforms.uDrain.value = step / recovery;
      fieldUniforms.uFrom.value.set(pointer.fromX, pointer.fromY);
      fieldUniforms.uTo.value.set(pointer.x, pointer.y);
      fieldUniforms.uRadius.value = Math.max(settings.breathRadius, 0.05) * em;
      fieldUniforms.uAmount.value = strength;
      fieldUniforms.uWind.value.set(pointer.vx * windScale, pointer.vy * windScale);
      renderer.setRenderTarget(targets[1 - flip]);
      renderer.render(fieldScene, camera);
      renderer.setRenderTarget(null);
      flip = 1 - flip;
      shared.uField.value = targets[flip].texture;
      if (painting && strength > 0.02) lastPaint = now;
    }
    pointer.fromX = pointer.x;
    pointer.fromY = pointer.y;
    pointer.moved = false;

    const sweep = Math.max(0, SWEEPS.indexOf(settings.sweep));
    for (const layer of layers) {
      layer.own.uMode.value = layer.mode;
      layer.own.uPhase.value =
        layer.mode === HOLD ? 0 : Math.min(layer.elapsed / durations[layer.mode], 1);
      layer.own.uSweep.value = layer.radial ? RADIAL : sweep;
    }
    shared.uStagger.value = clamp(settings.stagger, 0, 4);
    shared.uGrain.value = Math.max(settings.grain, 0.05) * em * 0.035;
    shared.uBreath.value = settings.interactive ? clamp(settings.breath, 0, 3) : 0;
    vapor.uTime.value = clock;
    vapor.uSpread.value = Math.max(settings.spread, 0) * em;
    vapor.uRise.value = clamp(settings.rise, -3, 3);
    vapor.uTurbulence.value = clamp(settings.turbulence, 0, 4);
    vapor.uDiffusion.value = clamp(settings.diffusion, 0, 4);
    vapor.uSize.value = clamp(settings.particleSize, 0.25, 8);
    renderer.render(scene, camera);

    const busy =
      running &&
      (active.mode !== HOLD ||
        layers[1 - current].word >= 0 ||
        now - lastPaint < (recovery + 1) * 1000 ||
        pendingNext ||
        pendingTarget >= 0);
    if (busy) {
      schedule();
    } else if (running && active.mode === HOLD && !holdForever && !hovering && visible) {
      const remaining = Math.max(durations[HOLD] - active.elapsed, 0);
      timer = window.setTimeout(() => {
        timer = 0;
        schedule();
      }, remaining * 1000 + 16);
    }
  }

  const locate = (event: PointerEvent) => {
    const box = canvas.getBoundingClientRect();
    return {
      x: event.clientX - box.left - width / 2,
      y: box.top + height / 2 - event.clientY,
    };
  };

  const inside = (event: PointerEvent) => {
    const rect = host.getBoundingClientRect();
    return (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
  };

  const onMove = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    const over = inside(event);
    if (pointer.over && !over) last = 0;
    pointer.over = over;
    const point = locate(event);
    const at = event.timeStamp;
    if (pointer.fresh) {
      pointer.fresh = false;
      pointer.x = point.x;
      pointer.y = point.y;
      pointer.fromX = point.x;
      pointer.fromY = point.y;
      pointer.vx = 0;
      pointer.vy = 0;
      pointer.at = at;
      return;
    }
    const gap = Math.max((at - pointer.at) / 1000, 1 / 500);
    const blend = Math.min(1, gap / 0.03);
    pointer.vx += ((point.x - pointer.x) / gap - pointer.vx) * blend;
    pointer.vy += ((point.y - pointer.y) / gap - pointer.vy) * blend;
    pointer.x = point.x;
    pointer.y = point.y;
    pointer.at = at;
    pointer.moved = true;
    schedule();
  };

  const onLeave = () => {
    if (pointer.over) last = 0;
    pointer.fresh = true;
    pointer.over = false;
    pointer.vx = 0;
    pointer.vy = 0;
    schedule();
  };

  const onDown = (event: PointerEvent) => {
    const settings = settingsRef.current;
    if (!settings.clickAdvance || !settings.interactive || event.button > 0) return;
    if (!inside(event)) return;
    click = locate(event);
    schedule();
  };

  let bindings: [EventTarget, string, EventListener][] = [];
  let boundArea: VaporTypeArea | null = null;
  const unbind = () => {
    for (const [target, type, listener] of bindings) target.removeEventListener(type, listener);
    bindings = [];
  };
  const bindArea = () => {
    const area = settingsRef.current.area;
    if (area === boundArea) return;
    unbind();
    boundArea = area;
    const surface: EventTarget =
      area === "window" ? doc : area === "self" ? host : (host.parentElement ?? host);
    const exit: EventTarget = area === "window" ? doc.documentElement : surface;
    bindings = [
      [surface, "pointermove", onMove as EventListener],
      [surface, "pointerdown", onDown as EventListener],
      [exit, "pointerleave", onLeave],
      [surface, "pointercancel", onLeave],
    ];
    for (const [target, type, listener] of bindings) {
      target.addEventListener(type, listener, { passive: true });
    }
  };

  const onFonts = () => {
    fontsReady = true;
    fontsVersion += 1;
    layout();
    begin();
    schedule();
  };

  const resizer = new ResizeObserver(() => {
    if (layout()) schedule();
  });
  resizer.observe(host);

  const themer = new MutationObserver(() => {
    if (refreshColors()) schedule();
  });
  themer.observe(doc.documentElement, {
    attributes: true,
    attributeFilter: ["class", "style", "data-theme"],
  });

  const observer =
    typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(
          ([entry]) => {
            visible = entry.isIntersecting;
            if (visible) {
              begin();
              last = 0;
              schedule();
            } else if (raf) {
              cancelAnimationFrame(raf);
              raf = 0;
            }
          },
          { rootMargin: "60px" },
        );

  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
  const onRestored = () => {
    lost = false;
    layoutKey = "";
    colorKey = "";
    refreshColors();
    layout();
    schedule();
  };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);

  refreshColors();
  bindArea();
  layout();
  const fonts = doc.fonts;
  if (fonts) {
    fonts.addEventListener("loadingdone", onFonts);
    fonts.ready.then(() => {
      if (!destroyed) onFonts();
    });
  } else {
    fontsReady = true;
  }
  if (observer) {
    observer.observe(host);
  } else {
    visible = true;
    begin();
  }

  return {
    sync: () => {
      bindArea();
      refreshColors();
      layout();
      begin();
      schedule();
    },
    next: () => {
      pendingNext = true;
      schedule();
    },
    replay: () => {
      pendingTarget = 0;
      schedule();
    },
    destroy: () => {
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      if (timer) window.clearTimeout(timer);
      observer?.disconnect();
      resizer.disconnect();
      themer.disconnect();
      unbind();
      fonts?.removeEventListener("loadingdone", onFonts);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      words.forEach(disposeWord);
      words = [];
      targets.forEach((target) => target.dispose());
      plane.dispose();
      emptyGeometry.dispose();
      fieldQuad.geometry.dispose();
      for (const layer of layers) {
        layer.textMaterial.dispose();
        layer.particleMaterial.dispose();
      }
      fieldMaterial.dispose();
      renderer.dispose();
      if (!renderer.getContext().isContextLost()) renderer.forceContextLoss();
      canvas.remove();
    },
  };
};

export const VaporType = forwardRef<VaporTypeHandle, VaporTypeProps>(function VaporType(
  {
    words = DEFAULT_WORDS,
    as: Tag = "span",
    align = "center",
    color = "currentColor",
    vaporColor = "#B19EEF",
    density = 1,
    particleSize = 1.2,
    spread = 1.2,
    rise = 1,
    turbulence = 0.8,
    diffusion = 0.35,
    grain = 1,
    sweep = "left",
    stagger = 0.8,
    condense = 1.8,
    hold = 2.4,
    dissolve = 2,
    overlap = 0.6,
    loop = true,
    startOnView = true,
    interactive = true,
    breath = 1,
    breathRadius = 0.8,
    recovery = 1.2,
    clickAdvance = true,
    pauseOnHover = true,
    area = "parent",
    paused = false,
    dpr = 2,
    onWordChange,
    className,
    style,
  },
  ref,
) {
  const hostRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLSpanElement | null>(null);
  const controllerRef = useRef<Controller | null>(null);
  const reduced = useSyncExternalStore(subscribeToMotion, readMotion, () => false);
  const [failed, setFailed] = useState(false);
  const still = reduced || failed;
  const list = useMemo(() => {
    const cleaned = words.map((word) => word.trim()).filter(Boolean);
    return cleaned.length ? cleaned : DEFAULT_WORDS;
  }, [words]);

  const settings: Settings = {
    words: list,
    align,
    color,
    vaporColor,
    density,
    particleSize,
    spread,
    rise,
    turbulence,
    diffusion,
    grain,
    sweep,
    stagger,
    condense,
    hold,
    dissolve,
    overlap,
    loop,
    startOnView,
    interactive,
    breath,
    breathRadius,
    recovery,
    clickAdvance,
    pauseOnHover,
    area,
    paused,
    dpr,
    onWordChange,
  };
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
    controllerRef.current?.sync();
  });

  useEffect(() => {
    if (still) return;
    const host = hostRef.current;
    const stage = stageRef.current;
    if (!host || !stage) return;
    const controller = createVapor(host, stage, settingsRef);
    if (!controller) {
      const frame = requestAnimationFrame(() => setFailed(true));
      return () => cancelAnimationFrame(frame);
    }
    controllerRef.current = controller;
    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [still]);

  useImperativeHandle(
    ref,
    () => ({
      next: () => controllerRef.current?.next(),
      replay: () => controllerRef.current?.replay(),
    }),
    [],
  );

  const bleed = Math.max(spread, 0) + 0.35;

  return (
    <Tag
      ref={hostRef as Ref<HTMLSpanElement & HTMLDivElement & HTMLParagraphElement & HTMLHeadingElement>}
      className={cn("relative inline-block", className)}
      style={style}
    >
      <span style={hiddenStyle}>{list.join(", ")}</span>
      <span aria-hidden="true" style={sizerStyle}>
        {list.map((word, index) => (
          <span
            key={`${index}:${word}`}
            data-vapor-word=""
            style={{
              gridArea: "1 / 1",
              justifySelf: align,
              alignSelf: "center",
              textAlign: align,
              color: still && index === 0 ? undefined : "transparent",
              visibility: still && index > 0 ? "hidden" : undefined,
            }}
          >
            {word}
          </span>
        ))}
      </span>
      {still ? null : (
        <span
          ref={stageRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: `${-bleed}em`,
            display: "block",
            pointerEvents: "none",
          }}
        />
      )}
    </Tag>
  );
});

export default VaporType;
