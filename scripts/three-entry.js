// public/ 下的独立页（404 / fox-view / vulpa）不经过 Vite 的模块图，
// 无法直接写 bare import，因此这里做一个聚合入口，由 scripts/vendor-three.mjs
// 打包成单个 ESM 文件供它们引用。
export * from "three";
export { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
export { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
export { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
