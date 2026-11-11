// ═════════════════════════════════════════════════════════════════════════
// 环境音「单一事实来源」(Single source of truth for ambient sound UI)
// -------------------------------------------------------------------------
// 说明：
// 1. 页面里有两处环境音入口：顶栏的圆形按钮 (#sound) 与悬浮 Dock 的潮汐声景。
//    此前两处各自维护图标 / 文案 / 开关状态，互相不知道对方是否已切换，
//    导致「点了 Dock，顶栏还显示关闭」「刷新后 Dock 又变回初始图标」。
// 2. 这里用一个纯函数把「开关值」映射成各处 UI 需要的全部字段，
//    两个入口都从这里取描述，状态自然一致，也便于在 Node 下直接单测。
// 3. 纯函数、无副作用、不接触 DOM。
// ═════════════════════════════════════════════════════════════════════════

import { normalizeSound } from "./preferences.js";

export const SOUND_WAVES_ON = "M15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14";
export const SOUND_WAVES_OFF = "m16 9 5 6m0-6-5 6";

/**
 * 把任意开关值归一化为环境音 UI 描述。
 * 归一化规则与偏好存储保持一致（true / "true" / "1" 视为开启），
 * 避免「存储里是开、界面显示是关」这类不一致。
 *
 * @param {unknown} enabled
 * @returns {{
 *   enabled: boolean,
 *   ariaPressed: "true"|"false",
 *   ariaLabel: string,
 *   wavesPath: string,
 *   dockIcon: string,
 *   dockTooltip: string,
 *   status: string,
 * }}
 */
export function describeSoundState(enabled) {
  const on = normalizeSound(enabled);
  return {
    enabled: on,
    ariaPressed: on ? "true" : "false",
    ariaLabel: on ? "关闭环境音" : "开启环境音",
    wavesPath: on ? SOUND_WAVES_ON : SOUND_WAVES_OFF,
    dockIcon: on ? "🌊" : "🎵",
    dockTooltip: on ? "关闭声景" : "潮汐声景",
    status: on ? "环境音已开启" : "环境音已关闭",
  };
}
