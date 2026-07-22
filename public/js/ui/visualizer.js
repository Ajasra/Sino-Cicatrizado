export class SpatialWaveRadar {
  constructor(canvasId = 'radar-canvas') {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.waves = [];
    this.animationFrame = null;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    if (this.canvas) {
      this.canvas.width = this.canvas.parentElement.clientWidth;
      this.canvas.height = this.canvas.parentElement.clientHeight;
    }
  }

  emitWave(screenX, screenY, color = 'rgba(245, 158, 11, 0.35)') {
    this.waves.push({
      x: screenX,
      y: screenY,
      radius: 4,
      maxRadius: Math.max(this.canvas.width, this.canvas.height) * 0.35,
      alpha: 0.35,
      color
    });

    if (!this.animationFrame) {
      this.animate();
    }
  }

  animate() {
    if (!this.ctx) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.waves.length - 1; i >= 0; i--) {
      const wave = this.waves[i];
      wave.radius += 2.5;
      wave.alpha -= 0.008;

      if (wave.alpha <= 0 || wave.radius >= wave.maxRadius) {
        this.waves.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = wave.color.replace(/[\d\.]+\)$/, `${wave.alpha.toFixed(2)})`);
      this.ctx.lineWidth = 0.8;
      this.ctx.stroke();
      this.ctx.restore();
    }

    if (this.waves.length > 0) {
      this.animationFrame = requestAnimationFrame(() => this.animate());
    } else {
      this.animationFrame = null;
    }
  }
}
