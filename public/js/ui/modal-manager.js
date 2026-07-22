import { AboutModal } from './about-modal.js';

/**
 * ModalManager - Encapsulated controller for application modals
 * Manages modal display states, event handlers, and escape key bindings.
 */
export class ModalManager {
  constructor(app) {
    this.app = app;

    // Render modular components to DOM if not already present
    AboutModal.render();

    // Elements
    this.modalCity = document.getElementById('modal-city-select');
    this.modalSettings = document.getElementById('modal-settings');
    this.modalReflector = document.getElementById('modal-reflector');
    this.modalAbout = document.getElementById('modal-about');

    this.setupListeners();
  }

  setupListeners() {
    // City Selection Modal
    const pillCity = document.getElementById('pill-city');
    const closeCityBtn = document.getElementById('modal-city-close-btn');
    const switchCityBtn = document.getElementById('btn-switch-city');

    if (pillCity) pillCity.addEventListener('click', () => this.openCityModal());
    if (closeCityBtn) closeCityBtn.addEventListener('click', () => this.closeCityModal());
    if (switchCityBtn) {
      switchCityBtn.addEventListener('click', () => {
        this.closeSettingsModal();
        this.openCityModal();
      });
    }

    if (this.modalCity) {
      this.modalCity.addEventListener('click', (e) => {
        if (e.target === this.modalCity) this.closeCityModal();
      });
    }

    // Settings Modal
    const fabSettingsBtn = document.getElementById('fab-settings');
    const closeSettingsBtn = document.getElementById('modal-settings-close-btn');

    if (fabSettingsBtn) fabSettingsBtn.addEventListener('click', () => this.openSettingsModal());
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => this.closeSettingsModal());
    if (this.modalSettings) {
      this.modalSettings.addEventListener('click', (e) => {
        if (e.target === this.modalSettings) this.closeSettingsModal();
      });
    }

    // Reflector Deposit Modal
    const fabReflectorBtn = document.getElementById('fab-reflector');
    const closeReflectorBtn = document.getElementById('modal-close-btn');
    const cancelReflectorBtn = document.getElementById('btn-cancel-reflector');
    const intentInput = document.getElementById('input-reflector-intent');

    if (fabReflectorBtn) {
      fabReflectorBtn.addEventListener('click', () => {
        this.openReflectorModal();
        if (intentInput) intentInput.focus();
      });
    }

    if (closeReflectorBtn) closeReflectorBtn.addEventListener('click', () => this.closeReflectorModal());
    if (cancelReflectorBtn) cancelReflectorBtn.addEventListener('click', () => this.closeReflectorModal());
    if (this.modalReflector) {
      this.modalReflector.addEventListener('click', (e) => {
        if (e.target === this.modalReflector) this.closeReflectorModal();
      });
    }

    // About / Concept Modal
    const openAboutBtn = document.getElementById('btn-open-about');
    const closeAboutBtn = document.getElementById('modal-about-close-btn');

    if (openAboutBtn) {
      openAboutBtn.addEventListener('click', () => {
        this.closeSettingsModal();
        this.openAboutModal();
      });
    }

    if (closeAboutBtn) closeAboutBtn.addEventListener('click', () => this.closeAboutModal());
    if (this.modalAbout) {
      this.modalAbout.addEventListener('click', (e) => {
        if (e.target === this.modalAbout) this.closeAboutModal();
      });
    }

    // Global ESC Key Listener to close any open modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });
  }

  openCityModal() {
    if (this.app && typeof this.app.renderCitySelector === 'function') {
      this.app.renderCitySelector();
    }
    if (this.modalCity) this.modalCity.style.display = 'flex';
  }

  closeCityModal() {
    if (this.modalCity) this.modalCity.style.display = 'none';
  }

  openSettingsModal() {
    if (this.modalSettings) this.modalSettings.style.display = 'flex';
  }

  closeSettingsModal() {
    if (this.modalSettings) this.modalSettings.style.display = 'none';
  }

  openReflectorModal() {
    if (this.modalReflector) this.modalReflector.style.display = 'flex';
  }

  closeReflectorModal() {
    if (this.modalReflector) this.modalReflector.style.display = 'none';
  }

  openAboutModal() {
    if (this.modalAbout) this.modalAbout.style.display = 'flex';
  }

  closeAboutModal() {
    if (this.modalAbout) this.modalAbout.style.display = 'none';
  }

  closeAllModals() {
    this.closeCityModal();
    this.closeSettingsModal();
    this.closeReflectorModal();
    this.closeAboutModal();
  }
}
