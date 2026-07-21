# Procedural Sound Engine & DSP Architecture Specification

> **Sino Cicatrizado (The Scarred Bell)**  
> Technical Architecture & DSP Specification for the Real-Time Web Audio Engine

---

## 1. Overview & Zero-Sample Procedural Axiom

The **Sound Engine** in *Sino Cicatrizado* is a 100% procedural, real-time spatial synthesis apparatus built on the native Web Audio API ([web-audio-engine.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/public/js/audio/web-audio-engine.js#L9)).

The engine is decomposed into single-responsibility ES modules under `public/js/audio/`:
- **General Filter & DSP Utilities** ([general-filter.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/public/js/audio/general-filter.js)): Reusable multi-mode filter bank (`applyReflectorDSPChain`), impulse response buffer synthesis, noise buffer generators, and soft-clipping waveshapers.
- **City Generators**:
  - **Ouro Preto** ([generators/ouro-preto.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/public/js/audio/generators/ouro-preto.js)): Sacred bell inharmonic synthesis, deep sub-hum, continuous flux drone, industrial mine FM, and forensic glitch.
  - **Chicago** ([generators/chicago.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/public/js/audio/generators/chicago.js)): L-train track clatter, wind canyon whistles, Lake Michigan maritime foghorn, and drawbridge iron groans.
  - **Shanghai** ([generators/shanghai.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/public/js/audio/generators/shanghai.js)): Temple gongs, Huangpu river ferry foghorn, and soaring Maglev rail sweeps.

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

The sound engine contains **6 procedural sound generators for each city** (a balanced mix of discrete triggers and continuous proximity-based emitters):

### Ouro Preto (6 Generators)
1. **`bell_sacred`** *(Discrete)*: 5-partial inharmonic additive synthesis with exponential damping (Colonial Bronze Towers).
2. **`bell_deep`** *(Discrete)*: Sub-hum ($55\text{Hz} - 140\text{Hz}$) with warm lowpass filtering (Imperial Crypts).
3. **`industrial`** *(Discrete)*: High FM modulation index (`fmIndex` up to $10.0$) (Silver Mine Pickaxe Strikes).
4. **`glitch`** *(Discrete)*: Rapid FM leaps and 2-bit quantization artifacts (Scar Trauma).
5. **`createContinuousEmitterOuroPretoMine`** *(Continuous Proximity)*: Subterranean mine sub-hum ambient emitter.
6. **`createContinuousEmitterOuroPretoDrone`** *(Continuous Proximity)*: Mountain valley flux drone ambient emitter.

### Chicago (6 Generators)
1. **`chicago_rail`** *(Discrete)*: High FM iron friction with bandpass filter sweep (Elevated L-Train Tracks).
2. **`chicago_foghorn`** *(Discrete)*: Dual detuned lowpass brass vessel horn ($110\text{Hz}$) (Chicago Harbor & Riverwalk).
3. **`chicago_bridge`** *(Discrete)*: Steel drawbridge iron groan and sub-harmonic thud (Chicago River Bridges).
4. **`chicago_steam`** *(Discrete)*: Subway vent steam hiss and thermal pressure release.
5. **`createContinuousEmitterChicagoWind`** *(Continuous Proximity)*: Skyscraper wind canyon howling noise & whistle emitter.
6. **`createContinuousEmitterChicagoLake`** *(Continuous Proximity)*: Lake Michigan shoreline & water drift ambient emitter.

### Shanghai (6 Generators)
1. **`triggerShanghaiGong`** *(Impact Modal)*: Imperial bronze gong with multi-partial mode ratios.
2. **`triggerShanghaiRiver`** *(Continuous/Impact)*: Deep sub-bass maritime ferry foghorn with river chorus LFO.
3. **`triggerShanghaiMaglev`** *(Sweep)*: High-frequency electromagnetic FM rail glide.
4. **`triggerShanghaiCicadas`** *(Continuous/Impact)*: High-frequency garden cicadas swarm with 12 Hz tremolo.
5. **`triggerShanghaiConstructionDrums`** *(Impact)*: Sub piling impact pitch drop.
6. **`createContinuousEmitterShanghaiRiver`** *(Continuous Proximity)*: Huangpu river vessel foghorn & water drift ambient emitter.

### SH Noise (6 Generators)
1. **`triggerShanghaiGlitch`** *(Granular Impulse)*: Bitcrushed granular impulse synth with pseudo-random pitch skipping.
2. **`triggerShanghaiHarshFeedback`** *(FM Burst)*: High FM-index screaming feedback burst with resonant bandpass sweep.
3. **`triggerShanghaiCircuitBend`** *(Ring Mod/LFO)*: Rapid stepping pitch LFO with square wave ring-mod circuit bending.
4. **`triggerShanghaiSubRumble`** *(Sub Impact)*: Heavy waveshaped sub-bass impact with sub-harmonic saturation.
5. **`createContinuousEmitterShanghaiNoiseStatic`** *(Continuous Proximity)*: Continuous high-frequency electromagnetic noise & glitch static emitter.
6. **`createContinuousEmitterShanghaiNoiseDrone`** *(Continuous Proximity)*: Continuous sub-bass industrial drone & cellar rumble emitter.
6. **`createContinuousEmitterShanghaiCyber`** *(Continuous Proximity)*: Bund neon & urban electromagnetic resonance ambient emitter.


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

## 9. Continuous Drone Evolution & Somatic Proximity Attenuation

### 9.1 Polyrhythmic Dual-LFO Background Drone
The global background drone (`startContinuousDrone`) uses two asynchronous, out-of-phase LFOs controlling lowpass filter cutoff frequency to generate evolving non-repeating acoustic movement:
- **LFO 1**: $0.011\text{ Hz}$ sine wave ($\pm 110\text{ Hz}$ cutoff swing)
- **LFO 2**: $0.017\text{ Hz}$ triangle wave ($\pm 70\text{ Hz}$ cutoff swing)

### 9.2 Somatic Velocity Brightness Modulation
When the somatic node moves (GPS updates or map location taps), movement velocity $v = \frac{\Delta \text{dist}}{\Delta t}$ dynamically brightens the background drone filter cutoff:
$$\text{Cutoff}_{\text{target}} = \text{Cutoff}_{\text{base}} + \min(v \cdot 25.0, \; 300\text{ Hz})$$

### 9.3 Continuous Spatial Proximity Emitters
Continuous sound generators (e.g. Chicago Wind Canyon, Shanghai River Drift, Ouro Preto Sub-Mine Hum) are anchored to nearby active map nodes. Gain attenuates dynamically according to a quadratic inverse-distance curve:
$$\text{Gain}(d) = \text{clamp}\left(1 - \frac{d}{350\text{ m}}, \; 0, \; 1\right)^2 \cdot \text{Gain}_{\text{max}}$$

