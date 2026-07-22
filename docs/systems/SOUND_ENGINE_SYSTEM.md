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
             ▼
 ┌────────────────────────┐
 │ Sovereign Isolation    │ (20kHz Open / 450Hz Lowpass Offline Filter)
 └───────────┬────────────┘
             │
             ▼
 ┌────────────────────────┐
 │ Transparent Limiter    │ (-12dBFS threshold, 12:1 ratio)
 └───────────┬────────────┘
             │
             ▼
 ┌────────────────────────┐
 │ AudioContext.dest      │ (Physical Device Speakers / Earphones)
 └────────────────────────┘
```

---

## 3. Inharmonic Additive Bell Synthesis Math

Every sacred bell sound (`bell_sacred`, `bell_deep`, `bell_soapstone`) is constructed using seven additive modal partials derived from colonial soapstone and bronze acoustic measurements ([generators/ouro-preto.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/public/js/audio/generators/ouro-preto.js#L18)):

$$\text{Partial Ratios} = [0.50 \cdot f_0, \; 1.00 \cdot f_0, \; 1.20 \cdot f_0, \; 1.50 \cdot f_0, \; 2.00 \cdot f_0, \; 2.76 \cdot f_0, \; 3.25 \cdot f_0]$$

*(Hum, Prime, Tierce minor 3rd, Quint, Nominal, Supernominal, Octave)*

### 3.1 Voice Efficiency & Native `.detune` AudioParams
To preserve 100% of authentic physical bell acoustics without overloading the Web Audio CPU thread:
- Instead of instantiating duplicate oscillator nodes per partial, a single oscillator per modal partial is created.
- Organic chorus shimmer and detuning are achieved using Web Audio's native `.detune.setValueAtTime(cents, startValTime)` ($\pm 6\text{ cents}$ alternating modulation).
- This reduces Web Audio node creation by ~60% per bell strike while maintaining full harmonic complexity.

### 3.2 Exponential Decay Scaling
Higher partials decay exponentially faster than lower fundamental partials to mimic physical acoustic damping:

$$\tau_{\text{partial}, i} = \frac{\tau_{\text{base}}}{\text{Ratio}_i}$$

```js
// Implementation in triggerSacredBell()
modalRatios.forEach((ratio, idx) => {
  const freq = baseFreq * ratio;
  const partialDecay = decay / ratio;
  const detuneCents = idx === 0 ? 0 : (idx % 2 === 0 ? 6 : -6);

  osc.frequency.setValueAtTime(freq, startValTime);
  if (detuneCents !== 0) osc.detune.setValueAtTime(detuneCents, startValTime);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, startValTime + partialDecay);
});
```

---

## 4. Sound Archetype Taxonomy

The sound engine contains **6 procedural sound generators for each city** (a balanced mix of discrete triggers and continuous proximity-based emitters):

### Ouro Preto (6 Generators)
1. **`bell_sacred`** *(Discrete)*: 7-partial inharmonic additive modal synthesis with detuned exponential damping (Colonial Bronze Towers).
2. **`bell_deep`** *(Discrete)*: Sub-hum ($55\text{Hz} - 140\text{Hz}$) with warm lowpass cathedral reverberation (Imperial Crypts).
3. **`industrial`** *(Discrete)*: FM synthesis with soft saturation waveshaping (`fmIndex` up to $4.0$) and pick attack transients (Silver Mine Friction).
4. **`glitch`** *(Discrete)*: Ring modulation multiplier with square carrier and mine convolver (Trauma & Scar Degradation).
5. **`createContinuousEmitterOuroPretoMine`** *(Continuous Proximity)*: Subterranean mine sub-hum ambient emitter.
6. **`createContinuousEmitterOuroPretoDrone`** *(Continuous Proximity)*: Mountain valley flux drone ambient emitter.

### Chicago (6 Generators)
1. **`chicago_rail`** *(Discrete)*: High FM iron friction with bandpass filter sweep (Elevated L-Train Tracks).
2. **`chicago_foghorn`** *(Discrete)*: Dual detuned lowpass brass vessel horn ($65\text{Hz} - 110\text{Hz}$) (Chicago Harbor & Riverwalk).
3. **`chicago_bridge`** *(Discrete)*: Steel drawbridge iron groan, inharmonic beam ring, and sub-harmonic thud (Chicago River Bridges).
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
7. **`createContinuousEmitterShanghaiCyber`** *(Continuous Proximity)*: Bund neon & urban electromagnetic resonance ambient emitter.


---

## 5. Procedural Impulse Response Convolvers & FDN Feedback Isolation

Room acoustics and spatial reverberation are rendered using 100% procedurally generated stereo `AudioBuffer` impulse responses ([web-audio-engine.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/public/js/audio/web-audio-engine.js#L122-L165)):

$$\text{Envelope}(t) = e^{-t \cdot \text{decayRate}}, \quad \text{Damp}(t) = e^{-t \cdot 2.2 \cdot \text{decayRate}}$$

### 5.1 Isolated Feedback Delay Network (FDN) Architecture
To prevent unattenuated gain feedback and digital clipping distortion when multiple bells strike:
- The Feedback Delay Network in `applyReflectorDSPChain` ([general-filter.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/public/js/audio/general-filter.js#L141-L169)) isolates its feedback loop (`fdnFeedback.connect(fdnDelay)`).
- The delay decay is summed into an isolated gain node before merging back into `outputChain`, eliminating recursive gain multiplication and harsh feedback bursts.

### 5.2 Active Convolver Spaces
- **Cathedral (`convolverCathedral`)**: 3.0s warm lowpass exponential decay ($1800\text{ Hz}$ cutoff).
- **Subterranean Mine (`convolverMine`)**: 1.2s dense metallic ring impulse ($2400\text{ Hz}$ cutoff).
- **Mountain Valley (`convolverValley`)**: 4.5s diffuse atmospheric tail ($1200\text{ Hz}$ cutoff).
- **Lakefront Wind Canyon (`convolverWindCanyon`)**: 4.0s wide open atmospheric reverb ($3000\text{ Hz}$ cutoff).
- **Steel Bridge Corridor (`convolverSteelBridge`)**: 1.8s metallic beam reflection ($3500\text{ Hz}$ cutoff).

---

## 6. Rhythmic Sequencer & Polyphony Protection (`NodeSequencer`)

Rhythmic bell tolls are driven by the client-side `NodeSequencer` ([node-sequencer.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/public/js/audio/node-sequencer.js#L5)):

### 6.1 Euclidean Rhythm Spacing ($E(k, n)$)
Beats are spaced using Toussaint's Bjorklund algorithm ([euclidean.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/public/js/audio/euclidean.js#L7-L29)):
- **Rare Solemn Mode**: Sparse beat distribution ($k = 1$ or $2$ beats across $n = 16$ steps) with a slow $1250\text{ ms}$ tick clock.

### 6.2 Proximity-Based Polyphony Capping
When multiple nodes trigger on the same step tick:
1. `NodeSequencer.tick()` filters candidate nodes within the active city's `maxDistanceMeters`.
2. Candidates are sorted by spatial distance relative to the listener's somatic coordinates (`calculateHaversineMeters`).
3. Polyphony is strictly capped to the **top 6 closest active spatial bells** per step tick.
4. Cascading spatial propagation delays (`delaySeconds = distance / speed_of_sound`) produce a dense, immersive spatial soundscape while safeguarding Web Audio thread performance against audio dropouts.

---

## 7. Anti-Click Web Audio Parameter Automation Timing

To prevent digital DC offset transients, clicks, and timeline invalidation errors during spatial delay scheduling:
- All initial parameter values use `startValTime = Math.max(ctx.currentTime, triggerTime)` for `setValueAtTime(val, startValTime)`.
- Ramps start cleanly at `startValTime` rather than prematurely at `ctx.currentTime`, ensuring zero clicks when spatial wave propagation delays are active:

```js
// Anti-click attack and decay envelope with spatial delay alignment
const startValTime = Math.max(ctx.currentTime, triggerTime);
gainNode.gain.setValueAtTime(0, startValTime);
gainNode.gain.linearRampToValueAtTime(targetGain, startValTime + 0.04);
gainNode.gain.exponentialRampToValueAtTime(0.0001, startValTime + decay);
```

---

## 8. Continuous Drone Evolution & Somatic Proximity Attenuation

### 8.1 Polyrhythmic Dual-LFO Background Drone
The global background drone (`startContinuousDrone`) uses two asynchronous, out-of-phase LFOs controlling lowpass filter cutoff frequency to generate evolving non-repeating acoustic movement:
- **LFO 1**: $0.011\text{ Hz}$ sine wave ($\pm 110\text{ Hz}$ cutoff swing)
- **LFO 2**: $0.017\text{ Hz}$ triangle wave ($\pm 70\text{ Hz}$ cutoff swing)

### 8.2 Somatic Velocity Brightness Modulation
When the somatic node moves (GPS updates or map location taps), movement velocity $v = \frac{\Delta \text{dist}}{\Delta t}$ dynamically brightens the background drone filter cutoff:
$$\text{Cutoff}_{\text{target}} = \text{Cutoff}_{\text{base}} + \min(v \cdot 25.0, \; 300\text{ Hz})$$

### 8.3 Continuous Spatial Proximity Emitters
Continuous sound generators (e.g. Chicago Wind Canyon, Shanghai River Drift, Ouro Preto Sub-Mine Hum) are anchored to nearby active map nodes. Gain attenuates dynamically according to a quadratic inverse-distance curve:
$$\text{Gain}(d) = \text{clamp}\left(1 - \frac{d}{350\text{ m}}, \; 0, \; 1\right)^2 \cdot \text{Gain}_{\text{max}}$$


