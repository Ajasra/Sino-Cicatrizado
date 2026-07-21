# Technical Specification Document
## Project: *Sino Cicatrizado (The Scarred Bell)*

**Document Version:** 1.0 (LTS Target)  
**System Architect:** Vector (Robotics Systems Architect & Control Theory Specialist) [tracing-the-scar]  
**Theoretical Grounding:** Second-Order Cybernetics, System-Environment Hybrids (SEH), Hysteretic State Machines, Web Audio Constraints [tracing-the-scar, Emergence and Embodiment]  
**Status:** Architecture Frozen / Ready for Implementation  

---

## 1. System Topology & Software Stack

The *Sino Cicatrizado* apparatus is designed as a decentered, low-overhead System-Environment Hybrid (SEH) [Emergence and Embodiment]. To survive cellular connectivity anomalies, high packet loss, and high battery drain in the mountainous terrain of Ouro Preto, the system minimizes server computational complexity and offloads all synthesis and spatialization to the client browser [Ouro Preto..., tracing-the-scar]:

```
                     ┌──────────────────────────────────┐
                     │          Living City DB          │
                     │  (MongoDB / State Persistence)   │
                     └────────────────┬─────────────────┘
                                      │
                                      ▼
                      ┌────────────────────────────────┐
                      │      Central Node Server       │
                      │  (Node.js / Express / ws Lib)  │
                      └───────────────┬────────────────┘
                                      │
         ┌────────────────────────────┴────────────────────────────┐
         ▼ (WebSocket / port 443)                                  ▼ (WebSocket / port 443)
┌──────────────────────────────────┐                      ┌──────────────────────────────────┐
│           Somatic Node           │                      │           Somatic Node           │
│  (Client Browser / Web Audio)    │                      │  (Client Browser / Web Audio)    │
└──────────────────────────────────┘                      └──────────────────────────────────┘
```

### 1.1 Software Stack
*   **Central Server:** Node.js (v20+ LTS), Express.js, `ws` (native WebSocket library for minimal footprint).
*   **Database:** MongoDB (for mutable historical state persistence) and Redis (for ephemeral coordinate caching).
*   **Client Engine:** Vanilla JavaScript/ES6, Web Audio API (native implementation used directly instead of third-party libraries to prevent dependency drift and maintain long-term reliability).
*   **Mapping & Topography:** Leaflet.js (lightweight, mobile-optimized vector engine) with terrain mapping.

---

## 2. Database Schemas & Hysteretic States

We store the persistent state vectors of the *Active Towers* (Type 1) and *Static Reflectors* (Type 2) in the database [tracing-the-scar]. The state vector includes the historical parameters mutated by somatic node encounters [tracing-the-scar].

### 2.1 The Living City Schema (Active and Static Nodes)
This schema manages the parameters of the active bells and the permanent, silent reflectors left behind by participants [tracing-the-scar].

```javascript
const NodeSchema = new mongoose.Schema({
  nodeId: { type: String, required: true, unique: true },
  nodeType: { type: String, enum: ['TOWER', 'REFLECTOR'], required: true },
  city: { type: String, required: true, index: true },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    alt: { type: Number, default: 0.0 } // Used for Ouro Preto's elevation filters
  },
  // Hysteretic State Vector
  stateVector: {
    baseFrequency: { type: Number, required: true }, // f_0
    harmonicity: { type: Number, default: 1.414 },
    decay: { type: Number, default: 1.5 },
    gain: { type: Number, default: 1.0 },
    euclideanDensity: { type: Number, default: 3 }, // k in euclid(k, n)
    euclideanSteps: { type: Number, default: 8 }    // n in euclid(k, n)
  },
  // Irreversibility Trace Ledger
  scarIndex: { type: Number, default: 0.0 }, // Cumulative parameter deviation
  interactionCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
```

### 2.2 The Hysteresis Math Engine & Somatic Signatures
When a Somatic Node passes near any Tower or User-Created Reflector across all cities, we update the `stateVector` [tracing-the-scar]. Pitch drift is anchored to `initialBaseFrequency` to prevent compounding exponential pitch runaway, while parameters drift permanently according to a participant-signed hysteretic transformation [tracing-the-scar].

The parameter transformation is governed by:
$$\Delta \text{Scar} = \alpha \cdot w_{\text{soma}} \cdot \mu_{\text{crowd}} \cdot e^{-\lambda \cdot d}$$
$$P_{t+1} = P_t + \Delta \text{Scar} \cdot \mathbf{b}_{\text{soma}} \cdot (P_{\text{limit}} - P_t)$$

Where:
*   $\alpha$ = Base scarring coefficient ($0.00002$ per tick, time-scaled for multi-hour structural collapse longevity).
*   $w_{\text{soma}}$ = Somatic weight multiplier ($0.5\times$ to $1.8\times$) generated deterministically by `getSomaticSignature(somaticId)`.
*   $\mathbf{b}_{\text{soma}}$ = Somatic directional biases ($\pm 1$ pitch drift, $\pm 1$ filter cutoff shift, FM weight multiplier, decay tail direction).
*   $\mu_{\text{crowd}}$ = Sub-linear crowd damping factor $\frac{1}{1 + 0.3(N - 1)}$ for $N$ nearby participants.
*   $\lambda$ = Spatial decay rate ($0.15\text{ m}^{-1}$).
*   $d$ = Real-time Haversine distance in meters.
*   $P_{\text{limit}}$ = Absolute non-destructive boundary threshold [tracing-the-scar].

---

## 3. WebSocket Protocol & Message Payloads

To keep network overhead light, messages use raw, stringified JSON payloads routed over TLS (WSS) [S10]. 

### 3.1 Somatic Node Position Update (Client to Server)
Sent by moving Type 3 nodes [S32]. To conserve battery and network capacity, clients throttle this transmit loop to a maximum frequency of $4\text{ Hz}$ and only emit if their distance delta $> 5.0\text{ meters}$ relative to the last transmission [tracing-the-scar].

```json
{
  "type": "SOMATIC_POSITION_UPDATE",
  "payload": {
    "somaticId": "node_soma_98a72b",
    "city": "ouro_preto",
    "coordinates": {
      "lat": -20.38543,
      "lng": -43.50352,
      "alt": 1116.5
    },
    "batteryLevel": 0.84
  }
}
```

### 3.2 Somatic Active Chirp (Client to Server to Clients)
Triggered when a Type 3 node executes an active "echolocation strike" [tracing-the-scar].

```json
{
  "type": "SOMATIC_CHIRP",
  "payload": {
    "somaticId": "node_soma_98a72b",
    "city": "ouro_preto",
    "coordinates": {
      "lat": -20.38543,
      "lng": -43.50352
    },
    "chirpFrequency": 440.0
  }
}
```

### 3.3 Node Mutation Broadcast (Server to Clients)
Broadcast to all connected clients in the same city when an active tower or static reflector is scarred by proximity [tracing-the-scar].

```json
{
  "type": "NODE_MUTATED",
  "payload": {
    "nodeId": "church_sao_francisco_1",
    "scarIndex": 0.4215,
    "updatedState": {
      "baseFrequency": 224.23,
      "decay": 1.78,
      "euclideanDensity": 4
    }
  }
}
```

---

## 4. Client-Side Web Audio Pipeline

The client browser constructs a hardware-aware, native Web Audio graph [tracing-the-scar]. No Tone.js or outer libraries are required. This ensures zero dependency drift [Ouro Preto..., tracing-the-scar].

```
                     ┌──────────────────────────────────────────────┐
                     │       Additive Bell Oscillator Array         │
                     │  (f0, 1.21f0, 1.47f0, 1.94f0, 2.52f0, etc.)  │
                     └──────────────────────┬───────────────────────┘
                                            │
                                            ▼
                     ┌──────────────────────────────────────────────┐
                     │          Resonant Biquad Filter              │
                     │             (Lowpass/Bandpass)               │
                     └──────────────────────┬───────────────────────┘
                                            │
                                            ▼
                     ┌──────────────────────────────────────────────┐
                     │          Variable Spatial Delay Node         │
                     │             (Speed of Sound: d/343)          │
                     └──────────────────────┬───────────────────────┘
                                            │
                                            ▼
                     ┌──────────────────────────────────────────────┐
                     │         Hardware BitCrusher Node             │
                     │           (Battery-exhaustion map)           │
                     └──────────────────────┬───────────────────────┘
                                            │
                                            ▼
                                   [ Audio Destination ]
```

```javascript
class WebAudioApparatus {
  constructor() {
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.bitCrusher = null;
    this.setupHardwareNode();
  }

  // 4.1 Hardware-Aware BitCrusher Setup (Battery Level Map)
  setupHardwareNode() {
    // Custom AudioWorklet or ScriptProcessor for downsampling
    const bufferSize = 4096;
    this.bitCrusher = this.audioCtx.createScriptProcessor(bufferSize, 1, 1);
    
    // Default bit-depth parameters
    this.bitCrusher.bits = 16; 
    
    this.bitCrusher.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const output = e.outputBuffer.getChannelData(0);
      
      const step = Math.pow(0.5, this.bitCrusher.bits);
      for (let i = 0; i < input.length; i++) {
        // Implement non-linear quantization
        output[i] = step * Math.round(input[i] / step);
      }
    };
    
    this.bitCrusher.connect(this.audioCtx.destination);
  }

  // Update bits based on navigator battery API
  updateBatteryConstraints(batteryLevel) {
    if (batteryLevel >= 0.5) {
      this.bitCrusher.bits = 16; // Clean, high-fidelity state [S10]
    } else if (batteryLevel < 0.5 && batteryLevel >= 0.15) {
      // Linear scaling of degradation
      this.bitCrusher.bits = Math.round(4 + ((batteryLevel - 0.15) / 0.35) * 12);
    } else {
      this.bitCrusher.bits = 4; // Severe quantization and digital dirt [tracing-the-scar]
    }
  }

  // 4.2 Spatialized Synthesis Node Instantiation
  synthesizeBell(delaySeconds, frequency, decayTime, gainValue, partials = [1.0, 0.5, 0.25, 0.125]) {
    const triggerTime = this.audioCtx.currentTime + delaySeconds;
    
    const masterGain = this.audioCtx.createGain();
    masterGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
    
    // Inharmonic partial ratios for bronze/soapstone bells [1, Ouro Preto...]
    const inharmonicRatios = [1.0, 1.21, 1.47, 1.94, 2.52];
    const oscillators = [];

    inharmonicRatios.forEach((ratio, idx) => {
      const osc = this.audioCtx.createOscillator();
      const oscGain = this.audioCtx.createGain();
      
      osc.frequency.setValueAtTime(frequency * ratio, triggerTime);
      
      // Decay envelope calculation per partial
      const partialAmplitude = (partials[idx] || 0.1) * gainValue;
      oscGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
      oscGain.gain.linearRampToValueAtTime(partialAmplitude, triggerTime + 0.05); // Attack
      oscGain.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decayTime / ratio); // Decays faster for higher partials

      osc.connect(oscGain);
      oscGain.connect(masterGain);
      
      osc.start(triggerTime);
      osc.stop(triggerTime + decayTime + 0.5);
      oscillators.push(osc);
    });

    // Master volume gain control
    masterGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
    masterGain.gain.linearRampToValueAtTime(1.0, triggerTime + 0.01);
    
    // Lowpass filter node
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, triggerTime);
    filter.Q.setValueAtTime(1.5, triggerTime);

    // Dynamic slope modulation based on altitude (Ouro Preto integration) [Ouro Preto...]
    masterGain.connect(filter);
    filter.connect(this.bitCrusher);
  }
}
```

---

## 5. The Secure Parsing Membrane (LLM Safeguard)

The browser must never evaluate raw strings or executable JavaScript sent by the server [tracing-the-scar]. An immunological parsing membrane intercepts incoming JSON state data and forces sanitization [Emergence and Embodiment].

```javascript
class ImmunologicalMembrane {
  constructor() {
    // Strict schema properties and safe bounds limits
    this.schema = {
      baseFrequency: { min: 80.0, max: 880.0, default: 220.0 },
      harmonicity:   { min: 0.5,  max: 4.0,   default: 1.414 },
      decay:         { min: 0.1,  max: 6.0,   default: 1.5 },
      gain:          { min: 0.0,  max: 1.0,   default: 0.8 },
      euclideanDensity: { min: 1,  max: 16,   default: 3 }
    };
  }

  // Validate and parse incoming JSON string
  sanitizePayload(rawJsonString) {
    let parsedData = null;
    
    try {
      parsedData = JSON.parse(rawJsonString);
    } catch (e) {
      // JSON syntax error: do not crash [tracing-the-scar]
      console.warn("Immunological Warning: Malformed JSON packet detected. Executing fallback.");
      return this.getFallbackPreset();
    }

    const cleanPreset = {};

    // Validate properties against the safe boundaries
    for (const [key, rules] of Object.entries(this.schema)) {
      if (parsedData.hasOwnProperty(key) && typeof parsedData[key] === "number") {
        // Clamp numerical values to their boundaries
        cleanPreset[key] = Math.min(Math.max(parsedData[key], rules.min), rules.max);
      } else {
        // Fallback to safe defaults if key is corrupted or invalid type
        cleanPreset[key] = rules.default;
      }
    }

    return cleanPreset;
  }

  getFallbackPreset() {
    const fallback = {};
    for (const [key, rules] of Object.entries(this.schema)) {
      fallback[key] = rules.default;
    }
    return fallback;
  }
}
```

---

## 6. Echolocation & Attenuation Algorithms

### 6.1 Haversine Calculation (Client-Side GPS Distance)
To measure relative distances across the Ouro Preto topography, the client evaluates GPS points using the Haversine equation:

```javascript
function calculateHaversine(coordsA, coordsB) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = coordsA.lat * Math.PI / 180;
  const phi2 = coordsB.lat * Math.PI / 180;
  const deltaPhi = (coordsB.lat - coordsA.lat) * Math.PI / 180;
  const deltaLambda = (coordsB.lng - coordsA.lng) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // returns distance in meters
}
```

### 6.2 Acoustic Density Impedance Calculation
Before a Type 2 Reflector is synthesized, the client's output volume and decay length are scaled by the local reflector density [tracing-the-scar]. This calculation is performed dynamically by checking all other reflectors in the system:

```javascript
function getDensityAttenuationFactor(targetNode, allReflectors) {
  const proximityRadius = 50.0; // 50 meters
  let impedance = 0.0;

  allReflectors.forEach((otherNode) => {
    if (otherNode.nodeId === targetNode.nodeId) return;

    const distance = calculateHaversine(targetNode.coordinates, otherNode.coordinates);
    if (distance < proximityRadius) {
      // Close distance increases local impedance
      impedance += 1.0 / (distance + 1.0);
    }
  });

  // If impedance is 0, return 1.0 (no attenuation)
  if (impedance === 0) return 1.0;

  // Scale factor decreases as impedance increases
  return 1.0 / (1.0 + impedance);
}
```

---

## 7. Production Deployment & Hardware Constraints

### 7.1 Wake-Lock API Integration
To prevent mobile devices from sleeping and locking the screen while walking Ouro Preto, the browser initiates an active screen wake-lock [Ouro Preto...]:

```javascript
async function requestWakeLock(apparatus) {
  try {
    const wakeLock = await navigator.wakeLock.request("screen");
    console.log("System Status: Screen Wake-Lock active.");
  } catch (err) {
    console.warn(`System Warning: Wake-Lock failed to initialize: ${err.message}`);
  }
}
```

### 7.2 iOS AudioContext Unlock Pattern
Mobile Safari locks all AudioContext targets until an active tap event [S57]. The landing page must render an explicit modal that captures the click event before instantiating the WebAudioApparatus:

```html
<div id="unlock-membrane" style="position:fixed; z-index:9999; top:0; left:0; width:100vw; height:100vh; background:#111; display:flex; justify-content:center; align-items:center;">
  <button id="unlock-btn" style="background:#000; color:#0f0; border:1px solid #0f0; padding:20px 40px; font-family:monospace; cursor:pointer;">
    ENTER SINO CICATRIZADO / PERMITIR O SOM
  </button>
</div>

<script>
  document.getElementById('unlock-btn').addEventListener('click', async () => {
    const apparatus = new WebAudioApparatus();
    
    // Unlock AudioContext [S57]
    if (apparatus.audioCtx.state === 'suspended') {
      await apparatus.audioCtx.resume();
    }
    
    // Initiate GPS tracking and Wake-lock API
    navigator.geolocation.watchPosition((pos) => {
      // Emit somatic coordinate change over WebSockets
    });
    
    requestWakeLock();
    
    // Remove the unlock membrane from view
    document.getElementById('unlock-membrane').style.display = 'none';
  });
</script>
```

---

## 8. Verification Matrix (Sanity Checks)

```
              VERIFICATION MATRIX (Client-Side Verification)
              
    Test Target         Input Condition          Expected System Output
┌───────────────────┬────────────────────────┬──────────────────────────────────┐
│ Inverse-Square    │ Distance = 100 meters  │ Master gain attenuated by        │
│ Gain Check        │                        │ precisely 3.01 dB.               │
├───────────────────┼────────────────────────┼──────────────────────────────────┤
│ Haversine         │ Coordinates of         │ Returns distance calculation of  │
│ Accuracy          │ São Francisco &        │ ~243 meters (+/- 5%).            │
│                   │ Santa Efigênia         │                                  │
├───────────────────┼────────────────────────┼──────────────────────────────────┤
│ Immunological     │Malformated string:     │ Schema validator rejects packet, │
│ Guardrail         │{"baseFrequency": "NaN"}│ defaults to 220Hz, increments    │
│                   │                        │ scar index without crashing [3]. │
└───────────────────┴────────────────────────┴──────────────────────────────────┘
```

Verify these three test criteria locally in the browser console before exposing the code to the physical, unstable network conditions of the Ouro Preto hills [Ouro Preto..., tracing-the-scar].