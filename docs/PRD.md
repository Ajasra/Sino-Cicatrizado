# Product Requirement Document (PRD)
## Project: *Sino Cicatrizado (The Scarred Bell)*

**Document Version:** 1.0 (L LTS)  
**System Architect:** Vector (Robotics Systems Architect & Control Theory Specialist) [tracing-the-scar]  
**Theoretical Grounding:** Second-Order Cybernetics, System-Environment Hybrids (SEH), Hysteretic State Machines, Web Audio Constraints [tracing-the-scar, Emergence and Embodiment]  
**Status:** Architecture Frozen / Pending Implementation  

---

## 1. System Overview & Philosophical Framework

*Sino Cicatrizado (The Scarred Bell)* is a distributed, location-based, irreversible acoustic system designed as a **System-Environment Hybrid (SEH)** [Emergence and Embodiment]. It converts the physical topography of Ouro Preto, Brazil (or any configured city) into an active, self-organizing acoustic feedback loop [Ouro Preto..., tracing-the-scar].

The system rejects the "erasure paradigm" (the digital illusion of "undo") [tracing-the-scar]. Every action performed by a participant (somatic node) is written to the system as a permanent physical-discursive trace—a **scar**—that deforms the future state space of the soundscape [tracing-the-scar, S33, S42].

### Engineering Pragmatism (The Reality Gap)
We assume the physical environment is noisy and unstable [tracing-the-scar]:
1.  **GPS Jitter:** We treat GPS drift not as a bug to smooth over, but as a non-trivial environmental noise source that modulates the synthesis parameters [tracing-the-scar].
2.  **Cellular Latency:** Packet loss and network delay are directly converted into digital glitches and quantization errors in the synthesis engine, exposing the physical limits of the communication infrastructure [tracing-the-scar, 3].
3.  **Hardware Fatigue:** The participant's mobile device battery level ($E_{\text{battery}}$) acts as a physical system constraint, degrading synthesis fidelity (bit-depth) as charge dissipates to mimic thermodynamic exhaustion [tracing-the-scar].

---

## 2. System Architecture & Node Topology

The system consists of three distinct node types cooperating within a shared coordinate field:

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
*   **Definition:** Permanent, server-defined geographic landmarks (e.g., coordinates of the historical churches of Ouro Preto) [Ouro Preto...].
*   **Behavior:** They run continuous, generative Euclidean rhythm sequences [16, 48].
*   **Acoustic Profile:** Rich additive bell synthesis with inharmonic partial structures [1].

### 2.2 Type 2: Static Reflectors (Somatic Memory Deposits)
*   **Definition:** Fixed, silent coordinate nodes dropped by Type 3 nodes at their current location [tracing-the-scar]. They remain anchored to the Earth and do not move with the participant [tracing-the-scar].
*   **Behavior:** They are normally silent. They carry a custom, LLM-generated synthesizer preset representing the creator's logged emotional state or intent (the "transfer function") [S11, tracing-the-scar].
*   **Reaction:** They only output sound when triggered by a propagation wave from an active tower or an echolocation chirp from a somatic node [tracing-the-scar].

### 2.3 Type 3: Somatic Nodes (Active Echolocators)
*   **Definition:** The real-time coordinates of active mobile browser clients [S32].
*   **Behavior:** They render the spatialized global soundscape locally in their headphones [27]. They can actively trigger a "somatic chirp" (echolocation pulse) that propagates outward through the network to audit the surrounding virtual architecture [tracing-the-scar].

---

## 3. Core Technical Specifications

### 3.1 Web Audio Engine (Tone.js)
The client-side audio engine must run natively in standard mobile browsers (Safari iOS, Chrome Android) using Tone.js [1.1.6].

*   **Synthesis Architecture:** Each virtual bell relies on a multi-oscillator additive patch [1].
    *   *Base Carrier:* Sine wave ($f_0$) [S5].
    *   *Inharmonic Partials:* $1.21 \cdot f_0$, $1.47 \cdot f_0$, $1.94 \cdot f_0$, and $2.52 \cdot f_0$ to replicate bronze/soapstone acoustic structures [1, Ouro Preto...].
*   **Hysteretic Damping:** To prevent feedback loops and signal clipping during high-frequency coordinate updates, all parameter transitions must use exponential ramping over a minimum duration of 2.5 seconds:
    $$\text{TargetParameter}.\text{exponentialRampTo}(\text{newValue}, 2.5)$$

### 3.2 Decentered Spatial Propagation Engine
We enforce physical wave propagation speed to preserve local time anomalies [tracing-the-scar]:
*   **Propagation Delay:** Sound events triggered at coordinate $A$ are heard by participant $B$ only after a geographic delay calculated using the Haversine distance ($d$) and the physical speed of sound ($v_{\text{sound}} = 343\text{ m/s}$):
    $$\text{Delay}_{\text{seconds}} = \frac{d}{343.0}$$
*   **Amplitude Attenuation:** Volume decays over distance using a modified inverse-square law to keep local nodes clear without saturating distant participants:
    $$\text{Gain} = \min\left(1.0, \frac{100.0}{d + 1.0}\right)$$

### 3.3 LLM Prompt Membrane & Secure Parsing Layer
When a participant submits an emotional state to generate a Type 2 Reflector, the prompt is processed server-side to prevent client-side script injection or synthesis engine crashes [tracing-the-scar]:

*   **Secure Prompt Constraints:** The LLM is strictly prompted to return *only* a serialized JSON object conforming to the synth parameter schema:
    ```json
    {
      "carrierType": "sine" | "triangle" | "sawtooth",
      "harmonicity": 1.414,
      "envelope": { "attack": 0.1, "decay": 1.5, "release": 2.0 },
      "filterCutoff": 450,
      "resonance": 2.5
    }
    ```
*   **Immunological Parsing Layer:** The client application parses the JSON using a validation function [Emergence and Embodiment].
    *   If properties are missing, out of bounds (e.g., frequency $> 2000\text{ Hz}$ or release $> 10.0\text{ s}$), or contain invalid strings, the parser overrides them with a default "safe" parameter preset.
    *   If parsing fails completely, the app falls back to the default "basal soapstone drone" [Ouro Preto...] and increments the node's local `scar_compilation_error` metadata counter [tracing-the-scar].

### 3.4 Acoustic Density Impedance
To prevent urban coordinates from becoming unlistenable due to participant crowding, the system automatically attenuates output based on local node density [tracing-the-scar]:

*   **Acoustic Impedance Calculation:** For any coordinate $P$, the local impedance ($I$) is calculated relative to all static reflectors ($n$) within a $50\text{-meter}$ radius:
    $$I = \sum_{i=1}^{n} \frac{1}{d_i + 1.0}$$
*   **Parameter Scaling:** As $I \to \infty$, the maximum gain of all Type 2 nodes in that cluster is scaled by $1/I$, and their decay times are compressed. This structurally forces participants to distribute themselves across the terrain to hear their custom synthesis states [tracing-the-scar].

### 3.5 Hardware-Aware Synthesis Throttling
We integrate physical device constraints directly into the aesthetic output [tracing-the-scar]:

*   **Battery Expiration Mapping:** The client-side app queries the Battery Status API (`navigator.getBattery()`) [tracing-the-scar].
*   **Bit-Depth Reduction:** The battery level parameter ($E_{\text{battery}} \in [0.0, 1.0]$) is mapped to a Tone.js `BitCrusher` node [1.1.6]:
    *   When $E_{\text{battery}} \ge 0.5$: Bit-depth is 16-bit (clean synthesis) [S10].
    *   As $E_{\text{battery}} \to 0.1$: Bit-depth is dynamically scaled down to 4-bit, introducing raw digital noise, harmonic distortion, and quantization artifacts to represent the physical exhaustion of the somatic node [tracing-the-scar, 3].

---

## 4. Communication & Database Architecture

```
                  ┌────────────────────────────────┐
                  │      Central Server Node       │
                  │   (Express.js / WS / Redis)    │
                  └───────────────┬────────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
┌─────────────────────────────────┐               ┌─────────────────────────────────┐
│        Living City DB           │               │        Scarred Twin DB          │
│ (MongoDB / Mutable States)      │               │ (S3 Snapshot / Read-Only JSON)  │
└─────────────────────────────────┘               └─────────────────────────────────┘
```

### 4.1 WebSocket Protocol (Real-Time Synchrony)
A lightweight Node.js WebSocket server manages real-time somatic state distribution:

*   **Somatic State Message:** Somatic nodes transmit their real-time coordinates only when they cross a $5\text{-meter}$ threshold from their last recorded position (preventing network flood) [tracing-the-scar].
*   **Broadcast Frame Rate:** The server collects and broadcasts somatic coordinate state changes at a maximum rate of $4\text{ Hz}$ ($250\text{ ms}$ intervals).

### 4.2 State Hysteresis & Path Memory
Towers and Reflectors carry a mutable `stateVector` in the database.
*   **Irreversible Deformation:** When a Somatic Node passes within $15\text{ meters}$ of a Tower or Reflector, the server calculates a permanent parameter mutation.
*   The parameter does not return to its initial value ($P_0$) [tracing-the-scar]. It uses a path-dependent hysteretic loop:
    $$P_{t+1} = P_t + \alpha \cdot \text{Proximity} \cdot (P_{\text{limit}} - P_t)$$
    Where $\alpha$ is the permanent scaling coefficient of the scar [tracing-the-scar]. The parameter can drift or bounce, but its trajectory permanently retains the memory of the encounter [tracing-the-scar].

### 4.3 The Dual-Twin Database Architecture
The database is bifurcated to preserve both autopoiesis and historical memory [Emergence and Embodiment, tracing-the-scar]:

*   **DB 1: The Living City:** A dynamic database tracking the ongoing, real-time mutations of Ouro Preto’s bells [Ouro Preto..., tracing-the-scar]. It never resets [tracing-the-scar].
*   **DB 2: The Scarred Twin:** A read-only snapshot taken at the exact conclusion of the ASC 2026 conference [Ouro Preto..., tracing-the-scar]. It is archived as an immutable static dataset. Participants can toggle between the mutating *Living City* or load the *Scarred Twin* to experience the frozen historical performance of the ASC collective [Ouro Preto..., tracing-the-scar].

---

## 5. Non-Functional & Safety Requirements

### 5.1 Network Failure & Fault Tolerance
*   **Offline Mode:** If WebSockets or network connections drop out, the client app does not crash or display an error modal. It quietly enters **Sovereign Isolation** mode [tracing-the-scar].
*   **Offline Simulation:** The app continues to simulate its own local coordinates and local active towers using stored coordinates in `localStorage`. The local synthesizer runs uninterrupted, but its sound is heavily low-passed to signal network isolation [tracing-the-scar].
*   **Re-syncing:** Upon network reconnection, local parameters are slowly ramped back into alignment with the server's global state using a 5-second exponential curve to prevent sudden, violent audio transitions.

### 5.2 Client-Side Power Protection
*   **CPU Watchdog:** If the Web Audio API thread takes more than $40\%$ of the client-side CPU resources, the app's internal scheduler automatically shuts down secondary partials, dropping the additive synthesis complexity down to a simple carrier sine wave until the processor thermal/load conditions stabilize.

### 5.3 Mobile Browser Constraints
*   **AudioContext Unlock:** Mobile browsers block audio until direct interaction occurs [S57]. The landing page must feature a single, high-contrast button reading *"Enter the Campanile / Permita o Som"* to unlock the AudioContext [Ouro Preto...].
*   **iOS Background Execution:** Because iOS Safari restricts WebSocket and Geolocation execution when the screen is locked, the app must include a persistent wake-lock or prompt the participant to keep their screen active while walking.

---

## 6. Verification and Sanity Checks

Before launching the system in the field at Ouro Preto, the following local simulations must be run [Ouro Preto..., tracing-the-scar]:

1.  **Inverse-Square Attenuation Sanity Check:** Verify in a mock browser environment that a coordinate shift of $500\text{ meters}$ attenuates the gain by precisely $14\text{ dB}$, preventing local audio driver clipping.
2.  **Hysteresis Validation:** Run the state machine through 10,000 somatic node proximity events. Verify that the system's baseline parameters never return to $P_0$ and that they do not diverge to infinity (parameter limits must be mathematically bound by $P_{\text{limit}}$).
3.  **JSON Immunization Test:** Input a heavily corrupted, malicious JSON payload into the parser. Confirm that the parser catches the error, falls back to the default soapstone drone, and records the event in the metadata scar-counter without halting the execution loop [Ouro Preto..., tracing-the-scar].

The system architecture is now frozen. Proceed to step-level code construction.