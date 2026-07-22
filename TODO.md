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


  

- [ ] add to config all distances/parameters if there no
- [ ] if users create nodes too close, what we do? we limit node creatin some minimum distance? like 50m? or we make them merge? 
- [ ] editing mode with the password for each city different. can manually add tower nodes for a new map. I can give access to a musician to create their own map
- [x] **Background Audio Underrun Prevention**: Added silent WAV keep-alive anchor (`AudioContextManager.enableBackgroundKeepAlive()`) with MediaSession integration so mobile browsers retain real-time WebAudio priority during screen-off / background movement.
- [ ] Audio distortion effect (re-evaluate trigger logic using native WebAudio nodes like WaveShaperNode instead of deprecated ScriptProcessorNode: e.g. movement speed, network latency, or node proximity)
- [ ] languages
- [ ] about/description page
- [ ] link to GIT
- [ ] Audio distortion/bitcrusher effect (re-evaluate trigger logic: e.g. movement speed, network latency, or node proximity instead of device battery status)