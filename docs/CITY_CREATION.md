# City Creation & Node Seeding Instructions

This guide outlines how to register new historical or modern cities in **Sino Cicatrizado (The Scarred Bell)**, create site-specific acoustic context prompts, synthesize initial landmark sound nodes, and configure the interactive map view.

---

## 1. Directory Structure & Prompts

City acoustic prompts live in the `server/prompts/cities/` directory:

```
server/prompts/cities/
├── ouro_preto.txt          # Ouro Preto gold mining & church bell context
├── potosi.txt              # Potosí imperial silver mines & high altitude wind
├── salvador_da_bahia.txt   # Afro-Brazilian drumming & Pelourinho cobblestones
├── kyoto.txt               # Buddhist temple bronze bells & bamboo groves
├── berlin.txt              # Techno vaults & digital hardware glitches
├── tokyo.txt               # Cyberpunk corridors & bell shrines
└── default.txt             # Fallback generic urban acoustic landscape
```

### Writing a City Context Prompt
A city prompt should be a concise 2–3 sentence text describing:
- **Physical & Acoustic Materials:** Iron pickaxes, quartzite rock, silver ore, soapstone, damp marble, ocean waves, volcanic ash, bronze bells.
- **Architectural & Topographical Echoes:** Deep mine shafts, high-altitude winds, mountain valleys, concrete canyons, floating canals.
- **Historical Soundscape:** Afro-diasporic bell ringers (*sineiros*), ancient temple bells, industrial machinery.

---

## 2. Methods to Create a New City

### Method A: Via HTTP API Endpoint (`POST /api/cities/create`)

You can create a new city and synthesize its initial landmark nodes dynamically by sending a POST request to `/api/cities/create`:

```bash
curl -X POST http://localhost:3000/api/cities/create \
  -H "Content-Type: application/json" \
  -d '{
    "key": "potosi",
    "name": "Potosí",
    "contextText": "Potosí, Bolivia: Imperial colonial silver mining city at 4,060m altitude on Cerro Rico. Subterranean mine shafts, pickaxes on silver ore, howling high-altitude winds, heavy church bronze bells.",
    "landmarks": [
      {
        "name": "Cerro Rico Silver Mine",
        "lat": -19.6189,
        "lng": -65.7494,
        "intentText": "Subterranean iron pickaxes striking silver ore inside dark mines",
        "nodeType": "TOWER"
      },
      {
        "name": "Casa de la Moneda",
        "lat": -19.5886,
        "lng": -65.7533,
        "intentText": "Heavy imperial mint machinery and clanking silver coins",
        "nodeType": "TOWER"
      },
      {
        "name": "Iglesia de San Francisco",
        "lat": -19.5878,
        "lng": -65.7547,
        "intentText": "Solemn high altitude church bronze bell tolling in mountain wind",
        "nodeType": "TOWER"
      }
    ]
  }'
```

---

### Method B: Programmatically via Node.js Service (`server/services/city-generator.js`)

In server code or a custom seed script, invoke `createNewCity`:

```javascript
import { createNewCity } from './server/services/city-generator.js';

const newCityResult = await createNewCity({
  key: 'kyoto',
  name: 'Kyoto',
  contextText: 'Kyoto, Japan: Imperial capital of ancient Japan. Massive Buddhist temple bronze bells (bonshō), rustling Arashiyama bamboo groves, stone Zen garden reverberations, and wooden architecture resonance.',
  landmarks: [
    {
      name: 'Kiyomizu-dera Temple',
      lat: 34.9949,
      lng: 135.7850,
      intentText: 'Deep bronze temple bell resonance (bonshō) echo across wooden valley',
      nodeType: 'TOWER'
    },
    {
      name: 'Fushimi Inari Shrine',
      lat: 34.9671,
      lng: 135.7727,
      intentText: 'Wind through vermilion Torii gates and stone fox shrines',
      nodeType: 'REFLECTOR'
    }
  ]
});

console.log(`Created city ${newCityResult.cityName} with ${newCityResult.nodeCount} nodes.`);
```

---

## 3. How Landmark Sound Synthesis Works

When a city landmark is created:
1. `createNewCity` writes `server/prompts/cities/<key>.txt`.
2. For each landmark, it calls `generateReflectorPresetFromPrompt(landmark.intentText, key)`.
3. The LLM membrane reads the city's prompt file and maps the landmark's intent to one of the 5 synthesis archetypes:
   - **Mines / Metal Strikes / Pickaxes:** $\to$ `soundType: "industrial"` with FM modulation (`fmIndex: 3.0 - 8.0`).
   - **Deep Mist / Valleys / Mountains:** $\to$ `soundType: "drone"` with sub-bass frequencies (55–110 Hz) and 6–15s decay tails.
   - **Church Bell Towers / Shrines:** $\to$ `soundType: "bell_sacred"` or `"bell_deep"`.
   - **Digital Glitches / Corruption:** $\to$ `soundType: "glitch"`.
4. Nodes are automatically saved to SQLite under the city's identifier.

---

## 4. Frontend Map View Configuration

To make the new city selectable on the web interface, register its center coordinates in `public/js/config.js`:

```javascript
// in public/js/config.js
CITY_CENTERS: {
  ouro_preto: { lat: -20.3856, lng: -43.5035, zoom: 16 },
  potosi:     { lat: -19.5886, lng: -65.7533, zoom: 15 },
  kyoto:      { lat: 34.9949,  lng: 135.7850, zoom: 15 }
}
```

---

## 5. Summary Checklist for Adding a City

- [ ] Write prompt context file: `server/prompts/cities/<city_key>.txt`
- [ ] Prepare list of historical landmark coordinates (`lat`, `lng`, `name`, `intentText`)
- [ ] Call `POST /api/cities/create` or run `createNewCity()`
- [ ] Verify nodes created in database via `GET /api/nodes?city=<city_key>`
- [ ] Update frontend map configuration in `public/js/config.js`
