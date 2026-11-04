import * as THREE from 'three';

// Inspired by danmana/sakura-idle GPU curl-noise falling petal physics.
// Aerodynamic 3-axis tumbling petals & foliage with theme-aware palettes.

export function createSakuraField(scene, groundHeightFunc) {
  const COUNT = 160;
  const TAU = Math.PI * 2;

  // Create curved petal geometry with aerodynamic center ridge
  const geometry = new THREE.PlaneGeometry(0.18, 0.26, 3, 3);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // Slight spoon curve along vein
    pos.setZ(i, (1.0 - (x / 0.09) ** 2) * 0.035 + Math.sin(y * 8.0) * 0.015);
  }
  geometry.computeVertexNormals();

  // Create custom soft petal texture with velvety rim
  function makePetalTexture() {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 64, 64);

    // Oval petal path
    ctx.beginPath();
    ctx.ellipse(32, 32, 22, 28, 0, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(32, 28, 4, 32, 32, 30);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.65, 'rgba(255, 240, 245, 0.95)');
    g.addColorStop(0.9, 'rgba(255, 220, 230, 0.7)');
    g.addColorStop(1, 'rgba(255, 200, 215, 0)');
    ctx.fillStyle = g;
    ctx.fill();

    return new THREE.CanvasTexture(c);
  }

  const material = new THREE.MeshStandardMaterial({
    map: makePetalTexture(),
    color: '#ffc0cb',
    roughness: 0.65,
    metalness: 0.05,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    alphaTest: 0.05,
  });

  const instancedMesh = new THREE.InstancedMesh(geometry, material, COUNT);
  instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(instancedMesh);

  // Palettes per theme
  const themeColors = {
    forest: ['#ffb7c5', '#ffd1dc', '#c7f9cc', '#ffcbf2'], // Sakura pinks & fresh green
    desert: ['#fde047', '#fef08a', '#fdba74', '#fed7aa'], // Amber & golden dust leaves
    ocean: ['#67e8f9', '#a5f3fc', '#c4b5fd', '#bae6fd'], // Bioluminescent cyan & violet petals
  };

  const dummy = new THREE.Object3D();
  const petals = [];

  function resetPetal(p, fullSpread = false) {
    const angle = Math.random() * TAU;
    const radius = 1.0 + Math.random() * 11.8;
    p.x = Math.cos(angle) * radius;
    p.z = Math.sin(angle) * radius;
    const ground = groundHeightFunc(p.x, p.z);
    p.y = fullSpread ? ground + 0.5 + Math.random() * 6.5 : ground + 4.8 + Math.random() * 3.5;
    p.ground = ground;

    p.rotX = Math.random() * TAU;
    p.rotY = Math.random() * TAU;
    p.rotZ = Math.random() * TAU;

    // Aerodynamic tumble speed
    p.spinX = (Math.random() - 0.5) * 2.8;
    p.spinY = (Math.random() - 0.5) * 2.2;
    p.spinZ = (Math.random() - 0.5) * 3.4;

    // Fall & sway params
    p.fallSpeed = 0.35 + Math.random() * 0.42;
    p.swaySpeed = 0.8 + Math.random() * 1.4;
    p.swayRadius = 0.25 + Math.random() * 0.35;
    p.phase = Math.random() * TAU;
    p.scale = 0.7 + Math.random() * 0.6;
  }

  // Initialize petals
  const colorHelper = new THREE.Color();
  for (let i = 0; i < COUNT; i++) {
    const p = {};
    resetPetal(p, true);
    petals.push(p);

    // Initial color
    const c = themeColors.forest[i % themeColors.forest.length];
    colorHelper.set(c);
    instancedMesh.setColorAt(i, colorHelper);
  }
  if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;

  return {
    mesh: instancedMesh,

    update(dt, time, reducedMotion = false) {
      if (reducedMotion) return;

      for (let i = 0; i < COUNT; i++) {
        const p = petals[i];

        // Aerodynamic flutter
        p.rotX += p.spinX * dt;
        p.rotY += p.spinY * dt;
        p.rotZ += p.spinZ * dt;

        // Wind drift & falling
        const windX = Math.sin(time * 0.7 + p.phase) * p.swayRadius + 0.15 * dt;
        const windZ = Math.cos(time * 0.6 + p.phase * 1.3) * p.swayRadius;
        
        p.x += windX * dt;
        p.z += windZ * dt;
        p.y -= p.fallSpeed * dt;

        // Ground threshold check: reset to canopy
        const currentGround = groundHeightFunc(p.x, p.z);
        if (p.y <= currentGround + 0.08 || p.y < 0.25) {
          resetPetal(p, false);
        }

        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(p.rotX, p.rotY, p.rotZ);
        dummy.scale.setScalar(p.scale);
        dummy.updateMatrix();

        instancedMesh.setMatrixAt(i, dummy.matrix);
      }

      instancedMesh.instanceMatrix.needsUpdate = true;
    },

    setTheme(themeId) {
      const colors = themeColors[themeId] || themeColors.forest;
      for (let i = 0; i < COUNT; i++) {
        colorHelper.set(colors[i % colors.length]);
        instancedMesh.setColorAt(i, colorHelper);
      }
      if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
    },
  };
}
