export class InventorySystem {
  constructor() {
    this.items = [];
    this.el = document.getElementById('inventory');
    this._selectionProvider = () => -1; // sätts av MenuManager
  }

  // MenuManager ger en funktion som returnerar markerat index (eller -1)
  setSelectionProvider(fn) {
    this._selectionProvider = fn;
  }

  add(item) {
    this.items.push(item);
    if (this.el.style.display === 'block') this.render();
  }

  remove(id) {
    const i = this.items.findIndex(it => it.id === id);
    if (i !== -1) this.items.splice(i, 1);
    if (this.el.style.display === 'block') this.render();
  }

  count(id) {
    return this.items.filter(it => it.id === id).length;
  }

  has(id) {
    return this.items.some(it => it.id === id);
  }

  // Slår ihop dubbletter till en lista med { id, name, icon, n, usable }
  groupedItems() {
    const counts = {};
    const order = [];
    for (const it of this.items) {
      if (!(it.id in counts)) { counts[it.id] = { ...it, n: 0 }; order.push(it.id); }
      counts[it.id].n++;
    }
    return order.map(id => counts[id]);
  }

  render() {
    const groups = this.groupedItems();
    const sel = this._selectionProvider();

    let body;
    if (groups.length === 0) {
      body = '<div><em>Tomt</em></div>';
    } else {
      body = groups.map((c, i) => {
        const highlight = i === sel
          ? ' style="background:rgba(184,155,94,0.30);border-radius:4px;"'
          : '';
        const arrow = i === sel ? '\u27a4 ' : '\u00A0\u00A0\u00A0';
        const count = c.n > 1 ? ` \u00d7${c.n}` : '';
        const tag = c.usable ? ' <span style="color:#8d8">(anv\u00e4nd)</span>' : '';
        return `<div${highlight}>${arrow}${c.icon} ${c.name}${count}${tag}</div>`;
      }).join('');
    }

    this.el.innerHTML =
      '<h3>Inventory</h3>' + body +
      '<p style="margin:10px 0 0;font-size:13px;color:#ccb;">\u2191/\u2193 v\u00e4lj &nbsp;\u00b7&nbsp; Enter/E anv\u00e4nd &nbsp;\u00b7&nbsp; Esc st\u00e4ng</p>';
  }
}