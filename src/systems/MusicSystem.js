export class MusicSystem {
  constructor(volume = 0.45) {
    this.tracks = {};
    this.volume = volume;
    this.currentName = null;
    this.unlocked = false;
    this.pending = null;

    // Webbläsare blockerar ljud tills användaren interagerat
    const unlock = () => {
      this.unlocked = true;
      if (this.pending) {
        const p = this.pending;
        this.pending = null;
        this.play(p);
      }
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
  }

  add(name, url) {
    const a = new Audio(url);
    a.loop = true;
    a.volume = 0;
    this.tracks[name] = a;
  }

  play(name) {
    if (this.currentName === name) return;
    if (!this.unlocked) { this.pending = name; return; }

    const next = this.tracks[name];
    const prev = this.tracks[this.currentName];
    this.currentName = name;
    if (!next) return;

    next.play().catch(() => {});       // ignorera om filen saknas
    this._fade(next, this.volume);
    if (prev && prev !== next) this._fade(prev, 0, () => prev.pause());
  }

  _fade(audio, target, onDone) {
    if (audio._fadeTimer) clearInterval(audio._fadeTimer);
    const step = (target - audio.volume) / 20; // ~0.8s vid 40ms
    audio._fadeTimer = setInterval(() => {
      let v = audio.volume + step;
      if ((step >= 0 && v >= target) || (step < 0 && v <= target)) {
        v = target;
        clearInterval(audio._fadeTimer);
        audio._fadeTimer = null;
        if (onDone) onDone();
      }
      audio.volume = Math.min(1, Math.max(0, v));
    }, 40);
  }
}