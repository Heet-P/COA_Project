/* ──────────────────────────────────────────
   machine.js  — CPU register board (repositioned)
   ────────────────────────────────────────── */

import { makeLabel } from './labels.js';

const REG_NAMES = ['PC', 'SP', 'ACC', 'R0', 'R1', 'FLAGS'];
const REG_Y_START = 2.60;
const REG_SPACING = 0.60;
const BOARD_POS = { x: 7, y: 0, z: 6 };   // southeast of platform

let bgMesh, regs = [], flashQ = [];
let regTexts = []; // keep track of the canvas contexts/textures to update them dynamically
const initVals = [0x0041, 0x1FF0, 0x0000, 0x0000, 0x0000, 0x0000];

let machineGroup;
let cameraRef;

function toHex(val) {
  return '0x' + val.toString(16).toUpperCase().padStart(4, '0');
}

export function initMachine(scene, camera) {
  cameraRef = camera;
  machineGroup = new THREE.Group();
  machineGroup.position.set(BOARD_POS.x, 2.4, BOARD_POS.z);
  scene.add(machineGroup);

  /* Background board */
  const bg = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 4.2, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.6 })
  );
  bg.position.set(0, 0, 0);
  bg.castShadow = true;
  machineGroup.add(bg);
  bgMesh = bg;

  /* Floating label: REGISTERS */
  const lbl = makeLabel('REGISTERS', {
    color: '#44ffaa', bgColor: '#001a10', bgAlpha: 0.6, fontSize: 28, scale: 1.2
  });
  lbl.position.set(0, 1.8, 0);
  machineGroup.add(lbl);

  /* Registers */
  REG_NAMES.forEach((name, i) => {
    // label
    const cLabel = document.createElement('canvas');
    cLabel.width = 128; cLabel.height = 48;
    const ctxLabel = cLabel.getContext('2d');
    ctxLabel.fillStyle = '#44ffaa';
    ctxLabel.font = 'bold 24px monospace';
    ctxLabel.fillText(name, 8, 34);
    const spLabel = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cLabel) }));
    spLabel.scale.set(0.8, 0.28, 1);
    spLabel.position.set(-0.7, (REG_Y_START - 2.4) - i * REG_SPACING, 0.15);
    machineGroup.add(spLabel);

    // Dynamic value sprite (replaces the plain green bar)
    const cVal = document.createElement('canvas');
    cVal.width = 256; cVal.height = 48;
    const ctxVal = cVal.getContext('2d');
    ctxVal.fillStyle = '#00ff88';
    ctxVal.font = 'bold 28px monospace';
    ctxVal.fillText(toHex(initVals[i]), 8, 34);

    const texVal = new THREE.CanvasTexture(cVal);
    const spVal = new THREE.Sprite(new THREE.SpriteMaterial({ map: texVal }));
    spVal.scale.set(1.4, 0.28, 1);
    spVal.position.set(0.4, (REG_Y_START - 2.4) - i * REG_SPACING, 0.15);
    machineGroup.add(spVal);

    regs.push(spVal);
    regTexts.push({ ctx: ctxVal, tex: texVal });
  });
}

let lastVals = Array(6).fill(0);
let lastTexts = Array(6).fill("");

function redrawRegText(idx, text, color) {
  const rt = regTexts[idx];
  rt.ctx.clearRect(0, 0, 256, 48);
  rt.ctx.fillStyle = color;
  rt.ctx.fillText(text, 8, 34);
  rt.tex.needsUpdate = true;
}

/* Update specific register value text */
export function updateRegisterValue(idx, val) {
  if (idx < 0 || idx >= regTexts.length) return;
  lastVals[idx] = val;
  lastTexts[idx] = toHex(val);
  redrawRegText(idx, lastTexts[idx], '#ffffff');

  // Also flash the sprite by altering color
  const sp = regs[idx];
  sp.material.color.setHex(0xffffff);
  flashQ.push({ mesh: sp, ttl: 0.25 });
}

/* Update specific register string text (e.g. for flags) */
export function updateRegisterText(idx, text) {
  if (idx < 0 || idx >= regTexts.length) return;
  lastTexts[idx] = text;
  redrawRegText(idx, text, '#ffffff');

  const sp = regs[idx];
  sp.material.color.setHex(0xffffff);
  flashQ.push({ mesh: sp, ttl: 0.25 });
}

/* Flash a random register to show activity (e.g. ACC, R0, R1) */
export function flashRegister() {
  const indices = [2, 3, 4]; // ACC, R0, R1
  const idx = indices[Math.floor(Math.random() * indices.length)];
  const sp = regs[idx];
  sp.material.color.setHex(0xaaaaaa);
  flashQ.push({ mesh: sp, ttl: 0.35 });

  // also change the value randomly to look active
  updateRegisterValue(idx, Math.floor(Math.random() * 0xFFFF));
}

/* Called from conveyor to tick PC (index 0) */
export function tickPC() {
  // Let's rely on stage.js or hud.js to call updateRegisterValue for PC
  // If called without value, we just flash it
  const sp = regs[0];
  sp.material.color.setHex(0xffffff);
  flashQ.push({ mesh: sp, ttl: 0.25 });
}

export function tickMachine(dt) {
  if (machineGroup && cameraRef) {
    machineGroup.lookAt(cameraRef.position);
  }

  for (let i = flashQ.length - 1; i >= 0; i--) {
    flashQ[i].ttl -= dt;
    if (flashQ[i].ttl <= 0) {
      // restore normal color
      flashQ[i].mesh.material.color.setHex(0xffffff);
      // Reset text color to green via canvas redraw
      const idx = regs.indexOf(flashQ[i].mesh);
      if (idx !== -1) {
        redrawRegText(idx, lastTexts[idx] || toHex(initVals[idx]), '#00ff88');
      }
      flashQ.splice(i, 1);
    }
  }
}
