# Installation, Setup & Developer Guide
## Project: *Sino Cicatrizado (The Scarred Bell)*

This document provides step-by-step instructions for installing, running, configuring, testing, and deploying *Sino Cicatrizado (The Scarred Bell)* locally or across mobile hardware.

---

## 1. System Requirements

- **Operating System**: Windows 10/11, macOS, or Linux.
- **Node.js**: v20+ LTS recommended.
- **Package Manager**: `npm` (included with Node.js).
- **Web Browser**: Chrome (Android/Desktop), Safari (iOS/macOS), Firefox, or Edge.

---

## 2. Installation Steps

### Step 1: Clone or Open Directory
Ensure you are in the project root folder:
```bash
cd "c:\Users\user\Desktop\ASC\The Scarred Bell"
```

### Step 2: Install Dependencies
Install all required Node.js packages (`express`, `ws`, `better-sqlite3`, `dotenv`):
```bash
npm install
```

---

## 3. Configuration & Parameter Customization

*Sino Cicatrizado* strictly enforces a **Zero Hardcoding Policy**. All parameters can be customized without editing core business logic:

### 3.1 Backend Configuration (`server/config.js` or `.env`)
Create an optional `.env` file in the project root to override defaults:

```env
PORT=3000
HOST=0.0.0.0
BROADCAST_RATE_HZ=4
PROXIMITY_MUTATION_THRESHOLD_M=15.0
DEFAULT_CITY=ouro_preto
```

- `PORT`: Server listening port (default: `3000`).
- `HOST`: Server bind address (`0.0.0.0` allows mobile devices on the local network to connect).
- `BROADCAST_RATE_HZ`: Real-time WebSocket frame & proximity evaluation loop frequency (default: `4` Hz).
- `PROXIMITY_MUTATION_THRESHOLD_M`: Geographic distance in meters triggering hysteretic scar parameter drift (default: `15.0` m).

### 3.2 Client Configuration (`public/js/config.js`)
Adjust client-side physical constants:
- `SPEED_OF_SOUND_MPS`: Wave propagation speed ($343.0\text{ m/s}$).
- `ATTENUATION_REFERENCE_DISTANCE_M`: Inverse-square reference distance ($100.0\text{ m}$).
- `DENSITY_RADIUS_M`: Acoustic density impedance proximity radius ($50.0\text{ m}$).

### 3.3 Theme & Visual Customization (`public/css/variables.css`)
All colors, font families, glow effects, and animation speeds live in `:root` CSS variables. To change the visual identity or theme of the application, **only edit `public/css/variables.css`**.

---

## 4. Running the Application

### 4.1 Production Mode
```bash
npm start
```

Console Output:
```text
=======================================================
 Sino Cicatrizado (The Scarred Bell) Server Running 
 URL: http://localhost:3000
 Environment: Node.js / SQLite WAL / WSS Port 3000
 Broadcast Loop: 4 Hz (250 ms)
=======================================================
```

### 4.2 Development Mode (Auto-Reload)
```bash
npm run dev
```

---

## 5. Mobile & Cross-Platform Testing Guide

### 5.1 Desktop Browser Testing
1. Navigate to `http://localhost:3000`.
2. Click **ENTER CAMPANILE / PERMITIR O SOM** to unlock the browser `AudioContext`.
3. Click **MOCK GPS TOGGLE** on the dashboard. This activates simulated walking movement around Ouro Preto streets, allowing full testing of proximity mutations and spatial wave delays without walking outdoors.
4. Click **EMIT SOMATIC CHIRP** to trigger echolocation pulses and observe the animated wave radar.
5. Type an intent (e.g. *"Acoustic Resistance"*) and click **DROP STATIC REFLECTOR HERE** to deposit static reflectors.

### 5.2 Mobile Device Testing (Local Wi-Fi)
1. Find your host computer's local IP address (e.g. `192.168.1.100`).
2. Ensure your mobile phone is connected to the same Wi-Fi network.
3. Open mobile browser to `http://192.168.1.100:3000`.
4. Tap **ENTER CAMPANILE / PERMITIR O SOM**.
5. *Note on Mobile GPS & Sensors*:
   - **Battery Sensor**: Android Chrome reports battery level; iOS Safari defaults gracefully to 100% (16-bit).
   - **Screen WakeLock**: Prevents screen sleep while walking.
   - **Geolocation**: Mobile Safari/Chrome requires HTTPS or `localhost` to access high-accuracy GPS outdoors. For testing outdoors over local IP, use `ngrok http 3000` or local HTTPS tunneling.

---

## 6. Running Automated Verification Tests

Verify system health, database WAL mode concurrency, inverse-square gain math, Haversine metrics, and hysteresis non-return rules by running:

```bash
npm test
```

Expected Output:
```text
=======================================================
 SINO CICATRIZADO - AUTOMATED VERIFICATION MATRIX TEST
=======================================================

   Calculated distance: 510.61 meters
✅ [PASS 1] Haversine Distance Metric Accuracy (São Francisco to Santa Efigênia)
   Gain 0m: 1.0000 | 100m: 0.9901 | 500m: 0.1996
✅ [PASS 2] Inverse-Square Gain Attenuation Check (100m & 500m)
   Cleaned Preset: { carrierType: 'sine', baseFrequency: 220, harmonicity: 1.414, decay: 6, gain: 1, euclideanDensity: 3 }
✅ [PASS 3] Immunological Parsing Layer Guardrail & Fallback Test
   Nodes interaction count: 100, scar index: 0.1000
✅ [PASS 4] SQLite WAL Mode Parallel Concurrency (100 Concurrent Writes)
   Baseline: 220Hz -> Mutated after 10k steps: 880.00Hz (Limit: 880Hz)
✅ [PASS 5] Hysteresis Irreversible Parameter Mutation & Boundary Limits

=======================================================
 VERIFICATION COMPLETE: 5/5 TESTS PASSED
=======================================================
```

---

## 7. Troubleshooting

- **No Sound Output**: Browsers block audio until user interaction occurs. Ensure you clicked **ENTER CAMPANILE / PERMITIR O SOM**.
- **Database Locked Error**: The database operates under WAL mode (`PRAGMA journal_mode = WAL;`). If another process locks the file, delete `data/scarred_bell.db-wal` or restart the server.
- **WebSocket Connection Failed**: Check if a firewall is blocking port 3000.
