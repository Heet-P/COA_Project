# CPU Interrupt Handling — 3D Visualization

An interactive 3D factory-floor simulation that visualizes how a CPU handles **interrupt requests (IRQs)**, built with **Three.js** and vanilla JavaScript.

Walk around a miniature factory where conveyor belts carry instruction blocks through **Fetch → Decode → Execute → Write-Back** stages, a robotic arm processes them, and pressing **X** fires an interrupt that triggers the full ISR (Interrupt Service Routine) pipeline — complete with stack push/pop, register save/restore, and IVT lookup.

---

## Features

- **First-person walkable 3D scene** (WASD + mouse look)
- **4-way conveyor belt system** — instruction blocks flow through pipeline stages
- **Robotic arm** — picks and processes blocks at the ALU/Control Unit
- **Interrupt simulation** — press `X` to fire an IRQ signal
  - Stack push (PC + registers saved)
  - IVT lookup for ISR address
  - ISR Handler execution with glowing block animation
  - Automatic return: registers restored, pipeline resumes
- **CPU Register board** — live display of PC, SP, ACC, R0–R3 with flash-on-change
- **HUD overlay** — shows pipeline state, register values, and current phase
- **Alarm VFX + audio** — red screen flash and klaxon sound on interrupt
- **Ambient factory audio** — background hum for immersion
- **ISR Handler module** — dedicated glowing box that activates during interrupt servicing

---

## Project Structure

```
coa/
├── index.html          # Entry point
├── css/
│   └── hud.css         # HUD + loading screen styles
├── js/
│   ├── main.js         # App bootstrap, render loop, input
│   ├── factory.js      # Scene setup (floor, walls, sky, clouds, fog)
│   ├── conveyor.js     # 4-way belt system + instruction blocks
│   ├── arm.js          # Robotic arm (GLTF) + pick/place logic
│   ├── machine.js      # CPU register board (canvas textures)
│   ├── vault.js        # Stack visualization (push/pop animation)
│   ├── irq.js          # Interrupt request trigger + alarm VFX
│   ├── ivt.js          # Interrupt Vector Table lookup
│   ├── isr-handler.js  # ISR Handler box + execution animation
│   ├── vip.js          # Dashed ISR path line (conveyor → ISR)
│   ├── stage.js        # Pipeline state machine (fetch/decode/execute/wb/isr)
│   ├── player.js       # First-person camera + pointer lock
│   ├── lights.js       # Directional + ambient + point lights
│   ├── hud.js          # On-screen HUD panel updates
│   ├── audio.js        # Factory ambience + alarm sound
│   ├── labels.js       # 3D floating label + arrow label utilities
│   └── loader.js       # GLTF asset loader with progress
├── assets/
│   ├── factory.glb     # Factory building model
│   └── robot_arm.glb   # Robotic arm model
└── README.md
```

---

## Quick Start

### Prerequisites
- A modern browser (Chrome / Edge / Firefox)
- [Node.js](https://nodejs.org/) installed (for `npx`)

### Run Locally

```bash
npx http-server c:\Users\Heet\Desktop\Coding\coa -p 8080 --cors -c-1
```

Then open **http://localhost:8080** in your browser.

> The `-c-1` flag disables caching so code changes reflect immediately on refresh.

### Controls

| Key / Action | Function |
|---|---|
| **Click canvas** | Lock mouse for first-person look |
| **W A S D** | Move forward / left / back / right |
| **Mouse** | Look around |
| **X** | Fire an interrupt (IRQ) signal |
| **ESC** | Release mouse cursor |

---

## How It Works

1. **Baseline** — instruction blocks spawn on the input conveyor and travel through Fetch → Decode → Execute → Write-Back.
2. **Press X** — an IRQ fires: alarm sounds, screen flashes red, the pipeline pauses.
3. **Stack Push** — current PC and registers animate into the Stack vault.
4. **IVT Lookup** — the Interrupt Vector Table resolves the ISR address.
5. **ISR Execution** — the ISR Handler box glows and a yellow block pulses inside it.
6. **Return** — registers pop from the stack, PC restores, pipeline resumes.

---

## Tech Stack

- **Three.js** (ES module via CDN) — 3D rendering
- **Vanilla JS** (ES modules) — no build step, no framework
- **GLTF models** — factory building + robotic arm
- **Web Audio API** — factory ambience + alarm klaxon
- **CSS** — HUD overlay with `Share Tech Mono` font

---

## Status

🚧 **Work in progress** — core simulation loop and ISR flow are functional. More features and polish coming soon.
