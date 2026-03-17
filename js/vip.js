/* ──────────────────────────────────────────
   vip.js   — VIP priority lane (repositioned)
   ────────────────────────────────────────── */

const LANE_X_START = 2;
const LANE_X_END   = 14;
const LANE_Z       = 9.5;
const LANE_Y       = 0.32;

let strip, marker;

export function initVip(scene) {
  /* Gold lane strip */
  strip = new THREE.Mesh(
    new THREE.BoxGeometry(LANE_X_END - LANE_X_START, 0.04, 0.7),
    new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      emissive: 0xffaa00,
      emissiveIntensity: 0.25,
      roughness: 0.3,
      metalness: 0.6
    })
  );
  strip.position.set(
    (LANE_X_START + LANE_X_END) / 2,
    LANE_Y + 0.02,
    LANE_Z
  );
  strip.receiveShadow = true;
  scene.add(strip);

  /* "VIP" label */
  const c = document.createElement('canvas');
  c.width = 128; c.height = 48;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffdd00';
  ctx.font = 'bold 30px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('VIP', 64, 36);
  const sp = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c) })
  );
  sp.scale.set(1.2, 0.45, 1);
  sp.position.set((LANE_X_START + LANE_X_END) / 2, LANE_Y + 0.9, LANE_Z);
  scene.add(sp);

  /* Priority marker (slides along lane) */
  marker = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.35, 0.35),
    new THREE.MeshStandardMaterial({
      color: 0xff4400,
      emissive: 0xff2200,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.5
    })
  );
  marker.position.set(LANE_X_START, LANE_Y + 0.2, LANE_Z);
  marker.castShadow = true;
  marker.visible = false;
  scene.add(marker);
}

export function fireVip() {
  if (!marker) return;
  marker.position.x = LANE_X_START;
  marker.visible = true;
}

export function clearVip() {
  if (marker) marker.visible = false;
}

export function tickVip(dt) {
  if (!marker || !marker.visible) return;
  marker.position.x += dt * 3.5;
  marker.rotation.y += dt * 4;
  if (marker.position.x > LANE_X_END) {
    marker.position.x = LANE_X_START;
  }
}
