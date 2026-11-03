// ═════════════════════════════════════════════════════════════════════════
// Jakub Antalik 风格磁吸悬浮动画引擎 (Magnetic Spring Hover Effect)
// ═════════════════════════════════════════════════════════════════════════

export function initMagneticHover(selector = "[data-magnetic]", options = {}) {
  const elements = document.querySelectorAll(selector);
  const maxDistance = options.distance || 60; // 磁吸感知半径 (px)
  const magneticStrength = options.strength || 0.38; // 磁吸拉伸强度
  const damping = options.damping || 0.15; // 弹簧阻尼系数
  const tiltStrength = options.tilt || 0.12; // 3D 倾斜微透视

  elements.forEach((el) => {
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let rotX = 0;
    let rotY = 0;
    let currentRotX = 0;
    let currentRotY = 0;
    let isHovered = false;
    let animId = null;

    // 确保有 relative 定位和平滑的硬件加速
    el.style.willChange = "transform";
    el.style.transformStyle = "preserve-3d";

    function onPointerMove(e) {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      const distance = Math.hypot(deltaX, deltaY);

      // 计算磁吸拉力：距离越近拉力越明显，带物理衰减
      if (distance < rect.width / 2 + maxDistance) {
        targetX = deltaX * magneticStrength;
        targetY = deltaY * magneticStrength;
        rotY = deltaX * tiltStrength;
        rotX = -deltaY * tiltStrength;
        if (!isHovered) {
          isHovered = true;
          startSpring();
        }
      } else {
        targetX = 0;
        targetY = 0;
        rotX = 0;
        rotY = 0;
      }
    }

    function onPointerLeave() {
      targetX = 0;
      targetY = 0;
      rotX = 0;
      rotY = 0;
      isHovered = false;
    }

    function startSpring() {
      if (animId) return;
      function tick() {
        // 弹簧阻尼插值 (Spring Lerp)
        currentX += (targetX - currentX) * damping;
        currentY += (targetY - currentY) * damping;
        currentRotX += (rotX - currentRotX) * damping;
        currentRotY += (rotY - currentRotY) * damping;

        el.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0) rotateX(${currentRotX.toFixed(2)}deg) rotateY(${currentRotY.toFixed(2)}deg)`;

        // 当物体回弹静止且不再 hover 时停止动画循环节省性能
        if (!isHovered && Math.abs(currentX) < 0.05 && Math.abs(currentY) < 0.05) {
          el.style.transform = "translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg)";
          currentX = 0;
          currentY = 0;
          currentRotX = 0;
          currentRotY = 0;
          animId = null;
          return;
        }
        animId = requestAnimationFrame(tick);
      }
      animId = requestAnimationFrame(tick);
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    el.addEventListener("pointerleave", onPointerLeave);
  });
}
