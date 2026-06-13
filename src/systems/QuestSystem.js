export class QuestSystem {
  constructor() {
    this.quests = [];
    this.el = document.getElementById('questlog');
  }

  add(quest) {
    if (this.has(quest.id)) return;
    this.quests.push({ status: 'active', ...quest });
    if (this.el.style.display === 'block') this.render();
  }

  complete(id) {
    const q = this.quests.find(q => q.id === id);
    if (q) q.status = 'complete';
    if (this.el.style.display === 'block') this.render();
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

  render() {
    this.el.innerHTML =
      '<h3>Uppdrag</h3>' +
      (this.quests.length
        ? this.quests.map(q =>
            q.status === 'complete'
              ? `<div class="done">\u2713 ${q.title}</div>`
              : `<div>\u2726 <b>${q.title}</b><br><small>${q.text}</small></div>`
          ).join('')
        : '<div><em>Inga uppdrag \u00e4nnu. Prata med byborna!</em></div>') +
      '<p style="margin:10px 0 0;font-size:13px;color:#ccb;">Esc st\u00e4ng</p>';
  }
}