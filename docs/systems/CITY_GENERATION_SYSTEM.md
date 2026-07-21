# New City Generation & Landmark Synthesis Specification

> **Sino Cicatrizado (The Scarred Bell)**  
> Technical Architecture & Specification for Multi-City Expansion, Context Prompts, and Landmark Synthesis

---

## 1. Overview & Architectural Purpose

The **City Generation System** enables *Sino Cicatrizado* to dynamically expand beyond its original site of Ouro Preto, Brazil, allowing any historical or contemporary city (e.g., Potosí, Kyoto, Chicago, Shanghai, Salvador) to be registered into the apparatus.

### System Responsibilities
1. **Acoustic Context Prompting**: Stores site-specific material, architectural, and historical soundscape prompts in `server/prompts/cities/`.
2. **LLM Landmark Synthesis**: Uses the LLM Membrane service ([llm-membrane.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/server/llm-membrane.js)) to translate natural language landmark intent descriptions into city-aligned Web Audio state vectors.
3. **Database Seeding**: Automatically persists generated landmark nodes (Type 1 Towers or Type 2 Reflectors) into the local SQLite database ([database.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/server/db/database.js)).
4. **Dynamic Frontend Map Routing**: Exposes city definitions via REST API (`GET /api/cities`) and supports path-based URL routing (e.g., `/chicago`, `/ouro_preto`).

---

## 2. City Generation Pipeline Architecture

```text
  ┌─────────────────────────────────────────────────────────────┐
  │         City Request Payload (JSON or API Call)             │
  │ (key, name, contextText, landmarks[{name, lat, lng, intent}]) │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │           Write Prompt File: server/prompts/cities/<key>.txt │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │   Iterate Landmarks & Invoke LLM Synthesis Membrane         │
  │   (generateReflectorPresetFromPrompt(intentText, cityKey))  │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │   Immunological Parsing & Safety Parameter Clamping        │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │   Persist Nodes to SQLite ('nodes' table in WAL mode)       │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │   Broadcast & Expose via API / UI Membrane Selector           │
  └─────────────────────────────────────────────────────────────┘
```

---

## 3. City Acoustic Context Prompts (`server/prompts/cities/`)

Every city registered in the apparatus possesses a site-specific acoustic context file:

```text
server/prompts/cities/
├── ouro_preto.txt          # Soapstone quarries, gold mining shafts, colonial church bell towers
├── potosi.txt              # Cerro Rico silver mines at 4,060m altitude, pickaxes, high winds
├── salvador_da_bahia.txt   # Pelourinho cobblestones, Afro-diasporic drumming, ocean waves
├── kyoto.txt               # Bonshō bronze temple bells, bamboo groves, wooden architecture
├── chicago.txt             # Lake Michigan wind canyon, elevated L-train tracks, steel bridges
└── default.txt             # Generic urban acoustic landscape fallback
```

### Prompt Authoring Guidelines
A city prompt must describe:
- **Physical & Material Geology**: Soapstone, quartzite, silver ore, iron, damp marble, volcanic ash, bronze.
- **Topographical Acoustic Space**: Deep mine shafts, mountain valleys, high-altitude winds, water corridors.
- **Historical Soundscape**: Enslaved *sineiros* syncopation, ancient temple bell tolls, heavy industrial machinery.

---

## 4. HTTP API Endpoint Specification (`POST /api/cities/create`)

Cities can be created dynamically over HTTP via theExpress server ([server.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/server/server.js#L89-L98)):

### Request Envelope
- **URL**: `POST /api/cities/create`
- **Header**: `Content-Type: application/json`

```json
{
  "key": "potosi",
  "name": "Potosí",
  "contextText": "Potosí, Bolivia: Imperial colonial silver mining city at 4,060m altitude on Cerro Rico. Subterranean mine shafts, pickaxes on silver ore, howling high-altitude winds, heavy church bronze bells.",
  "landmarks": [
    {
      "name": "Cerro Rico Silver Mine",
      "lat": -19.6189,
      "lng": -65.7494,
      "alt": 4060.0,
      "intentText": "Subterranean iron pickaxes striking silver ore inside dark mines",
      "nodeType": "TOWER"
    },
    {
      "name": "Casa de la Moneda",
      "lat": -19.5886,
      "lng": -65.7533,
      "alt": 4000.0,
      "intentText": "Heavy imperial mint machinery and clanking silver coins",
      "nodeType": "TOWER"
    }
  ]
}
```

### Response Envelope
- **Status**: `201 Created`

```json
{
  "success": true,
  "city": {
    "cityKey": "potosi",
    "cityName": "Potosí",
    "promptFile": "server/prompts/cities/potosi.txt",
    "nodeCount": 2,
    "nodes": [ ... ]
  }
}
```

---

## 5. Programmatic Service Interface (`city-generator.js`)

In server code or custom seeding scripts, cities are generated programmatically via `createNewCity()` ([city-generator.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/server/services/city-generator.js#L17-L73)):

```javascript
import { createNewCity } from './server/services/city-generator.js';

const result = await createNewCity({
  key: 'kyoto',
  name: 'Kyoto',
  contextText: 'Kyoto, Japan: Imperial capital. Massive bonshō temple bells, bamboo groves, wooden temples.',
  landmarks: [
    {
      name: 'Kiyomizu-dera Temple',
      lat: 34.9949,
      lng: 135.7850,
      intentText: 'Deep bonshō bronze bell resonance echoing across wooden valley',
      nodeType: 'TOWER'
    }
  ]
});
```

---

## 6. LLM Landmark Archetype Mapping

When `createNewCity()` iterates over landmark items, it invokes the LLM Membrane service. The LLM evaluates the landmark's `intentText` against the city's prompt file and maps the landmark to a synthesis archetype:

| Landmark Intent Keywords | Synthesized `soundType` | Carrier Wave | Generated DSP Profile |
| :--- | :--- | :--- | :--- |
| **Mines, Pickaxes, Iron Strikes** | `industrial` | `sawtooth` / `square` | High FM index ($3.0 - 8.0$), metallic inharmonicity |
| **Caverns, Deep Valleys, Mist** | `drone` | `sawtooth` | Low-frequency sub-bass ($55 - 110\text{Hz}$), 8–15s decay |
| **Church Bells, Shrines, Temples** | `bell_sacred` / `bell_deep` | `sine` | Inharmonic partials, long exponential tail |
| **Glitches, Digital Corruption** | `glitch` | `square` | Rapid frequency leaps, 4-bit digital crushing |
| **Vessels, Foghorns, Harbor** | `chicago_foghorn` / `shanghai_river` | `sawtooth` | Deep brass vessel resonance, slow LFO chorus |

---

## 7. Persistence & Database Seeding

Generated city landmarks are saved into `scarred_bell.db` via `saveReflectorNode()` ([database.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/server/db/database.js#L318-L345)):

- **Primary Key**: `tower_<cityKey>_<index>` or `reflector_<timestamp>_<rand>`
- **City Identifier**: Stored in the `city` column (`WHERE city = 'potosi'`).
- **Initial State**: `scarIndex = 0.0`, `interactionCount = 0`.

---

## 8. Summary Checklist for Creating a New City

- [ ] Define city key and center coordinates (`lat`, `lng`).
- [ ] Compose acoustic context prompt file in `server/prompts/cities/<cityKey>.txt`.
- [ ] Prepare list of historical landmarks with coordinates and `intentText` descriptions.
- [ ] Call `POST /api/cities/create` or invoke `createNewCity()`.
- [ ] Verify node creation via `GET /api/nodes?city=<cityKey>`.
- [ ] Register center coordinates in `CLIENT_CONFIG.CITIES` ([config.js](file:///c:/Users/user/Desktop/ASC/The%20Scarred%20Bell/public/js/config.js)).
