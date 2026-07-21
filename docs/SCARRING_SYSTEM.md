# Cybernetic Scarring System Specification

> **Sino Cicatrizado (The Scarred Bell)**  
> Technical Architecture & Mathematical Specification for Hysteretic State Mutation

---

## 1. Overview & Cybernetic Principles

The **Scarring System** governs the irreversible accumulation of physical wear, acoustic deformation, and trauma on sound nodes (towers and reflectors) in *Sino Cicatrizado*. 

Rooted in **Second-Order Cybernetics** and **Hysteresis theory**, the system explicitly rejects the digital myth of an "undo" button or automatic reset:
- **Irreversible Path Memory**: Once a participant interacts with a sound node, the node's state vector ($P$) permanently retains the imprint of that encounter.
- **Hysteretic Non-Return**: Parameters drift away from initial baseline values ($P_0$) and do not naturally heal or revert to pristine conditions.
- **Cumulative Trajectory**: Every node maintains a `scarIndex` representing its total accumulated physical trauma.

---

## 2. Spatial Trigger & Accumulation Math

Proximity evaluation runs on the server at **$4\text{ Hz}$** ($250\text{ ms}$ broadcast loop) for every active participant (Somatic Node) near a sound node.

### 2.1 Spatial Proximity Threshold
- **Interaction Zone**: $d \le 15.0\text{ meters}$ (measured via client/server Haversine distance metric).
- **Spatial Decay Weight**:
  $$\text{spatialWeight} = e^{-\lambda \cdot d} \quad (\lambda = 0.15\text{ m}^{-1})$$

### 2.2 Scar Increment Formula
Every tick where a participant is within range, the node's `scarIndex` increments by:

$$\Delta \text{Scar} = \alpha \cdot w_{\text{soma}} \cdot \mu_{\text{crowd}} \cdot \text{spatialWeight}$$
$$\text{scarIndex}_{t+1} = \text{scarIndex}_t + \Delta \text{Scar}$$

Where:
- $\alpha = 0.00002$: Base scarring coefficient per $250\text{ ms}$ frame tick (~$0.00008\text{ / second}$).
- $w_{\text{soma}}$: Deterministic participant weight multiplier ($0.5\times$ to $1.8\times$).
- $\mu_{\text{crowd}}$: Sub-linear crowd damping multiplier.

---

## 3. Participant Somatic Signatures (`somaticSignature`)

Rather than treating all participants identically, each user possesses a unique, deterministic **Somatic Signature** derived from their `somaticId` using a djb2 hash function ([hysteresis.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/server/services/hysteresis.js#L8-L34)).

| Signature Parameter | Range / Values | Description |
| :--- | :--- | :--- |
| **`weightMultiplier` ($w_{\text{soma}}$)** | `0.5` to `1.8` | Scales individual scarring intensity per participant. |
| **`pitchDir`** | `+1` or `-1` | Determines whether microtonal pitch sways upward or downward. |
| **`filterDir`** | `+1` or `-1` | Determines whether resonance shifts brighter ($+1$) or darker ($-1$). |
| **`fmWeight`** | `0.5` to `2.0` | Controls participant sensitivity for creating harsh FM overtones. |
| **`decayDir`** | `+1` or `-1` | Determines whether envelope decay lengthens ($+1$) or shortens ($-1$). |

*Result*: Every bell node retains a composite physical fingerprint reflecting the unique combination of participants who spent time near it.

---

## 4. Sub-linear Crowd Damping

To prevent large crowds at famous coordinates (e.g., historical monuments) from causing instant node collapse, multi-user proximity is scaled sublinearly:

$$\mu_{\text{crowd}} = \frac{1}{1 + 0.3 \cdot (N - 1)}$$

For $N$ participants simultaneously present at a node:
- **1 User**: $\mu_{\text{crowd}} = 1.00$ (Rate multiplier = $1.0\times$)
- **5 Users**: $\mu_{\text{crowd}} = 0.45$ (Combined rate multiplier = $2.27\times$)
- **10 Users**: $\mu_{\text{crowd}} = 0.27$ (Combined rate multiplier = $2.70\times$)
- **50 Users**: $\mu_{\text{crowd}} = 0.06$ (Combined rate multiplier = $3.18\times$)

---

## 5. Affected Parameters & Boundaries

All sound node state vector mutations are mathematically constrained within safe DSP parameter boundaries (`CONFIG.PARAMETER_BOUNDS`).

$$\text{Parameter}_{t+1} = \text{clamp}\left(\text{Parameter}_t + \text{Delta}, \, P_{\text{min}}, \, P_{\text{max}}\right)$$

### Parameter Mutation Table

| Parameter | Initial Baseline | Min Limit ($P_{\text{min}}$) | Max Limit ($P_{\text{max}}$) | Scarring Behavior & Formula |
| :--- | :--- | :--- | :--- | :--- |
| **Fundamental Pitch (`initialBaseFrequency`)** | $220.0\text{ Hz}$ | $55.0\text{ Hz}$ | $880.0\text{ Hz}$ | **Anchored Fundamental**: Does not compound exponentially. Slowly drifts toward $880\text{ Hz}$ via hysteretic limit mutation. |
| **Effective Pitch (`baseFrequency`)** | $220.0\text{ Hz}$ | $55.0\text{ Hz}$ | $880.0\text{ Hz}$ | **Microtonal Sway**: $\text{baseFreq} \cdot (1.0 + \text{pitchDir} \cdot \sin(\text{scarIndex} \cdot 8.5) \cdot 0.03 \cdot \text{spatialWeight})$. |
| **Harmonicity (`harmonicity`)** | $1.414$ | $0.5$ | $4.0$ | Drifts toward upper bound $4.0$ via $\Delta \text{Harm} = \text{effectiveAlpha} \cdot \text{spatialWeight} \cdot (4.0 - \text{currentHarm})$. |
| **Envelope Decay (`decay`)** | $1.5\text{ s}$ | $0.1\text{ s}$ | $15.0\text{ s}$ | Oscillates and drifts via $\text{decayDir} \cdot \cos(\text{scarIndex} \cdot 4.2) \cdot 0.2 \cdot \text{spatialWeight}$. |
| **FM Index (`fmIndex`)** | $0.0$ | $0.0$ | $10.0$ | Increases continuously by $+2.5 \cdot \Delta \text{Scar} \cdot \text{fmWeight}$, generating harsh inharmonic overtones. |
| **Filter Cutoff (`filterCutoff`)** | $1200.0\text{ Hz}$ | $100.0\text{ Hz}$ | $5000.0\text{ Hz}$ | Shifts by $\text{filterDir} \cdot 300.0\text{ Hz} \cdot \Delta \text{Scar}$, darkening or brightening resonance. |
| **Bit Depth (`bitDepth`)** | $16\text{-bit}$ | $2\text{-bit}$ | $16\text{-bit}$ | **Digital Crushing**: When $\text{scarIndex} > 1.5$, bit depth drops via $\text{Math.round}(16 - (\text{scarIndex} - 1.5) \cdot 4)$ down to $2\text{-bit}$. |
| **Gain (`gain`)** | $1.0$ | $0.0$ | $1.0$ | Remains bounded between $0.0$ and $1.0$. |
| **Euclidean Density (`euclideanDensity`)** | $2$ | $1$ | $3$ | Density steps scale upward with cumulative scar trauma. |

---

## 6. Rhythmic Perturbation (Broken Euclidean Beats)

In [euclidean.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/public/js/audio/euclidean.js#L31-L51), `scarIndex` directly perturbs beat sequencing:

- **Pristine State (`scarIndex = 0`)**: Follows clean Euclidean rhythm patterns $E(k, n)$.
- **Perturbation Probability**:
  $$\text{scarPerturbationProb} = \min(\text{scarIndex} \cdot 0.12, \, 0.35)$$
- On each clock step, if a random roll is below `scarPerturbationProb`, the step beat is inverted (causing syncopated ghost strikes or skipped beats).

---

## 7. Sound Archetype Morphing (Trauma Milestones)

As trauma accumulates on a sound node, its sound archetype morphs through three structural phases:

1. **Sacred / Soapstone Phase (`scarIndex < 2.0`)**: Rich inharmonic bell tones (`bell_sacred`, `bell_deep`, `bell_soapstone`).
2. **Industrial Phase (`scarIndex > 2.0`)**: Bell sounds transform into harsh, metallic `industrial` sound types.
3. **Terminal Glitch Phase (`scarIndex > 3.0`)**: Complete structural breakdown into `glitch` archetype, 2-bit crushed audio, and heavy 35% broken syncopation.

---

## 8. Node Scope & Persistence

### 8.1 Universal Coverage
The scarring system applies universally to **all sound objects** in the database:
- **Preset Historical Towers**: São Francisco, Nossa Senhora do Carmo, Santa Efigênia, Matriz do Pilar, Chicago, Shanghai.
- **User-Created Reflectors**: Any reflector node added by users across any city via the UI or API.

### 8.2 Database Persistence & WebSocket Sync
1. **SQLite WAL Mode**: State vector updates and updated `scar_index` values are written to `scarred_bell.db` via `updateNodeStateVector()` ([database.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/server/db/database.js#L349)).
2. **Real-time Broadcast**: The server emits a `NODE_MUTATED` WebSocket event:

```json
{
  "type": "NODE_MUTATED",
  "payload": {
    "nodeId": "tower_ouro_preto_sao_francisco",
    "scarIncrement": 0.000018,
    "updatedState": {
      "soundType": "bell_sacred",
      "carrierType": "sine",
      "initialBaseFrequency": 220.0,
      "baseFrequency": 224.2,
      "harmonicity": 1.418,
      "decay": 1.48,
      "gain": 1.0,
      "fmIndex": 0.45,
      "filterCutoff": 1180,
      "bitDepth": 16
    },
    "distanceMeters": 3.42,
    "triggeredBySomaticId": "node_soma_78b",
    "signature": {
      "weightMultiplier": 1.12,
      "pitchDir": 1,
      "filterDir": -1,
      "fmWeight": 1.4,
      "decayDir": -1
    }
  },
  "timestamp": 1721536000000
}
```
