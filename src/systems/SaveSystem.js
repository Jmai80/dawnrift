import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────
// SaveSystem – sparar/laddar spelprogression i Supabase-tabellen
// `dawnriftsaves`. Sparningar nycklas på (player_name, slot): man skriver
// in ett namn och väljer en av tre checkpoint-platser.
//
// Publishable-nyckeln är gjord för att ligga i klientkod (skyddad av RLS),
// så det är okej att den står här. Secret-nyckeln ska ALDRIG ligga här.
// ─────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://oyhbdwtwtjtskfzwysrc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_kiKGG5B390hjmaIMqi3GXA_H8Qb_vB_';
const TABLE = 'dawnriftsaves';
const SLOTS = [1, 2, 3];

export class SaveSystem {
  // serialize() → objekt med hela progressionen; apply(obj) återställer den.
  // canOpen() → bool (false när en annan meny/butik är öppen).
  constructor({ serialize, apply, canOpen }) {
    this.serialize = serialize;
    this.apply = apply;
    this.canOpen = canOpen || (() => true);
    this.client = createClient(SUPABASE_URL, SUPABASE_KEY);
    this.el = document.getElementById('savemenu');
    this.openFlag = false;
    this.playerName = '';

    // Egen tangenthantering i capture-fas: K öppnar/stänger, Esc stänger,
    // och I/Q/H sväljs medan panelen är öppen så andra menyer inte krockar.
    // Övriga tangenter släpps igenom (så man kan skriva i namnfältet).
    window.addEventListener('keydown', e => this._onKey(e), true);
  }

  isOpen() { return this.openFlag; }

  _onKey(e) {
    if (e.code === 'KeyK') {
      // Öppna bara om ingen annan meny är öppen; stäng alltid om vår är öppen.
      if (this.openFlag) { this.hide(); e.preventDefault(); e.stopImmediatePropagation(); }
      else if (this.canOpen()) { this.show(); e.preventDefault(); e.stopImmediatePropagation(); }
      return;
    }
    if (!this.openFlag) return;
    if (e.code === 'Escape') { this.hide(); e.preventDefault(); e.stopImmediatePropagation(); return; }
    // Svälj meny-tangenter så MenuManager inte öppnar något ovanpå
    if (e.code === 'KeyI' || e.code === 'KeyQ' || e.code === 'KeyH') {
      e.preventDefault(); e.stopImmediatePropagation();
    }
    // Allt annat (bokstäver, backspace osv) släpps igenom till namnfältet
  }

  show() {
    this.openFlag = true;
    this._build();
    this.el.style.display = 'block';
    const input = this.el.querySelector('#savename');
    if (input) { input.value = this.playerName; setTimeout(() => input.focus(), 0); }
    if (this.playerName.trim()) this.refresh();
  }

  hide() {
    this.openFlag = false;
    this.el.style.display = 'none';
  }

  _build() {
    const rows = SLOTS.map(s => `
      <div class="shoprow">
        <span class="nm">Checkpoint ${s}</span>
        <span class="pr" id="slotinfo-${s}" style="min-width:120px;text-align:right;">—</span>
        <button data-act="save" data-slot="${s}">Spara</button>
        <button data-act="load" data-slot="${s}">Ladda</button>
      </div>`).join('');
    this.el.innerHTML = `
      <h3>Sparningar</h3>
      <div style="margin-bottom:8px;">
        Namn: <input id="savename" type="text" maxlength="40"
          style="background:#1a1712;color:#e8d8a8;border:1px solid #b89b5e;border-radius:4px;padding:4px 6px;width:60%;" />
      </div>
      ${rows}
      <div id="savestatus" style="margin-top:8px;color:#ccb;min-height:18px;"></div>
      <p>Skriv ett namn, välj checkpoint · K eller Esc stänger</p>`;

    const input = this.el.querySelector('#savename');
    input.addEventListener('input', () => { this.playerName = input.value; });
    input.addEventListener('change', () => { if (this.playerName.trim()) this.refresh(); });
    // Enter i fältet uppdaterar listan
    input.addEventListener('keydown', e => {
      if (e.code === 'Enter') { e.preventDefault(); if (this.playerName.trim()) this.refresh(); }
    });

    this.el.querySelectorAll('button[data-act]').forEach(btn => {
      btn.addEventListener('click', () => {
        const slot = parseInt(btn.dataset.slot, 10);
        if (btn.dataset.act === 'save') this.save(slot);
        else this.load(slot);
      });
    });
  }

  _status(msg, color = '#ccb') {
    const s = this.el.querySelector('#savestatus');
    if (s) { s.textContent = msg; s.style.color = color; }
  }

  // Hämta vilka checkpoints som finns för namnet + tidsstämplar
  async refresh() {
    const name = this.playerName.trim();
    if (!name) return;
    try {
      const { data, error } = await this.client
        .from(TABLE).select('slot, updated_at').eq('player_name', name);
      if (error) throw error;
      const bySlot = {};
      for (const row of (data || [])) bySlot[row.slot] = row.updated_at;
      for (const s of SLOTS) {
        const span = this.el.querySelector(`#slotinfo-${s}`);
        if (!span) continue;
        if (bySlot[s]) {
          const d = new Date(bySlot[s]);
          span.textContent = d.toLocaleDateString() + ' ' + d.toLocaleTimeString().slice(0, 5);
          span.style.color = '#9fd0a0';
        } else {
          span.textContent = 'tom';
          span.style.color = '#888';
        }
      }
    } catch (err) {
      this._status('Kunde inte hämta sparningar: ' + (err.message || err), '#e88');
    }
  }

  async save(slot) {
    const name = this.playerName.trim();
    if (!name) { this._status('Skriv ett namn först.', '#e88'); return; }
    this._status('Sparar…');
    try {
      const state = this.serialize();
      const { error } = await this.client.from(TABLE).upsert(
        { player_name: name, slot, state, updated_at: new Date().toISOString() },
        { onConflict: 'player_name,slot' }
      );
      if (error) throw error;
      this._status(`Sparat till checkpoint ${slot}.`, '#9fd0a0');
      this.refresh();
    } catch (err) {
      this._status('Kunde inte spara: ' + (err.message || err), '#e88');
    }
  }

  async load(slot) {
    const name = this.playerName.trim();
    if (!name) { this._status('Skriv ett namn först.', '#e88'); return; }
    this._status('Laddar…');
    try {
      const { data, error } = await this.client
        .from(TABLE).select('state').eq('player_name', name).eq('slot', slot).maybeSingle();
      if (error) throw error;
      if (!data) { this._status(`Ingen sparning i checkpoint ${slot}.`, '#e88'); return; }
      this.apply(data.state);
      this._status(`Laddade checkpoint ${slot}.`, '#9fd0a0');
      // Stäng efter en kort stund så spelaren ser bekräftelsen
      setTimeout(() => this.hide(), 700);
    } catch (err) {
      this._status('Kunde inte ladda: ' + (err.message || err), '#e88');
    }
  }
}