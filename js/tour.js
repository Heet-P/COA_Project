import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { fireIrq } from './irq.js';
import { playAlarmLoop } from './audio.js';
import { setAlarm } from './lights.js';
import { highlightVector } from './ivt.js';
import { fireVip } from './vip.js';

let tourActive = false;
let currentStep = 0;
let stepTimer = 0;
let cameraArrived = false;
let camPos = new THREE.Vector3();
let camLook = new THREE.Vector3();
let tourCam = null;

const STEPS = [
  {
    pos: new THREE.Vector3(0, 14, 22),
    look: new THREE.Vector3(0, 2, -3),
    lerpSpeed: 1.2,
    hold: 4000,
    main: "Welcome to the CPU Interrupt Factory.",
    sub: "This environment represents what happens inside a processor during normal execution. Every object maps to a real CPU concept — the conveyor belt, the robotic arm, the machine housing, the vault, the IVT board. Walk through all of it in 11 steps.",
    action: "Full factory overview",
    trigger: null
  },
  {
    pos: new THREE.Vector3(-8, 3.5, 4),
    look: new THREE.Vector3(-2, 1.8, -3),
    lerpSpeed: 2.8,
    hold: 5000,
    main: "These are Instruction Blocks from the data bus.",
    sub: "Each blue cube = one machine instruction fetched from RAM. The CPU picks them up one by one in strict sequence. This is the Fetch → Decode → Execute cycle repeating continuously. The CPU never skips, never reorders, never executes two at the same time.",
    action: "Watch blocks flow left to right",
    trigger: () => { /* ensure blueActive = true logic if needed */ }
  },
  {
    pos: new THREE.Vector3(2, 5.5, 2),
    look: new THREE.Vector3(0, 4.3, -0.5),
    lerpSpeed: 2.8,
    hold: 4500,
    main: "This board is the Program Counter — PC.",
    sub: "It stores the memory address of the NEXT instruction to execute. Every time a blue block completes its run, the PC increments by 1. It never lies — the CPU always knows exactly which instruction comes next. 0x0041 → 0x0042 → 0x0043...",
    action: "Watch the hex value tick upward",
    trigger: null
  },
  {
    pos: new THREE.Vector3(-5, 4.5, 2.5),
    look: new THREE.Vector3(-3, 2.5, -2.5),
    lerpSpeed: 2.8,
    hold: 5000,
    main: "This robotic arm is the Control Unit.",
    sub: "It fetches each instruction block, scans it with the laser line (decode stage), then feeds it into the machine for execution. Every instruction passes through here without exception. The laser = the decode bus. No block gets processed without the arm reading it first.",
    action: "Watch the arm scan each block with its laser",
    trigger: null
  },
  {
    pos: new THREE.Vector3(4, 4, 2),
    look: new THREE.Vector3(0, 2.8, -3),
    lerpSpeed: 2.8,
    hold: 5000,
    main: "This is the CPU machine — the execution core.",
    sub: "Instructions enter through the conveyor, pass through the arm, and are executed inside this housing. The glowing window shows the internal execution state. The blue light pulses with every completed instruction — each pulse = one full Fetch-Decode-Execute cycle done. This machine is the entire reason the factory exists.",
    action: "Watch the machine pulse with each instruction",
    trigger: null
  },
  {
    pos: new THREE.Vector3(18, 4.5, 4),
    look: new THREE.Vector3(12, 2, -2),
    lerpSpeed: 2.0,
    hold: 4500,
    main: "This pathway is the IRQ line — Interrupt Request line.",
    sub: "Hardware devices — keyboard, network card, disk drive — connect here. When a device needs the CPU's attention it sends a signal down this path to the PIC (Programmable Interrupt Controller) which forwards it to the CPU's INT pin. In a moment you will send one.",
    action: "This is where the interrupt cube will enter",
    trigger: null
  },
  {
    pos: new THREE.Vector3(10, 4, 6),
    look: new THREE.Vector3(4, 1.8, -2),
    lerpSpeed: 2.8,
    hold: 7000,
    main: "INTERRUPT FIRED — watch what happens.",
    sub: "The red cube is the IRQ signal. Notice: the CPU does NOT stop immediately. It finishes the current instruction first — this is ATOMICITY. Instructions are indivisible. The red cube waits at the buffer (x=6.2) until the current blue block completes its full run. Only then does the CPU acknowledge the interrupt.",
    action: "Red cube waits — blue block must finish first",
    trigger: () => {
      // Fire IRQ 900ms after camera arrives, handled in tickTour
    }
  },
  {
    pos: new THREE.Vector3(8, 6, -6),
    look: new THREE.Vector3(12, 3.5, -13.5),
    lerpSpeed: 2.0,
    hold: 5500,
    main: "The vault opens — this is the Stack.",
    sub: "The CPU pushes its full state onto the Stack: PUSH FLAGS, PUSH CS, PUSH IP (the current PC address). The golden briefcase = this entire snapshot locked in the vault. Stack Pointer (SP) decrements with each push — watch it on the register display top-right. Without this save the CPU would have no way to return to your program after the interrupt is handled.",
    action: "Watch SP decrement on the register display",
    trigger: null
  },
  {
    pos: new THREE.Vector3(-4, 7.5, -12),
    look: new THREE.Vector3(-9, 5.8, -19.65),
    lerpSpeed: 1.8,
    hold: 6000,
    main: "This board is the Interrupt Vector Table — IVT.",
    sub: "An array of function pointers mapping IRQ numbers to handler addresses. In C++: void (*IVT[])() = { keyboardISR, networkISR, timerISR, diskISR }. The CPU reads IVT[IRQ_number] to find where to jump. Our IRQ was 0 (keyboard). IVT[0] = 0xFF20. The CPU's PC is now being set to 0xFF20.",
    action: "Row 0 lights up — IRQ[0] maps to 0xFF20",
    trigger: () => { highlightVector(0); }
  },
  {
    pos: new THREE.Vector3(-2, 9.5, 7),
    look: new THREE.Vector3(0, 7.2, -3),
    lerpSpeed: 1.8,
    hold: 6500,
    main: "The ISR executes on the elevated VIP Lane.",
    sub: "Yellow diamond blocks = compiled ISR instructions at 0xFF20. They run at 2.6× speed because ISRs MUST be fast — get in, handle the device, get out. The lane is physically elevated: ISR runs at Ring 0 (kernel privilege) above your user-space program. Your blue blocks are frozen below. One CPU. One active code path at a time. The ISR owns it completely right now.",
    action: "ISR owns the CPU — blue blocks frozen below",
    trigger: () => { fireVip(); }
  },
  {
    pos: new THREE.Vector3(0, 7, 9),
    look: new THREE.Vector3(0, 2, -3),
    lerpSpeed: 1.6,
    hold: 7000,
    main: "IRET fires. Your program gets the CPU back.",
    sub: "The briefcase is retrieved from the vault. PC pops back to EXACTLY the address that was saved — the instruction that was waiting. Stack Pointer increments back to its original value. IF flag restores to 1 so interrupts are re-enabled. Blue blocks resume from that exact address. Your program experienced zero visible side effects. The interrupt was completely transparent to it. This is the full CPU interrupt lifecycle.",
    action: "PC restored — execution resumes exactly where it left off",
    trigger: null
  }
];

let irqFired = false;

export function initTour(camera, scene) {
  tourCam = camera;

  // Key listeners for tour navigation
  document.addEventListener('keydown', (e) => {
    if (!tourActive) return;
    if (e.code === 'Space') advanceTourStep();
    if (e.code === 'Backspace') retreatTourStep();
    if (e.code === 'Escape') skipTour();
  });
}

export function startTour() {
  tourActive = true;
  currentStep = 0;
  stepTimer = 0;
  cameraArrived = false;
  irqFired = false;

  camPos.copy(tourCam.position);
  camLook.copy(tourCam.position).add(new THREE.Vector3(0, 0, -1)); // initial look

  document.getElementById('tour-start-card').style.display = 'none';
  document.getElementById('tour-end-card').style.display = 'none';
  document.getElementById('tour-step-card').style.display = 'flex';

  loadTourStep();
}

export function skipTour() {
  tourActive = false;
  document.getElementById('tour-start-card').style.display = 'none';
  document.getElementById('tour-end-card').style.display = 'none';
  document.getElementById('tour-step-card').style.display = 'none';

  // Call lockPointer from player.js via window object or similar trick since we cannot import lockPointer here
  // Actually, we can just trigger it
  const c = document.getElementById('c');
  if (c && !document.pointerLockElement) {
    c.requestPointerLock();
  }
}

function finishTour() {
  tourActive = false;
  document.getElementById('tour-step-card').style.display = 'none';
  document.getElementById('tour-end-card').style.display = 'flex';
}

function loadTourStep() {
  const step = STEPS[currentStep];
  stepTimer = 0;
  cameraArrived = false;

  // Update DOM
  document.getElementById('tour-step-count').textContent = `${currentStep + 1} / 11`;
  document.getElementById('tour-step-main').textContent = step.main;
  document.getElementById('tour-step-sub').textContent = step.sub;
  document.getElementById('tour-step-action').textContent = step.action;

  // Reset IRQ trigger flag for step 7
  if (currentStep === 6) irqFired = false;

  if (step.trigger) step.trigger();
}

function advanceTourStep() {
  if (currentStep < STEPS.length - 1) {
    currentStep++;
    loadTourStep();
  } else {
    finishTour();
  }
}

function retreatTourStep() {
  if (currentStep > 0) {
    currentStep--;
    loadTourStep();
  }
}

export function isTourActive() {
  return tourActive;
}

export function tickTour(dt, t) {
  if (!tourActive || !tourCam) return;

  const step = STEPS[currentStep];
  const speed = step.lerpSpeed || 2.8;

  camPos.lerp(step.pos, dt * speed);
  camLook.lerp(step.look, dt * speed);

  tourCam.position.copy(camPos);
  tourCam.lookAt(camLook);

  if (!cameraArrived && camPos.distanceTo(step.pos) < 0.18) {
    cameraArrived = true;
  }

  // Always update progress based on the current step out of total steps
  const pBar = document.getElementById('tour-step-progress');
  if (pBar) {
    const progress = (currentStep / (STEPS.length - 1)) * 100;
    pBar.style.width = `${progress}%`;
  }

  if (cameraArrived) {
    stepTimer += dt * 1000;

    // Step 7 trigger: Fire IRQ after 900ms hold
    if (currentStep === 6 && !irqFired && stepTimer >= 900) {
      fireIrq();
      playAlarmLoop();
      setAlarm(true);
      irqFired = true;
    }
  }
}
