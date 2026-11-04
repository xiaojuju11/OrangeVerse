import * as THREE from 'three';

// Inspired by weeeha/AI-Orb & Apple Intelligence dynamic Siri liquid-glass shaders.
// Creates a living, audio-reactive Aurora Orb hovering over the island's central lake.

export function createAIOrb(scene, pondLocation = { x: -1.15, z: -0.65 }, audioRef = null, toastRef = null) {
  const orbGroup = new THREE.Group();
  orbGroup.position.set(pondLocation.x, 2.35, pondLocation.z);
  scene.add(orbGroup);

  // Core Plasma Shader
  const coreMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      excitement: { value: 0 },
      coreColor1: { value: new THREE.Color('#38bdf8') }, // Sky blue
      coreColor2: { value: new THREE.Color('#ec4899') }, // Magenta pink
      coreColor3: { value: new THREE.Color('#a855f7') }, // Purple violet
    },
    vertexShader: /* glsl */ `
      uniform float time;
      uniform float excitement;
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vWorldPosition;

      void main() {
        vNormal = normal;
        vPosition = position;
        float wave = sin(position.x * 6.0 + time * (2.2 + excitement * 3.5)) 
                   * cos(position.y * 6.0 + time * (1.9 + excitement * 3.5)) 
                   * sin(position.z * 6.0 + time * 1.7);
        vec3 displaced = position + normal * (wave * (0.038 + excitement * 0.055));
        vWorldPosition = (modelMatrix * vec4(displaced, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float time;
      uniform float excitement;
      uniform vec3 coreColor1;
      uniform vec3 coreColor2;
      uniform vec3 coreColor3;
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vWorldPosition;

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float facing = max(0.0, dot(normal, viewDir));
        float fresnel = pow(1.0 - facing, 2.8);
        
        float p1 = sin(vPosition.x * 5.2 + time * 2.3) * 0.5 + 0.5;
        float p2 = cos(vPosition.y * 5.2 - time * 1.9) * 0.5 + 0.5;
        float p3 = sin(vPosition.z * 5.2 + time * 2.6) * 0.5 + 0.5;
        
        vec3 col = mix(coreColor1, coreColor2, p1);
        col = mix(col, coreColor3, p2 * 0.85);
        
        // Specular glow and fresnel rim
        col += vec3(0.96, 0.98, 1.0) * pow(facing, 5.0) * 0.65;
        col += mix(coreColor1, coreColor2, p3) * fresnel * (1.3 + excitement * 0.9);
        
        gl_FragColor = vec4(col, 0.94);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
  });

  const coreGeo = new THREE.SphereGeometry(0.38, 48, 48);
  const coreMesh = new THREE.Mesh(coreGeo, coreMaterial);
  coreMesh.castShadow = false;
  orbGroup.add(coreMesh);

  // Soft Radial Halo Sprite
  function makeHaloTexture() {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    g.addColorStop(0.25, 'rgba(147, 197, 253, 0.65)');
    g.addColorStop(0.6, 'rgba(236, 72, 153, 0.25)');
    g.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  const haloMaterial = new THREE.SpriteMaterial({
    map: makeHaloTexture(),
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const haloSprite = new THREE.Sprite(haloMaterial);
  haloSprite.scale.set(1.5, 1.5, 1.5);
  orbGroup.add(haloSprite);

  // Delicate Orbiting Stardust Ring
  const ringGeo = new THREE.TorusGeometry(0.62, 0.012, 16, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: '#bae6fd',
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.rotation.x = Math.PI / 3;
  orbGroup.add(ringMesh);

  // Rotating inspiration quotes for Vibe Coding
  const quotes = [
    '✨ AI 灵感之核正在共鸣：「代码是凝固的诗，小岛是流动的光。」',
    '🔮 灵感共振中：探索未知与构建浪漫，是开发者的永恒特权。',
    '🌊 听，潮汐与思维正在同频呼吸。保持好奇，自由漫游。',
    '💡 Vibe Coding 状态全开：让直觉引领逻辑，让美感赋予灵魂。',
    '🦊 小狐狸悄悄看了你一眼：今天也是充满创造力的一天呢！',
  ];
  let quoteIndex = 0;

  let currentExcitement = 0;
  let targetExcitement = 0;

  // Click & hover response
  function triggerResonance() {
    targetExcitement = 1.0;
    setTimeout(() => { targetExcitement = 0; }, 1400);

    if (audioRef) audioRef.playHaptic('open');
    if (toastRef) {
      toastRef(quotes[quoteIndex % quotes.length]);
      quoteIndex++;
    }
  }

  return {
    group: orbGroup,
    core: coreMesh,

    update(dt, time, reducedMotion = false) {
      if (reducedMotion) return;

      // Smooth excitement decay
      currentExcitement += (targetExcitement - currentExcitement) * (1 - Math.exp(-dt * 6));
      coreMaterial.uniforms.excitement.value = currentExcitement;
      coreMaterial.uniforms.time.value = time;

      // Gentle vertical hover floating
      orbGroup.position.y = 2.35 + Math.sin(time * 1.2) * 0.12;

      // Ring tumble & halo pulse
      ringMesh.rotation.z = time * 0.6;
      ringMesh.rotation.y = time * 0.4;
      haloSprite.scale.setScalar(1.4 + Math.sin(time * 2.0) * 0.15 + currentExcitement * 0.35);
    },

    interact: triggerResonance,

    setTheme(themeId) {
      if (themeId === 'ocean') {
        coreMaterial.uniforms.coreColor1.value.set('#06b6d4'); // Cyan
        coreMaterial.uniforms.coreColor2.value.set('#818cf8'); // Indigo
        coreMaterial.uniforms.coreColor3.value.set('#c084fc'); // Purple
      } else if (themeId === 'desert') {
        coreMaterial.uniforms.coreColor1.value.set('#f59e0b'); // Amber
        coreMaterial.uniforms.coreColor2.value.set('#f43f5e'); // Rose
        coreMaterial.uniforms.coreColor3.value.set('#fbbf24'); // Gold
      } else {
        coreMaterial.uniforms.coreColor1.value.set('#10b981'); // Emerald
        coreMaterial.uniforms.coreColor2.value.set('#06b6d4'); // Cyan
        coreMaterial.uniforms.coreColor3.value.set('#a855f7'); // Purple
      }
    },
  };
}
