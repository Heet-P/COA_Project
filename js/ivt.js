/* ──────────────────────────────────────────
   ivt.js   — Interrupt Vector Table board
              Fixed: proper colour change on highlight
   ────────────────────────────────────────── */

const BOARD_X = 10;
const BOARD_Z = 6;
const BOARD_Y = 2.0;

let panel;
let rows = [];           // { dot, label } per vector
let glowTarget = -1;
const NUM_VECTORS = 6;
const LABELS = ['IRQ0 — Timer', 'IRQ1 — Keyboard', 'IRQ2 — Disk',
                'IRQ3 — Network', 'IRQ4 — GPU', 'IRQ5 — USB'];
const ADDRESSES = ['0x0040', '0x00A0', '0x00B0',
                   '0x00C0', '0x00D0', '0x00E0'];

/* Colours: idle = dim green, active = bright orange-red */
const IDLE_COLOR    = new THREE.Color(0x115522);
const IDLE_EMISSIVE = new THREE.Color(0x00ff88);
const ACTIVE_COLOR    = new THREE.Color(0xff6600);
const ACTIVE_EMISSIVE = new THREE.Color(0xff2200);

let ivtGroup;
let cameraRef;

export function initIvt(scene, camera) {
  cameraRef = camera;
  ivtGroup = new THREE.Group();
  ivtGroup.position.set(BOARD_X, BOARD_Y, BOARD_Z);
  scene.add(ivtGroup);

  /* Dark panel */
  panel = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 2.6, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x0a0a1a, roughness: 0.6 })
  );
  panel.position.set(0, 0, 0);
  panel.castShadow = true;
  ivtGroup.add(panel);

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
  tsp.position.set(0, 1.15, 0.1);
  ivtGroup.add(tsp);

  /* Vector rows */
  for (let i = 0; i < NUM_VECTORS; i++) {
    // label sprite
    const c = document.createElement('canvas');
    c.width = 300; c.height = 36;
    const ctx = c.getContext('2d');

    // IRQ Name
    ctx.fillStyle = '#88bbff';
    ctx.font = '16px monospace';
    ctx.fillText(LABELS[i], 0, 24);

    // Memory Address (the meaningful part)
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(ADDRESSES[i], 280, 24);

    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c) })
    );
    sp.scale.set(2.4, 0.32, 1);
    sp.position.set(-0.1, 0.7 - i * 0.35, 0.1);
    ivtGroup.add(sp);

    // indicator dot — starts idle green
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 12, 12),
      new THREE.MeshStandardMaterial({
        color: IDLE_COLOR.clone(),
        emissive: IDLE_EMISSIVE.clone(),
        emissiveIntensity: 0.25
      })
    );
    dot.position.set(1.0, 0.7 - i * 0.35, 0.1);
    ivtGroup.add(dot);
    rows.push(dot);
  }
}

/* ── Highlight specific vector (by index) ── */
export function highlightVector(idx) {
  glowTarget = idx;
}

/* ── Reset all to idle ── */
export function clearIvt() {
  glowTarget = -1;
  rows.forEach(dot => {
    dot.material.color.copy(IDLE_COLOR);
    dot.material.emissive.copy(IDLE_EMISSIVE);
    dot.material.emissiveIntensity = 0.25;
  });
}

/* ── Tick: animate dots toward target state ── */
export function tickIvt(dt) {
  if (ivtGroup && cameraRef) {
    ivtGroup.lookAt(cameraRef.position);
  }

  rows.forEach((dot, i) => {
    const isActive = (i === glowTarget);

    if (isActive) {
      /* Lerp toward bright orange-red with strong pulse */
      dot.material.color.lerp(ACTIVE_COLOR, dt * 8);
      dot.material.emissive.lerp(ACTIVE_EMISSIVE, dt * 8);
      // Pulsing intensity
      dot.material.emissiveIntensity = 1.5 + Math.sin(performance.now() * 0.01) * 0.8;
    } else {
      /* Lerp back to dim idle green */
      dot.material.color.lerp(IDLE_COLOR, dt * 4);
      dot.material.emissive.lerp(IDLE_EMISSIVE, dt * 4);
      dot.material.emissiveIntensity += (0.25 - dot.material.emissiveIntensity) * dt * 4;
    }
  });
}
