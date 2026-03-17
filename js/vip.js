/* ──────────────────────────────────────────
   vip.js   — yellow guide line from conveyor
              centre to the stack bin
   ────────────────────────────────────────── */

const PLAT_Y = 0.32;

/* Start (conveyor centre) → End (stack bin) */
const FROM = new THREE.Vector3(0, PLAT_Y + 0.04, 0);
const TO   = new THREE.Vector3(4, PLAT_Y + 0.04, 4);

const DASH_LEN  = 0.3;
const GAP_LEN   = 0.2;
const LINE_Y    = PLAT_Y + 0.025;

let lineGroup = null;
let marker    = null;
let sceneRef  = null;
let markerT   = 0;

export function initVip(scene) {
  sceneRef = scene;

  /* Build dashed yellow line as a series of thin boxes */
  lineGroup = new THREE.Group();
  const dir = TO.clone().sub(FROM);
  const len = dir.length();
  dir.normalize();
  const angle = Math.atan2(dir.x, dir.z);

  let d = 0;
  while (d < len) {
    const segLen = Math.min(DASH_LEN, len - d);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      emissive: 0xffaa00,
      emissiveIntensity: 0.3,
      roughness: 0.35,
      metalness: 0.5
    });
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.02, segLen), mat
    );
    const midD = d + segLen / 2;
    m.position.set(
      FROM.x + dir.x * midD,
      LINE_Y,
      FROM.z + dir.z * midD
    );
    m.rotation.y = angle;
    lineGroup.add(m);

    d += DASH_LEN + GAP_LEN;
  }

  scene.add(lineGroup);

  /* "ISR" label */
  const c = document.createElement('canvas');
  c.width = 160; c.height = 48;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffdd00';
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ISR PATH', 80, 36);
  const sp = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c) })
  );
  sp.scale.set(1.6, 0.45, 1);
  sp.position.set((FROM.x + TO.x) / 2, PLAT_Y + 0.9, (FROM.z + TO.z) / 2);
  scene.add(sp);

  /* Priority marker block — slides along the line */
  marker = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.38, 0.38),
    new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xff3300,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.5
    })
  );
  marker.castShadow = true;
  marker.visible = false;
  scene.add(marker);
}

export function fireVip() {
  if (!marker) return;
  markerT = 0;
  marker.position.copy(FROM);
  marker.position.y = PLAT_Y + 0.22;
  marker.visible = true;
}

export function clearVip() {
  if (marker) marker.visible = false;
}

export function tickVip(dt) {
  if (!marker || !marker.visible) return;
  markerT += dt * 0.5;                     // ~2 seconds to travel
  if (markerT > 1) markerT = 1;

  marker.position.lerpVectors(FROM, TO, markerT);
  marker.position.y = PLAT_Y + 0.22;
  marker.rotation.y += dt * 4;
  marker.material.emissiveIntensity = 0.5 + Math.sin(performance.now() * 0.006) * 0.3;
}
