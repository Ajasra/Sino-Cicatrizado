/**
 * AboutModal - Component that generates and injects the About/Concept modal HTML into DOM
 */
export class AboutModal {
  static render() {
    // If modal already exists in DOM, skip injection
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
          <strong>Sino Cicatrizado</strong> is an interactive, location-based acoustic installation that transforms physical landscapes into living, sound-emitting surfaces. Rather than treating cities as static maps, the system turns your real-world movement and location into an active participant in an evolving soundscape.
        </p>

        <h3 class="about-subheading">Acoustic Confluence & The Memory of Sound</h3>
        <p class="about-p">
          Inspired by the Afro-diasporic acoustic tradition of <em>Linguagem dos Sinos</em> (the Language of Bells) in historic Ouro Preto, Brazil, the project rejects the idea of a clean digital "reset." Every interaction and movement leaves a lasting acoustic mark—a <em>scar</em>. As participants walk through physical coordinates or place memory reflectors, spatial waves propagate outward at the physical speed of sound (343 m/s), creating echoes that refract off surrounding bell towers and somatic nodes.
        </p>

        <h3 class="about-subheading">How to Experience</h3>
        <ul class="about-list">
          <li><strong>Select a Soundscape:</strong> Explore site-specific acoustic profiles in cities like Ouro Preto, Chicago, or Shanghai.</li>
          <li><strong>Emit Acoustic Probes:</strong> Trigger a "chirp" to sound your presence and hear real-time environmental echoes from nearby virtual towers.</li>
          <li><strong>Deposit Memory Reflectors:</strong> Leave an acoustic memory node at your physical coordinates for other wanderers to encounter.</li>
          <li><strong>Shared Acoustic Currents:</strong> When multiple participants cross paths, their audio fields naturally weave together in real-time confluence.</li>
        </ul>

        <div class="about-footer-links">
          <p class="about-git-link">
            Source Code & Repository: <a href="https://github.com/Ajasra/Sino-Cicatrizado" target="_blank" rel="noopener noreferrer">github.com/Ajasra/Sino-Cicatrizado</a>
          </p>
          <p class="about-copyright">
            © <a href="http://sympoietic.systems" target="_blank" rel="noopener noreferrer">sympoietic.systems</a> — All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }
}
