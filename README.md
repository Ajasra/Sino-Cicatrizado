# *Sino Cicatrizado (The Scarred Bell)*

> **A Site-Specific, Hysteretic Acoustic Apparatus — System-Environment Hybrid (SEH) for Ouro Preto, Brazil**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-SQLite%20WAL-blue.svg)](https://www.sqlite.org/)
[![Web Audio](https://img.shields.io/badge/Audio-Native%20Web%20Audio-orange.svg)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

*Sino Cicatrizado* converts the physical topography of Ouro Preto, Brazil into a self-organizing acoustic feedback loop. It entangles your movement, the city's colonial architecture, and the legacy of Afro-diasporic acoustic resistance (*Linguagem dos Sinos*) into a single evolving soundscape. The system rejects the digital myth of "undo": every interaction deforms the phase space of future sound synthesis, leaving behind an irreversible parameter trace — a **scar**.

---

## Inspiration & Conceptual Grounding

### The Scar Instead of the Reset

First-order cybernetics — and most interactive software — chase the myth of equilibrium: a feedback loop that returns to a pristine, untouched state. Noise is treated as a bug, and the material act of computation is rendered invisible. *Sino Cicatrizado* adopts second-order cybernetics instead: the system's internal state is a recursive archive of its own history. Every visit, every chirp, every placed reflector permanently alters what comes next. The bell you hear carries the microscopic frequency shifts left by every person who walked here before you.

### System-Environment Hybrid

The city is not a passive stage — it is a co-composer. GPS drift, cellular latency, battery drain, and terrain are treated as active agents that shape the sound. This is not a simulation running on top of the world; the environment *in-forms* the system, and hardware limits become part of the composition.

### The Language of the Bells (Toque dos Sinos)

For centuries, the church bells of Ouro Preto served as a city-wide acoustic communication network — distinct rhythmic sequences signaled births, deaths, fires, invasions. Enslaved *sineiros* (bell ringers), forced to perform rigid European ecclesiastical scores, injected African syncopation and polyrhythms into the bell patterns — acoustic resistance that embedded hidden messages of safety and rebellion into the colonial soundscape. This work inherits that legacy: virtual Euclidean rhythms are detuned and syncopated by your physical presence, reclaiming the algorithmic grid as a site of organic improvisation.

### Confluence, Not Assimilation

Drawing on the decolonial philosophy of the Piaui intellectual **Nego Bispo**, the system models *confluence* — the meeting of differing currents that mutually amplify each other without erasing distinct identities. When two participants' acoustic signatures merge, neither is flattened. The rivers meet, the combined current grows stronger, but each sediment trail remains visible.

### Acoustic Resistance & Chico Rei

In Ouro Preto, the legendary King of Kongo — **Chico Rei** (Galanga) — covertly accumulated gold dust to purchase freedom for himself and his community, eventually buying the very mine where he had been enslaved. The Church of Santa Efigenia, funded by his emancipated community, stands as a monument to structural subversion from within. The virtual bells of *Sino Cicatrizado* echo this logic: they sound from within the apparatus, but they carry frequencies the apparatus was never designed to transmit.

---

## What It Does

- **Irreversible Scars**: Every interaction permanently mutates the bell parameters — pitch, timbre, rhythm — for everyone who follows. No reset, no undo.
- **Active Echolocation**: Emit acoustic chirps that travel at the physical speed of sound, returning echoes from towers and reflectors up to 500m away.
- **Native Additive Bell Synthesis**: Bells synthesized from inharmonic partials modeled on bronze and soapstone — no sample libraries, no audio framework bloat.
- **Battery as an Aesthetic Material**: As your device battery drains, the sound degrades in fidelity — from 16-bit clarity down to 4-bit digital grit. The system performs its own material exhaustion.
- **Dual-Twin Ontology**: Toggle between the continuously mutating *Living City* and the frozen *Scarred Twin* — an immutable snapshot from the close of the ASC 2026 conference.
- **The Right to Decline**: When too many participants crowd one location, the system deadens that node permanently rather than rebalancing. A structural reminder that not every wound can be healed.
- **Multi-City Soundscapes**: While born from Ouro Preto's acoustic history, the system adapts to any city — mapping local topography, towers, and spatial character into site-specific experiences.
- **Analog Hardware UI**: Flat panel interface inspired by Eurorack modules and test equipment. Dark and light modes for indoor and outdoor sunlight visibility.

---

## Quick Start

See [`docs/SETUP.md`](docs/SETUP.md) for full installation, mobile deployment, HTTPS configuration, and environment overrides.

```bash
npm install
npm start        # Open http://localhost:3000
npm test         # Run verification suite
```

---

## Documentation

| Document | What It Covers |
|---|---|
| [`CONCEPT.md`](docs/CONCEPT.md) | Second-order cybernetics, decolonial framework, scar ontology |
| [`PRD.md`](docs/PRD.md) | Product requirements and feature scope |
| [`SPEC.md`](docs/SPEC.md) | Master consolidated system specification |
| [`SETUP.md`](docs/SETUP.md) | Installation, deployment, environment configuration |
| [`IMPLEMENTATION.md`](docs/IMPLEMENTATION.md) | Architectural blueprint and component roadmap |
| [`DEV_PRACTICES.md`](docs/DEV_PRACTICES.md) | Development standards and directory layout |
| [`Audio Research.md`](docs/Audio%20Research.md) | Spectralism and acoustic resistance foundations |
| [`docs/systems/`](docs/systems/) | Detailed cybernetic subsystem specifications |

---

## License

Distributed under the [MIT License](LICENSE).
