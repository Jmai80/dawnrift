import * as THREE from 'three';
import { WorldScene } from '../world/WorldScene.js';
import { HouseScene } from '../world/HouseScene.js';
import { TowerScene } from '../world/TowerScene.js';
import { RangeShopScene } from '../world/RangeShopScene.js';
import { ManorShopScene } from '../world/ManorShopScene.js';
import { PuzzleHouseScene } from '../world/PuzzleHouseScene.js';
import { GuardHallScene } from '../world/GuardHallScene.js';
import { PUZZLE_HOUSE_POS, GUARDHALL_POS } from '../world/WorldScene.js';
import { Enemy } from '../entities/Enemy.js';
import { Player } from '../entities/Player.js';
import { InventorySystem } from '../systems/InventorySystem.js';
import { QuestSystem } from '../systems/QuestSystem.js';
import { MusicSystem } from '../systems/MusicSystem.js';
import { MinimapSystem } from '../systems/MinimapSystem.js';
import { MenuManager } from '../systems/MenuManager.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { getHeight } from '../world/terrain/Terrain.js';
import { createDungeons } from '../content/dungeons.js';
import { createNPCs } from '../content/npcs.js';
import { GUBBE_RING } from '../content/npcs.js';
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
  elda:     new HouseScene({ owner: 'elda' }),
  torvald:  new HouseScene({ owner: 'torvald' }),
  gubbe:    new HouseScene({ owner: 'gubbe' }),
  tower:    new TowerScene(),
  rangeshop:new RangeShopScene(),
  manor:    new ManorShopScene(),
  puzzle:   new PuzzleHouseScene(),
  guardhall:new GuardHallScene()
};

// --- innehåll (data i src/content/) ---
const dungeons = createDungeons(world);
const { elda, torvald, bryn, gubbe, npcs } = createNPCs(world);

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
let gold = 0;             // guldmynt – börjar på noll
let strengthBought = false; // den stärkande potionen är en engångs-permanent uppgradering
const arrows = [];

// Väktarhallen (väster): vättarna som vaktar den + upplåsning.
const guardians = [];          // världsfiender som vaktar hallen
let guardhallUnlocked = false; // dörr + vättar frigörs när de tre grottorna är clearade
let symbolRevealed = false;    // altaret i hallen avslöjar symbolens mening

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

// --- gubbequest-tillstånd ---
// Tre faser som spåras explicit utöver QuestSystem-loggarna, eftersom
// gubbens dialog-gren och husinteriörens interaktioner beror på dem.
let gubbeMetOnce  = false;  // spelaren har pratat med gubben minst en gång
let trinketFound  = false;  // spelaren har hittat prylen i huset
let mapGiven      = false;  // gubben har gett spelaren kartan
let mapReadOnce   = false;  // spelaren har läst kartan (quest-kedjan slutkläm)

function talkToGubbe() {
  if (!gubbeMetOnce) {
    // Första mötet: starta quest-kedjan
    gubbeMetOnce = true;
    milestone('hitta_gubben', 'Den förvirrade gubben',
      'Träffa den förvirrade gubben som vandrar söder om byn.');
    quests.add({
      id: 'gubbens_pryl',
      title: 'Gubbens förlorade pryl',
      text: 'Han minns inte vad han letar efter, men tror att det finns i hans hus sydost om vandringsringen.'
    });
    gubbe.lineIndex = 0;
    showMessage(
      `<b>${gubbe.name}:</b> ${gubbe.lines[0]}<br><i>Nytt uppdrag: Gubbens förlorade pryl</i>`,
      6
    );
    return;
  }

  if (trinketFound && !mapGiven) {
    // Spelaren har hittat prylen och återvänder: gubben minns och ger kartan
    // direkt i handen — ingen extra resa till huset.
    mapGiven = true;
    quests.complete('ge_gubben_prylen');
    quests.add({
      id: 'hemlig_karta',
      title: 'Den hemliga kartan',
      text: 'Kartan pekar mot en dold plats djupt i skogen söderut. Hitta platsen.'
    });
    // Ge kartan direkt till spelaren
    inventory.add({ id: 'hemlig_karta', name: 'Hemlig karta', icon: '🗺️', usable: true });
    updateHud();
    gubbe.lineIndex = 1;
    showMessage(
      `<b>${gubbe.name}:</b> ${gubbe.lines[1]}<br><i>Uppdrag slutfört! Nytt uppdrag: Den hemliga kartan — läs den i inventoryt (I)</i>`,
      8
    );
    return;
  }

  if (mapGiven) {
    gubbe.lineIndex = 2;
    showMessage(`<b>${gubbe.name}:</b> ${gubbe.lines[2]}`, 5);
    return;
  }

  // Mellantillstånd: quest aktivt men prylen inte hittad än
  showMessage(
    `<b>${gubbe.name}:</b> Mitt hus... det är sydost härifrån, en bit bortom den här ringen. Det kanske ligger kvar där inne?`,
    4
  );
}

function collectTrinket() {
  trinketFound = true;
  houses.gubbe.takeTrinket();
  inventory.add({ id: 'gubbens_medaljon', name: 'Gubbens medaljon', icon: '🏅' });
  updateHud();
  quests.complete('gubbens_pryl');
  quests.add({
    id: 'ge_gubben_prylen',
    title: 'Återvänd till gubben',
    text: 'Du hittade en medaljon i gubbens hus — återvänd till honom söder om byn.'
  });
  showMessage(
    '<b>Du hittade en gammal medaljon!</b> Stoftig men vacker. Det verkar vara gubbens — återvänd till honom.',
    5
  );
}

function collectMap() {
  houses.gubbe.takeMap();
  inventory.add({ id: 'hemlig_karta', name: 'Hemlig karta', icon: '🗺️' });
  updateHud();
  showMessage(
    '<b>Du tar kartan.</b> Pergamentet är gammalt men teckningarna är tydliga — en plats djupt i skogen söderut. Tryck E för att läsa den i inventoryt.',
    5
  );
}

function readMap() {
  if (!mapReadOnce) {
    mapReadOnce = true;
    // Avslöja pussel-husets position på minimapen
    minimap.setMarkers([
      ...buildMinimapMarkers(world),
      { x: PUZZLE_HOUSE_POS.x, z: PUZZLE_HOUSE_POS.z, color: '#ff44ff' }
    ]);
    milestone('hemlig_karta', 'Den hemliga kartan',
      'Kartan pekar mot en dold plats djupt i skogen söderut. Hitta platsen.');
    showMessage(
      '<b>Den hemliga kartan:</b> En grov teckning av ett skogsområde. Mitt i teckningen sitter en markering — och bredvid den, inristad med en darrande hand: <em>"Cirkeln lever. Sök stenen under rötterna."</em><br><i>En ny markering har dykt upp på minimapen!</i>',
      10
    );
    return;
  }
  showMessage(
    '<b>Den hemliga kartan:</b> <em>"Cirkeln lever. Sök stenen under rötterna."</em>',
    5
  );
}

// --- progression: serialisering för sparsystemet ------------------------------
// Fångar allt som behövs för att fortsätta där man slutade. SaveSystem skickar
// resultatet till Supabase; applyProgressSnapshot() återställer det vid laddning.
function serializeProgress() {
  return {
    version: 2,
    gold,
    hasBow,
    hasSword: player.hasSword,
    bullseyeHits,
    strengthBought,
    potionUnlocked,
    hp: player.hp,
    maxHp: player.maxHp,
    bullseyeRadius: world.archeryTarget ? world.archeryTarget.bullseyeRadius : null,
    gubbe: { metOnce: gubbeMetOnce, trinketFound, mapGiven, mapReadOnce },
    puzzle: {
      solved: houses.puzzle.isSolved(),
      rewardTaken: !!(houses.puzzle.reward && houses.puzzle.reward.taken)
    },
    eldaPotionTaken: !!houses.elda.potionTaken,
    guardhall: {
      unlocked: guardhallUnlocked,
      guardiansAlive: guardians.map(g => g.alive),
      item1Taken: !!houses.guardhall.item1.taken,
      item2Taken: !!houses.guardhall.item2.taken,
      altarRead: symbolRevealed
    },
    inventory: inventory.items.map(it => ({ ...it })),
    quests: quests.quests.map(q => ({ ...q }))
  };
}

function applyProgressSnapshot(s) {
  if (!s) return;
  gold = s.gold ?? 0;
  hasBow = !!s.hasBow;
  // Svärdet: utrusta/avrusta enligt sparat läge (flaggan styr om F gör något).
  if (s.hasSword) player.equipSword();
  else player.unequipSword();
  bullseyeHits = s.bullseyeHits ?? 0;
  potionUnlocked = !!s.potionUnlocked;
  player.maxHp = s.maxHp ?? player.maxHp;
  player.hp = s.hp ?? player.maxHp;
  if (s.bullseyeRadius != null && world.archeryTarget) world.archeryTarget.bullseyeRadius = s.bullseyeRadius;

  // Inventory & quests: ersätt råa listorna
  inventory.items.length = 0;
  for (const it of (s.inventory || [])) inventory.items.push({ ...it });
  quests.quests.length = 0;
  for (const q of (s.quests || [])) quests.quests.push({ ...q });

  // Styrkedryck: permanent fart-/hopp-boost
  strengthBought = !!s.strengthBought;
  if (strengthBought) applyStrengthBoost();

  // Gubbe-kedjan
  const g = s.gubbe || {};
  gubbeMetOnce = !!g.metOnce;
  trinketFound = !!g.trinketFound;
  mapGiven = !!g.mapGiven;
  mapReadOnce = !!g.mapReadOnce;
  if (trinketFound) houses.gubbe.takeTrinket();   // dölj medaljongen i huset

  // Elda-dryck: om upplåst men ej tagen, lägg fram den igen
  if (potionUnlocked && !s.eldaPotionTaken) houses.elda.spawnPotion();
  if (s.eldaPotionTaken) houses.elda.potionTaken = true;

  // Pussel-huset
  if (s.puzzle && s.puzzle.solved) houses.puzzle.restoreSolved(!!s.puzzle.rewardTaken);

  // Minimap: avslöja pussel-huset om kartan lästs
  if (mapReadOnce) {
    minimap.setMarkers([
      ...buildMinimapMarkers(world),
      { x: PUZZLE_HOUSE_POS.x, z: PUZZLE_HOUSE_POS.z, color: '#ff44ff' }
    ]);
  }

  // Väktarhallen
  const gh = s.guardhall || {};
  symbolRevealed = !!gh.altarRead;
  if (gh.unlocked) {
    unlockGuardHall(true);                       // tyst (ingen banner vid laddning)
    const alive = gh.guardiansAlive || [];
    guardians.forEach((en, i) => {
      if (alive[i] === false) { en.alive = false; en.scene.remove(en.mesh); }
    });
  }
  if (gh.item1Taken) houses.guardhall.takeItem(houses.guardhall.item1);
  if (gh.item2Taken) houses.guardhall.takeItem(houses.guardhall.item2);
  if (symbolRevealed) {
    houses.guardhall.markAltarRead();
    world.awakenMonument();
  }

  updateHud();
}

// --- väktarhallen: upplåsning, vättar, symbol-avslöjande --------------------
// Alla tre ursprungliga grottor räknas som clearade när deras loot-quests är
// avklarade: svärdet (norr), amuletten (öster) och pilbågen (djupet).
function allCavesCleared() {
  return quests.isComplete('hitta_svardet')
    && quests.isComplete('grottan_i_oster')
    && quests.isComplete('hitta_pilbagen');
}

// Spawna de tre vaktande vättarna öster om hallen (mellan byn och dörren).
// De patrullerar sina hempunkter och återvänder dit om spelaren backar undan.
function spawnGuardians() {
  if (guardians.length > 0) return;
  const gx = GUARDHALL_POS.x, gz = GUARDHALL_POS.z;
  // Vättarna patrullerar öster om hallen (mot byn-hållet), vid dörrsidan (+x)
  const posts = [
    { x: gx + 10, z: gz - 4 },
    { x: gx + 12, z: gz },
    { x: gx + 10, z: gz + 4 },
  ];
  for (const post of posts) {
    guardians.push(new Enemy(world.scene, {
      x: post.x, z: post.z, name: 'Hallvätte', hp: 3, speed: 2.3,
      color: 0x5a6a2a, colliders: world.colliders, bounds: null,
      home: post, leashRange: 11, aggroRange: 9
    }));
  }
}

// Lås upp hallen (dörr + vättar). silent=true vid laddning (ingen banner).
function unlockGuardHall(silent = false) {
  if (guardhallUnlocked) return;
  guardhallUnlocked = true;
  const door = world.houseDoors.find(d => d.owner === 'guardhall');
  if (door) door.locked = false;
  spawnGuardians();
  if (!silent) {
    showMessage('<b>Något har förändrats västerut.</b> Med alla tre grottor tömda har vättar samlats kring en hall bortom byn — och dess dörr är inte längre förseglad.', 6);
  }
}

// Kallas varje världstick: lås upp när villkoret uppfylls.
function maybeUnlockGuardHall() {
  if (guardhallUnlocked) return;
  if (allCavesCleared()) unlockGuardHall(false);
}

// Centraliserad menyhantering: bara en meny öppen i taget, Esc stänger meny
// eller en öppen meddelanderuta, piltangenter + Enter/E använder valt föremål.
const menus = new MenuManager({
  inventory,
  quests,
  controlsEl,
  hintEl,
  onUseItem: (item) => {
    if (item.id === 'lakedryck')      return drinkPotion();
    if (item.id === 'hemlig_karta')   { readMap(); return true; }
    if (item.id === 'gubbens_medaljon') {
      showMessage('<b>Gubbens medaljon:</b> En oval guldmedaljon med en inristad blomma. Välvårdad trots dammet — någon har burit den länge.', 5);
      return false; // förbrukar den inte
    }
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
    pil: 1,
    azurbrosch: 500,
    silverkalk: 180,
    rubinhjarta: 320
  }
};

const ITEM_META = {
  lakedryck:         { name: 'Läkedryck', icon: '🧪' },
  styrkedryck:       { name: 'Styrkedryck', icon: '🟢' },
  rostigt_svard:     { name: 'Rostigt svärd', icon: '🗡️' },
  forntida_amulett:  { name: 'Forntida amulett', icon: '📿' },
  gyllene_kalk:      { name: 'Gyllene kalk', icon: '🏆' },
  pil:               { name: 'Pilar', icon: '➳' },
  gubbens_medaljon:  { name: 'Gubbens medaljon', icon: '🏅' },
  hemlig_karta:      { name: 'Hemlig karta', icon: '🗺️' },
  azurbrosch:        { name: 'Azurbröschen', icon: '💎' },
  silverkalk:        { name: 'Silverkalk', icon: '🍶' },
  rubinhjarta:       { name: 'Rubinhjärta', icon: '❤️‍🔥' },
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
    // Säljer man svärdet ska man inte längre kunna slåss med det. Avrusta när
    // sista exemplaret lämnar inventoryt.
    if (r.id === 'rostigt_svard' && inventory.count('rostigt_svard') === 0) {
      player.unequipSword();
    }
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

// --- sparsystem (Supabase) ---
// K öppnar spar-/laddmenyn. Bara tillåten när ingen annan meny/butik är öppen.
const saveMenu = new SaveSystem({
  serialize: serializeProgress,
  apply: applyProgressSnapshot,
  canOpen: () => !menus.isOpen() && !shop.isOpen()
});

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
        // Horisontell distans: pilen flyger högre än fiendens kropp, så en 3D-
        // distans skulle aldrig understiga tröskeln. Ignorera y-led.
        const ex = en.mesh.position.x - a.mesh.position.x;
        const ez = en.mesh.position.z - a.mesh.position.z;
        if (en.alive && Math.hypot(ex, ez) < (en.radius + 0.5)) {
          en.takeDamage(a.mesh.position);
          if (!en.alive) showMessage(`<b>${en.name} är besegrad!</b>`);
          hit = true;
          break;
        }
      }
    } else if (location === 'world' && a.scene === world.scene) {
      // Vaktande vättar (horisontell distans, samma skäl som i grottorna)
      for (const en of guardians) {
        if (!en.alive) continue;
        const ex = en.mesh.position.x - a.mesh.position.x;
        const ez = en.mesh.position.z - a.mesh.position.z;
        if (Math.hypot(ex, ez) < (en.radius + 0.5)) {
          en.takeDamage(a.mesh.position);
          if (!en.alive) showMessage(`<b>${en.name} är besegrad!</b>`);
          hit = true;
          break;
        }
      }
      // Piltavlan på skyttebanan (plan-korsning), om pilen inte redan träffat
      if (!hit && target) {
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
    }
    if (hit || a.dist > 45) {
      a.scene.remove(a.mesh);
      arrows.splice(i, 1);
    }
  }
}

// --- quest-/interaktionsskript (anropas av interaction.act) ---
function talkTo(npc) {
  if (npc === bryn)  { talkToArcher(); return; }
  if (npc === gubbe) { talkToGubbe();  return; }
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

// Plocka ett av väktarhallens två värdeföremål.
function collectHallItem(item) {
  houses.guardhall.takeItem(item);
  inventory.add({ id: item.id, name: item.name, icon: item.icon });
  updateHud();
  showMessage(`<b>Du tog ${item.name}.</b> Värdefull — kan säljas i handelsboden.`, 4);
}

// Granska altaret: avslöjar symbolens mening och väcker stenstoden i byn.
function revealSymbol() {
  if (!symbolRevealed) {
    symbolRevealed = true;
    houses.guardhall.markAltarRead();
    world.awakenMonument();
    milestone('symbolens_mening', 'Symbolens mening',
      'Du tydde symbolen i väktarhallen — cirkeln genomborrad av tre streck.');
    showMessage(
      '<b>Altaret:</b> Symbolen — cirkeln genomborrad av tre streck — är ingen prydnad. <em>Cirkeln är byn, förseglad. De tre strecken är de tre grottorna du redan tömt: svärdet, amuletten och bågen. Tillsammans bröt deras tomhet förseglingen.</em> Långt borta i byn vaknar stenstoden — den lyser nu gyllene, och pekar mot de dörrar som ännu är förseglade.',
      11
    );
    return;
  }
  showMessage('<b>Altaret:</b> Cirkeln är byn; de tre strecken de tre grottorna. Förseglingen är bruten — stoden i byn har vaknat.', 6);
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
  // Sparmenyn likaså (egen capture-lyssnare)
  if (saveMenu.isOpen()) return;
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
    cameraOffset: house.cameraOffset,
    faceY: house.faceY
  });
}

function exitHouse() {
  // Om man lämnar pusselhuset olöst: nollställ lådorna så man aldrig kan
  // fastna permanent med en låda intryckt mot en vägg. (Löst pussel rörs ej –
  // belöningen ligger kvar att hämta.)
  if (currentHouse && currentHouse.reset && !currentHouse.isSolved?.()) {
    currentHouse.reset();
  }
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

  // Lås upp väktarhallen när de tre grottorna är clearade
  maybeUnlockGuardHall();

  // Vaktande vättar: patrullera/jaga med leash, samt strid
  for (const en of guardians) {
    if (!en.alive) continue;
    en.update(delta, pos);
    if (player.attackActive && en.distanceTo(pos) < 2.3) {
      en.takeDamage(pos);
      if (!en.alive) showMessage(`<b>${en.name} är besegrad!</b>`);
    }
    if (en.alive && en.distanceTo(pos) < 1.2 && player.takeDamage(en.mesh.position)) {
      updateHud();
      if (player.hp <= 0) { respawn(); return; }
    }
  }

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
  // Trinket i gubbens hus
  const dTrinket = (currentHouse === houses.gubbe && houses.gubbe.trinket &&
    !houses.gubbe.trinketTaken)
    ? pos.distanceTo(houses.gubbe.trinketPos) : Infinity;
  // Karta i gubbens hus (dyker upp efter att gubben minns)
  const dMap = (currentHouse === houses.gubbe && houses.gubbe.map &&
    houses.gubbe.map.visible && !houses.gubbe.mapTaken)
    ? pos.distanceTo(houses.gubbe.mapPos) : Infinity;

  if (showBook) {
    interaction = { prompt: 'Tryck E för att läsa boken', act: () => showMessage(currentHouse.bookText, 8) };
  } else if (showPotion) {
    interaction = { prompt: 'Tryck E för att plocka upp flaskan', act: takePotionFromHouse };
  } else if (dTrinket < 2.0) {
    interaction = { prompt: 'Tryck E för att plocka upp medaljonen', act: collectTrinket };
  } else if (dMap < 2.2) {
    interaction = { prompt: 'Tryck E för att ta kartan', act: collectMap };
  } else if (currentHouse.shopPos && pos.distanceTo(currentHouse.shopPos) < 2.8) {
    if (currentHouse === houses.manor) {
      interaction = { prompt: 'Tryck E för att handla (köp / sälj)', act: () => shop.show() };
    } else {
      interaction = { prompt: 'Tryck E för att köpa 10 pilar (gratis)', act: buyArrows };
    }
  }

  // Pussel-huset: låd-push (E) och belönings-pickup
  if (currentHouse === houses.puzzle) {
    const puzzle = houses.puzzle;
    if (puzzle.reward && !puzzle.reward.taken &&
        pos.distanceTo(puzzle.reward.position) < 2.0) {
      interaction = {
        prompt: 'Tryck E för att plocka upp Azurbröschen',
        act: () => {
          puzzle.reward.taken = true;
          puzzle.scene.remove(puzzle.reward.group);
          inventory.add({ id: 'azurbrosch', name: 'Azurbröschen', icon: '💎' });
          updateHud();
          milestone('pussel_klart', 'Pusslet löst', 'Du löste lådpusslet och fick Azurbröschen.');
          showMessage('<b>Azurbröschen!</b> En strålande blå brosch infattad i guld. Den är värd en förmögenhet — säkerligen värd 💎 500 mynt hos köpmannen.', 6);
        }
      };
    } else if (!puzzle.isSolved()) {
      // Återställningsplatta: putta-fri zon där spelaren kan nollställa lådorna.
      if (puzzle.resetPos && pos.distanceTo(puzzle.resetPos) < 1.4) {
        interaction = {
          prompt: 'Tryck E för att återställa lådorna',
          act: () => {
            if (puzzle.reset()) showMessage('<b>Lådorna återställda.</b> Pusslet börjar om.', 2.5);
          }
        };
      } else {
        // Kolla om spelaren är nära en låda och erbjud push
        const pCol = Math.round((pos.x - (-13)) / 2 - 0.5);
        const pRow = Math.round((0 - pos.z) / 2 - 0.5);
        const nearBox = puzzle.boxes.some(b => {
          if (b.removed) return false;
          const dc = Math.abs(b.col - pCol), dr = Math.abs(b.row - pRow);
          return dc + dr === 1;
        });
        if (nearBox && !interaction) {
          interaction = {
            prompt: 'Tryck E för att putta lådan',
            act: () => { puzzle.tryPush(pos); }
          };
        }
      }
    }
  }

  // Väktarhallen: två värdeföremål + symbol-altaret
  if (currentHouse === houses.guardhall) {
    const hall = houses.guardhall;
    const d1 = (!hall.item1.taken) ? pos.distanceTo(hall.item1.position) : Infinity;
    const d2 = (!hall.item2.taken) ? pos.distanceTo(hall.item2.position) : Infinity;
    const dAltar = pos.distanceTo(hall.altarPos);
    if (d1 < 2.0) {
      interaction = { prompt: `Tryck E för att ta ${hall.item1.name}`, act: () => collectHallItem(hall.item1) };
    } else if (d2 < 2.0) {
      interaction = { prompt: `Tryck E för att ta ${hall.item2.name}`, act: () => collectHallItem(hall.item2) };
    } else if (dAltar < 2.6) {
      interaction = { prompt: 'Tryck E för att granska altaret', act: revealSymbol };
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

  player.setInputEnabled(!menus.isOpen() && !shop.isOpen() && !saveMenu.isOpen());
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