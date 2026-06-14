export class MusicSystem {
  constructor(volume = 0.45) {
    this.tracks = {};
    this.volume = volume;
    this.current = null;      // spår som FAKTISKT spelas just nu
    this.desired = null;      // spår spelet vill höra
    this.unlocked = false;    // sätts först när ett play() verkligen lyckats
    this._attempting = false; // skydd mot dubbel-play under den asynkrona luckan

    // Webbläsare blockerar ljud tills användaren interagerat. OBS: alla
    // gester duger inte – t.ex. ger Escape i Chrome ingen "user activation"
    // för media, så play() avvisas (NotAllowedError). Vi tar därför INTE
    // bort lyssnarna förrän ett play() faktiskt lyckats, och försöker igen
    // vid varje ny gest. Då kan en tidig Escape-stängning inte längre
    // permanent döda musiken.
    this._onGesture = () => this._unlock();
    window.addEventListener('keydown', this._onGesture);
    window.addEventListener('pointerdown', this._onGesture);
  }

  add(name, url) {
    const a = new Audio(url);
    a.loop = true;
    a.volume = 0;
    this.tracks[name] = a;
  }

  // Spelet ber om ett spår. Före upplåsning sparas bara önskemålet och
  // verkställs vid nästa giltiga gest; efter upplåsning korsfadear vi direkt.
  play(name) {
    this.desired = name;
    if (this.unlocked) this._sync();
  }

  // Körs vid varje användargest tills ljudet är upplåst.
  _unlock() {
    if (this.unlocked || this._attempting) return;
    const name = this.desired;
    const track = name && this.tracks[name];
    if (!track) {
      // Inget (giltigt) spår att starta ännu. Om ett spår är önskat men
      // filen saknas räknar vi ändå gesten som upplåsande så vi inte
      // fastnar och lyssnar i all evighet.
      if (name) this._markUnlocked();
      return;
    }

    this._attempting = true;
    track.play().then(() => {
      this._attempting = false;
      this.current = name;
      this._fade(track, this.volume);
      this._markUnlocked();
    }).catch(() => {
      // Gesten gav ingen mediarättighet (t.ex. Escape). Behåll lyssnarna
      // och försök igen vid nästa gest – inget tillstånd ändras.
      this._attempting = false;
    });
  }

  _markUnlocked() {
    this.unlocked = true;
    window.removeEventListener('keydown', this._onGesture);
    window.removeEventListener('pointerdown', this._onGesture);
    this._sync(); // ifall spelet hunnit önska ett annat spår under tiden
  }

  // Korsfadear mot önskat spår. Anropas bara när ljudet är upplåst.
  _sync() {
    const name = this.desired;
    if (!name || name === this.current) return;
    const next = this.tracks[name];
    const prev = this.current ? this.tracks[this.current] : null;
    this.current = name;
    if (!next) return; // saknad fil – behandla som "tyst men aktiv"
    next.play().catch(() => {});
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