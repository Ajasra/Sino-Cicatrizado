# *Sino Cicatrizado (The Scarred Bell)*

> **Site-Specific, Distributed, Hysteretic Acoustic Apparatus & System-Environment Hybrid (SEH)**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-SQLite%20WAL-blue.svg)](https://www.sqlite.org/)
[![Web Audio](https://img.shields.io/badge/Audio-Native%20Web%20Audio-orange.svg)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

*Sino Cicatrizado (The Scarred Bell)* converts the physical topography of Ouro Preto, Brazil into an active, self-organizing acoustic feedback loop. The system rejects the digital "undo/reset" myth: every somatic interaction deforms the phase space of future sound synthesis, leaving behind an irreversible parameter trace—a **scar** ($z_{t+1} = g(x_t, z_t)$).

---

## 🌟 Key Features & Cybernetic Foundations

- 🔔 **Irreversible Hysteretic Scars & Somatic Signatures**: Somatic node encounters permanently mutate bell parameter vectors with participant-specific fingerprints (unique weights, pitch directions, filter shifts, and FM biases) time-scaled for 30–60 minute real-world presence and protected by sub-linear crowd damping.
- 🎛️ **Native Additive Bell DSP**: 5 inharmonic sine partials ($1.0, 1.21, 1.47, 1.94, 2.52$) simulating bronze and soapstone acoustic structures without external audio framework bloat.
- 🔋 **Thermodynamic Battery Degradation**: Real-time hardware battery monitoring (`navigator.getBattery()`) mapped to a ScriptProcessor BitCrusher node (16-bit high-fidelity down to 4-bit digital dirt).
- 🌐 **Decentered Spatial Propagation**: Spatial wave delay calculated at the speed of sound ($v_{\text{sound}} = 343\text{ m/s}$) via client-side Haversine distance math.
- 📶 **Rate-Limited WebSocket Protocol**: Real-time somatic position broadcasts throttled to $4\text{ Hz}$ ($250\text{ ms}$) and a $5.0\text{m}$ movement delta threshold.
- 🛡️ **Immunological Parsing Layer**: Strict schema validation clamping missing or corrupted LLM synthesis presets to safe boundaries or defaulting to the Basal Soapstone Drone ($220\text{ Hz}$).
- 🏛️ **Dual-Twin Ontology**: Toggle seamlessly between the mutating **Living City** (SQLite WAL autopoiesis) and the read-only **Scarred Twin** (frozen historical monument snapshot).
- 🎛️ **Analog Sound Apparatus Aesthetic & Theme Switch**: Minimal, flat hardware panel UI inspired by Eurorack modules and test equipment. Features a zero-shadow monospace layout, custom 6px hardware scrollbars, desaturated monochrome Leaflet map rendering, and a settings switch between Dark Mode (industrial chassis) and Light Mode (brushed aluminum for outdoor sunlight readability) persisted in `localStorage`.
- 🗺️ **Interactive Radar Map**: Leaflet topography map overlaid with an HTML5 Canvas spatial wave radar displaying expanding echolocation pulses.

---

## 📁 Repository Architecture & Documentation

```text
c:\Users\user\Desktop\ASC\The Scarred Bell\
├── README.md                 # Project Overview & Quick Start
├── package.json              # Dependencies (express, ws, better-sqlite3, dotenv)
├── docs/                     # Philosophical & Technical Governance
│   ├── CONCEPT.md            # Second-Order Cybernetics & Decolonial Acoustic Framework
│   ├── PRD.md                # Product Requirement Document
│   ├── TS.md                 # Technical Specification Document
│   ├── SPEC.md               # Master Consolidated System Specification
│   ├── IMPLEMENTATION.md     # Architectural Blueprint & Component Roadmap
│   ├── DEV_PRACTICES.md      # Development Standards & Directory Layout Rules
│   ├── Audio Research.md     # Spectralism & Acoustic Resistance Foundations
│   ├── SETUP.md              # Comprehensive Setup, Installation & Developer Guide
│   └── systems/              # Detailed Cybernetic Subsystem Specifications
│       ├── SCARRING_SYSTEM.md        # Cybernetic Scarring System Specification
│       ├── SOMATIC_NODES_SYSTEM.md   # Somatic Nodes (Type 3 Mobile Clients) Specification
│       ├── REFLECTOR_NODES_SYSTEM.md # Reflector Nodes (Type 2 User Reflectors) Specification
│       ├── SOUND_ENGINE_SYSTEM.md    # Real-Time Procedural Sound Engine Specification
│       └── CITY_GENERATION_SYSTEM.md # Multi-City Generation & Landmark Synthesis Specification
├── data/                     # Persistent Data Storage
│   ├── scarred_bell.db       # Local SQLite Database (WAL Mode)
│   └── scarred_twin.json     # Immutable ASC 2026 Snapshot
├── server/                   # Node.js Server & Hysteresis Engine
│   ├── config.js             # Centralized Server Parameters
│   ├── server.js             # Express Host + WS Handler + 4Hz Broadcast Loop
│   ├── db/
│   │   └── database.js       # SQLite Connection & Seed Queries
│   ├── services/
│   │   ├── spatial.js        # Haversine Distance Engine
│   │   └── hysteresis.js     # State Mutation Engine
│   ├── utils/
│   │   └── immunological-parser.js # Safety Validator
│   ├── llm-membrane.js       # Reflector Preset Generator
│   └── prompts/
│       └── reflector_preset_system.txt # LLM System Prompt
├── public/                   # Frontend Web Application
│   ├── index.html            # App Shell & Audio Unlock Overlay Membrane
│   ├── css/
│   │   ├── variables.css     # Centralized Theme Tokens & Design System
│   │   └── main.css          # Visualizer & UI Styling
│   └── js/
│       ├── config.js         # Client Constants & Configuration
│       ├── main.js           # App Lifecycle Coordinator
│       ├── audio/            # Native Web Audio Engine & AudioContext Manager
│       ├── sensors/          # Cross-Platform Adapters (Battery, GPS, WakeLock)
│       ├── net/              # Throttled WebSocket Client
│       ├── spatial.js        # Client Distance & Wave Metrics
│       ├── membrane.js       # Client Immunological Validator
│       └── ui/               # Leaflet Map & Canvas Radar Visualizer
└── test/
    └── verification.js       # Automated Verification Matrix Test Suite
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v20.0.0 LTS or higher
- **npm**: v10.0.0 or higher

### 2. Installation & Server Start
```bash
# Clone or navigate to project directory
cd "The Scarred Bell"

# Install dependencies
npm install

# Start the application server
npm start
```

Open your browser to `http://localhost:3000`.

### 3. Run Automated Verification Tests
```bash
npm test
```

For detailed setup instructions, mobile device deployment, HTTPS configuration, and environment overrides, refer to [`docs/SETUP.md`](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/docs/SETUP.md).

---

## 📜 License

Distributed under the [MIT License](LICENSE).
