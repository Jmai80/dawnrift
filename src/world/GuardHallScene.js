import * as THREE from 'three';

// Interiör för väktarhallen västerut – en lång, låg hall (annorlunda proportion
// än byns små kvadratiska hus). Här finns två värdefulla föremål att plocka (och
// sälja) samt ett altare med den mystiska symbolen som, när det granskas,
// avslöjar symbolens mening och väcker stenstoden i byn.
//
// Samma rumsgränssnitt som de andra husscenerna: scene, colliders, bounds,
// exitPos, entryPos, faceY, book=null, potion=null, update(). Plus egna fält
// som Game.js läser: item1/item2 (pickups) och altarPos/altarRead.
export class GuardHallScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0c10);

    this.colliders = [];
    // Lång hall: bred i x, grund i z.
    this.bounds = { minX: -9.2, maxX: 9.2, minZ: -3.4, maxZ: 3.4 };
    this.entryPos = { x: 0, z: 1.2 };   // en bit in i hallen
    this.faceY = 0;                     // titta in mot föremålen/altaret (mot -z)
    this.exitPos = new THREE.Vector3(0, 0.9, 3.3);
    this.book = null; this.bookPos = null;
    this.potion = null; this.potionPos = null; this.potionTaken = false;

    // Ljus
    this.scene.add(new THREE.AmbientLight(0xb8c4d8, 0.5));
    const lamp = new THREE.PointLight(0xcfe0ff, 26, 40);
    lamp.position.set(0, 4, 0);
    this.scene.add(lamp);

    const stone = new THREE.MeshLambertMaterial({ color: 0x6b6f78 });
    const darkStone = new THREE.MeshLambertMaterial({ color: 0x4a4e56 });
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x3a3e46 });

    // Golv + tak (lång rektangel 20 × 8)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), floorMat);
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), darkStone);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 5;
    this.scene.add(ceil);

    // Väggar
    const mkWall = (w, h, d, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stone);
      m.position.set(x, y, z); this.scene.add(m);
    };
    mkWall(20, 5, 0.4, 0, 2.5, -4);   // bortre (väster)
    mkWall(20, 5, 0.4, 0, 2.5, 4);    // främre (öster, med dörr)
    mkWall(0.4, 5, 8, -10, 2.5, 0);
    mkWall(0.4, 5, 8, 10, 2.5, 0);

    // Dörr (öster, mot byn)
    const door = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 2.8),
      new THREE.MeshLambertMaterial({ color: 0x241c12 })
    );
    door.position.set(0, 1.4, 3.78);
    this.scene.add(door);

    // Utgångsplatta – blå glödande ring vid dörren (samma som PuzzleHouseScene)
    const exitPad = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.85, 24),
      new THREE.MeshBasicMaterial({ color: 0x44aaff, side: THREE.DoubleSide })
    );
    exitPad.rotation.x = -Math.PI / 2;
    exitPad.position.set(0, 0.03, 3.1);
    this.scene.add(exitPad);
    const exitLight = new THREE.PointLight(0x44aaff, 6, 5);
    exitLight.position.set(0, 1.2, 3.1);
    this.scene.add(exitLight);

    // Pelare längs hallen för rumskänsla
    for (const px of [-6, -2, 2, 6]) {
      for (const pz of [-3, 3]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 5, 10), darkStone);
        col.position.set(px, 2.5, pz);
        this.scene.add(col);
        this.colliders.push({ x: px, z: pz, radius: 0.6 });
      }
    }

    // --- Två värdefulla föremål på pelarpodier (vänster & höger) ---
    this.item1 = this._makeValuable(-6.5, 'silver');   // Silverkalk
    this.item2 = this._makeValuable(6.5, 'ruby');       // Rubinhjärta
    this.item1.id = 'silverkalk'; this.item1.name = 'Silverkalk'; this.item1.icon = '🍶';
    this.item2.id = 'rubinhjarta'; this.item2.name = 'Rubinhjärta'; this.item2.icon = '❤️‍🔥';

    // --- Altaret med symbolen (mitt i hallen, bortre delen) ---
    this._buildAltar(stone, darkStone);
    this.altarPos = new THREE.Vector3(0, 0.9, -2.4);
    this.altarRead = false;
  }

  _makeValuable(x, kind) {
    const podium = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 1.0, 12),
      new THREE.MeshLambertMaterial({ color: 0x4a4e56 }));
    podium.position.set(x, 0.5, -1.5);
    this.scene.add(podium);
    this.colliders.push({ x, z: -1.5, radius: 0.8 });

    const group = new THREE.Group();
    if (kind === 'silver') {
      const mat = new THREE.MeshLambertMaterial({ color: 0xcfd6de, emissive: 0x33373c });
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.12, 0.34, 14), mat);
      cup.position.y = 0.3;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.18, 8), mat);
      stem.position.y = 0.09;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.06, 12), mat);
      group.add(cup, stem, base);
    } else {
      const gold = new THREE.MeshLambertMaterial({ color: 0xe0b94a, emissive: 0x3a2a00 });
      const ruby = new THREE.MeshLambertMaterial({ color: 0xc0143c, emissive: 0x4a0010 });
      const heart = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), ruby);
      heart.position.y = 0.32; heart.scale.set(1, 1.2, 0.8);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 8, 18), gold);
      ring.position.y = 0.1; ring.rotation.x = Math.PI / 2;
      group.add(heart, ring);
    }
    group.position.set(x, 1.0, -1.5);
    this.scene.add(group);

    const glow = new THREE.PointLight(kind === 'silver' ? 0xcfe0ff : 0xff4060, 5, 4);
    glow.position.set(x, 1.5, -1.5);
    this.scene.add(glow);

    return { group, glow, position: new THREE.Vector3(x, 1.0, -1.5), taken: false, _kind: kind };
  }

  _buildAltar(stone, darkStone) {
    const block = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.1, 1.0), darkStone);
    block.position.set(0, 0.55, -3.2);
    this.scene.add(block);
    this.colliders.push({ x: 0, z: -3.2, radius: 1.1 });

    // Lutande tavla med symbolen ovanpå altaret
    const slab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 1.0),
      new THREE.MeshLambertMaterial({ color: 0x2a2e36 }));
    slab.position.set(0, 1.15, -3.2);
    slab.rotation.x = -0.5;
    this.scene.add(slab);

    // Symbolen: cirkel genomborrad av tre streck (självlysande cyan)
    const symGroup = new THREE.Group();
    const symMat = new THREE.MeshBasicMaterial({ color: 0x66ddff });
    const circle = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.04, 10, 28), symMat);
    symGroup.add(circle);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const stroke = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.9), symMat);
      stroke.rotation.y = a;
      symGroup.add(stroke);
    }
    symGroup.position.set(0, 1.35, -3.05);
    symGroup.rotation.x = Math.PI / 2 - 0.5;
    this.scene.add(symGroup);
    this._symbol = symGroup;

    this._altarGlow = new THREE.PointLight(0x66ddff, 6, 6);
    this._altarGlow.position.set(0, 1.8, -3.0);
    this.scene.add(this._altarGlow);
  }

  takeItem(item) {
    item.taken = true;
    this.scene.remove(item.group);
    if (item.glow) item.glow.intensity = 0;
  }

  markAltarRead() {
    this.altarRead = true;
    // Symbolen skiftar till gyllene när dess mening avslöjats
    if (this._symbol) this._symbol.traverse(o => { if (o.material) o.material.color.set(0xffcc44); });
    if (this._altarGlow) this._altarGlow.color.set(0xffcc44);
  }

  update(delta) {
    const t = Date.now() * 0.003;
    if (this._symbol) this._symbol.rotation.z += delta * 0.3;
    if (this._altarGlow) this._altarGlow.intensity = 5 + Math.sin(t) * 2;
    for (const it of [this.item1, this.item2]) {
      if (it && !it.taken) {
        it.group.rotation.y += delta * 0.9;
        it.group.position.y = 1.0 + Math.sin(t * 1.3) * 0.05;
      }
    }
  }
}