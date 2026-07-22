/**
 * AboutModal - Component that generates and injects the About/Concept modal HTML into DOM
 */
export class AboutModal {
  static render() {
    if (document.getElementById('modal-about')) return;

    const modalHTML = `
  <!-- Modal Popup: About / Concept -->
  <div id="modal-about" class="modal-overlay" style="display: none;">
    <div class="modal-card modal-card-large">
      <div class="modal-header">
        <span class="modal-title">ABOUT / SINO CICATRIZADO</span>
        <button id="modal-about-close-btn" class="modal-close-btn">&times;</button>
      </div>
      <div class="modal-body modal-scrollable">
        <h2 class="about-heading">The Scarred Bell (Sino Cicatrizado)</h2>
        <p class="about-p">
          <strong>Sino Cicatrizado</strong> is an interactive acoustic installation that turns a city into a living, self-organizing sound system. Your movement entangles with the urban architecture and its sonic history to create an evolving soundscape.
        </p>
        <p class="about-p">
          Inspired by the <em>Toque dos Sinos</em> — the centuries-old Language of the Bells in Ouro Preto, Brazil — the system adapts to any city, mapping its unique topography, bell towers, and acoustic character into a site-specific experience.
        </p>

        <h3 class="about-subheading">The Scar</h3>
        <p class="about-p">
          Digital tools promise "undo." This work rejects that fiction. Every action you take leaves a permanent trace — a <strong>scar</strong> — that irreversibly changes what future visitors hear. The observer is inside the loop, and observation is a physical act that changes what it touches.
        </p>

        <h3 class="about-subheading">System-Environment Hybrid</h3>
        <p class="about-p">
          The city is not just a stage — it is a co-composer. Drawing on second-order cybernetics, the system treats GPS drift, cellular latency, battery drain, and terrain as active agents that shape the sound. This is not a simulation running on top of the world; it is a <strong>System-Environment Hybrid (SEH)</strong> where hardware limits, topography, and signal noise become part of the composition.
        </p>

        <h3 class="about-subheading">Echolocation & Confluence</h3>
        <p class="about-p">
          Trigger an acoustic chirp and it travels outward at the physical speed of sound (343 m/s), reflecting off nearby towers and memory reflectors. The echoes carry the histories — the scars — left by everyone who came before you. When two participants cross paths, their distinct acoustic signatures merge in real time: each current stays distinct, but the combined flow grows stronger.
        </p>

        <h3 class="about-subheading">How to Experience</h3>
        <ul class="about-list">
          <li><strong>Select a City:</strong> Site-specific soundscape tuned to local topography and acoustic character.</li>
          <li><strong>Emit a Chirp:</strong> Send a sonar pulse and hear real-time echoes from bell towers and memory reflectors.</li>
          <li><strong>Place a Reflector:</strong> Leave a memory node at your coordinates for others to encounter.</li>
          <li><strong>Move & Merge:</strong> When participants converge, their sound fields weave together without losing individual identity.</li>
        </ul>

        <div class="about-footer-links">
          <p class="about-git-link">
            Source Code & Repository: <a href="https://github.com/Ajasra/Sino-Cicatrizado" target="_blank" rel="noopener noreferrer">github.com/Ajasra/Sino-Cicatrizado</a>
          </p>
          <p class="about-copyright">
            &copy; <a href="http://sympoietic.systems" target="_blank" rel="noopener noreferrer">sympoietic.systems</a> — All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }
}