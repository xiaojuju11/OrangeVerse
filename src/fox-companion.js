import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { groundHeight } from "./island.js";

const MODEL_URL = "/fox.glb";

export function createGuardianFox(scene, options = {}) {
  const foxGroup = new THREE.Group();
  // 放在小岛中心水池旁边的草坪坐标 (例如 x: 1.6, z: 0.8)
  const posX = options.x ?? 0.0;
  const posZ = options.z ?? 2.0;
  const posY = groundHeight(posX, posZ) + 0.05;
  
  foxGroup.position.set(posX, posY, posZ);
  // 默认比例微调适配小岛小人 (小人高度约 1.2，狐狸缩放到约 0.95 高度)
  const scale = options.scale ?? 0.85;
  foxGroup.scale.set(scale, scale, scale);
  scene.add(foxGroup);

  const pivot = [-0.165, 1.02, 0.15];
  const eyeL = [-0.34, 1.30, 0.474];
  const eyeR = [0.011, 1.313, 0.496];
  const eyeSize = [0.108, 0.112, 0.075];
  const eyeTilt = 0.25;
  const eyeToe = 0.12;
  const headYaw = 0.42;
  const headPitch = 0.24;
  const eyeYaw = 0.5;
  const eyePitch = 0.38;

  const uHead = { value: new THREE.Matrix3() };

  function bendHead(shader) {
    shader.uniforms.uHead = uHead;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `#include <common>
      uniform mat3 uHead;
      float headWeight(vec3 p) {
        float w = smoothstep(0.980, 1.140, p.y);
        float tail = smoothstep(0.26, 0.36, p.x) * (1.0 - smoothstep(0.0, 0.14, p.z)) * (1.0 - smoothstep(1.18, 1.28, p.y));
        float map = smoothstep(0.58, 0.66, p.z) * (1.0 - smoothstep(1.0, 1.06, p.y));
        return w * (1.0 - tail) * (1.0 - map);
      }`
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <beginnormal_vertex>",
      `#include <beginnormal_vertex>
      float hw = headWeight(position);
      objectNormal = normalize(mix(objectNormal, uHead * objectNormal, hw));`
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      vec3 P = vec3(-0.165, 1.020, 0.150);
      transformed = mix(transformed, P + uHead * (transformed - P), hw);`
    );
  }

  // 眼睛贴图 Canvas
  const eyeCanvas = document.createElement("canvas");
  eyeCanvas.width = 1024;
  eyeCanvas.height = 512;
  const ctx = eyeCanvas.getContext("2d");

  ctx.fillStyle = "#fffdfa";
  ctx.fillRect(0, 0, 1024, 512);

  ctx.beginPath();
  ctx.arc(256, 256, 118, 0, Math.PI * 2);
  ctx.fillStyle = "#331604";
  ctx.fill();

  const grad = ctx.createRadialGradient(256, 282, 20, 256, 256, 110);
  grad.addColorStop(0, "#ffaa44");
  grad.addColorStop(0.55, "#e66010");
  grad.addColorStop(1, "#803005");
  ctx.beginPath();
  ctx.arc(256, 256, 110, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(256, 256, 66, 0, Math.PI * 2);
  ctx.fillStyle = "#120802";
  ctx.fill();

  ctx.save();
  ctx.translate(222, 216);
  ctx.rotate(-0.5);
  ctx.beginPath();
  ctx.ellipse(0, 0, 24, 20, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(292, 296, 9, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,.9)";
  ctx.fill();

  const eyeTexture = new THREE.CanvasTexture(eyeCanvas);
  eyeTexture.colorSpace = THREE.SRGBColorSpace;

  const headGroup = new THREE.Group();
  headGroup.position.set(pivot[0], pivot[1], pivot[2]);
  foxGroup.add(headGroup);

  function makeEye(pos, side) {
    const socket = new THREE.Group();
    socket.position.set(pos[0] - pivot[0], pos[1] - pivot[1], pos[2] - pivot[2]);
    socket.rotation.y = side * eyeTilt;
    socket.scale.set(eyeSize[0], eyeSize[1], eyeSize[2]);

    const geo = new THREE.SphereGeometry(1, 32, 24);
    const mat = new THREE.MeshStandardMaterial({
      map: eyeTexture,
      roughness: 0.22,
      metalness: 0
    });
    const sphere = new THREE.Mesh(geo, mat);
    sphere.userData.side = side;
    socket.add(sphere);
    headGroup.add(socket);
    return sphere;
  }

  const leftEyeMesh = makeEye(eyeL, -1);
  const rightEyeMesh = makeEye(eyeR, 1);

  // 加载 GLB
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);
  loader.setMeshoptDecoder(MeshoptDecoder);

  loader.load(MODEL_URL, (gltf) => {
    const model = gltf.scene;
    model.rotation.y = -Math.PI / 2 - 0.16;
    model.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const centre = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(centre);

    const s = 2 / size.y;
    const fit = new THREE.Matrix4()
      .makeScale(s, s, s)
      .multiply(new THREE.Matrix4().makeTranslation(-centre.x, -box.min.y, -centre.z));

    model.traverse((child) => {
      if (child.isMesh) {
        const geom = child.geometry.clone();
        geom.applyMatrix4(fit.clone().multiply(child.matrixWorld));
        geom.computeBoundingSphere();
        const mat = child.material.clone();
        mat.metalness = 0;
        mat.roughness = 1;
        mat.onBeforeCompile = bendHead;

        const mesh = new THREE.Mesh(geom, mat);
        mesh.castShadow = true;
        mesh.frustumCulled = false;
        foxGroup.add(mesh);
      }
    });
  });

  // 瞄准与光标追踪
  const aim = new THREE.Vector2();
  const look = new THREE.Vector2();
  const turn = new THREE.Vector2();
  let lastMove = -1e9;

  window.addEventListener("pointermove", (e) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const reach = Math.max(window.innerWidth, window.innerHeight) * 0.45;
    aim.x = THREE.MathUtils.clamp((e.clientX - cx) / reach, -1, 1);
    aim.y = THREE.MathUtils.clamp((e.clientY - cy) / reach, -1, 1);
    lastMove = performance.now();
  }, { passive: true });

  const euler = new THREE.Euler(0, 0, 0, "YXZ");
  const tempMatrix4 = new THREE.Matrix4();

  // 每一帧更新（由主循环调用）
  return {
    group: foxGroup,
    update: (dt, elapsed, playerPos) => {
      // 狐狸整体朝向：当玩家小人在附近时，狐狸身体轻微转向小人
      if (playerPos) {
        const dx = playerPos[0] - posX;
        const dz = playerPos[1] - posZ;
        const dist = Math.hypot(dx, dz);
        if (dist < 4.5) {
          const targetBodyAngle = Math.atan2(dx, dz);
          foxGroup.rotation.y = THREE.MathUtils.lerp(foxGroup.rotation.y, targetBodyAngle, 0.05);
        }
      }

      const idle = performance.now() - lastMove > 3500;
      if (idle) {
        aim.set(
          Math.sin(elapsed * 0.55) * 0.55,
          Math.sin(elapsed * 0.9 + 1) * 0.22 - 0.05
        );
      }

      look.lerp(aim, 1 - Math.exp(-dt * 11));
      turn.lerp(aim, 1 - Math.exp(-dt * 4.5));

      euler.set(turn.y * headPitch, turn.x * headYaw, -turn.x * 0.05, "YXZ");
      headGroup.rotation.copy(euler);

      tempMatrix4.makeRotationFromEuler(euler);
      uHead.value.setFromMatrix4(tempMatrix4);

      const ex = THREE.MathUtils.clamp(look.x * 1.25 - turn.x * 0.35, -1, 1);
      const ey = THREE.MathUtils.clamp(look.y * 1.25 - turn.y * 0.35, -1, 1);

      if (leftEyeMesh) {
        leftEyeMesh.rotation.set(ey * eyePitch, ex * eyeYaw - leftEyeMesh.userData.side * eyeToe, 0, "YXZ");
      }
      if (rightEyeMesh) {
        rightEyeMesh.rotation.set(ey * eyePitch, ex * eyeYaw - rightEyeMesh.userData.side * eyeToe, 0, "YXZ");
      }

      // 轻微呼吸
      foxGroup.position.y = posY + Math.sin(elapsed * 1.7) * 0.015;
    }
  };
}
