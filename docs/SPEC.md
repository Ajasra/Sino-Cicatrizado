# System Specification Document (SPEC)
## Project: *Sino Cicatrizado (The Scarred Bell)*

**Document Version:** 1.0 (LTS Master Specification)  
**Target Platform:** Web Browsers (Mobile Safari / Android Chrome / Desktop) + Node.js Backend  
**Theoretical & Technical Foundations:** Second-Order Cybernetics, System-Environment Hybrids (SEH), Hysteretic State Topologies, Spectral Audio Synthesis, Decolonial Acoustic Confluence [CONCEPT.md, Audio Research.md]  

---

## 1. Executive System Overview

*Sino Cicatrizado (The Scarred Bell)* is a site-specific, distributed, irreversible acoustic apparatus designed as a **System-Environment Hybrid (SEH)**. Operating over the geographic topography of Ouro Preto, Brazil (or any configured coordinate space), the system entangles physical participant movements (Somatic Nodes), Afro-diasporic acoustic resistance, cellular network limits, and device hardware fatigue into a self-organizing cybernetic feedback loop.

### 1.1 Core Axioms
1. **The Irreversibility Principle (The Scar)**: The system rejects the digital myth of "undo" or "reset". Every somatic encounter leaves a permanent parameter trace—a **scar**—deforming the phase space of future sound synthesis ($z_{t+1} = g(x_t, z_t)$).
2. **Non-Trivial Environmental Agency**: GPS jitter, packet dropouts, cellular latency, and battery drain are not bugs to be smoothed over. They are direct co-composers that modulate rhythm syncopation, digital bit-depth, and acoustic filtering.
3. **Decolonial Acoustic Confluence**: Mutual amplification of acoustic streams without erasure of individual identity (Nêgo Bispo framework).

---

## 2. Node Taxonomy & Spatial Topology

The system operates over three node classes within a shared 3D geographical coordinate field (`lat`, `lng`, `alt`):

```text
                      ┌─────────────────────────────────────────┐
                      │         Type 1: Active Towers           │
                      │ (Generative acoustic landmarks, fixed)  │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼ (Spatial Delay: d / 343)
┌─────────────────────────────────┐        │        ┌─────────────────────────────────┐
│      Type 3: Somatic Nodes      ├────────┼───────>│    Type 2: Static Reflectors    │
│ (Mobile clients / echolocators) │        │        │ (Silent somatic memory deposits)│
└─────────────────────────────────┘<───────┴────────└─────────────────────────────────┘
```

### 2.1 Type 1: Active Historical Towers
- **Role**: Permanent, server-defined geographic landmarks (e.g. historical church bell towers of Ouro Preto).
- **Behavior**: Generates continuous Euclidean rhythm sequences (`euclid(k, n)`).
- **Acoustic Profile**: Inharmonic additive synthesis simulating soapstone/bronze acoustics.

### 2.2 Type 2: Static Reflectors (Somatic Memory Deposits)
- **Role**: Fixed, silent coordinate nodes dropped by Type 3 nodes at their current geographic position.
- **Behavior**: Silent by default. Holds an LLM-generated or user-submitted synthesis parameter state.
- **Reaction**: Sounds an acoustic response only when struck by an expanding spatial propagation wave emitted from a Type 1 Tower or a Type 3 Somatic Echolocation Chirp.

### 2.3 Type 3: Somatic Nodes
- **Role**: Active mobile web browser clients running the client Web Audio engine.
- **Behavior**: Renders localized, spatialized audio; transmits position updates; triggers manual active Echolocation Chirps; drops Static Reflectors.

---

## 3. Acoustic & DSP Specification

The sound engine relies on native Web Audio API primitives (`AudioContext`, `OscillatorNode`, `GainNode`, `BiquadFilterNode`, `ScriptProcessorNode`) wrapped in a modular `AbstractAudioEngine` contract.

### 3.1 Inharmonic Additive Bell Synthesis
Each virtual bell sound is constructed using five additive sine partials derived from bronze/soapstone spectral measurements:

$$\text{Partial Ratios} = [1.00 \cdot f_0, \; 1.21 \cdot f_0, \; 1.47 \cdot f_0, \; 1.94 \cdot f_0, \; 2.52 \cdot f_0]$$

Higher partials decay exponentially faster than lower partials:
$$\tau_{\text{partial}} = \frac{\tau_{\text{base}}}{\text{Ratio}_i}$$

### 3.2 Thermodynamic Battery Degradation (BitCrusher Map)
Client hardware battery charge ($E_{\text{battery}} \in [0.0, 1.0]$) directly governs synthesis bit-depth, representing physical entropy and thermodynamic node exhaustion:

$$\text{BitDepth}(E) = \begin{cases} 
16 & \text{if } E \ge 0.50 \\
\text{round}\left(4 + \frac{E - 0.15}{0.35} \cdot 12\right) & \text{if } 0.15 \le E < 0.50 \\
4 & \text{if } E < 0.15 
\end{cases}$$

Non-linear signal quantization equation:
$$y[n] = q \cdot \text{round}\left(\frac{x[n]}{q}\right), \quad \text{where } q = 0.5^{\text{BitDepth}}$$

### 3.3 Pop & Click Prevention Ramping
All parameter modifications (gain, frequency, filter cutoff) must execute using exponential or linear ramping over $2.5\text{ seconds}$ to eliminate transient clicks.

---

## 4. Spatial Physics & Environmental Algorithms

### 4.1 Geographic Distance (Haversine Formula)
For any two coordinates $A(\phi_1, \lambda_1)$ and $B(\phi_2, \lambda_2)$:

$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$
$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$
$$d = R \cdot c \quad (R = 6,371,000\text{ meters})$$

### 4.2 Decentered Spatial Wave Propagation Delay
Sound does not travel instantaneously over physical terrain. An event occurring at distance $d$ is delayed by:

$$t_{\text{delay}} = \frac{d}{v_{\text{sound}}} = \frac{d}{343.0\text{ m/s}}$$

### 4.3 Inverse-Square Gain Attenuation
Volume decays smoothly over distance to avoid audio clipping:

$$\text{Gain}(d) = \min\left(1.0, \; \frac{100.0}{d + 1.0}\right)$$

### 4.4 Acoustic Density Impedance
To prevent overcrowding and saturation in dense urban areas, local reflector density within a $50\text{-meter}$ radius scales down output gain and compresses decay times:

$$I(P) = \sum_{i=1}^{n} \frac{1}{d_i + 1.0} \quad (\text{for all reflectors where } d_i \le 50\text{m})$$
$$\text{AttenuationFactor} = \frac{1}{1.0 + I(P)}$$

---

## 5. Cybernetic Hysteresis Engine

When a Somatic Node passes within $15\text{ meters}$ of a Tower or Reflector, the node's state vector undergoes an irreversible parameter mutation.

$$\text{Parameter}_{t+1} = \text{Parameter}_t + \alpha \cdot e^{-\lambda \cdot d} \cdot (P_{\text{limit}} - \text{Parameter}_t)$$

Where:
- $\alpha = 0.05$ (Scarring coefficient)
- $\lambda = 0.15\text{ m}^{-1}$ (Spatial decay rate)
- $d = \text{Haversine distance in meters}$
- $P_{\text{limit}} = \text{Parameter safety boundary}$

The cumulative parameter deviation is tracked in the node's `scarIndex`.

---

## 6. Real-Time Network & Protocol Specification

### 6.1 WebSocket Protocol Envelopes
All communication passes over WSS using stringified JSON envelopes:

```json
{
  "type": "SOMATIC_POSITION_UPDATE" | "SOMATIC_CHIRP" | "CREATE_REFLECTOR" | "NODE_MUTATED",
  "payload": { ... },
  "timestamp": 1721535300000
}
```

### 6.2 Rate Limits & Filtering
- **Transmit Rate Limit**: Max $4\text{ Hz}$ ($250\text{ ms}$ minimum interval).
- **Distance Threshold**: Somatic Nodes only emit position updates if their movement delta exceeds $5.0\text{ meters}$ relative to the last transmission.

---

## 7. Security, Immunology & Fault Tolerance

1. **Immunological Parsing Layer**: All incoming JSON strings (from LLM preset generation or client payloads) pass through `validateSynthPreset()`. Missing, NaN, or out-of-bounds parameters are clamped or defaulted to the Basal Soapstone Drone ($220\text{ Hz}$).
2. **Sovereign Isolation (Offline Mode)**: If network drops, the client app enters Sovereign Isolation mode. Local synthesis continues using stored tower coordinates and lowpassed filtering without crashing.
3. **Cross-Platform Sensor Abstraction**: Hardware APIs (`navigator.getBattery`, `navigator.geolocation`, `navigator.wakeLock`) are isolated behind adapters with desktop and iOS Safari fallback support.

---

## 8. Data Persistence & Dual-Twin Architecture

The storage layer relies on a local SQLite database (`scarred_bell.db`) running in **WAL (Write-Ahead Logging)** mode.

- **DB 1: The Living City (`nodes` table)**: Dynamic, real-time mutating state vectors for towers and static reflectors.
- **DB 2: The Scarred Twin (`scarred_twin.json`)**: Immutable, read-only static snapshot frozen at the ASC 2026 conference conclusion. Users can toggle between live autopoiesis and historical monument views.
