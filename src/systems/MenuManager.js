// Centraliserar alla överlagrings-menyer (inventory, uppdrag, hjälp) så att
// bara EN kan vara öppen i taget, Escape stänger den öppna, och inventoryt
// kan navigeras med piltangenter + Enter/E för att använda valt föremål.
export class MenuManager {
  constructor({ inventory, quests, controlsEl, hintEl, onUseItem }) {
    this.inventory = inventory;
    this.quests = quests;
    this.controlsEl = controlsEl;
    this.hintEl = hintEl;
    this.onUseItem = onUseItem; // (item) => boolean  (true om föremålet förbrukades)

    this.current = null;        // 'inventory' | 'quests' | 'controls' | null
    this.selected = 0;          // markerat index i inventoryt

    // Låt inventoryt veta hur det ska rita markeringen
    this.inventory.setSelectionProvider(() => (this.current === 'inventory' ? this.selected : -1));

    // Hjälpen visas vid start
    this.open('controls');

    window.addEventListener('keydown', e => this.handleKey(e));
  }

  isOpen() {
    return this.current !== null;
  }

  open(which) {
    // Stäng allt annat först – aldrig två menyer samtidigt
    this.closeAll(true);
    this.current = which;
    if (which === 'inventory') {
      this.selected = 0;
      this.inventory.render();
      this.inventory.el.style.display = 'block';
    } else if (which === 'quests') {
      this.quests.render();
      this.quests.el.style.display = 'block';
    } else if (which === 'controls') {
      this.controlsEl.style.display = 'block';
    }
    if (this.hintEl) this.hintEl.style.display = 'none';
  }

  closeAll(silent = false) {
    this.inventory.el.style.display = 'none';
    this.quests.el.style.display = 'none';
    this.controlsEl.style.display = 'none';
    this.current = null;
    if (!silent && this.hintEl) this.hintEl.style.display = 'block';
  }

  toggle(which) {
    if (this.current === which) this.closeAll();
    else this.open(which);
  }

  handleKey(e) {
    // Escape stänger alltid den öppna menyn
    if (e.code === 'Escape') {
      if (this.isOpen()) { e.preventDefault(); this.closeAll(); }
      return;
    }

    if (e.code === 'KeyI') { e.preventDefault(); this.toggle('inventory'); return; }
    if (e.code === 'KeyQ') { e.preventDefault(); this.toggle('quests'); return; }
    if (e.code === 'KeyH') { e.preventDefault(); this.toggle('controls'); return; }

    // Navigering i inventoryt
    if (this.current === 'inventory') {
      const groups = this.inventory.groupedItems();
      if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        e.preventDefault();
        if (groups.length > 0) {
          const dir = e.code === 'ArrowDown' ? 1 : -1;
          this.selected = (this.selected + dir + groups.length) % groups.length;
          this.inventory.render();
        }
      } else if (e.code === 'Enter' || e.code === 'KeyE') {
        e.preventDefault();
        const item = groups[this.selected];
        if (item && this.onUseItem) {
          const consumed = this.onUseItem(item);
          if (consumed) {
            const newGroups = this.inventory.groupedItems();
            if (this.selected >= newGroups.length) {
              this.selected = Math.max(0, newGroups.length - 1);
            }
            this.inventory.render();
          }
        }
      }
    }
  }
}