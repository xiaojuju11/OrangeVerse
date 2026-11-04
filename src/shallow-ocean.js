import { BackSide, Color, Mesh, PlaneGeometry, ShaderMaterial, SphereGeometry, Vector3 } from 'three';

export const DUSK_SUN_POSITION = [-29, 10, -24];
export const DUSK_SUN_COLOR = '#ffb37c';
const DUSK_HORIZON = '#ff8f70';
const DUSK_MIDSKY = '#6e5d82';
const DUSK_ZENITH = '#1e2942';

const duskAtmosphere = /* glsl */ `
  uniform vec3 sunDirection, sunColor, horizon, zenith, midsky;
  vec3 atmosphere(vec3 ray) {
    float elevation = smoothstep(-0.05, 0.65, ray.y);
    vec3 lowColor = mix(horizon, midsky, smoothstep(0.0, 0.28, ray.y));
    vec3 color = mix(lowColor, zenith, smoothstep(0.22, 0.65, ray.y));
    float towardSun = max(0.0, dot(ray, sunDirection));
    float sunDisc = smoothstep(0.9993, 0.9998, towardSun);
    float sunHalo = pow(towardSun, 7.0) * 0.38 + pow(towardSun, 32.0) * 0.55;
    return color + sunColor * (sunHalo + sunDisc * 1.2);
  }
`;

export function createDuskSky() {
  const sky = new Mesh(new SphereGeometry(125, 32, 16), new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    uniforms: {
      sunDirection: { value: new Vector3(...DUSK_SUN_POSITION).normalize() },
      sunColor: { value: new Color(DUSK_SUN_COLOR) },
      horizon: { value: new Color(DUSK_HORIZON) },
      midsky: { value: new Color(DUSK_MIDSKY) },
      zenith: { value: new Color(DUSK_ZENITH) },
    },
    vertexShader: /* glsl */ `
      varying vec3 worldPoint;
      void main() {
        worldPoint = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(worldPoint, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${duskAtmosphere}
      varying vec3 worldPoint;
      void main() {
        gl_FragColor = vec4(atmosphere(normalize(worldPoint - cameraPosition)), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  }));
  sky.renderOrder = -1;
  sky.visible = false;
  return sky;
}

// ═════════════════════════════════════════════════════════════════════════
// Gerstner displacement, analytic slopes and Fresnel approach adapted from
// Tideline by Rino Lovreglio (MIT). See public/third-party/tideline-license.txt.
// Upgraded with:
// - Luminous bioluminescent sea glow ("蓝眼泪"夜光海效果)
// - Subsurface scattering translucency on wave crests
// - Multi-tier organic shore wash and sparkling sunset caustics
// ═════════════════════════════════════════════════════════════════════════
const waves = /* glsl */ `
  uniform float time;
  varying vec3 waterPosition;
  varying vec2 slope;
  varying float compression;

  void swell(vec2 p, vec2 direction, float length, float height, float speed,
             inout vec3 offset, inout vec2 gradient, inout float squeeze) {
    float k = 6.283185 / length;
    float phase = k * dot(p, direction) - time * speed;
    float s = sin(phase), c = cos(phase);
    offset += vec3(direction.x * height * c, height * s, direction.y * height * c);
    gradient += direction * (height * k * c);
    squeeze += height * k * s;
  }
`;

export function createShallowOcean() {
  const geometry = new PlaneGeometry(240, 240, 104, 104).rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  // Concentrate vertices near the island while keeping a continuous horizon.
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i);
    positions.setXYZ(i, x * Math.abs(x) / 120, 0, z * Math.abs(z) / 120);
  }

  const material = new ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      deepColor: { value: new Color('#122f46') },
      shoreColor: { value: new Color('#3b8882') },
      skyColor: { value: new Color('#7286a6') },
      foamColor: { value: new Color('#f2f8fc') },
      bioColor: { value: new Color('#12d6eb') }, // Bioluminescent blue tears
      horizon: { value: new Color(DUSK_HORIZON) },
      midsky: { value: new Color(DUSK_MIDSKY) },
      zenith: { value: new Color(DUSK_ZENITH) },
      sunColor: { value: new Color(DUSK_SUN_COLOR) },
      sunDirection: { value: new Vector3(...DUSK_SUN_POSITION).normalize() },
    },
    vertexShader: /* glsl */ `${waves}
      void main() {
        vec3 offset = vec3(0.0);
        vec2 gradient = vec2(0.0);
        float squeeze = 0.0;
        swell(position.xz, vec2(0.96, 0.28), 6.3, 0.13, 1.65, offset, gradient, squeeze);
        swell(position.xz, vec2(-0.60, 0.80), 3.7, 0.068, 2.14, offset, gradient, squeeze);
        swell(position.xz, vec2(0.80, -0.60), 2.2, 0.035, 2.85, offset, gradient, squeeze);
        float r = length(position.xz);
        float fade = smoothstep(12.0, 17.0, r) * (1.0 - smoothstep(35.0, 75.0, r));
        waterPosition = (modelMatrix * vec4(position + offset * fade, 1.0)).xyz;
        slope = gradient * fade;
        compression = squeeze * fade;
        gl_Position = projectionMatrix * viewMatrix * vec4(waterPosition, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float time;
      uniform vec3 deepColor, shoreColor, skyColor, foamColor, bioColor;
      ${duskAtmosphere}
      varying vec3 waterPosition;
      varying vec2 slope;
      varying float compression;

      void main() {
        vec2 p = waterPosition.xz;
        float r = length(p);
        float detail = 1.0 - smoothstep(20.0, 65.0, distance(cameraPosition, waterPosition));
        
        // Multi-frequency micro ripples
        vec2 ripple = vec2(
          cos(dot(p, vec2(4.6, 1.7)) - time * 2.3),
          cos(dot(p, vec2(-1.9, 4.1)) + time * 1.85)
        ) * (0.038 * detail);
        vec3 normal = normalize(vec3(-slope.x + ripple.x, 1.0, -slope.y + ripple.y));
        vec3 view = normalize(cameraPosition - waterPosition);
        float facing = clamp(dot(normal, view), 0.0, 1.0);
        float fresnel = 0.02 + 0.98 * pow(1.0 - facing, 4.8);
        
        // Water body color with depth gradient
        float shoal = 1.0 - smoothstep(14.0, 26.0, r);
        vec3 body = mix(deepColor, shoreColor, shoal * (0.75 + 0.22 * facing));
        
        // Subsurface scattering on wave crests
        float sss = max(0.0, slope.y * 0.5 + 0.5) * max(compression, 0.0) * 0.28;
        vec3 sssTone = vec3(0.18, 0.65, 0.62);
        body += sssTone * sss;
        body += shoreColor * max(compression, 0.0) * 0.22;
        
        // Sky reflections & Sunset glint
        vec3 reflected = reflect(-view, normal);
        float light = max(dot(reflected, sunDirection), 0.0);
        float sunset = pow(max(dot(normalize(reflected.xz + vec2(0.001)), normalize(sunDirection.xz)), 0.0), 8.5);
        vec3 reflectedSky = mix(skyColor, sunColor, sunset * (1.0 - smoothstep(0.06, 0.75, reflected.y)) * 0.52);
        vec3 color = mix(body, reflectedSky, fresnel * 0.82);
        
        // Pinpoint sun glitter & warm sheen
        float sunGlint = pow(light, 110.0) * 1.1 + pow(light, 16.0) * 0.32;
        color += sunColor * sunGlint;

        // Shore wash, surf and tidal breathing
        float angle = atan(p.y, p.x);
        float edge = r - (13.55 + 0.2 * sin(angle * 7.0));
        float pulse = sin(edge * 6.2 - time * 1.6 + sin(angle * 14.0));
        float breakup = smoothstep(-0.35, 0.72, sin(angle * 38.0 + r * 3.2));
        float wash = smoothstep(-0.25, 0.32, edge) * (1.0 - smoothstep(0.72, 2.2, edge));
        
        float foam = wash * smoothstep(0.5, 0.98, pulse) * (0.35 + 0.55 * breakup);
        foam += smoothstep(0.14, 0.22, compression) * 0.2 * detail;
        
        // Bioluminescent "Blue Tears" (蓝眼泪夜光海效果)
        float bioSparkle = pow(max(0.0, sin(p.x * 6.0 + time * 2.8) * cos(p.y * 6.0 - time * 2.4)), 10.0);
        float bioActivity = smoothstep(0.12, 0.26, compression) * (0.6 + 0.4 * bioSparkle) + wash * (0.3 + 0.7 * breakup) * 0.45;
        vec3 bioGlow = bioColor * (bioActivity * 0.48 * (0.8 + 0.2 * sin(time * 3.0 + angle * 4.0)));

        // Combine foam, bioluminescence and atmospheric distant fog
        color = mix(color, foamColor, foam * 0.92);
        color += bioGlow;
        color = mix(color, atmosphere(-view), smoothstep(65.0, 116.0, r));
        
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });

  const surface = new Mesh(geometry, material);
  surface.position.y = -0.7;
  surface.visible = false;
  surface.update = (time, reducedMotion) => {
    material.uniforms.time.value = reducedMotion ? 0 : time;
  };
  
  // Theme adapter method
  surface.setTheme = (themeId, options = {}) => {
    if (themeId === 'ocean') {
      material.uniforms.deepColor.value.set('#122f46');
      material.uniforms.shoreColor.value.set('#3b8882');
      material.uniforms.foamColor.value.set('#f2f8fc');
      material.uniforms.bioColor.value.set('#12d6eb');
    } else if (themeId === 'forest') {
      material.uniforms.deepColor.value.set('#1b4b52');
      material.uniforms.shoreColor.value.set('#52a38b');
      material.uniforms.foamColor.value.set('#ffffff');
      material.uniforms.bioColor.value.set('#78ffd6');
    } else if (themeId === 'desert') {
      material.uniforms.deepColor.value.set('#204856');
      material.uniforms.shoreColor.value.set('#6ba39d');
      material.uniforms.foamColor.value.set('#fffbf0');
      material.uniforms.bioColor.value.set('#ffd166');
    }
    if (options.sunDirection) {
      material.uniforms.sunDirection.value.copy(options.sunDirection).normalize();
    }
    if (options.sunColor) {
      material.uniforms.sunColor.value.set(options.sunColor);
    }
  };

  return surface;
}
