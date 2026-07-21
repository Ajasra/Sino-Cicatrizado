# Product Requirement Document (PRD)
## Project: *Sino Cicatrizado (The Scarred Bell)*

**Document Version:** 2.0 (Post-Implementation Audit & Multi-City Edition)  
**System Architect:** Vector (Robotics Systems Architect & Control Theory Specialist) [tracing-the-scar]  
**Theoretical Grounding:** Second-Order Cybernetics, System-Environment Hybrids (SEH), Hysteretic State Machines, Web Audio Constraints [tracing-the-scar, Emergence and Embodiment]  
**Status:** Implemented & Verified / Active Deployment  

---

## 1. System Overview & Philosophical Framework

*Sino Cicatrizado (The Scarred Bell)* is a distributed, location-based, irreversible acoustic system designed as a **System-Environment Hybrid (SEH)** [Emergence and Embodiment]. It converts physical geographic topographies (such as Ouro Preto, Chicago, or dynamically generated custom cities) into active, self-organizing acoustic feedback loops [Ouro Preto..., tracing-the-scar].

The system rejects the "erasure paradigm" (the digital illusion of "undo") [tracing-the-scar]. Every action performed by a participant (somatic node) is written to the system as a permanent physical-discursive trace—a **scar**—that deforms the future state space of the soundscape [tracing-the-scar, S33, S42].

### Engineering Pragmatism (The Reality Gap)
We assume the physical environment is noisy and unstable [tracing-the-scar]:
1.  **GPS Jitter & Spatial Simulator:** We treat GPS drift not as a bug to smooth over, but as an environmental noise source. Additionally, a built-in Desktop/Mobile location simulator allows full spatial testing and interactive tap positioning.
2.  **Cellular Latency & Network Disruption:** Packet loss and network delay are handled smoothly via state sync and fallback handling.
3.  **Hardware Fatigue:** The participant's mobile device battery level ($E_{\text{battery}}$) acts as a physical system constraint, degrading synthesis fidelity (bit-depth via a custom BitCrusher Web Audio pipeline) as charge dissipates to mimic thermodynamic exhaustion [tracing-the-scar].

---

## 2. System Architecture & Node Topology

The system consists of three distinct node types cooperating within a shared coordinate field (`lat`, `lng`, `alt`):

```
                     ┌───────────────────────────────┐
                     │     Type 1: Active Towers     │
                     │  (Generative, fixed landmarks)│
                     └──────────────┬────────────────┘
                                    │
                                    ▼ (Spatial Propagation Delay: d / 343)
┌───────────────────────────────┐   │   ┌───────────────────────────────┐
│     Type 3: Somatic Nodes     ├───┼──>│  Type 2: Static Reflectors    │
│  (Mobile, active echolocators)│   │   │  (Silent, participant-placed) │
└───────────────────────────────┘<──┴───└───────────────────────────────┘
```

### 2.1 Type 1: Active Historical Towers (Autonomous Emitters)
*   **Definition:** Permanent, geographic landmarks pre-seeded in database (e.g., historical churches of Ouro Preto, Chicago landmarks, or custom city landmarks).
*   **Behavior:** Continuous, generative Euclidean rhythm sequences (`euclid(k, n)`).
*   **Acoustic Profile:** Rich 5-partial inharmonic additive bell synthesis representing soapstone/bronze acoustic structures.

### 2.2 Type 2: Static Reflectors (Somatic Memory Deposits)
*   **Definition:** Fixed, silent coordinate nodes dropped by Type 3 nodes or via API at their current location [tracing-the-scar].
*   **Behavior:** Normally silent. They carry an LLM-generated or validated synthesizer preset representing the creator's logged intent/emotional state.
*   **Reaction:** Output sound when triggered by a propagation wave from an active tower or an echolocation chirp from a somatic node [tracing-the-scar].

### 2.3 Type 3: Somatic Nodes (Active Echolocators)
*   **Definition:** The real-time coordinates of active mobile/desktop browser clients and optional virtual user agents [S32].
*   **Behavior:** Render localized spatialized audio; transmit real-time updates over WebSocket at $4\text{ Hz}$; trigger active "somatic chirps" (echolocation pulses); deposit static reflectors.

---

## 3. Core Technical Implementation & Current State

### 3.1 Web Audio Engine (`public/js/audio/web-audio-engine.js`)
*   **Status:** [IMPLEMENTED]
*   **Synthesis Architecture:** Native Web Audio API 5-partial inharmonic additive synthesis.
    *   *Partials:* $1.00 \cdot f_0$, $1.21 \cdot f_0$, $1.47 \cdot f_0$, $1.94 \cdot f_0$, and $2.52 \cdot f_0$.
    *   *Exponential Decay:* Envelope decays scaled by partial frequency ratios ($\tau_i = \tau_{\text{base}} / \text{Ratio}_i$).
*   **Pop/Click Ramping:** All parameter updates use exponential or linear ramping over $2.5\text{ seconds}$.

### 3.2 Spatial Propagation & Attenuation (`server/services/spatial.js` & `public/js/spatial.js`)
*   **Status:** [IMPLEMENTED]
*   **Propagation Delay:** Sound events use Haversine distance $d$ and speed of sound ($v_{\text{sound}} = 343\text{ m/s}$) for propagation delay ($t = d / 343$).
*   **Inverse-Square Attenuation:** Gain decays via $\text{Gain}(d) = \min(1.0, 100.0 / (d + 1.0))$.

### 3.3 LLM Prompt Membrane & Immunological Parser (`server/llm-membrane.js` & `server/utils/immunological-parser.js`)
*   **Status:** [IMPLEMENTED]
*   **LLM Preset Generator:** Uses Gemini / OpenRouter / local fallback to turn natural language intent into valid JSON presets.
*   **Immunological Parsing Layer:** Enforces safe value bounds (`baseFrequency` 80–880Hz, `harmonicity` 0.5–4.0, `decay` 0.1–6.0s, etc.). Malformed inputs default to the "Basal Soapstone Drone" ($220\text{ Hz}$).

### 3.4 Acoustic Density Impedance
*   **Status:** [IMPLEMENTED]
*   Calculates local reflector density within $50\text{m}$ radius and attenuates output gain ($\text{Attenuation} = 1 / (1 + I)$) to prevent audio clutter.

### 3.5 Battery-Aware Synthesis Throttling (`public/js/sensors/battery.js`)
*   **Status:** [IMPLEMENTED]
*   Queries `navigator.getBattery()`. Maps charge level ($E_{\text{battery}}$) down to 4-bit quantization via custom `ScriptProcessorNode` / AudioWorklet BitCrusher as charge depletes below 50%.

### 3.6 Cybernetic Hysteresis & Somatic Signatures (`server/services/hysteresis.js`)
*   **Status:** [IMPLEMENTED]
*   Proximity within $15\text{m}$ triggers irreversible state mutations governed by base coefficient $\alpha = 0.00002$, sub-linear crowd damping $\mu_{\text{crowd}} = \frac{1}{1 + 0.3(N - 1)}$, spatial decay $\lambda = 0.15$, and deterministic participant signatures ($w_{\text{soma}}$ and $\mathbf{b}_{\text{soma}}$). Fundamental note pitch is anchored to `initialBaseFrequency` with microtonal wobble ($\pm 3\%$) to eliminate pitch runaway while capturing somatic memory.

### 3.7 Spatial Grid Indexing & Multi-City Engine (`server/server.js` & `server/services/city-generator.js`)
*   **Status:** [IMPLEMENTED]
*   **Spatial Grid Indexing:** Uses $\approx 200\text{m}$ spatial grid buckets for $O(1)$ spatial lookup during proximity evaluation.
*   **Multi-City Architecture:** Supports switching between pre-configured cities (e.g., Ouro Preto, Chicago) and generating new AI-crafted or custom cities on the fly via `/api/cities/create`.

---

## 4. Communication & Database Architecture

```
                  ┌────────────────────────────────┐
                  │      Central Server Node       │
                  │   (Express.js / WS / SQLite)   │
                  └───────────────┬────────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
┌─────────────────────────────────┐               ┌─────────────────────────────────┐
│        Living City DB           │               │        Scarred Twin DB          │
│ (SQLite WAL Mode / Mutable)     │               │ (Read-Only Static JSON Snapshot)│
└─────────────────────────────────┘               └─────────────────────────────────┘
```

### 4.1 Real-Time WebSocket Protocol
*   **Status:** [IMPLEMENTED]
*   $4\text{ Hz}$ broadcast rate ($250\text{ ms}$ tick). Supports room partitioning by city key, position frame updates, somatic chirps, and mutation notifications. HTTPS/WSS support enabled via SSL certificates (`certs/server.pfx`).

### 4.2 Storage & Dual-Twin Dataset
*   **Status:** [IMPLEMENTED & VERIFIED]
*   **Living City DB:** SQLite in WAL mode (`PRAGMA journal_mode = WAL;`) for high concurrency (tested with 100+ parallel transactions).
*   **Scarred Twin Dataset:** Static snapshot support (`data/scarred_twin.json`) for toggling historical frozen states.

---

## 5. System Status & Implementation Audit Matrix

| Requirement / Component | Status | Implementation File / Details |
| :--- | :---: | :--- |
| **Inharmonic Additive Synth** | ✅ Implemented | `public/js/audio/web-audio-engine.js` (5 partials) |
| **BitCrusher Battery Sensor** | ✅ Implemented | `public/js/sensors/battery.js` & `web-audio-engine.js` |
| **Spatial Attenuation & Speed Delay** | ✅ Implemented | `server/services/spatial.js` & `public/js/spatial.js` |
| **Immunological JSON Guardrail** | ✅ Implemented | `server/utils/immunological-parser.js` |
| **LLM Preset Prompt Membrane** | ✅ Implemented | `server/llm-membrane.js` |
| **Hysteresis & Anchor Pitch Drift** | ✅ Implemented | `server/services/hysteresis.js` |
| **Somatic Signatures & Crowd Damping**| ✅ Implemented | `server/services/hysteresis.js` |
| **Spatial Grid Indexing ($O(1)$)** | ✅ Implemented | `server/server.js` |
| **SQLite WAL Concurrency Engine** | ✅ Implemented | `server/db/database.js` (`better-sqlite3`) |
| **Multi-City Support & AI City Gen** | ✅ Implemented | `server/services/city-generator.js` & API |
| **Desktop / GPS Simulator** | ✅ Implemented | `public/js/sensors/geolocation.js` |
| **Dual-Twin Snapshot Support** | ✅ Implemented | `server/server.js` & `data/scarred_twin.json` |
| **Canvas Echolocation Wave Radar** | ✅ Implemented | `public/js/ui/visualizer.js` |
| **Leaflet Map Visualization** | ✅ Implemented | `public/js/ui/map-view.js` |
| **Automated Verification Test Suite** | ✅ Implemented | `test/verification.js` (7/7 tests passing) |

### Currently Unimplemented / Future Roadmap Items
1. **Sovereign Isolation Audio Tone Filter (Offline Mode):**
   * *Status:* ✅ Implemented (`public/js/audio/web-audio-engine.js` & `public/index.html`)
   * *Detail:* Client handles disconnects gracefully without crashing and continues local synthesis, automatically engaging a heavy lowpass filter (450Hz cutoff) in Sovereign Isolation mode (smoothly ramping back over 5s upon reconnection). Offline state is visually indicated by changing the header brand circle (`#brand-dot`) from cyan (`ONLINE`) to red (`OFFLINE`).


2. **CPU Watchdog Dynamic Partial Shedding:**
   * *Status:* ⚠️ Unimplemented / Optional Optimization
   * *Detail:* Sound engine runs smoothly on tested mobile/desktop hardware without partial shedding logic; dynamic partial shedding on CPU threshold $>40\%$ is not active in the current Web Audio graph loop.
3. **Automated Conference End S3 Twin Archive Sync:**
   * *Status:* ⚠️ Local File Only
   * *Detail:* Scarred Twin snapshot is served locally from `data/scarred_twin.json` rather than synced to an external AWS S3 bucket.

---

## 6. Verification Test Suite Status

The automated verification suite (`test/verification.js`) passes 7/7 tests:
1. ✅ Haversine Distance Metric Accuracy
2. ✅ Inverse-Square Gain Attenuation Check
3. ✅ Immunological Parsing Guardrail & Fallback Test
4. ✅ SQLite WAL Mode Parallel Concurrency (100 Concurrent Writes)
5. ✅ Hysteresis Irreversible Parameter Mutation & Boundary Limits
6. ✅ Somatic Signature Determinism & Crowd Damping Calculation
7. ✅ Non-Compounding Pitch Drift Stability & User Reflector Scarring

---
*PRD updated to Version 2.0 following full repository audit.*