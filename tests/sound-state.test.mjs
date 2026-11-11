import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SOUND_WAVES_OFF,
  SOUND_WAVES_ON,
  describeSoundState,
} from "../src/sound-state.js";

test("describeSoundState reports the on-state for both sound entries", () => {
  const on = describeSoundState(true);
  assert.equal(on.enabled, true);
  assert.equal(on.ariaPressed, "true");
  assert.equal(on.ariaLabel, "关闭环境音");
  assert.equal(on.wavesPath, SOUND_WAVES_ON);
  assert.equal(on.dockIcon, "🌊");
  assert.equal(on.dockTooltip, "关闭声景");
  assert.equal(on.status, "环境音已开启");
});

test("describeSoundState reports the off-state for both sound entries", () => {
  const off = describeSoundState(false);
  assert.equal(off.enabled, false);
  assert.equal(off.ariaPressed, "false");
  assert.equal(off.ariaLabel, "开启环境音");
  assert.equal(off.wavesPath, SOUND_WAVES_OFF);
  assert.equal(off.dockIcon, "🎵");
  assert.equal(off.dockTooltip, "潮汐声景");
  assert.equal(off.status, "环境音已关闭");
});

test("describeSoundState normalizes loose values the same way preferences do", () => {
  assert.equal(describeSoundState("true").enabled, true);
  assert.equal(describeSoundState("1").enabled, true);
  assert.equal(describeSoundState("false").enabled, false);
  assert.equal(describeSoundState("yes").enabled, false);
  assert.equal(describeSoundState(null).enabled, false);
  assert.equal(describeSoundState(undefined).enabled, false);
  assert.equal(describeSoundState(1).enabled, false, "number 1 is not an affirmative flag");
});

test("both surfaces always agree on the switch value", () => {
  for (const value of [true, false, "true", "0", null]) {
    const state = describeSoundState(value);
    const headerOn = state.ariaPressed === "true";
    const dockOn = state.dockIcon === "🌊";
    assert.equal(headerOn, dockOn, `header and dock disagree for ${String(value)}`);
    assert.equal(headerOn, state.enabled);
  }
});
