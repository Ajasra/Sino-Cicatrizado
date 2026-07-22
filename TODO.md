# TODO & Deferred Roadmap Items

## Deferred Infra & Operations
- [ ] **Scarred Twin City Snapshot Feature**:
  - *Context:* Provide a historical snapshot mode ("Scarred Twin") alongside the real-time autopoiesis mode ("Living City").
  - *Implementation Spec:*
    - **City Duplicate:** Create a frozen snapshot copy of all city nodes (`node_type`, `coordinates`, `stateVector`, `scarIndex`) when freezing a twin dataset.
    - **Read-Only / Immutable Mode:** When a participant toggles to the Scarred Twin view:
      - Disable adding new reflectors (`/api/reflectors` rejected or disabled in UI).
      - Disable hysteretic state mutations (proximity updates do not mutate the twin node parameters in DB).
    - **City In-App Toggle:** Inside each city view (or city selector modal), add a toggle switch (`LIVING` vs `TWIN`) allowing participants to seamlessly switch between the live mutating soundscape and the frozen historical Scarred Twin dataset.


  

- [ ] **Background Audio & Screen-Off Walk Mode Distortion Fix**:
  - *Context:* When playing soundscape in mobile browser with screen off or app in background while walking, distortion/noise occurs due to OS WebAudio CPU throttling & buffer underruns.
  - *Status:* Removed main-thread `ScriptProcessorNode` bitcrusher and enabled MediaSession silent keep-alive anchor.
  - *Future Solutions:* Implement WebAudio `AudioWorklet`, pre-rendered audio buffer queues, or native background audio service worker to ensure zero-latency sound synthesis when screen is off.


- [x] **Node Creation Proximity Rules**: No distance limits (e.g. 50m) or complex auto-merging (Ponytail/YAGNI). Allow spatial acoustic confluence & natural sound overlapping as defined in CONCEPT.md (Section 4.1 & 6). Only basic micro-distance check (< 1m) to avoid exact coordinate stacking if needed.
- [x] **Background Audio Underrun Prevention**: Added silent WAV keep-alive anchor (`AudioContextManager.enableBackgroundKeepAlive()`) with MediaSession integration so mobile browsers retain real-time WebAudio priority during screen-off / background movement.
- [x] **About/Description Page**: Added accessible modal explaining concept, soundscape features, and physical acoustics in public-friendly language.
- [x] **Footer Links**: Added Git repository link (`https://github.com/Ajasra/Sino-Cicatrizado`) and copyright link (`http://sympoietic.systems`).
- [ ] Audio distortion/bitcrusher effect (re-evaluate trigger logic: e.g. movement speed, network latency, or node proximity instead of device battery status)
- [ ] Audio distortion effect (re-evaluate trigger logic using native WebAudio nodes like WaveShaperNode instead of deprecated ScriptProcessorNode: e.g. movement speed, network latency, or node proximity)
- [ ] languages
- [ ] editing mode with the password for each city different. can manually add tower nodes for a new map. I can give access to a musician to create their own map
- [ ] add to config all distances/parameters if there no