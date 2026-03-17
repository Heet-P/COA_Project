/* ──────────────────────────────────────────
   machine.js  — CPU register board (repositioned)
   ────────────────────────────────────────── */

const REG_NAMES = ['PC', 'SP', 'ACC', 'R0', 'R1', 'FLAGS'];
const REG_Y_START = 2.60;
const REG_SPACING = 0.60;
const BOARD_POS = { x: 7, y: 0, z: 6 };   // southeast of platform

let bgMesh, regs = [], flashQ = [];

export function initMachine(scene) {
  /* Background board */
  const bg = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 4.2, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.6 })
  );
  bg.position.set(BOARD_POS.x, 2.4, BOARD_POS.z);
  bg.castShadow = true;
  scene.add(bg);
  bgMesh = bg;

  /* Registers */
  REG_NAMES.forEach((name, i) => {
    // label
    const c = document.createElement('canvas');
    c.width = 256; c.height = 48;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#44ffaa';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(name, 8, 34);
    const tex = new THREE.CanvasTexture(c);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex }));
    sp.scale.set(1.2, 0.28, 1);
    sp.position.set(BOARD_POS.x - 0.6, REG_Y_START - i * REG_SPACING, BOARD_POS.z + 0.15);
    scene.add(sp);

    // value bar
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.22, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x00cc66, emissive: 0x00cc66, emissiveIntensity: 0.3 })
    );
    bar.position.set(BOARD_POS.x + 0.6, REG_Y_START - i * REG_SPACING, BOARD_POS.z + 0.15);
    scene.add(bar);
    regs.push(bar);
  });
}

/* Flash a random register bar to show activity */
export function flashRegister() {
  const r = regs[Math.floor(Math.random() * regs.length)];
  if (!r) return;
  r.material.emissiveIntensity = 1.6;
  flashQ.push({ mesh: r, ttl: 0.35 });
}

/* Called from conveyor to tick PC (index 0) */
export function tickPC() {
  flashQ.push({ mesh: regs[0], ttl: 0.25 });
  regs[0].material.emissiveIntensity = 1.6;
}

export function tickMachine(dt) {
  for (let i = flashQ.length - 1; i >= 0; i--) {
    flashQ[i].ttl -= dt;
    if (flashQ[i].ttl <= 0) {
      flashQ[i].mesh.material.emissiveIntensity = 0.3;
      flashQ.splice(i, 1);
    }
  }
}
