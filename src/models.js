import * as T from "three";
const materials = new Map();
export function mat(color, options = {}) {
  const key = JSON.stringify([color, options]);
  if (!materials.has(key))
    materials.set(
      key,
      new T.MeshStandardMaterial({ color, roughness: 0.86, ...options }),
    );
  return materials.get(key);
}
const sphere = new T.SphereGeometry(1, 16, 12),
  box = new T.BoxGeometry(1, 1, 1),
  cylinder = new T.CylinderGeometry(1, 1, 1, 12);
export function mesh(g, geo, color, p = [0, 0, 0], s = [1, 1, 1]) {
  const m = new T.Mesh(geo, color?.isMaterial ? color : mat(color));
  m.position.set(...p);
  m.scale.set(...s);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}
export const ball = (g, c, p, s) => mesh(g, sphere, c, p, s);
export const block = (g, c, p, s) => mesh(g, box, c, p, s);
export const cyl = (g, c, p, s) => mesh(g, cylinder, c, p, s);
export function capsule(g, c, p, s) {
  return mesh(g, new T.CapsuleGeometry(0.5, 1, 5, 10), c, p, s);
}
export function rod(g, c, a, b, r = 0.045) {
  const A = new T.Vector3(...a),
    B = new T.Vector3(...b),
    m = cyl(g, c, A.clone().add(B).multiplyScalar(0.5).toArray(), [
      r,
      A.distanceTo(B),
      r,
    ]);
  m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), B.sub(A).normalize());
  return m;
}
export function torus(g, c, p, r = 0.4, tube = 0.04) {
  return mesh(g, new T.TorusGeometry(r, tube, 8, 32), c, p);
}
export function group(parent, p = [0, 0, 0]) {
  const g = new T.Group();
  g.position.set(...p);
  parent?.add(g);
  return g;
}
export function makeHiker() {
  const root = new T.Group(),
    body = group(root, [0, 1.23, 0]);
  const green = "#355b43",
    lime = "#8bab3b",
    tan = "#c9b68b",
    skin = "#f3c497",
    hair = "#322a25",
    dark = "#272c25",
    orange = "#e59b46";
  // Hinged limbs form a genuine walk cycle from all camera angles.
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
  // Teal hiking pack and straps.
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
  // Camera suspended in front of the jacket.
  for (const x of [-0.2, 0.2])
    rod(body, dark, [x, 0.5, 0.29], [x * 0.6, -0.15, 0.36], 0.018);
  block(body, "#292e2c", [0, -0.11, 0.38], [0.32, 0.23, 0.17]);
  cyl(body, "#161f22", [0, -0.11, 0.5], [0.105, 0.11, 0.105]).rotation.x =
    Math.PI / 2;
  cyl(body, "#56818c", [0, -0.11, 0.565], [0.063, 0.014, 0.063]).rotation.x =
    Math.PI / 2;
  block(body, "#a7afaa", [0.11, -0.02, 0.48], [0.06, 0.035, 0.01]);
  const head = group(body, [0, 0.94, 0.015]);
  ball(head, skin, [0, 0, 0], [0.49, 0.53, 0.41]);
  ball(head, hair, [0, 0.19, -0.09], [0.51, 0.46, 0.37]);
  ball(head, hair, [-0.34, 0.15, 0.08], [0.18, 0.38, 0.25]);
  let fringe = ball(head, hair, [-0.16, 0.34, 0.27], [0.36, 0.17, 0.2]);
  fringe.rotation.z = 0.36;
  ball(head, hair, [0.3, 0.28, 0.13], [0.17, 0.27, 0.23]);
  // Warm face, round glasses, brows and a quiet smile.
  for (const side of [-1, 1]) {
    ball(head, skin, [side * 0.46, -0.03, 0.02], [0.1, 0.14, 0.09]);
    ball(head, "#dd997d", [side * 0.28, -0.18, 0.342], [0.11, 0.045, 0.012]);
    ball(head, "#fffaf0", [side * 0.19, 0.015, 0.364], [0.115, 0.14, 0.035]);
    ball(head, "#67422c", [side * 0.18, 0.005, 0.398], [0.057, 0.08, 0.015]);
    ball(head, "#fffdf1", [side * 0.165, 0.04, 0.414], [0.017, 0.022, 0.006]);
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
  root.userData = { body, head, legs, arms, braids };
  return root;
}
export function animateHiker(root, time, speed, reduced = false) {
  const { body, legs, arms, braids } = root.userData;
  const walk = reduced ? 0 : speed,
    phase = time * 9;
  legs[0].rotation.x = Math.sin(phase) * 0.48 * walk;
  legs[1].rotation.x = -Math.sin(phase) * 0.48 * walk;
  arms[0].rotation.x = -Math.sin(phase) * 0.36 * walk;
  arms[1].rotation.x = Math.sin(phase) * 0.36 * walk;
  body.position.y = 1.23 + Math.abs(Math.sin(phase)) * 0.055 * walk;
  braids.forEach((b, i) => (b.rotation.z = Math.sin(phase + i) * 0.07 * walk));
}
export function pine(g, x, y, z, s = 1, c = "#3e8271") {
  const t = group(g, [x, y, z]);
  rod(t, "#826e52", [0, 0, 0], [0, 2.9 * s, 0], 0.1 * s);
  for (let i = 0; i < 4; i++) {
    let m = mesh(
      t,
      new T.ConeGeometry(1, 1, 9),
      c,
      [0, (1.1 + i * 0.57) * s, 0],
      [(0.8 - i * 0.14) * s, 1.4 * s, (0.8 - i * 0.14) * s],
    );
    m.rotation.y = i * 0.9;
  }
  return t;
}
export function roundTree(g, x, y, z, s = 1, colors = ["#86b56b", "#b3cf76"]) {
  const t = group(g, [x, y, z]);
  rod(t, "#8b7865", [0, 0, 0], [0, 2.15 * s, 0], 0.14 * s);
  for (let i = 0; i < 3; i++) {
    const a = i * 2.4;
    rod(
      t,
      "#8b7865",
      [0, 1 * s, 0],
      [Math.cos(a) * 0.55 * s, 2 * s, Math.sin(a) * 0.55 * s],
      0.085 * s,
    );
    ball(
      t,
      colors[i % colors.length],
      [Math.cos(a) * 0.42 * s, (2.1 + i * 0.17) * s, Math.sin(a) * 0.42 * s],
      [0.8 * s, 0.81 * s, 0.75 * s],
    );
  }
  return t;
}
export function palm(g, x, y, z, s = 1, c = "#719f79") {
  let t = group(g, [x, y, z]);
  for (let i = 0; i < 7; i++)
    cyl(
      t,
      "#b7a080",
      [i * 0.035 * s, (i * 0.3 + 0.15) * s, 0],
      [0.13 * s, 0.32 * s, 0.13 * s],
    );
  for (let i = 0; i < 7; i++) {
    let a = (i * Math.PI * 2) / 7;
    let leaf = ball(
      t,
      c,
      [Math.cos(a) * 0.67 * s, 2.1 * s, Math.sin(a) * 0.67 * s],
      [0.95 * s, 0.1 * s, 0.26 * s],
    );
    leaf.rotation.y = -a;
    leaf.rotation.z = 0.18 * Math.cos(a);
  }
  for (let i = 0; i < 3; i++)
    ball(
      t,
      "#a57c53",
      [Math.sin(i * 2) * 0.16 * s, 1.9 * s, Math.cos(i * 2) * 0.16 * s],
      [0.16 * s, 0.2 * s, 0.16 * s],
    );
  return t;
}
export function cactus(g, x, y, z, s = 1) {
  let t = group(g, [x, y, z]);
  capsule(t, "#77a58c", [0, 1 * s, 0], [0.4 * s, 1.3 * s, 0.4 * s]);
  for (let side of [-1, 1]) {
    rod(t, "#79ac90", [0, 0.8 * s, 0], [side * 0.55 * s, 0.8 * s, 0], 0.13 * s);
    capsule(
      t,
      "#8bb59b",
      [side * 0.55 * s, 1.15 * s, 0],
      [0.25 * s, 0.55 * s, 0.25 * s],
    );
  }
  ball(t, "#eba291", [0, 1.9 * s, 0], [0.19 * s, 0.09 * s, 0.18 * s]);
  return t;
}
export function coral(g, x, y, z, s = 1, color = "#d79bc2") {
  let t = group(g, [x, y, z]);
  for (let i = 0; i < 5; i++) {
    const a = i * 1.6,
      len = 0.55 + (i % 3) * 0.3;
    rod(
      t,
      color,
      [0, 0, 0],
      [Math.cos(a) * 0.45 * s, len * s, Math.sin(a) * 0.4 * s],
      0.095 * s,
    );
    ball(
      t,
      color,
      [Math.cos(a) * 0.45 * s, len * s, Math.sin(a) * 0.4 * s],
      [0.12 * s, 0.12 * s, 0.12 * s],
    );
    rod(
      t,
      color,
      [Math.cos(a) * 0.25 * s, len * 0.6 * s, Math.sin(a) * 0.25 * s],
      [Math.cos(a + 0.8) * 0.7 * s, len * 0.9 * s, Math.sin(a + 0.8) * 0.6 * s],
      0.06 * s,
    );
  }
  return t;
}
export function tent(g) {
  const geo = new T.ConeGeometry(1.5, 1.7, 4, 1, false);
  geo.rotateY(Math.PI / 4);
  const t = mesh(g, geo, "#dba178", [0, 0.9, 0], [1.25, 1, 1]);
  const door = new T.Shape();
  door.moveTo(-0.67, 0);
  door.lineTo(0.67, 0);
  door.lineTo(0, 1.25);
  door.closePath();
  mesh(g, new T.ShapeGeometry(door), "#304e48", [0, 0.12, 1.07]);
  rod(g, "#f5dfb8", [-1.18, 0, 1.12], [0, 1.78, 0.15], 0.04);
  rod(g, "#f5dfb8", [1.18, 0, 1.12], [0, 1.78, 0.15], 0.04);
  for (let s of [-1, 1]) {
    rod(g, "#e8d7b7", [s * 0.9, 0.7, 0.5], [s * 1.8, 0.05, 1.4], 0.012);
    rod(g, "#86735b", [s * 1.8, 0, 1.4], [s * 1.8, 0.16, 1.4], 0.03);
  }
  block(g, "#e7c28c", [0, 0.04, 1.4], [1.25, 0.06, 0.7]);
  return t;
}
export function chair(g, x = 0, z = 0, color = "#9fb6b0") {
  const c = group(g, [x, 0, z]);
  for (let side of [-1, 1]) {
    rod(c, "#b19673", [side * 0.4, 0.05, -0.4], [side * 0.4, 0.8, 0.45], 0.04);
    rod(c, "#b19673", [side * 0.4, 0.05, 0.45], [side * 0.4, 1.5, -0.3], 0.04);
  }
  block(c, color, [0, 0.68, 0.04], [0.75, 0.045, 0.8]);
  const back = block(c, color, [0, 1.12, -0.26], [0.75, 0.7, 0.05]);
  back.rotation.x = -0.18;
  return c;
}
export function lantern(g, x, y, z) {
  cyl(g, "#d3a156", [x, y, z], [0.19, 0.09, 0.19]);
  cyl(
    g,
    mat("#fff2b0", { emissive: "#ffcf6f", emissiveIntensity: 0.6 }),
    [x, y + 0.2, z],
    [0.13, 0.32, 0.13],
  );
  cyl(g, "#d3a156", [x, y + 0.39, z], [0.18, 0.06, 0.18]);
  const loop = torus(g, "#ac8652", [x, y + 0.53, z], 0.11, 0.018);
  return loop;
}
export function table(g) {
  cyl(g, "#bb9771", [0, 0.65, 0], [0.85, 0.13, 0.6]);
  for (let a of [0, 2.1, 4.2])
    rod(
      g,
      "#8f795c",
      [0, 0.6, 0],
      [Math.cos(a) * 0.65, 0, Math.sin(a) * 0.45],
      0.06,
    );
}
export function book(g, x = 0, y = 0.8, z = 0) {
  const b = group(g, [x, y, z]);
  for (let s of [-1, 1]) {
    let page = block(b, "#fff1ce", [s * 0.29, 0, 0], [0.57, 0.08, 0.75]);
    page.rotation.z = s * 0.12;
    block(b, "#8ba8a5", [s * 0.29, -0.07, 0], [0.6, 0.04, 0.8]).rotation.z =
      s * 0.12;
    for (let i = 0; i < 4; i++) {
      const line = block(
        b,
        "#b3bdaf",
        [s * 0.29, 0.055, -0.2 + i * 0.12],
        [0.36, 0.008, 0.012],
      );
      line.rotation.z = s * 0.12;
    }
  }
  return b;
}
export function backpack(g) {
  capsule(g, "#4b8f87", [0, 0.83, 0], [1.1, 1.1, 0.6]);
  capsule(g, "#80b3a0", [0, 1.53, 0], [1.1, 0.22, 0.64]);
  block(g, "#cbac78", [0, 1.27, 0.33], [0.16, 0.28, 0.03]);
  capsule(g, "#39796e", [0, 0.55, 0.34], [0.72, 0.44, 0.16]);
  for (const s of [-1, 1]) {
    rod(g, "#657169", [s * 0.85, 0.05, 0.15], [s * 0.58, 1.9, 0.05], 0.025);
    capsule(g, "#564d3f", [s * 0.58, 1.86, 0.05], [0.08, 0.22, 0.08]);
  }
  cyl(g, "#a0c6bc", [0.64, 0.8, 0], [0.15, 0.58, 0.15]);
}
export function camel(g) {
  const c = group(g);
  ball(c, "#c29a68", [0, 1.15, 0], [1.02, 0.55, 0.42]);
  ball(c, "#b68b59", [-0.13, 1.62, 0], [0.4, 0.43, 0.37]);
  capsule(c, "#cda875", [0.78, 1.75, 0], [0.35, 0.95, 0.35]).rotation.z = -0.3;
  ball(c, "#cda875", [1.05, 2.38, 0.05], [0.44, 0.27, 0.25]);
  for (const s of [-1, 1]) {
    ball(c, "#624b33", [1.12, 2.43, s * 0.235], [0.035, 0.04, 0.02]);
    capsule(c, "#bc9464", [0.87, 2.66, s * 0.15], [0.09, 0.18, 0.07]);
  }
  for (let x of [-0.65, 0.6])
    for (let z of [-0.27, 0.27]) {
      capsule(c, "#b88b5b", [x, 0.55, z], [0.12, 0.66, 0.12]);
      ball(c, "#80654b", [x, 0.08, z + 0.07], [0.13, 0.08, 0.2]);
    }
  block(c, "#aa7562", [-0.15, 1.6, 0], [0.85, 0.1, 0.95]);
  block(c, "#ead7a0", [-0.15, 1.66, 0], [0.7, 0.06, 0.87]);
  rod(c, "#b58b5d", [-0.98, 1.3, 0], [-1.2, 0.8, 0], 0.045);
  return c;
}
export function fish(g, color = "#edc587", s = 1) {
  const f = group(g);
  ball(f, color, [0, 0, 0], [0.8 * s, 0.43 * s, 0.25 * s]);
  let tail = mesh(
    f,
    new T.ConeGeometry(0.4, 0.6, 3),
    color,
    [-0.9 * s, 0, 0],
    [s, s, 0.6 * s],
  );
  tail.rotation.z = -Math.PI / 2;
  for (const side of [-1, 1]) {
    ball(
      f,
      "#fff9e3",
      [0.42 * s, 0.08 * s, side * 0.21 * s],
      [0.13 * s, 0.14 * s, 0.05 * s],
    );
    ball(
      f,
      "#365561",
      [0.45 * s, 0.08 * s, side * 0.25 * s],
      [0.055 * s, 0.07 * s, 0.025 * s],
    );
  }
  let fin = mesh(
    f,
    new T.ConeGeometry(0.25, 0.4, 3),
    "#e4a77e",
    [0, 0.4 * s, 0],
    [s, s, s * 0.5],
  );
  fin.rotation.z = -0.3;
  return f;
}
export function shell(g) {
  for (let i = 0; i < 9; i++) {
    const a = (i / 8 - 0.5) * Math.PI * 0.8;
    let l = ball(
      g,
      i % 2 ? "#f2cebb" : "#e4b3b2",
      [Math.sin(a) * 0.5, 0.45 + Math.cos(a) * 0.4, -Math.cos(a) * 0.15],
      [0.2, 0.85, 0.16],
    );
    l.rotation.z = -a;
  }
  ball(
    g,
    mat("#fff5d9", { emissive: "#a6cfd7", emissiveIntensity: 0.2 }),
    [0, 0.35, 0.4],
    [0.35, 0.35, 0.35],
  );
}
export function landmark(theme, index) {
  const g = new T.Group();
  if (theme === "forest") {
    if (index === 0) {
      tent(g);
      lantern(g, 1.45, 0.1, 0.3);
    }
    if (index === 1) {
      chair(g, -0.6, 0, "#b6a1bd");
      chair(g, 0.85, -0.3, "#a2beb0").rotation.y = -0.4;
      lantern(g, 0.25, 0.07, 0.7);
    }
    if (index === 2) {
      table(g);
      book(g);
      cyl(g, "#779e97", [0.6, 0.85, 0.15], [0.12, 0.23, 0.12]);
    }
    if (index === 3) backpack(g);
  }
  if (theme === "desert") {
    if (index === 0) camel(g);
    if (index === 1) {
      for (let x of [-1, 1]) rod(g, "#967653", [x, 0, 0], [x, 1.9, 0], 0.055);
      block(g, "#d39e7a", [0, 1.9, 0], [2.2, 0.06, 1.6]).rotation.z = 0.07;
      chair(g, 0, 0, "#c8a17e");
      lantern(g, 0.8, 0.1, 0.6);
    }
    if (index === 2) {
      block(g, "#d5b891", [0, 0.45, 0], [1.7, 0.9, 1.1]);
      book(g, 0, 0.95, 0);
      cyl(g, "#bf8b55", [0.5, 1.2, 0], [0.12, 0.38, 0.12]);
    }
    if (index === 3) {
      block(g, "#9a8264", [0, 0.43, 0], [1.4, 0.86, 0.85]);
      for (let x of [-0.45, 0.45])
        block(g, "#d2b88c", [x, 0.44, 0.44], [0.09, 0.88, 0.035]);
      rod(g, "#82735e", [0.7, 0, 0], [0.7, 1.8, 0], 0.04);
      let scope = cyl(g, "#cfb580", [0.7, 1.85, 0], [0.16, 0.9, 0.16]);
      scope.rotation.z = 0.95;
    }
  }
  if (theme === "ocean") {
    if (index === 0) {
      const f = fish(g, "#ecc78b", 1.15);
      f.position.y = 1.15;
      const small = fish(g, "#9fc5d4", 0.5);
      small.position.set(-0.8, 0.5, 0.7);
    }
    if (index === 1) {
      shell(g);
      coral(g, 1, 0, -0.2, 0.8, "#cc9ebd");
    }
    if (index === 2) {
      const dome = mesh(
        g,
        new T.SphereGeometry(1.05, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        mat("#b0dce0", {
          transparent: true,
          opacity: 0.42,
          metalness: 0.1,
          roughness: 0.1,
        }),
        [0, 0.15, 0],
      );
      const ring = torus(g, "#97bcb8", [0, 0.18, 0], 1.06, 0.06);
      ring.rotation.x = Math.PI / 2;
      book(g, 0, 0.45, 0);
      lantern(g, 0, 0.9, 0);
    }
    if (index === 3) {
      const boat = ball(g, "#ddc7a8", [0, 0.35, 0], [1.4, 0.4, 0.65]);
      block(g, "#91b3b4", [0, 0.58, 0], [1.8, 0.07, 0.85]);
      rod(g, "#bda586", [0, 0.6, 0], [0, 2.35, 0], 0.045);
      const sail = new T.Shape();
      sail.moveTo(0.08, 0);
      sail.lineTo(0.08, 1.55);
      sail.lineTo(1, 0.15);
      sail.closePath();
      mesh(
        g,
        new T.ShapeGeometry(sail),
        mat("#f0ead8", { side: T.DoubleSide }),
        [0, 0.75, 0],
      );
    }
  }
  return g;
}


// ============================================================================
// THE LITTLE PRINCE (B-612) POETIC WORLD ASSETS
// ============================================================================

/**
 * The Little Prince's Rose under the Glass Cloche.
 * Translucent glass bell dome, delicate blooming red rose with emissive core,
 * mahogany base, fallen petals, and magical aura.
 */
export function clocheRose(parent, x = 0, y = 0, z = 0, s = 1) {
  const g = group(parent, [x, y, z]);
  g.userData.type = "clocheRose";

  // Mahogany Pedestal Base
  cyl(g, "#523624", [0, 0.08 * s, 0], [0.85 * s, 0.16 * s, 0.85 * s]);
  cyl(g, "#6a4630", [0, 0.17 * s, 0], [0.72 * s, 0.04 * s, 0.72 * s]);

  // Fallen Petals on the wood platter
  ball(g, "#d92338", [-0.22 * s, 0.2 * s, 0.15 * s], [0.1 * s, 0.02 * s, 0.08 * s]);
  ball(g, "#c41e32", [0.26 * s, 0.2 * s, -0.1 * s], [0.08 * s, 0.02 * s, 0.11 * s]);
  ball(g, "#b81a2c", [-0.08 * s, 0.2 * s, -0.22 * s], [0.07 * s, 0.02 * s, 0.07 * s]);

  // Slender curved green stem
  rod(g, "#3e6e44", [0, 0.18 * s, 0], [0.02 * s, 0.65 * s, 0], 0.03 * s);
  rod(g, "#3e6e44", [0.02 * s, 0.65 * s, 0], [-0.03 * s, 1.15 * s, 0.02 * s], 0.026 * s);

  // Fresh green leaves
  const l1 = ball(g, "#4d8054", [-0.14 * s, 0.6 * s, 0.08 * s], [0.18 * s, 0.025 * s, 0.1 * s]);
  l1.rotation.set(0.2, 0.4, -0.3);
  const l2 = ball(g, "#4d8054", [0.15 * s, 0.85 * s, -0.05 * s], [0.16 * s, 0.025 * s, 0.09 * s]);
  l2.rotation.set(-0.2, -0.3, 0.4);

  // Flower calyx
  cyl(g, "#3e6e44", [-0.03 * s, 1.16 * s, 0.02 * s], [0.09 * s, 0.08 * s, 0.09 * s]);

  // Blooming Red Rose Petals with inner luminous glow
  const roseCoreMat = mat("#ff2240", {
    emissive: "#ff2a44",
    emissiveIntensity: 0.85,
    roughness: 0.45,
  });
  const rosePetalMat = mat("#d62038", { roughness: 0.6 });

  // Outer Petals
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5;
    const px = -0.03 * s + Math.cos(angle) * 0.12 * s;
    const pz = 0.02 * s + Math.sin(angle) * 0.12 * s;
    const petal = ball(g, rosePetalMat, [px, 1.28 * s, pz], [0.13 * s, 0.15 * s, 0.08 * s]);
    petal.rotation.y = -angle;
    petal.rotation.z = 0.35;
  }
  // Middle & Inner luminous heart
  for (let i = 0; i < 3; i++) {
    const angle = i * 2.1 + 0.5;
    const px = -0.03 * s + Math.cos(angle) * 0.06 * s;
    const pz = 0.02 * s + Math.sin(angle) * 0.06 * s;
    ball(g, roseCoreMat, [px, 1.34 * s, pz], [0.1 * s, 0.14 * s, 0.09 * s]);
  }
  ball(g, roseCoreMat, [-0.03 * s, 1.38 * s, 0.02 * s], [0.08 * s, 0.12 * s, 0.08 * s]);

  // Glass Bell Cloche (Semi-transparent with soft highlights)
  const glassMat = mat("#c4eef2", {
    transparent: true,
    opacity: 0.36,
    roughness: 0.08,
    metalness: 0.15,
  });
  // Dome cylinder
  mesh(
    g,
    new T.CylinderGeometry(0.65 * s, 0.65 * s, 1.1 * s, 24, 1, true),
    glassMat,
    [0, 0.74 * s, 0]
  );
  // Dome top hemisphere
  mesh(
    g,
    new T.SphereGeometry(0.65 * s, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    glassMat,
    [0, 1.29 * s, 0]
  );
  // Glass handle bead
  ball(g, glassMat, [0, 1.98 * s, 0], [0.12 * s, 0.12 * s, 0.12 * s]);

  return g;
}

/**
 * B-612 Mini Volcano with chimney smoke puffs.
 */
export function miniVolcano(parent, x = 0, y = 0, z = 0, s = 1) {
  const g = group(parent, [x, y, z]);
  g.userData.type = "miniVolcano";

  // Volcanic cone
  const coneGeo = new T.CylinderGeometry(0.38 * s, 1.35 * s, 1.45 * s, 7);
  mesh(g, coneGeo, "#695e56", [0, 0.72 * s, 0]);

  // Molten vent glow
  cyl(
    g,
    mat("#ff6622", { emissive: "#ff5011", emissiveIntensity: 0.95 }),
    [0, 1.44 * s, 0],
    [0.32 * s, 0.06 * s, 0.32 * s]
  );

  // Smoke puffs group (animated in render loop)
  const smokeGroup = group(g, [0, 1.6 * s, 0]);
  smokeGroup.userData.isSmoke = true;
  const smokeMat = mat("#ffffff", {
    transparent: true,
    opacity: 0.48,
    roughness: 0.9,
  });
  ball(smokeGroup, smokeMat, [0, 0.15 * s, 0], [0.16 * s, 0.16 * s, 0.16 * s]);
  ball(smokeGroup, smokeMat, [0.08 * s, 0.5 * s, -0.05 * s], [0.24 * s, 0.22 * s, 0.24 * s]);
  ball(smokeGroup, smokeMat, [-0.06 * s, 0.92 * s, 0.08 * s], [0.32 * s, 0.3 * s, 0.32 * s]);
  ball(smokeGroup, smokeMat, [0.1 * s, 1.4 * s, 0], [0.4 * s, 0.36 * s, 0.4 * s]);

  return g;
}

/**
 * Saint-Exupéry's Vintage Yellow Biplane with spinning propeller.
 */
export function vintageBiplane(parent, x = 0, y = 0, z = 0, s = 1, color = "#e2b13c") {
  const g = group(parent, [x, y, z]);
  g.userData.type = "biplane";

  // Fuselage body (streamlined capsule)
  const fuse = capsule(g, color, [0, 0.85 * s, 0], [0.55 * s, 2.3 * s, 0.55 * s]);
  fuse.rotation.x = Math.PI / 2;

  // Dark Engine Cowling & Nose
  ball(g, "#3c3836", [0, 0.85 * s, 1.15 * s], [0.38 * s, 0.38 * s, 0.42 * s]);

  // Upper & Lower Wings
  const lowerWing = block(g, color, [0, 0.65 * s, 0.25 * s], [4.4 * s, 0.07 * s, 0.85 * s]);
  const upperWing = block(g, color, [0, 1.58 * s, 0.3 * s], [4.6 * s, 0.07 * s, 0.9 * s]);

  // Wing connecting struts
  for (const side of [-1, 1]) {
    rod(g, "#4a3c30", [side * 1.5 * s, 0.68 * s, 0.05 * s], [side * 1.5 * s, 1.55 * s, 0.05 * s], 0.035 * s);
    rod(g, "#4a3c30", [side * 1.5 * s, 0.68 * s, 0.5 * s], [side * 1.5 * s, 1.55 * s, 0.5 * s], 0.035 * s);
  }

  // Cockpit cutout
  block(g, "#262322", [0, 1.12 * s, 0.1 * s], [0.4 * s, 0.25 * s, 0.6 * s]);
  // Tiny windscreen
  const windshield = block(
    g,
    mat("#cceef4", { transparent: true, opacity: 0.65 }),
    [0, 1.25 * s, 0.48 * s],
    [0.35 * s, 0.18 * s, 0.04 * s]
  );
  windshield.rotation.x = -0.3;

  // Tail fin & Stabilizers
  block(g, color, [0, 1.35 * s, -1.05 * s], [0.06 * s, 0.7 * s, 0.55 * s]);
  block(g, color, [0, 1.0 * s, -1.05 * s], [1.6 * s, 0.06 * s, 0.45 * s]);

  // Landing Gear Wheels
  for (const side of [-1, 1]) {
    rod(g, "#3a3028", [side * 0.25 * s, 0.65 * s, 0.55 * s], [side * 0.65 * s, 0.25 * s, 0.55 * s], 0.04 * s);
    cyl(g, "#222224", [side * 0.7 * s, 0.25 * s, 0.55 * s], [0.45 * s, 0.12 * s, 0.45 * s]).rotation.z = Math.PI / 2;
    ball(g, "#a09070", [side * 0.76 * s, 0.25 * s, 0.55 * s], [0.08 * s, 0.08 * s, 0.08 * s]);
  }

  // Wooden Propeller (Rotates in render loop!)
  const propHub = group(g, [0, 0.85 * s, 1.58 * s]);
  propHub.userData.isPropeller = true;
  block(propHub, "#6a4528", [0, 0, 0], [1.4 * s, 0.12 * s, 0.035 * s]);
  ball(propHub, "#d4af37", [0, 0, 0.03 * s], [0.12 * s, 0.12 * s, 0.12 * s]);

  // Pilot's travel trunk and logbook resting nearby
  block(g, "#85532f", [1.3 * s, 0.22 * s, -0.4 * s], [0.75 * s, 0.42 * s, 0.48 * s]);
  block(g, "#a86c3d", [1.3 * s, 0.46 * s, -0.4 * s], [0.78 * s, 0.08 * s, 0.5 * s]);
  book(g, 1.3 * s, 0.52 * s, -0.4 * s);
  lantern(g, 1.9 * s, 0.05 * s, -0.3 * s);

  return g;
}

/**
 * The Lamplighter's Vintage Streetlamp.
 * Ornate iron pole with warm glowing amber lantern.
 */
export function lamplighterPost(parent, x = 0, y = 0, z = 0, s = 1) {
  const g = group(parent, [x, y, z]);
  g.userData.type = "lamplighter";

  // Stepped Iron Base
  cyl(g, "#2d3330", [0, 0.12 * s, 0], [0.42 * s, 0.24 * s, 0.42 * s]);
  cyl(g, "#3b423f", [0, 0.3 * s, 0], [0.3 * s, 0.16 * s, 0.3 * s]);

  // Fluted Lamp Pole
  cyl(g, "#323a37", [0, 1.6 * s, 0], [0.12 * s, 2.5 * s, 0.12 * s]);

  // Crossbar Ladder Rest
  rod(g, "#2d3330", [-0.35 * s, 2.5 * s, 0], [0.35 * s, 2.5 * s, 0], 0.035 * s);

  // Decorative Lantern Collar & Brackets
  cyl(g, "#3b423f", [0, 2.85 * s, 0], [0.28 * s, 0.1 * s, 0.28 * s]);

  // Glowing Amber Lantern Housing
  const glowMat = mat("#fff0a3", {
    emissive: "#ffbe3b",
    emissiveIntensity: 0.95,
  });
  cyl(g, glowMat, [0, 3.12 * s, 0], [0.22 * s, 0.46 * s, 0.22 * s]);

  // Lantern Outer Glass Cage Ribs
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    rod(g, "#262b29", [Math.cos(a) * 0.23 * s, 2.9 * s, Math.sin(a) * 0.23 * s], [Math.cos(a) * 0.23 * s, 3.35 * s, Math.sin(a) * 0.23 * s], 0.025 * s);
  }

  // Lantern Cap & Finial Peak
  mesh(g, new T.ConeGeometry(0.36 * s, 0.32 * s, 4), "#2c312f", [0, 3.48 * s, 0]);
  ball(g, "#d4af37", [0, 3.68 * s, 0], [0.06 * s, 0.06 * s, 0.06 * s]);

  // Gentle ground warm-glow disc
  mesh(
    g,
    new T.CircleGeometry(1.6 * s, 16),
    mat("#ffe180", {
      transparent: true,
      opacity: 0.18,
      roughness: 1,
    }),
    [0, 0.01 * s, 0]
  ).rotation.x = -Math.PI / 2;

  return g;
}

/**
 * The Stargazer's Brass Astronomical Telescope.
 */
export function astronomerTelescope(parent, x = 0, y = 0, z = 0, s = 1) {
  const g = group(parent, [x, y, z]);
  g.userData.type = "telescope";

  // Sturdy Tripod Legs
  for (let a of [0, 2.1, 4.2]) {
    rod(g, "#4e3522", [0, 1.4 * s, 0], [Math.cos(a) * 0.75 * s, 0, Math.sin(a) * 0.75 * s], 0.045 * s);
  }
  // Brass Swivel Mount
  cyl(g, "#d4af37", [0, 1.45 * s, 0], [0.14 * s, 0.16 * s, 0.14 * s]);

  // Long Gleaming Brass Barrel pointed up to stars
  const barrelGroup = group(g, [0, 1.55 * s, 0]);
  barrelGroup.rotation.z = -0.55; // Angle ~35 deg towards cosmos
  cyl(barrelGroup, "#d4af37", [0, 0.3 * s, 0], [0.11 * s, 1.4 * s, 0.11 * s]);
  cyl(barrelGroup, "#b89228", [0, 0.98 * s, 0], [0.15 * s, 0.25 * s, 0.15 * s]); // Lens hood
  cyl(barrelGroup, "#3a2b16", [0, -0.42 * s, 0], [0.07 * s, 0.3 * s, 0.07 * s]); // Eyepiece

  // Star Map Chart Table nearby
  const chartTable = group(g, [0.95 * s, 0, 0.4 * s]);
  cyl(chartTable, "#61442d", [0, 0.55 * s, 0], [0.65 * s, 0.08 * s, 0.65 * s]);
  rod(chartTable, "#442f1f", [0, 0, 0], [0, 0.55 * s, 0], 0.08 * s);
  // Rolled parchment map
  cyl(chartTable, "#f3ebd1", [0.08 * s, 0.63 * s, 0], [0.06 * s, 0.45 * s, 0.06 * s]).rotation.x = Math.PI / 2;

  return g;
}

/**
 * Celestial Armillary Rings (Slowly rotating golden cosmos rings).
 */
export function celestialRings(parent, x = 0, y = 0, z = 0, s = 1) {
  const g = group(parent, [x, y, z]);
  g.userData.type = "celestialRings";
  g.userData.isCelestial = true;

  // Outer Golden Ring
  const ring1 = torus(g, "#e6be57", [0, 0, 0], 1.6 * s, 0.028 * s);
  ring1.rotation.x = 0.5;
  ring1.rotation.y = 0.2;

  // Middle Cyan/Silver Starlight Ring
  const ring2 = torus(g, "#8fd4df", [0, 0, 0], 1.25 * s, 0.022 * s);
  ring2.rotation.x = -0.65;
  ring2.rotation.z = 0.4;

  // Inner Golden Zodiac Ring
  const ring3 = torus(g, "#ffd777", [0, 0, 0], 0.88 * s, 0.02 * s);
  ring3.rotation.y = 0.8;

  // Floating Micro-Asteroids on the orbits
  const orbMat1 = mat("#ffd970", { emissive: "#ffca40", emissiveIntensity: 0.8 });
  const orbMat2 = mat("#9be2ee", { emissive: "#72d5e5", emissiveIntensity: 0.8 });
  ball(ring1, orbMat1, [1.6 * s, 0, 0], [0.1 * s, 0.1 * s, 0.1 * s]);
  ball(ring2, orbMat2, [0, 1.25 * s, 0], [0.08 * s, 0.08 * s, 0.08 * s]);
  ball(ring3, orbMat1, [0, 0, 0.88 * s], [0.07 * s, 0.07 * s, 0.07 * s]);

  return g;
}

/**
 * Peaceful Sleepy Fox curled up under the shade.
 * Little Prince's beloved companion with fluffy white-tipped brush tail.
 */
export function sleepyFox(parent, x = 0, y = 0, z = 0, s = 1) {
  const g = group(parent, [x, y, z]);
  g.userData.type = "sleepyFox";

  const orange = "#db6826";
  const white = "#ffffff";
  const dark = "#222222";

  // Body curled up
  ball(g, orange, [0, 0.22 * s, 0], [0.46 * s, 0.3 * s, 0.38 * s]);

  // Big Fluffy Tail wrapping around
  ball(g, orange, [0.22 * s, 0.18 * s, 0.24 * s], [0.38 * s, 0.22 * s, 0.22 * s]);
  // Pure White Tail Tip
  ball(g, white, [0.44 * s, 0.2 * s, 0.06 * s], [0.22 * s, 0.18 * s, 0.18 * s]);

  // Head resting down
  ball(g, orange, [-0.26 * s, 0.28 * s, -0.06 * s], [0.26 * s, 0.22 * s, 0.24 * s]);
  // White muzzle
  ball(g, white, [-0.38 * s, 0.2 * s, -0.08 * s], [0.16 * s, 0.14 * s, 0.16 * s]);
  // Tiny black button nose
  ball(g, dark, [-0.48 * s, 0.23 * s, -0.08 * s], [0.035 * s, 0.035 * s, 0.035 * s]);

  // Alert pointed ears with white fluff
  const earL = mesh(g, new T.ConeGeometry(0.08 * s, 0.18 * s, 3), orange, [-0.22 * s, 0.44 * s, 0.05 * s]);
  earL.rotation.set(-0.2, 0.2, -0.2);
  const earR = mesh(g, new T.ConeGeometry(0.08 * s, 0.18 * s, 3), orange, [-0.22 * s, 0.44 * s, -0.17 * s]);
  earR.rotation.set(0.2, -0.2, -0.2);

  return g;
}

/**
 * Patch of Golden Wheat Stalks (The Wheat Field of the Fox).
 */
export function wheatPatch(parent, x = 0, y = 0, z = 0, count = 18, s = 1) {
  const g = group(parent, [x, y, z]);
  g.userData.type = "wheatPatch";

  const gold = "#dfb448";
  const stalkColor = "#c29d38";

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.4;
    const r = Math.sqrt((i + 1) / count) * 0.9 * s;
    const px = Math.cos(angle) * r;
    const pz = Math.sin(angle) * r;
    const h = (0.75 + (i % 5) * 0.12) * s;

    // Slender stalk
    rod(g, stalkColor, [px, 0, pz], [px + 0.05 * s, h * 0.8, pz + 0.04 * s], 0.018 * s);
    // Golden ear of wheat
    const ear = capsule(g, gold, [px + 0.08 * s, h * 0.95, pz + 0.06 * s], [0.06 * s, 0.28 * s, 0.06 * s]);
    ear.rotation.z = -0.18;
  }

  return g;
}
