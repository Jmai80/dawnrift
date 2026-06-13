import * as THREE from 'three';
import { WorldScene } from '../world/WorldScene.js';
import { DungeonScene } from '../world/DungeonScene.js';
import { HouseScene } from '../world/HouseScene.js';
import { Player } from '../entities/Player.js';
import { NPC } from '../entities/NPC.js';
import { Enemy } from '../entities/Enemy.js';
import { InventorySystem } from '../systems/InventorySystem.js';
import { QuestSystem } from '../systems/QuestSystem.js';
import { MusicSystem } from '../systems/MusicSystem.js';
import { MinimapSystem } from '../systems/MinimapSystem.js';
import { getHeight } from '../world/Terrain.js';

const POTION_HEAL = 3;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const world = new WorldScene();
const player = new Player(world.scene, world.colliders);
const inventory = new InventorySystem();
const quests = new QuestSystem();
const minimap = new MinimapSystem();

minimap.setMarkers([
  { x: world.caves[0].x, z: world.caves[0].z, color: '#5ad8ff' },
  { x: world.caves[1].x, z: world.caves[1].z, color: '#c07cff' },
  { x: world.caves[2].x, z: world.caves[2].z, color: '#ff8855' },
  { x: 0, z: 0, color: '#ffe08a' },
  { x: 15, z: -20, color: '#caa46a' },
  { x: -25, z: 10, color: '#caa46a' },
  { x: 30, z: 25, color: '#caa46a' }
]);

const music = new MusicSystem();
music.add('world', '/audio/world-theme.mp3');
music.add('dungeon', '/audio/dungeon-theme.mp3');

player.mesh.traverse(o => { if (o.isMesh) o.castShadow = true; });

const houses = {
  elda: new HouseScene({ owner: 'elda' }),
  torvald: new HouseScene({ owner: 'torvald' })
};

const dungeonNorth = new DungeonScene({ length: 60 });
const dungeonEast = new DungeonScene({ length: 80 });
const dungeonDeep = new DungeonScene({ layout: 'complex', bg: 0x070510 });

dungeonNorth.addPickup('sword', 0, dungeonNorth.endZ,
  { id: 'rostigt_svard', name: 'Torvalds farfars svärd', icon: '🗡️' });
dungeonEast.addPickup('amulet', 0, dungeonEast.endZ,
  { id: 'forntida_amulett', name: 'Forntida amulett', icon: '🔮' });
dungeonDeep.addPickup('bow', -9, -20, { id: 'pilbage', name: 'Jägarens pilbåge', icon: '🏹' });
dungeonDeep.addPickup('potion', 8, -14, { id: 'lakedryck', name: 'Läkedryck', icon: '🧪' });
dungeonDeep.addPickup('potion', 9, -22, { id: 'lakedryck', name: 'Läkedryck', icon: '🧪' });
dungeonDeep.addPickup('relic', 0, -47, { id: 'gyllene_kalk', name: 'Förgylld kalk', icon: '🏆' });

const dungeons = {
  north: {
    sceneObj: dungeonNorth,
    entrance: world.caves[0],
    enemies: [new Enemy(dungeonNorth.scene, {
      x: 0, z: -42, colliders: dungeonNorth.colliders, bounds: dungeonNorth.bounds
    })]
  },
  east: {
    sceneObj: dungeonEast,
    entrance: world.caves[1],
    enemies: [
      new Enemy(dungeonEast.scene, {
        x: -2, z: -35, colliders: dungeonEast.colliders, bounds: dungeonEast.bounds
      }),
      new Enemy(dungeonEast.scene, {
        x: 0, z: -62, name: 'Grottans väktare', hp: 6, speed: 2.4, scale: 1.5,
        color: 0x4a1a5a, colliders: dungeonEast.colliders, bounds: dungeonEast.bounds
      })
    ]
  },
  deep: {
    sceneObj: dungeonDeep,
    entrance: world.caves[2],
    enemies: [
      new Enemy(dungeonDeep.scene, {
        x: -9, z: -25, name: 'Skuggvätte', hp: 3, speed: 2.2,
        colliders: dungeonDeep.colliders, bounds: dungeonDeep.bounds
      }),
      new Enemy(dungeonDeep.scene, {
        x: 8, z: -25, name: 'Skuggvätte', hp: 3, speed: 2.2,
        colliders: dungeonDeep.colliders, bounds: dungeonDeep.bounds
      }),
      new Enemy(dungeonDeep.scene, {
        x: 0, z: -45, name: 'Djupets väktare', hp: 8, speed: 2.5, scale: 1.7,
        color: 0x6a1a3a, colliders: dungeonDeep.colliders, bounds: dungeonDeep.bounds
      })
    ]
  }
};

const camera = new THREE.PerspectiveCamera(
  70, window.innerWidth / window.innerHeight, 0.1, 1000
);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const elda = new NPC(world.scene, {
  x: 12, z: -16, name: 'Elda', color: 0xaa3355, variant: 'dress',
  lines: [
    'Välkommen till Dawnrift, främling. Du föll bokstavligen från himlen!',
    'Det sägs att grottorna i bergen gömmer både skatter och faror.',
    'Var försiktig där ute.'
  ]
});
const torvald = new NPC(world.scene, {
  x: -22, z: 7, name: 'Torvald', color: 0x336655,
  lines: [
    'Min farfar gick in i grottan norrut. Han kom aldrig tillbaka...',
    'Om du hittar hans gamla svärd, får du gärna behålla det.'
  ]
});
const npcs = [elda, torvald];
npcs.forEach(n => {
  world.colliders.push({ x: n.mesh.position.x, z: n.mesh.position.z, radius: 0.7 });
  n.mesh.traverse(o => { if (o.isMesh) o.castShadow = true; });
});

const promptEl = document.getElementById('prompt');
const dialogEl = document.getElementById('dialog');
const hudEl = document.getElementById('hud');
const controlsEl = document.getElementById('controls');

let activeNPC = null;
let location = 'world';
let currentHouse = null;
let houseReturnDoor = null;
let nearPickupObj = null;
let nearBook = false;
let nearPotion = false;
let nearLockedDoor = false;
let nearMonument = false;
let dialogTimer = 0;
let potionUnlocked = false;
let hasBow = false;
let bowCooldown = 0;

const arrows = [];

let helpOpen = true;
controlsEl.style.display = 'block';

function activeSceneFor() {
  return location === 'world' ? world.scene :
    location === 'house' ? currentHouse.scene :
    dungeons[location].sceneObj.scene;
}

function updateHud() {
  const hearts = '❤'.repeat(player.hp) + '♡'.repeat(player.maxHp - player.hp);
  const pots = inventory.count('lakedryck');
  hudEl.innerHTML = hearts + (pots > 0 ? `  <span style="color:#e88">🧪 ×${pots}</span>` : '');
}
updateHud();

function showMessage(html, seconds = 4) {
  dialogEl.innerHTML = html;
  dialogEl.style.display = 'block';
  dialogTimer = seconds;
}

function clearArrows() {
  for (const a of arrows) a.scene.remove(a.mesh);
  arrows.length = 0;
}

function fireArrow() {
  if (!hasBow || bowCooldown > 0) return;
  bowCooldown = 0.55;
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
    showMessage('<b>Du fick Jägarens pilbåge!</b> Tryck G för att avfyra pilar.', 5);
  } else if (id === 'lakedryck') {
    showMessage('<b>En läkedryck!</b> Tryck R för att dricka när du är skadad.', 4);
  } else if (id === 'gyllene_kalk') {
    showMessage('<b>En förgylld kalk</b> – ett ovärderligt fynd ur djupets mörker.', 5);
  }
}

window.addEventListener('keydown', e => {
  if (e.code === 'KeyH') {
    helpOpen = !helpOpen;
    controlsEl.style.display = helpOpen ? 'block' : 'none';
    return;
  }

  if (e.code === 'KeyG') { fireArrow(); return; }

  if (e.code === 'KeyR') {
    if (inventory.count('lakedryck') > 0 && player.hp < player.maxHp) {
      inventory.remove('lakedryck');
      player.hp = Math.min(player.maxHp, player.hp + POTION_HEAL);
      updateHud();
      showMessage('<b>Du dricker en läkedryck och känner dig starkare.</b>', 2);
    } else if (inventory.count('lakedryck') > 0) {
      showMessage('Du har redan full hälsa.', 2);
    }
    return;
  }

  if (e.code !== 'KeyE') return;

  if (location === 'world' && activeNPC) {
    let extra = '';
    if (activeNPC === torvald) {
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
    dialogEl.innerHTML = `<b>${activeNPC.name}:</b> ${activeNPC.nextLine()}` + extra;
    dialogEl.style.display = 'block';

  } else if (location === 'world' && nearMonument) {
    showMessage(world.monumentText, 8);

  } else if (location === 'house' && nearBook) {
    showMessage(currentHouse.bookText, 8);

  } else if (location === 'house' && nearPotion) {
    currentHouse.takePotion();
    inventory.add({ id: 'lakedryck', name: 'Läkedryck', icon: '🧪' });
    updateHud();
    showMessage('<b>Du tog en läkedryck!</b> Tryck R för att dricka den när du är skadad.', 5);

  } else if (dungeons[location] && nearPickupObj) {
    const pk = nearPickupObj;
    dungeons[location].sceneObj.collect(pk);
    inventory.add(pk.loot);
    updateHud();
    handleLootEffect(pk.loot.id);
  }
});

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
  location = 'house';
  clearArrows();
  currentHouse = houses[door.owner];
  houseReturnDoor = door;
  currentHouse.scene.add(player.mesh);
  player.teleport(0, 2.5, { groundFn: () => 0, colliders: currentHouse.colliders, bounds: currentHouse.bounds });
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

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (bowCooldown > 0) bowCooldown -= delta;

  player.update(delta);
  activeNPC = null;
  nearPickupObj = null;
  nearBook = false;
  nearPotion = false;
  nearLockedDoor = false;
  nearMonument = false;

  if (location === 'world') {
    world.updateSun(player.mesh.position);

    for (const npc of npcs) {
      if (npc.distanceTo(player.mesh.position) < 3.5) {
        activeNPC = npc;
        npc.faceToward(player.mesh.position);
      }
    }
    if (!activeNPC && player.mesh.position.distanceTo(world.monumentPos) < 3.4) {
      nearMonument = true;
    }

    for (const key of Object.keys(dungeons)) {
      const ent = dungeons[key].entrance;
      const dx = player.mesh.position.x - ent.x;
      const dz = player.mesh.position.z - ent.z;
      if (dx * dx + dz * dz < 25) { enterDungeon(key); break; }
    }

    if (location === 'world') {
      for (const door of world.houseDoors) {
        const dx = player.mesh.position.x - door.x;
        const dz = player.mesh.position.z - door.z;
        if (dx * dx + dz * dz < 5.3) {
          if (door.locked) nearLockedDoor = true;
          else enterHouse(door);
          break;
        }
      }
    }

  } else if (location === 'house') {
    currentHouse.update(delta);
    if (currentHouse.book &&
        player.mesh.position.distanceTo(currentHouse.bookPos) < 2.2) nearBook = true;
    if (currentHouse.potion && currentHouse.potion.visible && !currentHouse.potionTaken &&
        player.mesh.position.distanceTo(currentHouse.potionPos) < 1.9) nearPotion = true;
    if (player.mesh.position.distanceTo(currentHouse.exitPos) < 1.0) exitHouse();

  } else {
    const d = dungeons[location];
    d.sceneObj.update(delta);

    for (const en of d.enemies) {
      en.update(delta, player.mesh.position);
      if (!en.alive) continue;

      if (player.attackActive && en.distanceTo(player.mesh.position) < 2.3) {
        en.takeDamage(player.mesh.position);
        if (!en.alive) showMessage(`<b>${en.name} är besegrad!</b>`);
      }
      if (en.alive && en.distanceTo(player.mesh.position) < 1.2 &&
          player.takeDamage(en.mesh.position)) {
        updateHud();
        onFirstDungeonDamage();
        if (player.hp <= 0) { respawn(); break; }
      }
    }

    if (dungeons[location]) {
      const p = player.mesh.position;
      const sd = dungeons[location].sceneObj;
      for (const pk of sd.pickups) {
        if (!pk.taken && p.distanceTo(pk.group.position) < 2.2) { nearPickupObj = pk; break; }
      }
      if (p.distanceTo(sd.exit.position) < 1.4) exitDungeon();
    }
  }

  for (let i = arrows.length - 1; i >= 0; i--) {
    const a = arrows[i];
    const step = 32 * delta;
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
    }
    if (hit || a.dist > 45) {
      a.scene.remove(a.mesh);
      arrows.splice(i, 1);
    }
  }

  if (location === 'world') {
    minimap.show();
    minimap.draw(player.mesh.position.x, player.mesh.position.z, player.mesh.rotation.y);
  } else {
    minimap.hide();
  }

  music.play(dungeons[location] ? 'dungeon' : 'world');

  if (activeNPC) {
    promptEl.textContent = 'Tryck E för att prata';
    promptEl.style.display = 'block';
  } else if (nearMonument) {
    promptEl.textContent = 'Tryck E för att granska stoden';
    promptEl.style.display = 'block';
  } else if (nearPickupObj) {
    promptEl.textContent = 'Tryck E för att plocka upp föremålet';
    promptEl.style.display = 'block';
  } else if (nearBook) {
    promptEl.textContent = 'Tryck E för att läsa boken';
    promptEl.style.display = 'block';
  } else if (nearPotion) {
    promptEl.textContent = 'Tryck E för att plocka upp flaskan';
    promptEl.style.display = 'block';
  } else if (nearLockedDoor) {
    promptEl.textContent = 'Dörren är låst – förseglad tills vidare';
    promptEl.style.display = 'block';
  } else {
    promptEl.style.display = 'none';
  }

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