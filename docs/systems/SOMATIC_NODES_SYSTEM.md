# Somatic Nodes System Specification

> **Sino Cicatrizado (The Scarred Bell)**  
> Technical Architecture, Spatial Physics & Cybernetic Specification for Somatic Nodes (Type 3 Clients)

---

## 1. Overview & Cybernetic Taxonomy

In *Sino Cicatrizado*, **Somatic Nodes** (Type 3 Nodes) represent the mobile web browser clients operated by physical participants. Unlike traditional passive audio listeners or client-server applications, Somatic Nodes are fundamental **co-composers** within the **System-Environment Hybrid (SEH)** framework.

Rooted in **Second-Order Cybernetics**, the observer is placed inside the loop:
- **Agential Observer**: The participant's physical location, movement trajectory, device hardware strain, and manual acoustic probing co-constitute the spatial audio topology.
- **Irreversible Imprint**: As a Somatic Node navigates through geographical space, its unique **Somatic Signature** permanently deforms (scars) the synthesis parameters of nearby towers and static reflectors.
- **Active Echolocator**: Rather than passively listening, a Somatic Node can fire active acoustic chirps ($v_{\text{sound}} = 343\text{ m/s}$) to probe the historical density of the surrounding terrain.

---

## 2. Somatic Identity & Somatic Signatures (`somaticSignature`)

When a Somatic Node establishes a WebSocket connection ([server.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/server/server.js#L113-L139)), it is assigned a unique `somaticId` (e.g., `soma_m8f2a_78b`). 

### 2.1 Deterministic Hash Generation
From this `somaticId`, the system computes a deterministic **Somatic Signature** using a djb2 hash algorithm ([hysteresis.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/server/services/hysteresis.js#L9-L38)):

```js
let hash = 5381;
for (let i = 0; i < str.length; i++) {
  hash = ((hash << 5) + hash) + str.charCodeAt(i);
  hash |= 0;
}
const uHash = Math.abs(hash);
```

### 2.2 Somatic Signature Parameters

Each participant carries a unique combination of parameter directional biases and weight multipliers:

| Signature Parameter | Derived Value Range | Operational Impact on Sound Nodes |
| :--- | :--- | :--- |
| **`weightMultiplier` ($w_{\text{soma}}$)** | `0.5` to `1.8` | Scales the intensity rate of scarring per frame tick ($250\text{ ms}$). |
| **`pitchDir`** | `+1` or `-1` | Pulls fundamental note frequency (`baseFrequency`) upward or downward. |
| **`filterDir`** | `+1` or `-1` | Drives lowpass filter cutoff (`filterCutoff`) brighter or darker. |
| **`fmWeight`** | `0.5` to `2.0` | Multiplier for FM synthesis distortion sensitivity. |
| **`fmDir`** | `+1` or `-1` | Increases inharmonic FM overtones (`fmIndex`) or smooths toward pure sine. |
| **`decayDir`** | `+1` or `-1` | Lengthens or shortens envelope decay tails (`decay`). |
| **`harmDir`** | `+1` or `-1` | Increases harmonic overtone ratios (`harmonicity`) or sub-harmonic tones. |

---

## 3. Active Echolocation & Wave Propagation (`SOMATIC_CHIRP`)

A Somatic Node can perform active acoustic probing by triggering a **Chirp**. This converts the mobile device into an active sonar transmitter.

```text
  [ Somatic Node A ] (Fires Chirp at t=0)
           │
           ├─── Spatial Wave Propagation (v = 343 m/s) ───► [ Reflector Node ] (Distance = d1)
           │                                                       │
           │                                                       ├── Delayed Echo Return ───► [ Somatic Node B ]
           ▼                                                       ▼                            (Distance = d2)
  Direct Audio Pulse                                      Reflected Echo Strike
  (Delay: d / 343s)                                      (Delay: (d1 + d2) / 343s)
```

### 3.1 Wave Propagation Delay Math
When a chirp is emitted from origin coordinates $P_{\text{src}}$, the wave propagates outward across geographical space. The delay until the wave reaches target coordinates $P_{\text{target}}$ is given by:

$$t_{\text{arrival}} = \frac{d(P_{\text{src}}, \, P_{\text{target}})}{v_{\text{sound}}} = \frac{d(P_{\text{src}}, \, P_{\text{target}})}{343.0\text{ m/s}}$$

Where $d(\cdot)$ is calculated using the Haversine formula ([spatial.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/public/js/spatial.js#L3-L18)).

### 3.2 Round-Trip Echo Delay
For a listener at $P_{\text{listener}}$, the total return delay for a reflected strike from node $N$ is:

$$t_{\text{return}} = t_{\text{arrival}} + \frac{d(N, \, P_{\text{listener}})}{343.0\text{ m/s}}$$

### 3.3 Echo Probability & Inverse-Square Attenuation
* **Reflection Gate**: Each node checks its LLM-defined `echoProbability` (default `0.7`). If a random roll exceeds `echoProbability`, the node stays silent.
* **Inverse-Square Gain**:
  $$\text{Gain}(d) = \min\left(1.0, \, \frac{100.0}{d + 1.0}\right)$$
* **Range Limit**: Echolocation wave pulses dissipate beyond $600\text{ meters}$.

---

## 4. Thermodynamic Hardware Fatigue (Battery Degradation)

In accordance with non-trivial environmental agency, device hardware battery depletion represents physical entropy and somatic node exhaustion ([web-audio-engine.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/public/js/audio/web-audio-engine.js#L152-L197)).

### 4.1 Battery-to-BitDepth Mapping Formula
The mobile browser monitors battery level $E_{\text{battery}} \in [0.0, 1.0]$ via the Battery Status API ([battery.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/public/js/sensors/battery.js)):

$$\text{BitDepth}(E) = \begin{cases} 
16 & \text{if } E \ge 0.50 \\
\text{round}\left(4 + \frac{E - 0.15}{0.35} \cdot 12\right) & \text{if } 0.15 \le E < 0.50 \\
4 & \text{if } E < 0.15 
\end{cases}$$

### 4.2 DSP Signal Quantization
When $E_{\text{battery}} < 0.50$, audio routing is dynamically redirected through a custom `ScriptProcessorNode` bitcrusher:

$$y[n] = q \cdot \text{round}\left(\frac{x[n]}{q}\right), \quad q = 0.5^{\text{BitDepth}}$$

* **Full Charge ($E \ge 50\%$)**: 16-bit pristine Web Audio output.
* **Medium Charge ($15\% \le E < 50\%$)**: Linear degradation from 16-bit down to 4-bit.
* **Low Charge ($E < 15\%$)**: Heavy 4-bit digital crushing, reflecting hardware exhaustion.

---

## 5. Reflector Deposition (Somatic Memory Deposits)

A Somatic Node can drop a **Type 2 Static Reflector** at its current geographic position via `POST /api/reflectors` ([server.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/server/server.js#L49-L87)).

```text
[ Participant Text Intent ] ──► [ LLM Membrane Service ] ──► [ Immunological Parser ] ──► [ SQLite DB & WS Broadcast ]
"Colonial gold echoes"         (gpt-4o-mini / prompt)        (Bounds Clamping)             (REFLECTOR_CREATED)
```

1. **Intent Processing**: The participant submits a natural language intent string (e.g., *"echo of iron and soapstone"*).
2. **LLM Membrane Translation**: The server passes the prompt to `generateReflectorPresetFromPrompt()` ([llm-membrane.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/server/llm-membrane.js#L12)), generating a custom synthesis state vector (`baseFrequency`, `harmonicity`, `decay`, `fmIndex`, `filterCutoff`, `carrierType`, `soundType`).
3. **Immunological Validation**: Payload is verified by `validateSynthPreset()` ([immunological-parser.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/server/utils/immunological-parser.js)), clamping values within safe DSP boundaries.
4. **Persisted Reflector**: The reflector is stored in `scarred_bell.db` and broadcast over WebSocket to all clients as a `REFLECTOR_CREATED` event.

---

## 6. Real-Time Telemetry & WebSocket Protocol Envelopes

All communication between Somatic Nodes and the central cybernetic server passes over WSS using JSON envelopes.

### 6.1 Telemetry Broadcast & Rate Limits
- **Broadcast Rate**: $4\text{ Hz}$ ($250\text{ ms}$ evaluation interval).
- **Movement Delta Gate**: Clients transmit `SOMATIC_POSITION_UPDATE` only when movement exceeds $5.0\text{ meters}$ or battery level changes.

### 6.2 Envelope Schemas

#### Client -> Server: Position Update (`SOMATIC_POSITION_UPDATE`)
```json
{
  "type": "SOMATIC_POSITION_UPDATE",
  "payload": {
    "coordinates": { "lat": -20.3856, "lng": -43.5035, "alt": 1150.0 },
    "batteryLevel": 0.84
  },
  "timestamp": 1721536100000
}
```

#### Client -> Server: Echolocation Chirp (`SOMATIC_CHIRP`)
```json
{
  "type": "SOMATIC_CHIRP",
  "payload": {
    "chirpFrequency": 440.0,
    "coordinates": { "lat": -20.3856, "lng": -43.5035, "alt": 1150.0 }
  },
  "timestamp": 1721536105000
}
```

#### Server -> Client: Initial Handshake (`SESSION_INIT`)
```json
{
  "type": "SESSION_INIT",
  "payload": {
    "somaticId": "soma_m8f2a_78b",
    "twinMode": "LIVING",
    "debugMode": false,
    "showUsers": true,
    "config": {
      "broadcastRateHz": 4,
      "proximityThresholdM": 15.0
    }
  },
  "timestamp": 1721536000000
}
```

#### Server -> Client: Frame Telemetry Broadcast (`SOMATIC_FRAME_UPDATE`)
```json
{
  "type": "SOMATIC_FRAME_UPDATE",
  "payload": {
    "somaticNodes": [
      { "somaticId": "soma_m8f2a_78b", "coordinates": { "lat": -20.3856, "lng": -43.5035 }, "batteryLevel": 0.84 },
      { "soma_k3j9q_12c", "coordinates": { "lat": -20.3861, "lng": -43.5040 }, "batteryLevel": 0.42 }
    ]
  },
  "timestamp": 1721536100250
}
```

---

## 7. Client Web Audio Synthesis Engine Interface

On the mobile client, [WebAudioEngine](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/public/js/audio/web-audio-engine.js#L9) synthesizes spatial audio procedurally without external samples:

* **Additive Partial Ratios**: $[1.00 \cdot f_0, \, 1.21 \cdot f_0, \, 1.47 \cdot f_0, \, 1.94 \cdot f_0, \, 2.52 \cdot f_0]$.
* **Procedural Impulse Convolvers**:
  * `convolverCathedral` (Ouro Preto Church Towers - 3.0s warm exponential decay).
  * `convolverMine` (Ouro Preto Subterranean Chamber - 1.2s dense metallic reflections).
  * `convolverValley` (Ouro Preto Mountain Valley - 4.5s long lowpass tail).
  * `convolverWindCanyon` (Chicago Lakefront Wind - 4.0s wide atmospheric reverb).
  * `convolverSteelBridge` (Chicago River Corridor - 1.8s metallic beam impulse).
* **Limiter & Soft Clipper**: Dynamic compressor with threshold at $-12\text{ dBFS}$ prevents polyphonic summing distortion when multiple nodes fire simultaneously.

---

## 8. Summary Taxonomy Table

| Feature | Type 1: Towers | Type 2: User Reflectors | Type 3: Somatic Nodes |
| :--- | :--- | :--- | :--- |
| **Mobility** | Fixed Geographic Landmark | Fixed User Deposit | Mobile GPS Client |
| **Primary Function** | Rhythmic Bell Toll Emitter | Acoustic Memory Echoer | Listener, Echolocator, Scar Intermediary |
| **Audio Output** | Euclidean Pattern Tolls | Wave Echoes when struck | Direct Chirps & Spatialized Synthesis |
| **State Persistence** | SQLite DB (`nodes`) | SQLite DB (`nodes`) | Transient In-Memory (`somaticNodesMap`) |
| **Scarring Role** | Accumulates Scar Trauma | Accumulates Scar Trauma | Inflicts Scarring via `somaticSignature` |
