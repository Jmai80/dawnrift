import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────
// FINALRUMMET – det förseglade tredje huset i byn (slutplan steg 4).
//
// Helt pusselbaserat, ingen strid. Rummet är mörkt och kallt: här hölls inte
// en fara fången, utan GRYNINGEN själv. Fyra socklar väntar på de fyra tornens
// dyrgripar. Ordningen spelar ingen roll (fri ordning) – när alla fyra ligger
// på plats brister symbolens lås och varmt gryningsljus väller in i rummet.
//
// Gränssnittet matchar de andra rumsscenerna (Game.js styr dessa):
//   scene, colliders, bounds, entryPos, faceY, exitPos, groundFn,
//   cameraMaxY, cameraOffset, update(delta, playerPos)
// Plus finalspecifikt: pedestals[], placeGem(id), isComplete(), playDawn(),
// restore(state), solved.
// ─────────────────────────────────────────────────────────────────

const DAWN_DURATION = 3.6; // sekunder för ljusramp när pusslet löses

export class FinalHouseScene {
  // opts.treasures = TOWER_TREASURES-kartan { towerKey: { id, name, icon, color } }
  constructor(opts = {}) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05060c); // nästan svart, kallt

    this.colliders = [];
    this.bounds = { minX: -8.4, maxX: 8.4, minZ: -12.4, maxZ: 7.4 };
    this.entryPos = { x: 0, z: 5.5 };
    this.faceY = 0;                 // titta in i rummet (-z)
    this.exitPos = new THREE.Vector3(0, 0.9, 6.5);
    this.cameraMaxY = 16;
    this.cameraOffset = { x: 0, y: 9, z: 10 };
    this.groundFn = () => 0;        // platt golv

    // Färg per dyrgrip (för socklarnas ädelstenar), från TOWER_TREASURES.
    const tt = opts.treasures || {};
    this.gemColor = {};
    for (const k of Object.keys(tt)) this.gemColor[tt[k].id] = tt[k].color;

    this.solved = false;
    this.pedestals = [];            // { pos: Vector3, filled, slotLight }
    this._gems = [];                // placerade ädelstens-grupper (för spin)
    this._t = 0;

    // Gryningsramp-state
    this._dawn = { active: false, t: 0 };

    this._build();
  }

  _build() {
    const wallMat  = new THREE.MeshLambertMaterial({ color: 0x1f242c });
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x2a2e36 });

    // golv
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 20), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -2.5);
    floor.receiveShadow = true;
    this.scene.add(floor);

    // väggar + tak
    const H = 8;
    const mkWall = (w, d, x, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, H, d), wallMat);
      m.position.set(x, H / 2, z);
      m.receiveShadow = true;
      this.scene.add(m);
    };
    mkWall(0.4, 20, -8.6, -2.5);   // vänster
    mkWall(0.4, 20,  8.6, -2.5);   // höger
    mkWall(18, 0.4, 0, -12.6);     // bortre
    mkWall(18, 0.4, 0, 6.6);       // främre (dörr)
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(18, 20), wallMat);
    ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, -2.5);
    this.scene.add(ceil);

    // väggkollision (tät rad, lucka vid dörren x≈0)
    this._wallLine(-8.0, -12.0, -8.0, 6.0);
    this._wallLine( 8.0, -12.0,  8.0, 6.0);
    this._wallLine(-8.0, -12.0,  8.0, -12.0);
    this._wallLine(-8.0, 6.0, -1.1, 6.0);
    this._wallLine( 1.1, 6.0,  8.0, 6.0);

    // Kall, svag grundbelysning (höjs under gryningsrampen).
    this._ambient = new THREE.AmbientLight(0x2a3848, 0.28);
    this.scene.add(this._ambient);
    this._coldLamp = new THREE.PointLight(0x4a6a8a, 4, 22);
    this._coldLamp.position.set(0, 6.5, -4);
    this.scene.add(this._coldLamp);

    // Den stora gryningslampan – mörk tills pusslet löses, ramper sedan upp.
    this._dawnLight = new THREE.PointLight(0xffb060, 0, 26);
    this._dawnLight.position.set(0, 6.8, -6);
    this.scene.add(this._dawnLight);

    // dörr (synlig)
    const door = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 2.6),
      new THREE.MeshLambertMaterial({ color: 0x140f0b })
    );
    door.position.set(0, 1.3, 6.4);
    door.rotation.y = Math.PI;
    this.scene.add(door);

    // Fyra socklar i en kvadrat runt mittsymbolen.
    const padPos = [
      { x: -3, z: -4 },
      { x:  3, z: -4 },
      { x: -3, z: -8 },
      { x:  3, z: -8 },
    ];
    for (const p of padPos) {
      const pedestal = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.0, 1.2),
        new THREE.MeshLambertMaterial({ color: 0x3c3833 })
      );
      pedestal.position.set(p.x, 0.5, p.z);
      pedestal.castShadow = true;
      pedestal.receiveShadow = true;
      this.scene.add(pedestal);
      // collider så man inte går rakt igenom sockeln
      this.colliders.push({ x: p.x, z: p.z, radius: 0.85 });

      // Tom glödslits ovanpå (kall) som tänds i ädelstensfärg när fylld.
      const slotLight = new THREE.PointLight(0x3a5a7a, 1.2, 5);
      slotLight.position.set(p.x, 1.4, p.z);
      this.scene.add(slotLight);

      this.pedestals.push({
        pos: new THREE.Vector3(p.x, 1.05, p.z),
        filled: false,
        slotLight
      });
    }

    // Mittsymbolen "cirkel genomborrad av tre streck" – upphöjd, mörk/låst.
    this._lockMat = new THREE.MeshBasicMaterial({
      color: 0x33414e, transparent: true, opacity: 0.55
    });
    this._symbol = this._symbolMesh(this._lockMat);
    this._symbol.position.set(0, 2.4, -6);
    this._symbol.rotation.x = -Math.PI / 2.4;
    this.scene.add(this._symbol);
  }

  // Bygger symbolen som en plan grupp (delar mtrl så vi kan färga om den).
  _symbolMesh(mat) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.12, 10, 28), mat);
    g.add(ring);
    for (let i = 0; i < 3; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 2.6), mat);
      bar.rotation.y = (i - 1) * 0.5;
      g.add(bar);
    }
    return g;
  }

  _wallLine(ax, az, bx, bz, radius = 0.6, spacing = 0.6) {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.ceil(len / spacing));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      this.colliders.push({ x: ax + (bx - ax) * t, z: az + (bz - az) * t, radius });
    }
  }

  // Bygger en lysande ädelsten (samma look som tornens dyrgripar) på en sockel.
  _makeGem(color, pos) {
    const g = new THREE.Group();
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.42, 0),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92 })
    );
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.05, 8, 20),
      new THREE.MeshBasicMaterial({ color })
    );
    halo.rotation.x = Math.PI / 2;
    g.add(gem, halo);
    g.position.copy(pos);
    g._baseY = pos.y;
    this.scene.add(g);
    this._gems.push(g);
    return g;
  }

  // Placera en dyrgrip (id) på nästa lediga sockel. Returnerar true om det gick.
  // `instant` används vid laddning (ingen ljus-/färgändring av sockelslitsen).
  placeGem(id, instant = false) {
    const ped = this.pedestals.find(p => !p.filled);
    if (!ped) return false;
    const color = this.gemColor[id] != null ? this.gemColor[id] : 0xffffff;
    this._makeGem(color, ped.pos);
    ped.filled = true;
    ped.slotLight.color = new THREE.Color(color);
    ped.slotLight.intensity = 3.0;
    return true;
  }

  filledCount() {
    return this.pedestals.filter(p => p.filled).length;
  }

  isComplete() {
    return this.pedestals.length > 0 && this.pedestals.every(p => p.filled);
  }

  // Startar gryningsrampen (ljus väller in, symbolen tänds i guld).
  playDawn() {
    this.solved = true;
    this._dawn.active = true;
    this._dawn.t = 0;
  }

  // Sätter slutläget direkt (vid laddning av en redan löst final).
  _applyDawnFinal() {
    this._dawn.active = false;
    this._dawn.t = 1;
    this.scene.background = new THREE.Color(0x6b4a52);
    this._ambient.color = new THREE.Color(0xffd9a0);
    this._ambient.intensity = 0.95;
    this._coldLamp.intensity = 0;
    this._dawnLight.intensity = 15;
    this._lockMat.color = new THREE.Color(0xffcf6a);
    this._lockMat.opacity = 1.0;
  }

  // Återställ tillstånd vid laddning. state = { solved, placed:{id:bool} }.
  restore(state) {
    const placed = (state && state.placed) || {};
    for (const id of Object.keys(placed)) {
      if (placed[id]) this.placeGem(id, true);
    }
    if (state && state.solved) {
      this.solved = true;
      this._applyDawnFinal();
    }
  }

  update(delta, _playerPos) {
    this._t += delta;

    // Placerade ädelstenar snurrar och guppar mjukt.
    for (const g of this._gems) {
      g.rotation.y += delta * 0.9;
      g.position.y = g._baseY + Math.sin(this._t * 1.6 + g.position.x) * 0.07;
    }

    // Den låsta symbolen vrider sig långsamt.
    if (this._symbol) this._symbol.rotation.z += delta * 0.25;

    // Gryningsramp: lerpa kallt mörker → varmt morgonljus över DAWN_DURATION.
    if (this._dawn.active) {
      this._dawn.t = Math.min(1, this._dawn.t + delta / DAWN_DURATION);
      const k = this._dawn.t;
      // Bakgrund: kall svart -> dämpad gryningsros
      this.scene.background.lerpColors(
        new THREE.Color(0x05060c), new THREE.Color(0x6b4a52), k
      );
      // Ambient: kall svag -> varm stark
      this._ambient.color.lerpColors(
        new THREE.Color(0x2a3848), new THREE.Color(0xffd9a0), k
      );
      this._ambient.intensity = 0.28 + (0.95 - 0.28) * k;
      this._coldLamp.intensity = 4 * (1 - k);
      this._dawnLight.intensity = 15 * k;
      // Symbolen tänds i guld
      this._lockMat.color.lerpColors(
        new THREE.Color(0x33414e), new THREE.Color(0xffcf6a), k
      );
      this._lockMat.opacity = 0.55 + (1.0 - 0.55) * k;
      if (k >= 1) this._dawn.active = false;
    }
  }
}