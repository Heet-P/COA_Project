/* ──────────────────────────────────────────
   lights.js   — daylight sunlight + alarm VFX
   ────────────────────────────────────────── */

const LIGHTS = {};

export function initLights(scene) {

  /* Hemisphere — sky blue top, grass green bottom */
  LIGHTS.hemi = new THREE.HemisphereLight(0x88ccff, 0x446622, 0.6);
  scene.add(LIGHTS.hemi);

  /* Sun — warm directional */
  LIGHTS.sun = new THREE.DirectionalLight(0xfff4e0, 1.3);
  LIGHTS.sun.position.set(15, 25, 10);
  LIGHTS.sun.castShadow = true;
  LIGHTS.sun.shadow.mapSize.set(2048, 2048);
  LIGHTS.sun.shadow.camera.left   = -25;
  LIGHTS.sun.shadow.camera.right  =  25;
  LIGHTS.sun.shadow.camera.top    =  25;
  LIGHTS.sun.shadow.camera.bottom = -25;
  LIGHTS.sun.shadow.camera.near   =  1;
  LIGHTS.sun.shadow.camera.far    =  60;
  scene.add(LIGHTS.sun);

  /* Fill — soft cool key from opposite side */
  LIGHTS.fill = new THREE.DirectionalLight(0xaaccff, 0.35);
  LIGHTS.fill.position.set(-10, 12, -8);
  scene.add(LIGHTS.fill);

  /* Red alarm point (off by default) */
  LIGHTS.alarm = new THREE.PointLight(0xff0000, 0, 40);
  LIGHTS.alarm.position.set(0, 6, 0);
  scene.add(LIGHTS.alarm);

  return LIGHTS;
}

/* ── Alarm flash ── */
let _alarmOn = false;
const vfxEl = document.getElementById('alarm-vfx');

export function setAlarm(on) {
  if (on === _alarmOn) return;
  _alarmOn = on;
  if (on) {
    LIGHTS.alarm.intensity = 2.0;
  } else {
    LIGHTS.alarm.intensity = 0;
    vfxEl.style.background = 'rgba(255,0,0,0)';
  }
}

export function tickAlarm(t) {
  if (!_alarmOn) return;
  const v = Math.abs(Math.sin(t * 6));
  LIGHTS.alarm.intensity = 1.0 + v * 2.0;
  vfxEl.style.background = `rgba(255,0,0,${v * 0.06})`;
}
