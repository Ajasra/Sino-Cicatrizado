# Reflector Nodes System Specification

> **Sino Cicatrizado (The Scarred Bell)**  
> Technical Architecture, LLM Synthesis Membrane & Cybernetic Specification for Reflector Nodes (Type 2 Static Reflectors)

---

## 1. Overview & Cybernetic Taxonomy

In *Sino Cicatrizado*, **Reflector Nodes** (Type 2 Nodes) represent user-created, static coordinate deposits placed within the geographical coordinate field (`lat`, `lng`, `alt`). 

Unlike **Type 1 Towers** (which actively generate continuous Euclidean rhythm sequences) or **Type 3 Somatic Nodes** (which are mobile human participants), Reflector Nodes serve as **silent acoustic memory deposits**:

- **Passive Memory Traces**: By default, Reflector Nodes remain silent until perturbed by an expanding spatial sound wave.
- **LLM-Synthesized State Vectors**: Created via natural language prompts translated by an LLM into Web Audio synthesis state vectors.
- **Wave Responders**: When struck by an expanding sound wave emitted from a TOWER bell toll or a Somatic Echolocation Chirp ($v_{\text{sound}} = 343\text{ m/s}$), the reflector sounds a delayed, spatialized echo response.
- **Irreversible Scar Accumulator**: Reflectors accumulate physical wear and parameter trauma (`scarIndex`) whenever mobile Somatic Nodes pass within their $15\text{-meter}$ proximity interaction zone.

---

## 2. Reflector Creation & LLM Membrane Architecture

Reflector Nodes are created dynamically by participants via the `POST /api/reflectors` REST endpoint ([server.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/server/server.js#L49-L87)).

```text
  ┌─────────────────────────────────┐
  │  Participant Text Intent Input  │  (e.g., "Colonial gold and heavy iron echoes")
  └────────────────┬────────────────┘
                   │
                   ▼
  ┌─────────────────────────────────┐
  │   LLM Membrane Generator Service │  (generateReflectorPresetFromPrompt())
  └────────────────┬────────────────┘
                   │
                   ▼
  ┌─────────────────────────────────┐
  │  Immunological Parsing Layer    │  (validateSynthPreset() bounds clamping)
  └────────────────┬────────────────┘
                   │
                   ▼
  ┌─────────────────────────────────┐
  │  SQLite DB & WebSocket Broadcast│  (scarred_bell.db WAL mode & REFLECTOR_CREATED)
  └─────────────────────────────────┘
```

### 2.1 Natural Language to DSP Translation
The server invokes `generateReflectorPresetFromPrompt()` ([llm-membrane.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/server/llm-membrane.js#L12)), sending the user's intent to an LLM provider with system instructions ([reflector_preset_system.txt](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/server/prompts/reflector_preset_system.txt)). The LLM parses poetic intent into exact Web Audio DSP state vectors:

```json
{
  "soundType": "bell_deep",
  "carrierType": "triangle",
  "baseFrequency": 180.0,
  "initialBaseFrequency": 180.0,
  "harmonicity": 2.1,
  "decay": 3.2,
  "gain": 0.85,
  "fmIndex": 2.5,
  "filterCutoff": 1400.0,
  "bitDepth": 16,
  "echoProbability": 0.80
}
```

### 2.2 Immunological Validation & Safety Clamping
Before persistence, all generated payloads pass through `validateSynthPreset()` ([immunological-parser.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/server/utils/immunological-parser.js#L8-L45)):
- Missing or `NaN` numeric parameters are filled with default safe values.
- Frequency parameters are clamped to safe hearing ranges ($55.0\text{ Hz}$ to $880.0\text{ Hz}$).
- Unrecognized sound archetypes default to `bell_soapstone` with a $220.0\text{ Hz}$ basal drone.

### 2.3 Input Security, Length Control & Multi-Lingual Cicatrization
To protect the system against script/code injection, prompt manipulation, and inappropriate multi-lingual content:
1. **Native Client Truncation**: `<textarea id="input-reflector-intent">` enforces a strict `maxlength="200"` character cap on the UI layer ([index.html](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/public/index.html#L120)).
2. **Server-Side XSS Protection**: `POST /api/reflectors` sanitizes user text by trimming, truncating to 200 characters, and stripping HTML/script angle brackets (`<`/`>`).
3. **Single-Pass Multi-Lingual LLM Moderation**: The LLM prompt schema includes a `displayTitle` field. The LLM evaluates input semantically across all languages (including slang and leetspeak):
   - **Clean Text**: Outputs a safe, concise reflection title (max 60 chars).
   - **Profanity / Hate Speech / Injection Attack**: Outputs `"displayTitle": "▓▒░ [SOMATIC TRACE CICATRIZED] ░▒▓"` and generates calm neutral synthesis parameters.
4. **Offline Cicatrization Fallback**: If the LLM is offline, `cicatrizeText()` in [server.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/server/server.js#L388) strips XSS execution vectors, converting script attempts into scarred glyphs.

---

## 3. Spatial Trigger & Acoustic Echo Physics

Reflector Nodes do not generate self-timed rhythmic strikes. They reply when hit by expanding spatial propagation waves.

### 3.1 Wave Propagation Delay Formula
When an acoustic event occurs at source coordinates $P_{\text{src}}$ (either a TOWER bell strike or a Somatic Chirp), the wave travels outward at the physical speed of sound ($343\text{ m/s}$).

The wave arrival delay at the reflector node $N_{\text{reflector}}$ is:

$$t_{\text{arrival}} = \frac{d(P_{\text{src}}, \, N_{\text{reflector}})}{v_{\text{sound}}} = \frac{d(P_{\text{src}}, \, N_{\text{reflector}})}{343.0\text{ m/s}}$$

Where distance $d$ is measured via the Haversine formula ([spatial.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/public/js/spatial.js#L3-L18)).

### 3.2 Echo Return Delay & Spatial Gain Attenuation
For a listener situated at $P_{\text{listener}}$, the round-trip delay of the reflected echo is:

$$t_{\text{return}} = t_{\text{arrival}} + \frac{d(N_{\text{reflector}}, \, P_{\text{listener}})}{343.0\text{ m/s}}$$

The effective volume gain heard by the listener is attenuated using inverse-square distance math ([main.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/public/js/main.js#L460-L474)):

$$\text{EffectiveGain} = \text{NodeGain} \cdot \min\left(1.0, \, \frac{100.0}{d(N_{\text{reflector}}, P_{\text{listener}}) + 1.0}\right)$$

### 3.3 Echo Probability Reflection Gate
Every reflector node maintains an `echoProbability` parameter ($\in [0.1, 1.0]$). When hit by a wave pulse, the node executes a probability roll:
- If $\text{random}() \le \text{echoProbability}$, the reflector strikes and sounds its synthesis response.
- If $\text{random}() > \text{echoProbability}$, the reflector absorbs the acoustic wave silently without reflecting.

---

## 4. Acoustic Density Impedance (Spatial Filtering)

When multiple user-created reflectors are deposited in close proximity to one another or near a TOWER (e.g., within a $50\text{-meter}$ radius), they create **Acoustic Density Impedance** ([spatial.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/public/js/spatial.js#L29-L44)).

```text
           [ Reflector A ] (dist = 10m)
                  │
  [ Target Node ] ┼─── [ Reflector B ] (dist = 20m) ───► Total Impedance I(P)
                  │                                      Attenuation = 1 / (1 + I(P))
           [ Reflector C ] (dist = 5m)
```

### 4.1 Impedance Calculation Formula
For a target node $P$, local impedance $I(P)$ is calculated across all neighbor reflectors within $R = 50\text{m}$:

$$I(P) = \sum_{i=1}^{n} \frac{1}{d_i + 1.0} \quad (\text{where } d_i \le 50\text{m})$$

### 4.2 Attenuation & Filter Impact
The attenuation factor scales output volume and compresses decay tails:

$$\text{AttenuationFactor} = \frac{1}{1.0 + I(P)}$$

This physical mechanism prevents sound saturation in congested urban areas, acting as an automatic spatial lowpass filter.

---

## 5. Cybernetic Scarring & State Vector Mutation

When a mobile Somatic Node approaches within $d \le 15.0\text{ meters}$ of a Reflector Node, the server's 4 Hz broadcast loop evaluates hysteretic state mutation ([hysteresis.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/server/services/hysteresis.js#L40-L100)).

### 5.1 Scar Index Increment Formula
Every $250\text{ ms}$ tick where a participant is within range, the reflector's `scarIndex` increments by:

$$\Delta \text{Scar} = \alpha \cdot w_{\text{soma}} \cdot \mu_{\text{crowd}} \cdot e^{-\lambda \cdot d}$$
$$\text{scarIndex}_{t+1} = \text{scarIndex}_t + \Delta \text{Scar}$$

Where:
- $\alpha = 0.00002$ (Base scarring rate per tick)
- $w_{\text{soma}}$ (Participant weight multiplier, $0.5\times$ to $1.8\times$)
- $\mu_{\text{crowd}} = \frac{1}{1 + 0.3(N - 1)}$ (Sub-linear crowd damping factor)
- $\lambda = 0.15\text{ m}^{-1}$ (Spatial decay rate)

### 5.2 Reflector DSP Parameter Mutation Table

All parameter shifts are clamped within `CONFIG.PARAMETER_BOUNDS`:

| Reflector Parameter | Initial Baseline | Scar Mutation Behavior | Operational Audio Result |
| :--- | :--- | :--- | :--- |
| **`baseFrequency`** | $55\text{ Hz} - 880\text{ Hz}$ | Microtonal sway ($\pm 3\%$) relative to fundamental pitch | Microtonal pitch detuning without runaway compounding |
| **`filterCutoff`** | $100\text{ Hz} - 5000\text{ Hz}$ | Shifts by $\text{filterDir} \cdot 300 \cdot \Delta \text{Scar}$ | Lowpass filter cutoff darkens or brightens resonance |
| **`fmIndex`** | $0.0 - 10.0$ | Increases by $+2.5 \cdot \Delta \text{Scar} \cdot \text{fmWeight}$ | Harsh inharmonic metallic overtone generation |
| **`decay`** | $0.1\text{ s} - 15.0\text{ s}$ | Oscillates via $\text{decayDir} \cdot \cos(\text{scarIndex} \cdot 4.2)$ | Envelope release tail lengthens or shortens |
| **`bitDepth`** | $16\text{-bit} - 2\text{-bit}$ | Drops when $\text{scarIndex} > 1.5$ down to 2-bit | Digital crushing & bit degradation |
| **`soundType`** | User Preset | Morphs: `bell` $\rightarrow$ `industrial` $\rightarrow$ `glitch` | Structural sound archetype breakdown |

---

## 6. Database Schema & Persistence

Reflector Nodes are persisted in the SQLite local database `scarred_bell.db` in the `nodes` table ([database.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/server/db/database.js#L26-L50)):

```sql
CREATE TABLE IF NOT EXISTS nodes (
  node_id TEXT PRIMARY KEY,
  node_type TEXT CHECK(node_type IN ('TOWER', 'REFLECTOR')) NOT NULL,
  city TEXT NOT NULL,
  name TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  alt REAL DEFAULT 0.0,
  base_frequency REAL NOT NULL,
  harmonicity REAL DEFAULT 1.414,
  decay REAL DEFAULT 1.5,
  gain REAL DEFAULT 1.0,
  euclidean_density INTEGER DEFAULT 3,
  euclidean_steps INTEGER DEFAULT 8,
  echo_probability REAL DEFAULT 0.7,
  sound_type TEXT DEFAULT 'bell_deep',
  fm_index REAL DEFAULT 0.0,
  filter_cutoff REAL DEFAULT 1200.0,
  bit_depth INTEGER DEFAULT 16,
  carrier_type TEXT DEFAULT 'sine',
  scar_index REAL DEFAULT 0.0,
  interaction_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 6.1 Real-Time WebSocket Synchronization
- **Creation**: When a reflector is added, the server broadcasts a `REFLECTOR_CREATED` event containing the full node state to all connected Somatic Nodes.
- **Mutation**: When proximity causes a parameter shift, the server broadcasts a `NODE_MUTATED` event containing the updated state vector, distance, and triggering `somaticId`.

---

## 7. Comparative Taxonomy: Towers vs. Reflectors vs. Somatic Nodes

| Property | Type 1: Active Towers | Type 2: Reflector Nodes | Type 3: Somatic Nodes |
| :--- | :--- | :--- | :--- |
| **Origin** | Server / City Landmark Seed | User Creation (`/api/reflectors`) | Mobile Browser Client |
| **Node Type String** | `'TOWER'` | `'REFLECTOR'` | `'SOMATIC'` |
| **Sound Trigger Mode** | Continuous Euclidean Clock | Expanding Wave Echo Strike | Manual Chirp / Touch Pulse |
| **LLM Integration** | Preset Historical Configuration | Dynamic Prompt Translation | N/A |
| **Impedance Impact** | Contributes & Subject to Density | Contributes & Subject to Density | Induces Density & Impedance |
| **Scar Trajectory** | Accumulates Lifetime Scars | Accumulates Lifetime Scars | Inflicts Scars via `somaticSignature` |
