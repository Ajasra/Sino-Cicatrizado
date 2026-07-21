# Implementation Guide & Architecture Blueprint
## Project: *Sino Cicatrizado (The Scarred Bell)*

**Document Version:** 1.0  
**Target Execution Environment:** Node.js v20+ LTS / Local SQLite (WAL Mode) / Native Web Standards  
**Engineering Standards Reference:** [`DEV_PRACTICES.md`](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/docs/DEV_PRACTICES.md)  
**System Specification Reference:** [`SPEC.md`](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/docs/SPEC.md)  

---

## 1. Directory Structure & Module Blueprint

All files and directories must adhere to this unified layout:

```text
c:\Users\user\Desktop\ASC\The Scarred Bell\
├── docs/                     # Core Specs & Governance
│   ├── CONCEPT.md
│   ├── PRD.md
│   ├── TS.md
│   ├── DEV_PRACTICES.md
│   ├── SPEC.md
│   └── IMPLEMENTATION.md
├── data/                     # Data Stores
│   ├── scarred_bell.db       # SQLite Database File (WAL mode)
│   └── scarred_twin.json     # Read-only static snapshot
├── server/                   # Backend Application
│   ├── config.js             # Environment & System Constants
│   ├── server.js             # Express & WebSocket Server Loop
│   ├── db/
│   │   └── database.js       # SQLite Database Initialization & Queries
│   ├── prompts/
│   │   └── reflector_preset_system.txt # LLM System Prompt
│   ├── services/
│   │   ├── spatial.js        # Server-side spatial & Haversine metrics
│   │   └── hysteresis.js     # State Mutation Engine
│   └── utils/
│       └── immunological-parser.js # Safety JSON Validator
├── public/                   # Frontend Web Application
│   ├── index.html            # App Shell & Audio Unlock Membrane
│   ├── css/
│   │   ├── variables.css     # Centralized CSS Theme Variables
│   │   └── main.css          # App Layout & Visualizer Styling
│   └── js/
│       ├── config.js         # Centralized Client Constants
│       ├── main.js           # Main UI & Lifecycle Orchestrator
│       ├── audio/
│       │   ├── abstract-engine.js      # Base Audio Interface
│       │   ├── web-audio-engine.js     # Native Web Audio DSP Graph
│       │   └── audio-context-manager.js# AudioContext User Gesture Manager
│       ├── sensors/
│       │   ├── battery.js    # Battery Sensor Adapter
│       │   ├── geolocation.js# Geolocation Adapter + Desktop Simulator
│       │   └── wakelock.js   # Screen WakeLock Adapter
│       ├── net/
│       │   └── websocket-client.js # Throttled WebSocket Client
│       └── ui/
│           ├── map-view.js   # Leaflet Map Visualizer
│           └── visualizer.js # HTML5 Canvas Echolocation Wave Radar
└── package.json              # Project Manifest & Start Scripts
```

---

## 2. Component Implementation Roadmap

### 2.1 Backend Implementation Details

#### 1. Configuration (`server/config.js`)
Centralizes all server configuration, ports, file paths, math coefficients, and environment overrides.

#### 2. SQLite Database Layer (`server/db/database.js`)
- Uses `better-sqlite3`.
- Executes `PRAGMA journal_mode = WAL;` and `PRAGMA synchronous = NORMAL;`.
- Manages tables:
  ```sql
  CREATE TABLE IF NOT EXISTS nodes (
    node_id TEXT PRIMARY KEY,
    node_type TEXT CHECK(node_type IN ('TOWER', 'REFLECTOR')) NOT NULL,
    city TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    alt REAL DEFAULT 0.0,
    base_frequency REAL NOT NULL,
    harmonicity REAL DEFAULT 1.414,
    decay REAL DEFAULT 1.5,
    gain REAL DEFAULT 1.0,
    euclidean_density INTEGER DEFAULT 3,
    euclidean_steps INTEGER DEFAULT 8,
    scar_index REAL DEFAULT 0.0,
    interaction_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  ```
- Pre-seeds historical towers of Ouro Preto (São Francisco de Assis, Nossa Senhora do Carmo, Santa Efigênia, Matriz do Pilar).

#### 3. State Hysteresis Engine (`server/services/hysteresis.js`)
Computes proximity parameter drift when a Somatic Node passes within $15\text{m}$ of a tower or reflector:
$$P_{t+1} = P_t + \alpha \cdot e^{-\lambda \cdot d} \cdot (P_{\text{limit}} - P_t)$$

#### 4. Immunological Membrane (`server/utils/immunological-parser.js`)
Sanitizes raw JSON or LLM outputs, enforcing safe ranges:
- `baseFrequency`: $[80.0, 880.0]\text{ Hz}$
- `harmonicity`: $[0.5, 4.0]$
- `decay`: $[0.1, 6.0]\text{ s}$
- `gain`: $[0.0, 1.0]$
- `euclideanDensity`: $[1, 16]$

#### 5. Server Application Loop (`server/server.js`)
- Express static file provider for `public/`.
- Native `ws` WebSocket broadcast loop ($4\text{ Hz}$).
- Endpoints for Reflector creation and Dual-Twin dataset switching (`/api/twin/toggle`).

---

### 2.2 Frontend Implementation Details

#### 1. Theme & Design Tokens (`public/css/variables.css`)
Provides single-point styling configuration for background colors, accent tones, cybernetic glow, typography, and animation speeds.

#### 2. Audio Engine Subsystem (`public/js/audio/`)
- `audio-context-manager.js`: Handles gesture-unlocked `AudioContext` resumption.
- `web-audio-engine.js`: Implements 5-partial inharmonic additive synth, lowpass filter, exponential envelope ramping, and ScriptProcessor BitCrusher node driven by `BatterySensor`.

#### 3. Hardware Sensor Adapters (`public/js/sensors/`)
- `battery.js`: Reads `navigator.getBattery()`, fallback to $1.0$.
- `geolocation.js`: Reads `navigator.geolocation.watchPosition()`, includes toggleable Desktop/Windows coordinate simulator.
- `wakelock.js`: Requests `navigator.wakeLock.request('screen')`.

#### 4. Wave Radar & Map Visualizer (`public/js/ui/`)
- `map-view.js`: Leaflet map view centering Ouro Preto topography with custom icons for active towers, static reflectors, and moving somatic nodes.
- `visualizer.js`: HTML5 Canvas overlay animating spatial echolocation pulses expanding outward at scaled speed of sound ($343\text{ m/s}$).

---

## 3. Verification & Verification Matrix Test Suite

Implementation will be verified using `test/verification.js` covering:

1. **SQLite Concurrency Test**: 100 parallel write transactions in WAL mode without locking errors.
2. **Inverse-Square Attenuation Verification**: Master gain attenuation check ($3.01\text{ dB}$ at $100\text{m}$, $14\text{ dB}$ at $500\text{m}$).
3. **Haversine Distance Metric Verification**: São Francisco to Santa Efigênia coordinate test ($\approx 490\text{m} \pm 5\%$).
4. **Immunological Guardrail Test**: Malformed/NaN JSON payload fallback to Soapstone drone ($220\text{ Hz}$).
5. **Hysteresis Non-Return Test**: 10,000 simulated proximity updates verifying state parameters drift irreversibly without exceeding $P_{\text{limit}}$.

---

## 4. Execution Roadmap

1. **Step 1**: Initialize `package.json` with dependencies (`express`, `ws`, `better-sqlite3`, `dotenv`).
2. **Step 2**: Create `server/config.js` and `server/db/database.js` with Ouro Preto initial seed data.
3. **Step 3**: Implement `server/services/hysteresis.js`, `server/utils/immunological-parser.js`, and `server/server.js`.
4. **Step 4**: Build `public/css/variables.css`, `public/index.html`, and `public/css/main.css`.
5. **Step 5**: Build client JS modules (`config.js`, `audio/`, `sensors/`, `net/`, `ui/`, `main.js`).
6. **Step 6**: Run automated verification test suite `test/verification.js`.
