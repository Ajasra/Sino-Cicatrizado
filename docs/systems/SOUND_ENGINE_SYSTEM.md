# Procedural Sound Engine & DSP Architecture Specification

> **Sino Cicatrizado (The Scarred Bell)**  
> Technical Architecture & DSP Specification for the Real-Time Web Audio Engine

---

## 1. Overview & Zero-Sample Procedural Axiom

The **Sound Engine** in *Sino Cicatrizado* is a 100% procedural, real-time spatial synthesis apparatus built on the native Web Audio API ([web-audio-engine.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/public/js/audio/web-audio-engine.js#L9)).

### Core DSP Axioms
1. **Zero External Audio Samples**: No static `.mp3`, `.wav`, or pre-recorded audio files are loaded. Every bell toll, metal strike, drone, and atmospheric reverb tail is synthesized dynamically in JavaScript.
2. **Deterministic & Continuous Parameterization**: Sound output is governed strictly by node state vectors (`baseFrequency`, `harmonicity`, `decay`, `fmIndex`, `filterCutoff`, `bitDepth`, `carrierType`).
3. **Decentered Spatial Propagation**: Sound timing ($t_{\text{delay}} = d / 343\text{ m/s}$) and inverse-square volume attenuation ($\text{Gain}(d) = \frac{100}{d + 1}$) are rendered individually per client listener position.

---

## 2. Signal Flow & Master DSP Topology

```text
 ┌────────────────────────┐
 │ Procedural Generators  │ (Oscillators / FM Modulators / Biquad Filters)
 └───────────┬────────────┘
             │
             ├─── Spatial Convolver Send ───► [ Procedural Impulse Convolver ]
             │                                              │
             ▼                                              ▼
 ┌────────────────────────┐                    ┌────────────────────────┐
 │   Master Gain Node     │◄───────────────────┤ Convolver Gain Returns │
 └───────────┬────────────┘                    └────────────────────────┘
             │
             ├── [ High Battery (>=50%): Clean Path ] ──────────┐
             │                                                  │
             └── [ Low Battery (<50%): ScriptProcessor Bitcrusher ]
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │ Transparent Limiter   │ (-12dBFS threshold, 12:1 ratio)
                     └───────────┬───────────┘
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │ AudioContext.dest     │ (Physical Device Speakers)
                     └───────────────────────┘
```

---

## 3. Inharmonic Additive Bell Synthesis Math

Every sacred bell sound (`bell_sacred`, `bell_deep`, `bell_soapstone`) is constructed using five additive sine partials derived from soapstone and bronze acoustic measurements ([SPEC.md Section 3.1](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/docs/SPEC.md#L58-L64)):

$$\text{Partial Ratios} = [1.00 \cdot f_0, \; 1.21 \cdot f_0, \; 1.47 \cdot f_0, \; 1.94 \cdot f_0, \; 2.52 \cdot f_0]$$

### Exponential Decay Scaling
Higher partials decay exponentially faster than lower fundamental partials to mimic true physical acoustic damping:

$$\tau_{\text{partial}, i} = \frac{\tau_{\text{base}}}{\text{Ratio}_i}$$

```js
// Implementation in triggerSacredBell()
ratios.forEach((ratio, idx) => {
  const freq = baseFreq * ratio;
  const partialDecay = decay / ratio;
  osc.frequency.setValueAtTime(freq, triggerTime);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, triggerTime + partialDecay);
});
```

---

## 4. Sound Archetype Taxonomy

The sound engine contains 11 procedural sound generators tailored to city acoustic profiles:

| Archetype Key | Carrier Wave | Synthesis Method & DSP Signature | Primary Acoustic Profile |
| :--- | :--- | :--- | :--- |
| **`bell_sacred`** | `sine` | 5-partial inharmonic additive synthesis with exponential damping | Ouro Preto Church Towers |
| **`bell_deep`** | `sine` / `triangle` | Low-frequency sub-hum ($55\text{Hz} - 140\text{Hz}$) with warm lowpass filtering | Imperial Monasteries & Crypts |
| **`drone`** | `sawtooth` | Dual detuned lowpass filtered oscillators with slow LFO phase chorus | Mountain Valleys & Caverns |
| **`industrial`** | `sawtooth` / `square` | FM synthesis with high modulation index (`fmIndex` up to $10.0$) | Silver Mines & Pickaxe Strikes |
| **`glitch`** | `square` | Rapid frequency modulation leaps and 2-bit quantization artifacts | Terminal Scar Trauma (> 3.0) |
| **`shanghai_gong`** | `sine` / `triangle` | Eastern Gong ratios ($[0.5, 1.0, 1.12, 1.62, 2.38, 3.14]$) with pitch bend | Jing'an Temple & The Bund |
| **`shanghai_river`**| `sawtooth` | Deep vessel foghorn ($85\text{Hz}$) with slow $0.2\text{Hz}$ water chorus LFO | Huangpu River Vessels |
| **`shanghai_maglev`**| `sawtooth` / `square` | Bandpass filtered soaring frequency sweep ($350\text{Hz} \to 680\text{Hz}$) | High-Speed Maglev Rail |
| **`chicago_rail`** | `sawtooth` / `square` | High FM iron friction with bandpass filter sweep | Elevated L-Train Tracks |
| **`chicago_wind`** | Noise / `sine` | Lowpass filtered wind canyon atmospheric swell | Lake Michigan Shoreline |
| **`chicago_foghorn`**| `square` | Dual detuned lowpass brass vessel horn ($110\text{Hz}$) | Chicago Harbor & Riverwalk |

---

## 5. Procedural Impulse Response Convolvers

Room acoustics and spatial reverberation are rendered using 100% procedurally generated stereo `AudioBuffer` impulse responses ([web-audio-engine.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/public/js/audio/web-audio-engine.js#L102-L150)):

$$\text{Envelope}(t) = e^{-t \cdot \text{decayRate}}, \quad \text{Damp}(t) = e^{-t \cdot 2.2 \cdot \text{decayRate}}$$

```js
// Procedural Impulse Response Generator
const lpCoeff = Math.exp(-2 * Math.PI * targetCutoff / sampleRate);
for (let i = 0; i < length; i++) {
  let rawL = (Math.random() * 2 - 1);
  lastL = lastL * lpCoeff + rawL * (1 - lpCoeff);
  left[i] = (lastL * damp + rawL * envelope * 0.08);
}
```

### Active Convolver Spaces
- **Cathedral (`convolverCathedral`)**: 3.0s warm lowpass exponential decay ($1800\text{ Hz}$ cutoff).
- **Subterranean Mine (`convolverMine`)**: 1.2s dense metallic ring impulse ($2400\text{ Hz}$ cutoff).
- **Mountain Valley (`convolverValley`)**: 4.5s diffuse atmospheric tail ($1200\text{ Hz}$ cutoff).
- **Lakefront Wind Canyon (`convolverWindCanyon`)**: 4.0s wide open atmospheric reverb ($3000\text{ Hz}$ cutoff).
- **Steel Bridge Corridor (`convolverSteelBridge`)**: 1.8s metallic beam reflection ($3500\text{ Hz}$ cutoff).

---

## 6. Rhythmic Sequencer & Syncopation (`NodeSequencer`)

Rhythmic bell tolls are driven by the client-side `NodeSequencer` ([node-sequencer.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/public/js/audio/node-sequencer.js#L5)):

### 6.1 Euclidean Rhythm Spacing ($E(k, n)$)
Beats are spaced using Toussaint's Bjorklund algorithm ([euclidean.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/public/js/audio/euclidean.js#L7-L29)):
- **Rare Solemn Mode**: Sparse beat distribution ($k = 1$ or $2$ beats across $n = 16$ steps) with a slow $1250\text{ ms}$ tick clock.

### 6.2 Hysteretic Beat Perturbation
As a node accumulates scar trauma (`scarIndex`), its rhythm becomes syncopated and broken ([SCARRING_SYSTEM.md Section 6](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/docs/systems/SCARRING_SYSTEM.md#L95-L103)):

$$\text{scarPerturbationProb} = \min(\text{scarIndex} \cdot 0.12, \, 0.35)$$

If a random roll is below `scarPerturbationProb`, the step beat is inverted, producing ghost strikes or skipped beats.

---

## 7. Pop & Click Prevention Ramping

To prevent digital DC offset transients and audio clicks during gain and frequency changes, all Web Audio parameters execute linear or exponential ramps ([SPEC.md Section 3.3](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/docs/SPEC.md#L78-L80)):

```js
// Anti-click attack and decay envelope
gainNode.gain.setValueAtTime(0, triggerTime);
gainNode.gain.linearRampToValueAtTime(targetGain, triggerTime + 0.025); // 25ms attack ramp
gainNode.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay); // exponential decay ramp
```

---

## 8. AudioContext Lifecycle & Unlocking Protocol

Browser autoplay policies prevent Web Audio output prior to user interaction ([audio-context-manager.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/public/js/audio/audio-context-manager.js)):

1. **Overlay Membrane Gate**: Sound playback remains suspended until the user taps the **"UNLOCK AUDIO MEMBRANE"** button.
2. **Context Resumption**: Calling `AudioContext.resume()` unlocks the audio hardware.
3. **Automatic Cleanup**: Every triggered sound schedules node disconnection and garbage collection via `scheduleCleanup()` to prevent memory leaks during long-running performance sessions.
