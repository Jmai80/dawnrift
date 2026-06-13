export class QuestSystem {
  constructor() {
    this.quests = [];
    this.open = false;
    this.el = document.getElementById('questlog');

    window.addEventListener('keydown', e => {
      if (e.code === 'KeyQ') this.toggle();
    });
  }

  add(quest) {
    if (this.has(quest.id)) return;
    this.quests.push({ status: 'active', ...quest });
    if (this.open) this.render();
  }

  complete(id) {
    const q = this.quests.find(q => q.id === id);
    if (q) q.status = 'complete';
    if (this.open) this.render();
  }

  has(id) {
    return this.quests.some(q => q.id === id);
  }

  isActive(id) {
    return this.quests.some(q => q.id === id && q.status === 'active');
  }

  isComplete(id) {
    return this.quests.some(q => q.id === id && q.status === 'complete');
  }

  toggle() {
    this.open = !this.open;
    if (this.open) this.render();
    this.el.style.display = this.open ? 'block' : 'none';
  }

  render() {
    this.el.innerHTML =
      '<h3>Uppdrag</h3>' +
      (this.quests.length
        ? this.quests.map(q =>
            q.status === 'complete'
              ? `<div class="done">✓ ${q.title}</div>`
              : `<div>✦ <b>${q.title}</b><br><small>${q.text}</small></div>`
          ).join('')
        : '<div><em>Inga uppdrag ännu. Prata med byborna!</em></div>');
  }
}