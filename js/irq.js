/* ──────────────────────────────────────────
   irq.js   — red interrupt cube on a 45°
              DIAGONAL IRQ signal line that
              cuts across the input belt
              and the I/O port belt
   ────────────────────────────────────────── */

const PLAT_Y = 0.32;
const BLOCK_Y = PLAT_Y + 0.26;

/* Diagonal path: SW corner → robotic arm at centre (0,0,0) */
const DIAG_START = new THREE.Vector3(+10, PLAT_Y + 0.05, -10);
const DIAG_END = new THREE.Vector3(0, PLAT_Y + 0.05, 0);

/* Direction (normalised) along the diagonal */
const DIAG_DIR = new THREE.Vector3().subVectors(DIAG_END, DIAG_START).normalize();
const DIAG_LEN = DIAG_START.distanceTo(DIAG_END);
const DIAG_ANGLE = Math.atan2(DIAG_DIR.x, DIAG_DIR.z);   // yaw for mesh rotation

const TRAVEL_SPEED = 7.0;

/* Cube stops at the end of the line (the arm) */
const ARRIVAL_DIST = DIAG_LEN - 0.3;    // stop just before the arm base

let cube = null;
let active = false;
let arrived = false;
let sceneRef = null;
let lineGroup = null;
let travelDist = 0;

/* ── Build ── */
export function initIrq(scene) {
  sceneRef = scene;
  lineGroup = new THREE.Group();

  /* ── Diagonal rail (dark strip) ── */
  const railLen = DIAG_LEN;
  const railGeo = new THREE.BoxGeometry(railLen, 0.04, 0.40);
  const railMat = new THREE.MeshStandardMaterial({
    color: 0x330000, emissive: 0xff0000,
    emissiveIntensity: 0.15, roughness: 0.5, metalness: 0.3,
    transparent: true, opacity: 0.8
  });
  const rail = new THREE.Mesh(railGeo, railMat);
  /* Position at midpoint of diagonal */
  const mid = new THREE.Vector3().addVectors(DIAG_START, DIAG_END).multiplyScalar(0.5);
  rail.position.copy(mid);
  rail.rotation.y = -DIAG_ANGLE;     // rotate to align with diagonal
  rail.receiveShadow = true;
  lineGroup.add(rail);

  /* ── Glowing red dashed markers along the diagonal ── */
  const dashMat = new THREE.MeshStandardMaterial({
    color: 0xff2244, emissive: 0xff0000,
    emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.4
  });
  const dashCount = 10;
  for (let i = 0; i < dashCount; i++) {
    const t = (i + 0.5) / dashCount;
    const pos = new THREE.Vector3().lerpVectors(DIAG_START, DIAG_END, t);
    const dash = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.06, 0.12), dashMat
    );
    dash.position.copy(pos);
    dash.position.y = PLAT_Y + 0.065;
    dash.rotation.y = -DIAG_ANGLE;
    lineGroup.add(dash);
  }

  /* ── Side rails (thin red borders) ── */
  const sideRailMat = new THREE.MeshStandardMaterial({
    color: 0xff2244, roughness: 0.4, metalness: 0.5
  });
  /* Perpendicular offset vector */
  const perp = new THREE.Vector3(-DIAG_DIR.z, 0, DIAG_DIR.x);
  [-0.24, 0.24].forEach(off => {
    const sGeo = new THREE.BoxGeometry(railLen, 0.08, 0.04);
    const sr = new THREE.Mesh(sGeo, sideRailMat);
    sr.position.copy(mid).addScaledVector(perp, off);
    sr.position.y = PLAT_Y + 0.04;
    sr.rotation.y = -DIAG_ANGLE;
    lineGroup.add(sr);
  });

  /* ── Label at start of diagonal ── */
  const lc = document.createElement('canvas');
  lc.width = 256; lc.height = 48;
  const lctx = lc.getContext('2d');
  lctx.fillStyle = '#220000';
  lctx.globalAlpha = 0.7;
  lctx.fillRect(0, 0, lc.width, lc.height);
  lctx.globalAlpha = 1;
  lctx.fillStyle = '#ff4444';
  lctx.font = 'bold 22px monospace';
  lctx.textAlign = 'center';
  lctx.fillText('⚡ IRQ SIGNAL LINE', 128, 34);
  const lsp = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(lc), depthTest: false })
  );
  lsp.scale.set(2.5, 0.5, 1);
  lsp.position.set(DIAG_START.x + 2, PLAT_Y + 0.9, DIAG_START.z - 1.5);
  lsp.renderOrder = 999;
  lineGroup.add(lsp);

  scene.add(lineGroup);

  /* ── The red IRQ cube ── */
  const geo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xff2244,
    emissive: 0xff0000,
    emissiveIntensity: 0.7,
    roughness: 0.2,
    metalness: 0.5
  });
  cube = new THREE.Mesh(geo, mat);
  cube.castShadow = true;
  cube.visible = false;
  scene.add(cube);
}

/* ── Fire ── */
export function fireIrq() {
  if (active) return;
  cube.position.set(DIAG_START.x, BLOCK_Y, DIAG_START.z);
  cube.visible = true;
  active = true;
  arrived = false;
  travelDist = 0;
}

/* ── Tick ── */
export function tickIrq(dt) {
  if (!active || arrived) return;

  travelDist += TRAVEL_SPEED * dt;
  cube.position.set(
    DIAG_START.x + DIAG_DIR.x * travelDist,
    BLOCK_Y,
    DIAG_START.z + DIAG_DIR.z * travelDist
  );
  cube.rotation.x += dt * 5;
  cube.rotation.z += dt * 4;

  /* Pulse glow */
  cube.material.emissiveIntensity = 0.7 + Math.sin(performance.now() * 0.008) * 0.4;

  /* Pulse the line dashes as cube passes */
  lineGroup.children.forEach(c => {
    if (!c.isMesh) return;
    if (c.material.emissive && c.material.emissive.r > 0.5) {
      const dx = c.position.x - cube.position.x;
      const dz = c.position.z - cube.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 1.5) {
        c.material.emissiveIntensity = 0.5 + (1.5 - dist) * 0.6;
      }
    }
  });

  if (travelDist >= ARRIVAL_DIST) {
    /* Park near centre */
    cube.position.set(
      DIAG_START.x + DIAG_DIR.x * ARRIVAL_DIST,
      BLOCK_Y,
      DIAG_START.z + DIAG_DIR.z * ARRIVAL_DIST
    );
    arrived = true;
  }
}

/* ── Clear ── */
export function clearIrq() {
  if (cube) cube.visible = false;
  active = false;
  arrived = false;
  travelDist = 0;
}

export function isArrived() { return arrived; }
export function isActive() { return active; }

/* ── Expose cube mesh so the arm can grab it ── */
export function getIrqCube() { return cube; }
