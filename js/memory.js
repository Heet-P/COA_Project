// memory.js — Program Counter + Memory Block
// Sits just before the instruction fetch conveyor belt
// Displays a stack of flat memory cell slabs with an incrementing PC label

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

let memoryGroup = null;
let pcLabel = null;
let pcValue = 0;
let labelCanvas = null;
let labelCtx = null;
let labelTexture = null;

const SLAB_COUNT = 6;
const SLAB_WIDTH = 2.4;
const SLAB_HEIGHT = 0.18;
const SLAB_DEPTH = 1.2;
const SLAB_GAP = 0.08;
const HIGHLIGHT_COLOR = 0x00ffcc;
const BASE_COLOR = 0x1a1a2e;
const ACTIVE_COLOR = 0x0f3460;

export function initMemory(scene, position = new THREE.Vector3(-6, 0, -3)) {
    memoryGroup = new THREE.Group();
    memoryGroup.position.copy(position);

    const slabMaterials = [];

    for (let i = 0; i < SLAB_COUNT; i++) {
        const geo = new THREE.BoxGeometry(SLAB_WIDTH, SLAB_HEIGHT, SLAB_DEPTH);
        const mat = new THREE.MeshStandardMaterial({
            color: i === 0 ? ACTIVE_COLOR : BASE_COLOR,
            emissive: i === 0 ? HIGHLIGHT_COLOR : 0x000000,
            emissiveIntensity: i === 0 ? 0.4 : 0,
            roughness: 0.4,
            metalness: 0.7,
        });
        slabMaterials.push(mat);

        const slab = new THREE.Mesh(geo, mat);
        slab.position.y = i * (SLAB_HEIGHT + SLAB_GAP);
        slab.castShadow = true;
        slab.receiveShadow = true;
        memoryGroup.add(slab);

        // thin separator line between slabs
        if (i < SLAB_COUNT - 1) {
            const lineGeo = new THREE.BoxGeometry(SLAB_WIDTH + 0.02, 0.02, SLAB_DEPTH + 0.02);
            const lineMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
            const line = new THREE.Mesh(lineGeo, lineMat);
            line.position.y = i * (SLAB_HEIGHT + SLAB_GAP) + SLAB_HEIGHT / 2 + 0.01;
            memoryGroup.add(line);
        }
    }

    memoryGroup.userData.slabMaterials = slabMaterials;

    // PC label sprite above the stack
    labelCanvas = document.createElement('canvas');
    labelCanvas.width = 256;
    labelCanvas.height = 96;
    labelCtx = labelCanvas.getContext('2d');

    labelTexture = new THREE.CanvasTexture(labelCanvas);
    const spriteMat = new THREE.SpriteMaterial({
        map: labelTexture,
        transparent: true,
        depthTest: false,
    });
    pcLabel = new THREE.Sprite(spriteMat);
    pcLabel.scale.set(2.5, 0.9, 1);
    pcLabel.position.y = SLAB_COUNT * (SLAB_HEIGHT + SLAB_GAP) + 0.7;
    memoryGroup.add(pcLabel);

    _renderLabel();

    // "MEMORY" text plate at base
    const plateGeo = new THREE.BoxGeometry(SLAB_WIDTH, 0.05, 0.3);
    const plateMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.y = -0.06;
    plate.position.z = SLAB_DEPTH / 2 + 0.15;
    memoryGroup.add(plate);

    scene.add(memoryGroup);
}

function _renderLabel() {
    const hex = '0x' + pcValue.toString(16).toUpperCase().padStart(4, '0');

    labelCtx.clearRect(0, 0, 256, 96);

    // background pill
    labelCtx.fillStyle = '#0d0d1a';
    labelCtx.strokeStyle = '#00ffcc';
    labelCtx.lineWidth = 3;
    roundRect(labelCtx, 4, 4, 248, 88, 12);
    labelCtx.fill();
    labelCtx.stroke();

    // PC label
    labelCtx.fillStyle = '#00ffcc';
    labelCtx.font = 'bold 18px Share Tech Mono, monospace';
    labelCtx.textAlign = 'center';
    labelCtx.fillText('PC', 128, 30);

    // value
    labelCtx.fillStyle = '#ffffff';
    labelCtx.font = 'bold 26px Share Tech Mono, monospace';
    labelCtx.fillText(hex, 128, 70);

    labelTexture.needsUpdate = true;
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// Call this every time an instruction is fetched from the conveyor
export function onInstructionFetch() {
    if (!memoryGroup) return;

    const mats = memoryGroup.userData.slabMaterials;

    // reset all slabs
    mats.forEach((m, i) => {
        m.color.setHex(BASE_COLOR);
        m.emissive.setHex(0x000000);
        m.emissiveIntensity = 0;
    });

    // highlight bottom slab (current fetch row)
    const fetchIndex = pcValue % SLAB_COUNT;
    mats[fetchIndex].color.setHex(ACTIVE_COLOR);
    mats[fetchIndex].emissive.setHex(HIGHLIGHT_COLOR);
    mats[fetchIndex].emissiveIntensity = 0.6;

    // increment PC by 4 bytes
    pcValue += 4;
    _renderLabel();

    // fade emissive back down over ~800ms
    let intensity = 0.6;
    const fade = setInterval(() => {
        intensity -= 0.05;
        if (intensity <= 0) {
            mats[fetchIndex].emissiveIntensity = 0;
            mats[fetchIndex].color.setHex(BASE_COLOR);
            clearInterval(fade);
        } else {
            mats[fetchIndex].emissiveIntensity = intensity;
        }
    }, 60);
}

export function resetPC() {
    pcValue = 0;
    if (memoryGroup) {
        memoryGroup.userData.slabMaterials.forEach(m => {
            m.color.setHex(BASE_COLOR);
            m.emissive.setHex(0x000000);
            m.emissiveIntensity = 0;
        });
    }
    _renderLabel();
}

export function getMemoryGroup() {
    return memoryGroup;
}
