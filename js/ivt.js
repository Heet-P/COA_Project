/* ──────────────────────────────────────────
   ivt.js   — Interrupt Vector Table board (repositioned)
   ────────────────────────────────────────── */

const BOARD_X = 10;
const BOARD_Z = 6;
const BOARD_Y = 2.0;

let panel, rows = [];
let glowTarget = -1;
const NUM_VECTORS = 6;
const LABELS = ['IRQ0 — Timer', 'IRQ1 — Keyboard', 'IRQ2 — Disk',
                'IRQ3 — Network', 'IRQ4 — GPU', 'IRQ5 — USB'];

export function initIvt(scene) {
  /* Dark panel */
  panel = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 2.6, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x0a0a1a, roughness: 0.6 })
  );
  panel.position.set(BOARD_X, BOARD_Y, BOARD_Z);
  panel.castShadow = true;
  scene.add(panel);

  /* Title sprite */
  const tc = document.createElement('canvas');
  tc.width = 256; tc.height = 48;
  const tctx = tc.getContext('2d');
  tctx.fillStyle = '#ff6644';
  tctx.font = 'bold 22px monospace';
  tctx.textAlign = 'center';
  tctx.fillText('IVT — VECTOR TABLE', 128, 34);
  const tsp = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(tc) })
  );
  tsp.scale.set(2.2, 0.44, 1);
  tsp.position.set(BOARD_X, BOARD_Y + 1.15, BOARD_Z + 0.1);
  scene.add(tsp);

  /* Vector rows */
  for (let i = 0; i < NUM_VECTORS; i++) {
    // label
    const c = document.createElement('canvas');
    c.width = 256; c.height = 36;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#88bbff';
    ctx.font = '18px monospace';
    ctx.fillText(LABELS[i], 6, 26);
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c) })
    );
    sp.scale.set(2, 0.32, 1);
    sp.position.set(BOARD_X, BOARD_Y + 0.7 - i * 0.35, BOARD_Z + 0.1);
    scene.add(sp);

    // indicator dot
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.3
      })
    );
    dot.position.set(BOARD_X + 1.0, BOARD_Y + 0.7 - i * 0.35, BOARD_Z + 0.1);
    scene.add(dot);
    rows.push(dot);
  }
}

export function highlightVector(idx) {
  glowTarget = idx;
}

export function clearIvt() {
  glowTarget = -1;
  rows.forEach(d => { d.material.emissiveIntensity = 0.3; });
}

export function tickIvt(dt) {
  rows.forEach((dot, i) => {
    const target = (i === glowTarget) ? 2.0 : 0.3;
    dot.material.emissiveIntensity += (target - dot.material.emissiveIntensity) * dt * 6;
  });
}
