import * as T from "three";
import {
  mat,
  mesh,
  ball,
  block,
  cyl,
  rod,
  torus,
  capsule,
  group,
} from "./models.js";

export function makeInteractiveHiker() {
  const root = new T.Group(),
    body = group(root, [0, 1.23, 0]);
  const green = "#355b43",
    lime = "#8bab3b",
    tan = "#c9b68b",
    skin = "#f3c497",
    hair = "#322a25",
    dark = "#272c25",
    orange = "#e59b46";

  const legs = [];
  for (const side of [-1, 1]) {
    const leg = group(root, [side * 0.18, 1.17, 0]);
    capsule(leg, tan, [0, -0.4, 0], [0.27, 0.5, 0.29]);
    block(leg, "#b7a27a", [side * 0.13, -0.28, 0.035], [0.035, 0.19, 0.16]);
    capsule(leg, green, [0, -0.88, 0.08], [0.28, 0.18, 0.42]);
    block(leg, dark, [0, -1.02, 0.12], [0.31, 0.085, 0.5]);
    for (let k = 0; k < 3; k++)
      rod(
        leg,
        orange,
        [-0.09, -0.82, 0.19 + k * 0.04],
        [0.09, -0.82, 0.19 + k * 0.04],
        0.012,
      );
    legs.push(leg);
  }

  capsule(body, green, [0, 0.24, 0], [0.7, 0.5, 0.46]);
  ball(body, lime, [-0.21, 0.48, 0.08], [0.22, 0.2, 0.21]);
  ball(body, lime, [0.21, 0.48, 0.08], [0.22, 0.2, 0.21]);
  block(body, "#ada17a", [0, 0.19, 0.25], [0.27, 0.65, 0.035]);
  rod(body, orange, [0.18, -0.08, 0.255], [0.19, 0.49, 0.25], 0.015);
  for (const side of [-1, 1]) {
    block(body, green, [side * 0.22, 0.04, 0.25], [0.16, 0.2, 0.035]);
    rod(
      body,
      orange,
      [side * 0.15, 0.14, 0.28],
      [side * 0.29, 0.22, 0.28],
      0.012,
    );
  }

  // 背包
  capsule(body, "#285e61", [0, 0.24, -0.34], [0.57, 0.5, 0.29]);
  capsule(body, "#447c75", [0, 0.55, -0.36], [0.57, 0.11, 0.3]);
  for (const x of [-0.25, 0.25])
    rod(body, "#777652", [x, 0.53, -0.03], [x, -0.04, 0.28], 0.036);
  cyl(body, "#4c95a8", [0.39, 0.25, -0.24], [0.08, 0.35, 0.08]);

  const arms = [];
  for (const side of [-1, 1]) {
    let arm = group(body, [side * 0.39, 0.46, 0]);
    capsule(arm, green, [side * 0.035, -0.27, 0], [0.23, 0.32, 0.25]);
    capsule(arm, lime, [side * 0.035, -0.13, 0.03], [0.24, 0.14, 0.25]);
    ball(arm, skin, [side * 0.04, -0.58, 0.035], [0.13, 0.15, 0.12]);
    arms.push(arm);
  }

  // 挂在胸前的复古相机
  for (const x of [-0.2, 0.2])
    rod(body, dark, [x, 0.5, 0.29], [x * 0.6, -0.15, 0.36], 0.018);
  block(body, "#292e2c", [0, -0.11, 0.38], [0.32, 0.23, 0.17]);
  cyl(body, "#161f22", [0, -0.11, 0.5], [0.105, 0.11, 0.105]).rotation.x =
    Math.PI / 2;
  cyl(body, "#56818c", [0, -0.11, 0.565], [0.063, 0.014, 0.063]).rotation.x =
    Math.PI / 2;
  block(body, "#a7afaa", [0.11, -0.02, 0.48], [0.06, 0.035, 0.01]);

  // 头部组（可随鼠标轻微摆动）
  const head = group(body, [0, 0.94, 0.015]);
  ball(head, skin, [0, 0, 0], [0.49, 0.53, 0.41]);
  ball(head, hair, [0, 0.19, -0.09], [0.51, 0.46, 0.37]);
  ball(head, hair, [-0.34, 0.15, 0.08], [0.18, 0.38, 0.25]);
  let fringe = ball(head, hair, [-0.16, 0.34, 0.27], [0.36, 0.17, 0.2]);
  fringe.rotation.z = 0.36;
  ball(head, hair, [0.3, 0.28, 0.13], [0.17, 0.27, 0.23]);

  // 独立可移动的瞳孔眼球系统
  const eyeballs = [];
  for (const side of [-1, 1]) {
    ball(head, skin, [side * 0.46, -0.03, 0.02], [0.1, 0.14, 0.09]);
    ball(head, "#dd997d", [side * 0.28, -0.18, 0.342], [0.11, 0.045, 0.012]);
    // 眼白 (Sclera)
    ball(head, "#fffaf0", [side * 0.19, 0.015, 0.364], [0.115, 0.14, 0.035]);
    
    // 动态瞳孔组 (包含深棕色虹膜与白光点)
    const eyeSocket = group(head, [side * 0.19, 0.015, 0.39]);
    const pupil = ball(eyeSocket, "#50301e", [0, 0, 0], [0.057, 0.08, 0.015]);
    const glint = ball(eyeSocket, "#ffffff", [-0.015, 0.035, 0.015], [0.02, 0.025, 0.008]);
    eyeballs.push({ socket: eyeSocket, baseX: side * 0.19, baseY: 0.015 });

    // 眼镜框与镜架
    const lens = torus(
      head,
      "#744d32",
      [side * 0.205, 0.01, 0.415],
      0.165,
      0.022,
    );
    lens.scale.set(1, 0.92, 1);
    rod(
      head,
      hair,
      [side * 0.1, 0.22, 0.365],
      [side * 0.3, 0.24, 0.325],
      0.018,
    );
    rod(
      head,
      "#744d32",
      [side * 0.36, 0.06, 0.39],
      [side * 0.47, 0.08, 0.04],
      0.016,
    );
  }
  rod(head, "#744d32", [-0.04, 0.035, 0.42], [0.04, 0.035, 0.42], 0.015);
  ball(head, skin, [0, -0.09, 0.412], [0.055, 0.075, 0.06]);

  let smile = new T.CatmullRomCurve3([
    new T.Vector3(-0.105, -0.235, 0.365),
    new T.Vector3(0, -0.263, 0.392),
    new T.Vector3(0.1, -0.228, 0.365),
  ]);
  mesh(head, new T.TubeGeometry(smile, 12, 0.013, 5, false), "#b66b51");

  const braids = [];
  for (const side of [-1, 1]) {
    const braid = group(head, [side * 0.43, -0.17, 0.1]);
    for (let i = 0; i < 6; i++) {
      ball(
        braid,
        hair,
        [Math.sin(i * 2) * 0.045, -i * 0.135, 0.06 + i * 0.05],
        [0.105 - i * 0.006, 0.11, 0.1 - i * 0.004],
      );
    }
    ball(braid, orange, [0, -0.72, 0.32], [0.065, 0.035, 0.055]);
    braids.push(braid);
  }

  // 鼠标追踪向量
  let aimX = 0, aimY = 0;
  let curX = 0, curY = 0;
  window.addEventListener("pointermove", (e) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const reach = Math.max(window.innerWidth, window.innerHeight) * 0.5;
    aimX = T.MathUtils.clamp((e.clientX - cx) / reach, -1, 1);
    aimY = T.MathUtils.clamp((e.clientY - cy) / reach, -1, 1);
  }, { passive: true });

  root.userData = {
    body,
    head,
    legs,
    arms,
    braids,
    eyeballs,
    updateEyes: (dt) => {
      curX += (aimX - curX) * (1 - Math.exp(-dt * 9));
      curY += (aimY - curY) * (1 - Math.exp(-dt * 9));
      
      // 头部轻微随鼠标转动
      head.rotation.y = curX * 0.32;
      head.rotation.x = -curY * 0.22;

      // 眼球瞳孔在眼窝内平滑滑动
      eyeballs.forEach(({ socket, baseX, baseY }) => {
        socket.position.x = baseX + curX * 0.038;
        socket.position.y = baseY - curY * 0.035;
      });
    }
  };

  return root;
}
