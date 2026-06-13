export class InventorySystem {
  constructor() {
    this.items = [];
    this.open = false;
    this.el = document.getElementById('inventory');

    window.addEventListener('keydown', e => {
      if (e.code === 'KeyI') this.toggle();
    });
  }

  add(item) {
    this.items.push(item);
    if (this.open) this.render();
  }

  remove(id) {
    const i = this.items.findIndex(it => it.id === id);
    if (i !== -1) this.items.splice(i, 1);
    if (this.open) this.render();
  }

  count(id) {
    return this.items.filter(it => it.id === id).length;
  }

  has(id) {
    return this.items.some(it => it.id === id);
  }

  toggle() {
    this.open = !this.open;
    if (this.open) this.render();
    this.el.style.display = this.open ? 'block' : 'none';
  }

  render() {
    const counts = {};
    const order = [];
    for (const it of this.items) {
      if (!(it.id in counts)) { counts[it.id] = { ...it, n: 0 }; order.push(it.id); }
      counts[it.id].n++;
    }
    this.el.innerHTML = '<h3>Inventory</h3>' + (order.length
      ? order.map(id => {
          const c = counts[id];
          return `<div>${c.icon} ${c.name}${c.n > 1 ? ` ×${c.n}` : ''}</div>`;
        }).join('')
      : '<div><em>Tomt</em></div>');
  }
}