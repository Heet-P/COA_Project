/* ──────────────────────────────────────────
   main.js  — entry point, scene init, loop
   ────────────────────────────────────────── */

import { loadAll }         from './loader.js';
import { initPlayer, tickPlayer, lockPointer } from './player.js';
import { initLights, tickAlarm }               from './lights.js';
import { initAudio }       from './audio.js';
import { initHud, fadeHint }    from './hud.js';
import { initFactory }     from './factory.js';
import { initMachine, tickMachine } from './machine.js';
import { initConveyor, tickConveyor } from './conveyor.js';
import { initIrq }         from './irq.js';
import { initVault, tickVault }       from './vault.js';
import { initIsrHandler, tickIsrHandler } from './isr-handler.js';

import { initVip }         from './vip.js';
import { initArm, tickArm }           from './arm.js';
import { initStage, tickStage, onIrqKey } from './stage.js';

/* ── Renderer ── */
const canvas   = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.4;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

/* ── Scene & Camera ── */
const scene  = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);   // sky blue
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);

/* ── Resize ── */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ── Boot sequence ── */
(async function boot() {
  const assets = await loadAll();

  // Hide loading screen, show intro
  const loadingScreen = document.getElementById('loading-screen');
  loadingScreen.style.display = 'none';
  const intro = document.getElementById('intro');
  intro.style.display = 'flex';

  // Init all systems
  initPlayer(camera);
  initLights(scene);
  initAudio();
  initHud();
  initFactory(scene);              // no assets needed (procedural)
  initMachine(scene);
  initConveyor(scene);
  initIrq(scene);
  initVault(scene);

  initVip(scene);
  initIsrHandler(scene);
  initArm(scene, assets);
  initStage(scene);

  // Enter button
  document.getElementById('enter-btn').addEventListener('click', () => {
    intro.style.opacity = '0';
    setTimeout(() => { intro.style.display = 'none'; }, 600);
    document.getElementById('hud').style.display = 'block';
    lockPointer();
    fadeHint();
  });

  // Canvas click re-locks pointer
  canvas.addEventListener('click', () => {
    if (document.getElementById('hud').style.display === 'block') {
      lockPointer();
    }
  });

  // X key fires IRQ
  document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyX') onIrqKey();
  });

  // Render loop
  const clock = new THREE.Clock();
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t  = clock.elapsedTime;

    tickPlayer(dt);
    tickConveyor(dt);
    tickStage(dt);
    tickVault(dt);
    tickIsrHandler(dt);

    tickArm(dt);
    tickMachine(dt);
    tickAlarm(t);

    renderer.render(scene, camera);
  }
  loop();
})();
