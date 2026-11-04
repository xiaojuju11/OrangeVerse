import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createShallowOcean } from '../src/shallow-ocean.js';

test('shallow ocean covers the scene with a shoreline grid and respects reduced motion', () => {
  const ocean = createShallowOcean();
  ocean.geometry.computeBoundingBox();
  assert.equal(ocean.geometry.boundingBox.max.x, 120);
  assert.equal(ocean.geometry.boundingBox.min.z, -120);
  assert.ok(ocean.geometry.attributes.position.count > 4000);
  ocean.update(12, false);
  assert.equal(ocean.material.uniforms.time.value, 12);
  ocean.update(13, true);
  assert.equal(ocean.material.uniforms.time.value, 0);
});
