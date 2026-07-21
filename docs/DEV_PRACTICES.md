# Frontend & Backend Development Practices
## Project: *Sino Cicatrizado (The Scarred Bell)*

This document defines the core engineering principles, coding standards, directory conventions, and architectural practices for *Sino Cicatrizado*. All code in this repository must follow these rules to remain clean, unified, modular, and easy to maintain or re-theme.

---

## 1. Core Engineering & Ponytail Principles

1. **Modularity & Loose Coupling**:
   - Modules must be self-supporting and single-responsibility.
   - Never write monolithic files. Separate UI rendering, network communication, audio processing, sensor reading, and data storage into dedicated submodules.
2. **Interface Abstraction (Easy Replacement)**:
   - Core capabilities (Audio Engine, Storage Engine, Hardware Sensors) must sit behind clean JS interface contracts.
   - *Example*: The client UI calls `AudioEngine.triggerBell(params)`—it does not care whether the underlying engine is native Web Audio, Tone.js, or a WebAssembly synth.
3. **Zero Hardcoding Policy**:
   - **No inline colors or styles** in JS logic. All design tokens live in `:root` CSS variables in `variables.css`.
   - **No magic numbers** in business or math logic. All physical constants (speed of sound, Haversine Earth radius, default decay times, max gain, battery thresholds) are exported from `config.js` or `.env`.
   - **No embedded prompt strings** in server JS. All LLM system prompts and templates must live in external prompt files (`server/prompts/`).
4. **Ponytail Principles (Simplicity & Zero Bloat)**:
   - **YAGNI (You Aren't Gonna Need It)**: Do not add speculative abstractions, complex state stores, or extra build tooling unless explicitly required.
   - **Native Web Standards**: Prefer native ES Modules, standard Fetch/WebSockets, and native Web Audio APIs over heavy external dependencies.
   - **Intentional Simplification Tags**: Any intentional design simplification (e.g. SQLite WAL instead of distributed DB clusters, direct DOM updates over heavy virtual DOM frameworks) must be annotated with `// ponytail: <rationale>`.

---

## 2. Project Directory & Module Layout

All code in the repository must be organized according to the following layout:

```text
c:\Users\user\Desktop\ASC\The Scarred Bell\
├── docs/
│   ├── CONCEPT.md
│   ├── PRD.md
│   ├── TS.md
│   └── DEV_PRACTICES.md
├── server/
│   ├── config.js
│   ├── server.js
│   ├── db/
│   │   └── database.js
│   ├── prompts/
│   │   └── reflector_preset_system.txt
│   ├── services/
│   │   ├── spatial.js
│   │   └── hysteresis.js
│   └── utils/
│       └── immunological-parser.js
└── public/
    ├── index.html
    ├── css/
    │   ├── variables.css
    │   └── main.css
    └── js/
        ├── config.js
        ├── main.js
        ├── audio/
        │   ├── abstract-engine.js
        │   ├── web-audio-engine.js
        │   └── audio-context-manager.js
        ├── sensors/
        │   ├── battery.js
        │   ├── geolocation.js
        │   └── wakelock.js
        ├── net/
        │   └── websocket-client.js
        └── ui/
            ├── map-view.js
            └── indicator-panel.js
```

---

## 3. Configuration & Parameter Management

### 3.1 Backend Configuration (`server/config.js` & `.env`)
All server parameters must be centralized:
```javascript
// server/config.js
import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  PORT: process.env.PORT || 3000,
  HOST: process.env.HOST || '0.0.0.0',
  DB_PATH: process.env.DB_PATH || './data/scarred_bell.db',
  BROADCAST_RATE_HZ: Number(process.env.BROADCAST_RATE_HZ) || 4,
  PROXIMITY_MUTATION_THRESHOLD_M: Number(process.env.PROXIMITY_MUTATION_THRESHOLD_M) || 15.0,
  DEFAULT_CITY: process.env.DEFAULT_CITY || 'ouro_preto',
  SCAR_COEFFICIENT_ALPHA: 0.05,
  SPATIAL_DECAY_LAMBDA: 0.15,
};
```

### 3.2 Frontend Configuration (`public/js/config.js`)
All client parameters must be extracted:
```javascript
// public/js/config.js
export const CLIENT_CONFIG = {
  SPEED_OF_SOUND_MPS: 343.0,
  EARTH_RADIUS_M: 6371e3,
  ATTENUATION_REFERENCE_DISTANCE_M: 100.0,
  DENSITY_RADIUS_M: 50.0,
  POSITION_DELTA_THRESHOLD_M: 5.0,
  TRANSMIT_INTERVAL_MS: 250, // 4 Hz max update rate
  AUDIO: {
    EXPONENTIAL_RAMP_DURATION_S: 2.5,
    ATTACK_TIME_S: 0.05,
    INHARMONIC_PARTIALS: [1.0, 1.21, 1.47, 1.94, 2.52],
    DEFAULT_FREQUENCY_HZ: 220.0
  },
  DEFAULT_SOAPSTONE_PRESET: {
    carrierType: 'sine',
    baseFrequency: 220.0,
    harmonicity: 1.414,
    decay: 1.5,
    gain: 1.0,
    euclideanDensity: 3
  }
};
```

---

## 4. Styling & Unified Theme System (`variables.css`)

All colors, fonts, shadows, transitions, and z-index layers must be defined in a single CSS variables file (`public/css/variables.css`).

To change the theme or visual identity of the entire application, **only `variables.css` needs to be edited**.

```css
/* public/css/variables.css */
:root {
  /* Color Palette - Dark Cybernetic / Acoustic Bell Theme */
  --bg-primary: #0a0c10;
  --bg-surface: rgba(18, 22, 31, 0.85);
  --bg-surface-border: rgba(255, 255, 255, 0.1);
  --text-primary: #e6edf3;
  --text-muted: #8b949e;
  --accent-gold: #d4af37;      /* Bronze / Soapstone Bell accent */
  --accent-scar: #ff4d4d;      /* Scar state indicator */
  --accent-active: #00e676;    /* Somatic Node active state */
  --accent-echolocation: #00e5ff; /* Wave propagation ring color */

  /* Typography */
  --font-family-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-family-mono: "Fira Code", "Courier New", monospace;

  /* Layout & Spacing */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --backdrop-blur: blur(12px);

  /* Animation Timings */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.3s ease;
  --wave-propagation-duration: 2.5s;
}
```

---

## 5. Web Audio Lifecycle & Acoustic DSP Practices

Browsers strictly enforce autoplay policies. AudioContext initialization and DSP graph management must follow these rules:

### 5.1 Explicit User Gesture Activation (`audio-context-manager.js`)
```javascript
export class AudioContextManager {
  static instance = null;

  static getContext() {
    if (!AudioContextManager.instance) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      AudioContextManager.instance = new AudioCtx();
    }
    return AudioContextManager.instance;
  }

  static async ensureResumed() {
    const ctx = AudioContextManager.getContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    return ctx;
  }
}
```

### 5.2 Pop & Click Prevention (Parameter Ramping)
- **Never update audio gains or frequencies instantaneously.**
- Always use smooth parameter ramping (`linearRampToValueAtTime` or `exponentialRampToValueAtTime`) over a minimum of 0.05s (for attacks) or `CLIENT_CONFIG.AUDIO.EXPONENTIAL_RAMP_DURATION_S` (for spatial hysteretic updates).

### 5.3 Audio Resource Lifecycle & Cleanup
- Stop and disconnect temporary nodes (e.g. one-shot spatial echolocation oscillators) immediately after their envelope decay completes to avoid Web Audio node memory leaks.

---

## 6. Cross-Platform Sensor & API Abstractions

Hardware capabilities vary significantly across iOS (Safari), Android (Chrome), and Desktop browsers (Windows/Mac/Linux). Direct access to `navigator` APIs in component logic is strictly prohibited. All hardware access must use abstraction adapters.

### 6.1 Cross-Platform Battery Sensor Adapter (`sensors/battery.js`)
```javascript
export class BatterySensor {
  static async getLevel() {
    if ('getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();
        return battery.level; // Returns 0.0 to 1.0
      } catch {
        return 1.0; // Fallback if API fails
      }
    }
    // iOS Safari does not support Battery API: Return full fidelity fallback
    return 1.0;
  }
}
```

### 6.2 Cross-Platform Geolocation & Desktop Simulator (`sensors/geolocation.js`)
```javascript
export class GeolocationSensor {
  constructor(onPositionUpdate, onError) {
    this.onPositionUpdate = onPositionUpdate;
    this.onError = onError;
    this.watchId = null;
    this.mockMode = false;
  }

  setMockMode(enabled, mockCoords = { lat: -20.3856, lng: -43.5035, alt: 1150 }) {
    this.mockMode = enabled;
    if (enabled && this.onPositionUpdate) {
      this.onPositionUpdate(mockCoords);
    }
  }

  start() {
    if (navigator.geolocation && !this.mockMode) {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => this.onPositionUpdate({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          alt: pos.coords.altitude || 0.0
        }),
        (err) => this.onError(err),
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
      );
    } else {
      console.warn("Geolocation API unavailable or mock enabled. Using simulated somatic node.");
    }
  }

  stop() {
    if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId);
  }
}
```

### 6.3 Cross-Platform Screen Wake-Lock Adapter (`sensors/wakelock.js`)
```javascript
export class WakeLockAdapter {
  static async request() {
    if ('wakeLock' in navigator) {
      try {
        return await navigator.wakeLock.request('screen');
      } catch (err) {
        console.warn("WakeLock request refused:", err.message);
      }
    }
    return null;
  }
}
```

---

## 7. Real-Time Network Protocol & Rate Limiting (`net/websocket-client.js`)

All WebSocket communication between Somatic Nodes and the Central Server must follow standardized message envelopes and throttling rules.

### 7.1 WebSocket Envelope Schema
```javascript
// Format: JSON string
{
  "type": "SOMATIC_POSITION_UPDATE" | "ECHOLOCATION_CHIRP" | "CREATE_REFLECTOR" | "STATE_DELTA",
  "payload": { ... },
  "timestamp": 1721535300000
}
```

### 7.2 Client Transmission Throttling & Reconnect Protocol
```javascript
export class ScarredWebSocketClient {
  constructor(url, onMessage) {
    this.url = url;
    this.onMessage = onMessage;
    this.ws = null;
    this.lastSentPosition = null;
    this.lastSentTime = 0;
    this.retryDelayMs = 1000;
  }

  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => {
      console.log("[WS] Connected to Scarred Bell Central Server");
      this.retryDelayMs = 1000;
    };
    this.ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (this.onMessage) this.onMessage(msg);
      } catch (e) {
        console.error("[WS] Corrupt frame received:", e);
      }
    };
    this.ws.onclose = () => this.scheduleReconnect();
    this.ws.onerror = (err) => console.error("[WS] Error:", err);
  }

  scheduleReconnect() {
    setTimeout(() => {
      this.retryDelayMs = Math.min(this.retryDelayMs * 2, 30000);
      this.connect();
    }, this.retryDelayMs);
  }

  sendPositionUpdate(lat, lng, alt) {
    const now = Date.now();
    if (now - this.lastSentTime < 250) return; // Rate-limit to max 4 Hz

    // Check position delta (> 5.0 meters)
    if (this.lastSentPosition) {
      const dist = calculateHaversineMeters(this.lastSentPosition, { lat, lng });
      if (dist < 5.0) return;
    }

    this.lastSentTime = now;
    this.lastSentPosition = { lat, lng };

    this.send("SOMATIC_POSITION_UPDATE", { lat, lng, alt });
  }

  send(type, payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload, timestamp: Date.now() }));
    }
  }
}
```

---

## 8. Immunological Parsing & Parameter Boundary Enforcement

All external data (LLM responses, incoming user payloads, custom preset parameters) must pass through an **Immunological Parsing Layer** before reaching database storage or the Web Audio engine.

### 8.1 Immunological Preset Validator (`server/utils/immunological-parser.js`)
```javascript
import { CLIENT_CONFIG } from '../../public/js/config.js';

export function validateSynthPreset(rawPreset) {
  try {
    const data = typeof rawPreset === 'string' ? JSON.parse(rawPreset) : rawPreset;
    
    return {
      carrierType: ['sine', 'triangle', 'sawtooth'].includes(data.carrierType) ? data.carrierType : 'sine',
      baseFrequency: Math.min(Math.max(Number(data.baseFrequency) || 220.0, 80.0), 880.0),
      harmonicity: Math.min(Math.max(Number(data.harmonicity) || 1.414, 0.5), 4.0),
      decay: Math.min(Math.max(Number(data.decay) || 1.5, 0.1), 6.0),
      gain: Math.min(Math.max(Number(data.gain) || 1.0, 0.0), 1.0),
      euclideanDensity: Math.min(Math.max(Math.round(Number(data.euclideanDensity) || 3), 1), 16)
    };
  } catch (err) {
    console.warn("[Immunology] Malformed preset payload. Reverting to Basal Soapstone Drone:", err.message);
    return { ...CLIENT_CONFIG.DEFAULT_SOAPSTONE_PRESET };
  }
}
```

---

## 9. Storage Architecture (Local SQL with Parallel Safety)

Per implementation requirements, the backend uses a local SQLite database (`scarred_bell.db`) in WAL (Write-Ahead Logging) mode to enable parallel connection safety and fast transactions without requiring external server processes.

```javascript
// server/db/database.js
import Database from 'better-sqlite3';
import { CONFIG } from '../config.js';

export function createDatabaseConnection() {
  const db = new Database(CONFIG.DB_PATH);
  
  // Enable WAL mode for high performance parallel read/write concurrency
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  
  // Initialize Schema
  db.exec(`
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
  `);

  return db;
}
```

---

## 10. Prompt Management (`server/prompts/`)

Prompts for LLM synthesis preset generation must never be hardcoded into JS files. Store them as `.txt` templates:

- `server/prompts/reflector_preset_system.txt`:
```text
You are an immunological synthesis generator for Sino Cicatrizado.
Translate the user's emotional input into a numeric synth parameter JSON payload.
You MUST output ONLY valid JSON matching this schema:
{
  "carrierType": "sine" | "triangle" | "sawtooth",
  "baseFrequency": number (80 to 880),
  "harmonicity": number (0.5 to 4.0),
  "decay": number (0.1 to 6.0),
  "gain": number (0.1 to 1.0),
  "euclideanDensity": number (1 to 16)
}
Do NOT include markdown formatting or commentary.
```

---

## 11. Modular Audio Engine Interface

To keep the client audio engine modular and replaceable:

```javascript
// public/js/audio/abstract-engine.js
export class AbstractAudioEngine {
  async init() { throw new Error("Method not implemented"); }
  async resume() { throw new Error("Method not implemented"); }
  triggerBell(params, delaySeconds) { throw new Error("Method not implemented"); }
  updateBatteryLevel(level) { throw new Error("Method not implemented"); }
}
```

---

## 12. Git Rules & Commit Conventions

To maintain a clean, traceable version history, all developers and automated subagents must strictly adhere to the following Git conventions.

### 12.1 Conventional Commit Format
All commit messages must follow the **Conventional Commits** specification in imperative, present-tense phrasing:

```text
<type>(<scope>): <short descriptive summary in lowercase>

[optional body explaining context or rationale]
```

#### Allowed Types:
- `feat`: A new feature or user-facing capability (e.g., `feat(audio): add spatial echolocation pulse wave`)
- `fix`: A bug fix or error mitigation (e.g., `fix(net): resolve websocket reconnection backoff cap`)
- `docs`: Documentation-only updates (e.g., `docs(dev-practices): add git rules and commit guidelines`)
- `style`: Formatting, whitespace, or CSS styling changes (no logic changes)
- `refactor`: Code refactoring that neither fixes a bug nor adds a feature
- `test`: Adding or updating verification tests (e.g., `test(hysteretic): add 10k proximity update test`)
- `chore`: Maintenance tasks, config tweaks, or package management (e.g., `chore(deps): update express version`)

#### Example Commit Messages:
```text
feat(spatial): implement haversine distance delay calculation
fix(immunology): clamp LLM decay parameter to safe upper boundary
docs(readme): update setup instructions for local sqlite wal mode
refactor(sensors): extract battery API into cross-platform adapter
```

### 12.2 Branching & Workflow Rules
1. **Main Branch Protection**:
   - `main` represents the stable, deployable state of the project.
   - Development occurs on feature or fix branches (e.g., `feature/spatial-audio`, `fix/gps-jitter`).
2. **Atomic Commits**:
   - Commits must be small, logical, and self-contained. Do not combine unrelated features, bug fixes, and formatting in a single commit.
3. **Zero Secrets in Repository**:
   - **Never commit `.env` files, API keys, or sensitive credentials.** All secrets must be loaded from process environment variables.
4. **Standard `.gitignore` Rules**:
   - The repository must always ignore:
     - `node_modules/`
     - `.env` and `.env.local`
     - SQLite runtime artifacts (`*.db`, `*.db-wal`, `*.db-shm`)
     - OS & IDE metadata (`.DS_Store`, `.vscode/`, `.idea/`)

---

## 13. Summary Checklist for Code Reviews

Before submitting any code change, verify:
- [ ] Are commit messages formatted using Conventional Commits (`feat(...)`, `fix(...)`, etc.)?
- [ ] Is `.gitignore` actively excluding `node_modules/`, `.env`, and local SQLite database files?
- [ ] Are all constants imported from `config.js` (`server/config.js` or `public/js/config.js`)?
- [ ] Are all colors/styles using CSS variables from `variables.css`?
- [ ] Does project layout strictly conform to the Directory Layout in Section 2?
- [ ] Are Web AudioContext calls activated via user gesture and safe parameter ramping?
- [ ] Is hardware API access routed through cross-platform adapters?
- [ ] Are WebSocket position update transmits rate-limited (4 Hz / 5.0m threshold)?
- [ ] Do external inputs pass through the Immunological Parsing Layer with safe fallbacks?
- [ ] Are DB operations using parameterized SQLite queries to prevent injection?
- [ ] Are LLM prompts isolated in `server/prompts/`?
- [ ] Are intentional simplifications tagged with `// ponytail: <rationale>` comments?

