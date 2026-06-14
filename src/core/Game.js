import * as THREE from 'three';
import { WorldScene } from '../world/WorldScene.js';
import { HouseScene } from '../world/HouseScene.js';
import { TowerScene } from '../world/TowerScene.js';
import { RangeShopScene } from '../world/RangeShopScene.js';
import { ManorShopScene } from '../world/ManorShopScene.js';
import { Player } from '../entities/Player.js';
import { InventorySystem } from '../systems/InventorySystem.js';
import { QuestSystem } from '../systems/QuestSystem.js';
import { MusicSystem } from '../systems/MusicSystem.js';
import { MinimapSystem } from '../systems/MinimapSystem.js';
import { MenuManager } from '../systems/MenuManager.js';
import { getHeight } from '../world/terrain/Terrain.js';
import { createDungeons } from '../content/dungeons.js';
import { createNPCs } from '../content/npcs.js';
import { buildMinimapMarkers } from '../content/minimapMarkers.js';

const POTION_HEAL = 3;

// --- renderare ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// --- kärnobjekt ---
const world = new WorldScene();
const player = new Player(world.scene, world.colliders);
const inventory = new InventorySystem();
const quests = new QuestSystem();
const minimap = new MinimapSystem();
minimap.setMarkers(buildMinimapMarkers(world));

const music = new MusicSystem();
music.add('world', '/audio/world-theme.mp3');
music.add('dungeon', '/audio/dungeon-theme.mp3');

player.mesh.traverse(o => { if (o.isMesh) o.castShadow = true; });

const houses = {
  elda: new HouseScene({ owner: 'elda' }),
  torvald: new HouseScene({ owner: 'torvald' }),
  tower: new TowerScene(),
  rangeshop: new RangeShopScene(),
  manor: new ManorShopScene()
};

// --- innehåll (data i src/content/) ---
const dungeons = createDungeons(world);
const { elda, torvald, bryn, npcs } = createNPCs(world);

// --- kamera ---
const camera = new THREE.PerspectiveCamera(
  70, window.innerWidth / window.innerHeight, 0.1, 1000
);
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- DOM ---
const promptEl = document.getElementById('prompt');
const dialogEl = document.getElementById('dialog');
const hudEl = document.getElementById('hud');
const controlsEl = document.getElementById('controls');
const hintEl = document.getElementById('hint');
const shopEl = document.getElementById('shop');

// --- föränderligt speltillstånd ---
let activeNPC = null;
let location = 'world';        // 'world' | 'house' | 'north' | 'east' | 'deep'
let currentHouse = null;
let houseReturnDoor = null;
let interaction = null;        // { prompt, act } – enda källan för både E-prompt och E-handling
let dialogTimer = 0;
let potionUnlocked = false;
let hasBow = false;
let bowCooldown = 0;
let bullseyeHits = 0;     // träffar i mitten på skyttebanan (questen Pricksäkerhet)
let gold = 0;          // starta med noll
let strengthBought = false; // den stärkande potionen är en engångs-permanent uppgradering
const arrows = [];

// --- scen-/HUD-hjälpare ---
function activeSceneFor() {
  return location === 'world' ? world.scene :
    location === 'house' ? currentHouse.scene :
    dungeons[location].sceneObj.scene;
}

function updateHud() {
  const hearts = '❤'.repeat(player.hp) + '♡'.repeat(player.maxHp - player.hp);
  const pots = inventory.count('lakedryck');
  const arrowsN = inventory.count('pil');
  hudEl.innerHTML = hearts +
    (pots > 0 ? `  <span style="color:#e88">🧪 ×${pots}</span>` : '') +
    (hasBow ? `  <span style="color:#dca">➳ ×${arrowsN}</span>` : '') +
    `  <span style="color:#e8c349">🪙 ${gold}</span>`;
}
updateHud();

// Lägg n pilar i inventoryt (pilar är en räknad resurs som bågen förbrukar).
function giveArrows(n) {
  for (let i = 0; i < n; i++) inventory.add({ id: 'pil', name: 'Pilar', icon: '➳' });
}

// Köp pilar i Bryns butik. Gratis tills vidare – vi har inga mynt än.
function buyArrows() {
  giveArrows(10);
  updateHud();
  showMessage('<b>Du köpte 10 pilar.</b> Gratis tills vidare — vi har inga mynt än.', 3);
}

function showMessage(html, seconds = 4) {
  dialogEl.innerHTML = html;
  dialogEl.style.display = 'block';
  dialogTimer = seconds;
}

// Stäng en öppen meddelanderuta (t.ex. bokens text) i förtid. Returnerar true
// om något faktiskt stängdes – används av MenuManager för Escape.
function closeDialog() {
  if (dialogTimer > 0) {
    dialogTimer = 0;
    dialogEl.style.display = 'none';
    return true;
  }
  return false;
}

// Den stärkande potionen ger en PERMANENT uppgradering: spelaren går fortare
// och hoppar högre. Effekten är dyr och kan bara köpas en gång.
const STRENGTH_SPEED = 12;     // upp från standard 8
const STRENGTH_JUMP = 13;      // upp från standard 10
function applyStrengthBoost() {
  player.speed = STRENGTH_SPEED;
  player.jumpSpeed = STRENGTH_JUMP;
  strengthBought = true;
}

// Skjutförmåga: varje pricksäker träff vidgar tavlans EFFEKTIVA mitt en aning,
// så att allt snävare missar räknas som prick (upp till ett tak). Basvärdet
// 0.28 sätts i shootingRange.js; vi växer world.archeryTarget.bullseyeRadius.
const BULLSEYE_RADIUS_STEP = 0.16;
const BULLSEYE_RADIUS_MAX = 0.85; // strax under inre röda ringen (0.92) – lite skicklighet kvar
function growAccuracy() {
  const t = world.archeryTarget;
  if (!t || t.bullseyeRadius >= BULLSEYE_RADIUS_MAX) return false;
  t.bullseyeRadius = Math.min(BULLSEYE_RADIUS_MAX, t.bullseyeRadius + BULLSEYE_RADIUS_STEP);
  return true;
}

// Liten hjälp för "milstolpe-uppdrag": lägg till och slutför direkt, så viktiga
// steg (besökt handelsboden, köpt styrkedrycken, bärgat reliken …) syns i
// uppdragsloggen som avklarade. Idempotent – gör inget om den redan är klar.
function milestone(id, title, text) {
  if (quests.isComplete(id)) return false;
  quests.add({ id, title, text });
  quests.complete(id);
  return true;
}

// Drick en läkedryck. Returnerar true om en flaska förbrukades.
function drinkPotion() {
  if (inventory.count('lakedryck') <= 0) return false;
  if (player.hp >= player.maxHp) {
    showMessage('Du har redan full hälsa.', 2);
    return false;
  }
  inventory.remove('lakedryck');
  player.hp = Math.min(player.maxHp, player.hp + POTION_HEAL);
  updateHud();
  showMessage('<b>Du dricker en läkedryck och känner dig starkare.</b>', 2);
  return true;
}

// Centraliserad menyhantering: bara en meny öppen i taget, Esc stänger meny
// eller en öppen meddelanderuta, piltangenter + Enter/E använder valt föremål.
const menus = new MenuManager({
  inventory,
  quests,
  controlsEl,
  hintEl,
  onUseItem: (item) => {
    if (item.id === 'lakedryck') return drinkPotion();
    showMessage(`${item.icon} ${item.name} går inte att använda så.`, 2);
    return false;
  },
  closeDialog
});

// --- handelsbod (herrgården) -------------------------------------------------
// En egen köp-/sälj-meny. Den lånar samma överlagrings-stil som de andra
// menyerna men har egen tangenthantering: när den är öppen pausas spelaren och
// MenuManager hålls stängd (Game.js huvud-keydown kollar shop.isOpen() också).
//
// Köpkatalog: läkedryck (billig, läker) och en stärkande potion (dyr,
// permanent fart-/hopp-uppgradering, kan bara köpas en gång).
// Säljkatalog: byggs ur inventoryt – allt med ett definierat säljpris.
const PRICES = {
  buy: {
    lakedryck: 35,
    styrkedryck: 1000
  },
  sell: {
    lakedryck: 15,
    rostigt_svard: 40,
    forntida_amulett: 120,
    gyllene_kalk: 250,
    pil: 1
  }
};

const ITEM_META = {
  lakedryck:        { name: 'Läkedryck', icon: '🧪' },
  styrkedryck:      { name: 'Styrkedryck', icon: '🟢' },
  rostigt_svard:    { name: 'Rostigt svärd', icon: '🗡️' },
  forntida_amulett: { name: 'Forntida amulett', icon: '📿' },
  gyllene_kalk:     { name: 'Gyllene kalk', icon: '🏆' },
  pil:              { name: 'Pilar', icon: '➳' }
};

const shop = {
  open: false,
  selected: 0,
  rows: [],

  isOpen() { return this.open; },

  // Bygg den platta listan av rader (köp först, sedan sälj) som menyn navigerar.
  buildRows() {
    const rows = [];
    rows.push({ type: 'header', label: 'KÖP' });
    // Läkedryck – alltid köpbar
    rows.push({
      type: 'buy', id: 'lakedryck',
      price: PRICES.buy.lakedryck,
      enabled: gold >= PRICES.buy.lakedryck
    });
    // Styrkedryck – dyr engångsuppgradering
    rows.push({
      type: 'buy', id: 'styrkedryck',
      price: PRICES.buy.styrkedryck,
      enabled: !strengthBought && gold >= PRICES.buy.styrkedryck,
      bought: strengthBought
    });

    // Säljbart ur inventoryt (grupperat), allt som har ett säljpris
    const sellable = inventory.groupedItems().filter(g => PRICES.sell[g.id] != null);
    rows.push({ type: 'header', label: 'SÄLJ' });
    if (sellable.length === 0) {
      rows.push({ type: 'empty', label: 'Inget att sälja' });
    } else {
      for (const g of sellable) {
        rows.push({
          type: 'sell', id: g.id, n: g.n,
          price: PRICES.sell[g.id], enabled: true
        });
      }
    }
    this.rows = rows;
  },

  // Index över valbara (icke-header) rader, för piltangentsnavigering.
  selectableIndices() {
    const out = [];
    this.rows.forEach((r, i) => {
      if (r.type === 'buy' || r.type === 'sell') out.push(i);
    });
    return out;
  },

  show() {
    this.open = true;
    menus.closeAll(true);          // garantera att ingen annan meny är öppen
    closeDialog();
    this.buildRows();
    // Markera första valbara raden
    const sel = this.selectableIndices();
    this.selected = sel.length ? sel[0] : 0;
    this.render();
    shopEl.style.display = 'block';
  },

  hide() {
    this.open = false;
    shopEl.style.display = 'none';
  },

  render() {
    let body = `<h3>Handelsbod</h3>`;
    body += `<div style="text-align:center;margin-bottom:6px">Din pung: <span class="gold">🪙 ${gold}</span></div>`;
    this.rows.forEach((r, i) => {
      if (r.type === 'header') {
        body += `<div class="sect">${r.label}</div>`;
        return;
      }
      if (r.type === 'empty') {
        body += `<div class="shoprow disabled"><span class="arrow"></span><span class="nm"><em>${r.label}</em></span></div>`;
        return;
      }
      const meta = ITEM_META[r.id] || { name: r.id, icon: '•' };
      const isSel = i === this.selected;
      const cls = 'shoprow' + (isSel ? ' sel' : '') + (r.enabled ? '' : ' disabled');
      const arrow = isSel ? '➤' : '';
      let label = `${meta.icon} ${meta.name}`;
      if (r.type === 'sell' && r.n > 1) label += ` ×${r.n}`;
      if (r.type === 'buy' && r.bought) label += ' (köpt)';
      const prCls = r.type === 'sell' ? 'pr sell' : 'pr';
      const prSign = r.type === 'sell' ? '+' : '';
      body += `<div class="${cls}">` +
        `<span class="arrow">${arrow}</span>` +
        `<span class="nm">${label}</span>` +
        `<span class="${prCls}">${prSign}🪙 ${r.price}</span>` +
        `</div>`;
    });
    body += `<p>↑/↓ välj · Enter/E köp/sälj · Esc stäng</p>`;
    shopEl.innerHTML = body;
  },

  move(dir) {
    const sel = this.selectableIndices();
    if (!sel.length) return;
    let pos = sel.indexOf(this.selected);
    if (pos === -1) pos = 0;
    pos = (pos + dir + sel.length) % sel.length;
    this.selected = sel[pos];
    this.render();
  },

  confirm() {
    const r = this.rows[this.selected];
    if (!r || (r.type !== 'buy' && r.type !== 'sell')) return;
    if (r.type === 'buy') this.buy(r);
    else this.sell(r);
    // Bygg om (priser/lager/guld kan ha ändrats) och behåll markeringen rimlig
    const prevId = r.id;
    this.buildRows();
    const match = this.rows.findIndex(x => (x.type === 'buy' || x.type === 'sell') && x.id === prevId);
    const sel = this.selectableIndices();
    this.selected = match !== -1 ? match : (sel.length ? sel[0] : 0);
    this.render();
    updateHud();
  },

  buy(r) {
    if (r.id === 'styrkedryck') {
      if (strengthBought) { showMessage('Du har redan druckit styrkedrycken.', 2.5); return; }
      if (gold < r.price) { showMessage('Du har inte råd med styrkedrycken.', 2.5); return; }
      gold -= r.price;
      applyStrengthBoost();
      milestone('kop_styrkedryck', 'Styrkans gåva', 'Köp den stärkande styrkedrycken i handelsboden.');
      showMessage('<b>Du dricker styrkedrycken!</b> Du känner dig snabbare och spänstigare — för alltid.', 5);
      return;
    }
    if (r.id === 'lakedryck') {
      if (gold < r.price) { showMessage('Du har inte råd med en läkedryck.', 2.5); return; }
      gold -= r.price;
      inventory.add({ id: 'lakedryck', name: 'Läkedryck', icon: '🧪', usable: true });
      showMessage('<b>Du köpte en läkedryck.</b>', 2.5);
    }
  },

  sell(r) {
    if (inventory.count(r.id) <= 0) return;
    inventory.remove(r.id);
    gold += r.price;
    const meta = ITEM_META[r.id] || { name: r.id };
    showMessage(`<b>Du sålde ${meta.name}</b> för 🪙 ${r.price}.`, 2.5);
  },

  handleKey(e) {
    if (!this.open) return false;
    if (e.code === 'Escape') { e.preventDefault(); this.hide(); return true; }
    if (e.code === 'ArrowUp')   { e.preventDefault(); this.move(-1); return true; }
    if (e.code === 'ArrowDown') { e.preventDefault(); this.move(1);  return true; }
    if (e.code === 'Enter' || e.code === 'KeyE') { e.preventDefault(); this.confirm(); return true; }
    // Svälj övriga tangenter medan boden är öppen så de inte läcker till spelet
    return true;
  }
};

// Handelsboden får första tjing på tangenter när den är öppen (capture-fas),
// före både MenuManager och Game.js egna lyssnare. stopImmediatePropagation
// hindrar de andra keydown-lyssnarna (MenuManager, Player) från att också reagera.
window.addEventListener('keydown', e => {
  if (shop.isOpen()) { shop.handleKey(e); e.stopImmediatePropagation(); }
}, true);

// --- pilar ---
function clearArrows() {
  for (const a of arrows) a.scene.remove(a.mesh);
  arrows.length = 0;
}

function fireArrow() {
  if (!hasBow || bowCooldown > 0) return;
  if (inventory.count('pil') <= 0) {
    showMessage('Du har inga pilar kvar — köp fler hos Bryn på skyttebanan.', 2.5);
    return;
  }
  bowCooldown = 0.55;
  inventory.remove('pil');
  updateHud();
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(player.mesh.quaternion);
  const start = player.mesh.position.clone()
    .add(new THREE.Vector3(0, 1.0, 0))
    .add(dir.clone().multiplyScalar(0.9));
  const arrow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6),
    new THREE.MeshBasicMaterial({ color: 0xeecc66 })
  );
  arrow.position.copy(start);
  arrow.quaternion.copy(player.mesh.quaternion);
  arrow.rotateX(-Math.PI / 2);
  const scene = activeSceneFor();
  scene.add(arrow);
  arrows.push({ mesh: arrow, dir, dist: 0, scene });
}

function updateArrows(delta) {
  const target = world.archeryTarget;
  for (let i = arrows.length - 1; i >= 0; i--) {
    const a = arrows[i];
    const step = 32 * delta;
    const prev = a.mesh.position.clone();
    a.mesh.position.addScaledVector(a.dir, step);
    a.dist += step;
    let hit = false;
    if (dungeons[location] && a.scene === dungeons[location].sceneObj.scene) {
      for (const en of dungeons[location].enemies) {
        if (en.alive && en.distanceTo(a.mesh.position) < 1.0) {
          en.takeDamage(a.mesh.position);
          if (!en.alive) showMessage(`<b>${en.name} är besegrad!</b>`);
          hit = true;
          break;
        }
      }
    } else if (location === 'world' && target && a.scene === world.scene) {
      // Klassa träffen efter var pilen korsar tavlans plan (z = center.z),
      // inte efter närmaste frame-avstånd – annars kan framen strax före mitten
      // felaktigt räknas som ringträff och förbruka pilen innan den når mitten.
      const planeZ = target.center.z;
      const cur = a.mesh.position;
      if (prev.z > planeZ && cur.z <= planeZ) {
        const t = (prev.z - planeZ) / (prev.z - cur.z);
        const hx = prev.x + (cur.x - prev.x) * t;
        const hy = prev.y + (cur.y - prev.y) * t;
        const radial = Math.hypot(hx - target.center.x, hy - target.center.y);
        if (radial < target.bullseyeRadius) { registerBullseye(); hit = true; }
        else if (radial < target.radius) { registerTargetHit(); hit = true; }
      }
    }
    if (hit || a.dist > 45) {
      a.scene.remove(a.mesh);
      arrows.splice(i, 1);
    }
  }
}

// --- quest-/interaktionsskript (anropas av interaction.act) ---
function talkTo(npc) {
  if (npc === bryn) { talkToArcher(); return; }
  let extra = '';
  if (npc === torvald) {
    if (!quests.has('hitta_svardet')) {
      quests.add({ id: 'hitta_svardet', title: 'Farfars svärd', text: 'Hitta svärdet i grottan norrut.' });
      extra = '<br><i>Nytt uppdrag: Farfars svärd (tryck Q för uppdragsloggen)</i>';
    } else if (quests.isActive('atervand_torvald')) {
      quests.complete('atervand_torvald');
      quests.add({ id: 'grottan_i_oster', title: 'Grottan i öster', text: 'Utforska grottan österut, bortom skogen.' });
      torvald.setLines([
        'Grottan i öster... ingen i byn vågar gå nära den.',
        'Lycka till, äventyrare. Farfars svärd är i goda händer.'
      ]);
      extra = '<br><i>Uppdrag slutfört! Nytt uppdrag: Grottan i öster</i>';
    }
  }
  dialogEl.innerHTML = `<b>${npc.name}:</b> ${npc.nextLine()}` + extra;
  dialogEl.style.display = 'block';
}

// Bryn vid skyttebanan: kontextkänslig dialog + questen Pricksäkerhet.
function talkToArcher() {
  let msg;
  if (!hasBow) {
    if (!quests.has('hitta_pilbagen')) {
      quests.add({
        id: 'hitta_pilbagen', title: 'Jägarens pilbåge',
        text: 'Sägs vila djupt nere i djupgrottan i sydväst.'
      });
    }
    msg = 'Skjutbanan är till för bågskyttar. Bärga Jägarens pilbåge ur djupgrottan i sydväst, så lär jag dig att sikta.';
  } else if (quests.isComplete('pricksakerhet')) {
    msg = 'Mästerligt skjutet! Banan står öppen om du vill öva mer.';
  } else {
    if (!quests.has('pricksakerhet')) {
      quests.add({
        id: 'pricksakerhet', title: 'Pricksäkerhet',
        text: 'Träffa piltavlans mitt 3 gånger på skyttebanan.'
      });
    }
    msg = `Ställ dig vid linjen och sikta mot pricken i mitten. Tryck G för att skjuta. Träffa mitten tre gånger! (${bullseyeHits}/3)`;
  }
  dialogEl.innerHTML = `<b>${bryn.name}:</b> ${msg}`;
  dialogEl.style.display = 'block';
}

function registerBullseye() {
  // Varje pricksäker träff skärper skjutförmågan (vidgar effektiva mitten).
  const improved = growAccuracy();

  if (!quests.isActive('pricksakerhet')) {
    // Utanför questen (innan den startats eller efter att den klarats): träffen
    // räknas fortfarande som skickleighetsträning så länge taket inte nåtts.
    const tail = improved ? ' Din pricksäkerhet skärps.' : '';
    showMessage('<b>Mitt i prick!</b>' + tail, 1.5);
    return;
  }
  bullseyeHits++;
  if (bullseyeHits >= 3) {
    quests.complete('pricksakerhet');
    showMessage('<b>Mitt i prick — 3/3!</b> Pricksäkerheten är bemästrad — nu räknas även nära skott som prick. Bryn nickar imponerat.', 5);
  } else {
    showMessage(`<b>Mitt i prick!</b> ${bullseyeHits}/3 — pricksäkerheten skärps.`, 2);
  }
}

function registerTargetHit() {
  showMessage('Träff på tavlan! Sikta mot pricken i mitten.', 1.5);
}

function takePotionFromHouse() {
  currentHouse.takePotion();
  inventory.add({ id: 'lakedryck', name: 'Läkedryck', icon: '🧪', usable: true });
  updateHud();
  showMessage('<b>Du tog en läkedryck!</b> Tryck R, eller öppna inventoryt (I) och välj den.', 5);
}

function collectPickup(pk) {
  dungeons[location].sceneObj.collect(pk);
  inventory.add(pk.loot);
  updateHud();
  handleLootEffect(pk.loot.id);
}

function handleLootEffect(id) {
  if (id === 'rostigt_svard') {
    player.equipSword();
    quests.add({ id: 'hitta_svardet', title: 'Farfars svärd', text: 'Hitta svärdet i grottan norrut.' });
    quests.complete('hitta_svardet');
    quests.add({ id: 'atervand_torvald', title: 'Återvänd till Torvald', text: 'Berätta för Torvald att du hittat svärdet.' });
    torvald.setLines([
      'Du hittade det! Farfars gamla svärd... Behåll det, du har förtjänat det.',
      'Vänta – jag har hört talas om en grotta till, österut bortom skogen.'
    ]);
    showMessage('<b>Du hittade Torvalds farfars svärd!</b> (F för att svinga)', 5);
  } else if (id === 'forntida_amulett') {
    quests.add({ id: 'grottan_i_oster', title: 'Grottan i öster', text: 'Utforska grottan österut, bortom skogen.' });
    quests.complete('grottan_i_oster');
    showMessage('<b>Du fann den forntida amuletten!</b> Grottan i öster är avklarad.', 5);
  } else if (id === 'pilbage') {
    hasBow = true;
    giveArrows(15);
    updateHud();
    // Slutför bågquesten (lägg till + slutför, så den syns även om spelaren
    // aldrig pratat med Bryn först – samma mönster som svärdet).
    quests.add({ id: 'hitta_pilbagen', title: 'Jägarens pilbåge', text: 'Sägs vila djupt nere i djupgrottan i sydväst.' });
    quests.complete('hitta_pilbagen');
    showMessage('<b>Du fick Jägarens pilbåge!</b> Du har 15 pilar. Tryck G för att skjuta — köp fler hos Bryn.', 5);
  } else if (id === 'lakedryck') {
    showMessage('<b>En läkedryck!</b> Tryck R för att dricka när du är skadad.', 4);
  } else if (id === 'gyllene_kalk') {
    // Milstolpe: djupgrottans relik bärgad.
    milestone('djupets_relik', 'Djupets relik', 'Bärga den gyllene kalken ur djupgrottan.');
    showMessage('<b>En förgylld kalk</b> – ett ovärderligt fynd ur djupets mörker.', 5);
  }
}

// --- input ---
window.addEventListener('keydown', e => {
  // Handelsboden äger tangenterna helt när den är öppen (egen lyssnare i capture-fas)
  if (shop.isOpen()) return;
  // När en meny är öppen sköter MenuManager tangenterna (val, Esc osv)
  if (menus.isOpen()) return;
  if (e.code === 'KeyG') { fireArrow(); return; }
  if (e.code === 'KeyR') { drinkPotion(); return; }
  // All kontextkänslig E-interaktion går via det aktuella interaction-objektet.
  if (e.code === 'KeyE' && interaction && interaction.act) interaction.act();
});

// --- tillståndsövergångar ---
function enterDungeon(key) {
  location = key;
  clearArrows();
  const d = dungeons[key];
  d.sceneObj.scene.add(player.mesh);
  player.teleport(0, -2, { groundFn: () => 0, colliders: d.sceneObj.colliders, bounds: d.sceneObj.bounds });
}

function exitDungeon() {
  const ent = dungeons[location].entrance;
  location = 'world';
  clearArrows();
  world.scene.add(player.mesh);
  player.teleport(ent.x, ent.z + 9, { groundFn: getHeight, colliders: world.colliders, bounds: null });
}

function enterHouse(door) {
  const house = houses[door.owner];
  if (!house) {
    // Ingen interiör kopplad till dörren (t.ex. owner: null). Behandla som
    // låst i stället för att krascha på houses[undefined].scene.
    showMessage('Dörren är låst – förseglad tills vidare', 2);
    return;
  }
  location = 'house';
  clearArrows();
  currentHouse = house;
  houseReturnDoor = door;
  // Milstolpe: första besöket i handelsboden (herrgården).
  if (door.owner === 'manor' && milestone('besok_handelsboden', 'Handelsboden', 'Hitta och besök handelsboden i herrgården.')) {
    showMessage('<b>Du kliver in i handelsboden.</b> Köpmannen bakom disken nickar mot dig.', 4);
  }
  currentHouse.scene.add(player.mesh);
  const sp = house.entryPos || { x: 0, z: 2.5 };
  player.teleport(sp.x, sp.z, {
    groundFn: house.groundFn || (() => 0),
    colliders: currentHouse.colliders,
    bounds: currentHouse.bounds,
    cameraMaxY: house.cameraMaxY,
    faceY: house.faceY
  });
}

function exitHouse() {
  location = 'world';
  clearArrows();
  world.scene.add(player.mesh);
  player.teleport(houseReturnDoor.x, houseReturnDoor.z + 2.5, { groundFn: getHeight, colliders: world.colliders, bounds: null });
  currentHouse = null;
}

function respawn() {
  player.hp = player.maxHp;
  location = 'world';
  clearArrows();
  world.scene.add(player.mesh);
  player.teleport(0, 0, { groundFn: getHeight, colliders: world.colliders, bounds: null });
  showMessage('<b>Du vaknar omtöcknad upp i byn...</b>');
  updateHud();
}

function onFirstDungeonDamage() {
  if (potionUnlocked) return;
  potionUnlocked = true;
  houses.elda.spawnPotion();
  elda.setLines([
    'Jag ser att du är skadad! Inne i mitt hus finns en flaska till dig — drick den för att läka.',
    'Var rädd om dig där ute.'
  ]);
  showMessage('Du blev skadad! Elda i byn verkar ha lagt märke till det — sök upp henne.', 5);
}

// --- per-tillstånd-tick (sätter activeNPC/interaction och hanterar övergångar) ---
function tickWorld(delta) {
  world.updateSun(player.mesh.position);
  const pos = player.mesh.position;

  for (const npc of npcs) {
    if (npc.distanceTo(pos) < 3.5) {
      activeNPC = npc; npc.faceToward(pos); // nära nog att prata: vänd dig mot spelaren
    } else if (npc.update) {
      npc.update(delta);                    // annars: virrig vandring (om NPC:n vandrar)
    }
  }
  if (activeNPC) {
    interaction = { prompt: 'Tryck E för att prata', act: () => talkTo(activeNPC) };
  } else if (pos.distanceTo(world.monumentPos) < 3.4) {
    interaction = { prompt: 'Tryck E för att granska stoden', act: () => showMessage(world.monumentText, 8) };
  }

  // Grottingång (övergång – sluta ticka världen denna frame)
  for (const key of Object.keys(dungeons)) {
    const ent = dungeons[key].entrance;
    const dx = pos.x - ent.x, dz = pos.z - ent.z;
    if (dx * dx + dz * dz < 25) { enterDungeon(key); return; }
  }

  // Husdörrar: olåsta går in automatiskt, låsta visar bara prompt
  for (const door of world.houseDoors) {
    const dx = pos.x - door.x, dz = pos.z - door.z;
    if (dx * dx + dz * dz < 5.3) {
      if (door.locked) {
        if (!interaction) interaction = { prompt: 'Dörren är låst – förseglad tills vidare', act: null };
      } else {
        enterHouse(door);
        return;
      }
      break;
    }
  }
}

function tickHouseInterior(delta) {
  currentHouse.update(delta);
  const pos = player.mesh.position;

  // Bok och flaska kan ligga nära varandra på skrivbordet. Markera bara EN
  // i taget – den spelaren står närmast – så det går att sikta på rätt sak.
  const dBook = currentHouse.book
    ? pos.distanceTo(currentHouse.bookPos) : Infinity;
  const dPotion = (currentHouse.potion && currentHouse.potion.visible && !currentHouse.potionTaken)
    ? pos.distanceTo(currentHouse.potionPos) : Infinity;
  const bookInRange = dBook < 2.2;
  const potionInRange = dPotion < 1.9;
  let showBook = false, showPotion = false;
  if (bookInRange && potionInRange) {
    if (dBook <= dPotion) showBook = true; else showPotion = true;
  } else {
    showBook = bookInRange;
    showPotion = potionInRange;
  }
  if (showBook) {
    interaction = { prompt: 'Tryck E för att läsa boken', act: () => showMessage(currentHouse.bookText, 8) };
  } else if (showPotion) {
    interaction = { prompt: 'Tryck E för att plocka upp flaskan', act: takePotionFromHouse };
  } else if (currentHouse.shopPos && pos.distanceTo(currentHouse.shopPos) < 2.8) {
    if (currentHouse === houses.manor) {
      interaction = { prompt: 'Tryck E för att handla (köp / sälj)', act: () => shop.show() };
    } else {
      interaction = { prompt: 'Tryck E för att köpa 10 pilar (gratis)', act: buyArrows };
    }
  }

  if (pos.distanceTo(currentHouse.exitPos) < 1.0) exitHouse();
}

function tickDungeon(delta) {
  const d = dungeons[location];
  d.sceneObj.update(delta);
  const pos = player.mesh.position;

  for (const en of d.enemies) {
    en.update(delta, pos);
    if (!en.alive) continue;

    if (player.attackActive && en.distanceTo(pos) < 2.3) {
      en.takeDamage(pos);
      if (!en.alive) showMessage(`<b>${en.name} är besegrad!</b>`);
    }
    if (en.alive && en.distanceTo(pos) < 1.2 && player.takeDamage(en.mesh.position)) {
      updateHud();
      onFirstDungeonDamage();
      if (player.hp <= 0) { respawn(); return; }
    }
  }

  const sd = d.sceneObj;
  for (const pk of sd.pickups) {
    if (!pk.taken && pos.distanceTo(pk.group.position) < 2.2) {
      interaction = { prompt: 'Tryck E för att plocka upp föremålet', act: () => collectPickup(pk) };
      break;
    }
  }
  if (pos.distanceTo(sd.exit.position) < 1.4) exitDungeon();
}

function renderPrompt() {
  // Bara ETT meddelande i taget: visas en meddelanderuta göms prompten.
  if (dialogTimer > 0) { promptEl.style.display = 'none'; return; }
  if (interaction) {
    promptEl.textContent = interaction.prompt;
    promptEl.style.display = 'block';
  } else {
    promptEl.style.display = 'none';
  }
}

// --- loop ---
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (bowCooldown > 0) bowCooldown -= delta;

  player.setInputEnabled(!menus.isOpen() && !shop.isOpen());
  player.update(delta);

  activeNPC = null;
  interaction = null;

  if (location === 'world') tickWorld(delta);
  else if (location === 'house') tickHouseInterior(delta);
  else tickDungeon(delta);

  updateArrows(delta);

  if (location === 'world') {
    minimap.show();
    minimap.draw(player.mesh.position.x, player.mesh.position.z, player.mesh.rotation.y);
  } else {
    minimap.hide();
  }

  music.play(dungeons[location] ? 'dungeon' : 'world');

  renderPrompt();

  if (dialogTimer > 0) {
    dialogTimer -= delta;
    if (dialogTimer <= 0) dialogEl.style.display = 'none';
  } else if (!activeNPC) {
    dialogEl.style.display = 'none';
  }

  player.updateCamera(camera);
  renderer.render(activeSceneFor(), camera);
}

animate();