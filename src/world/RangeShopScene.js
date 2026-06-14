import * as THREE from 'three';

// Interiör för Bryns hus på skyttebanan: en liten butik där man köper pilar.
// Samma rumsskal och gränssnitt som HouseScene (scene/colliders/bounds/exitPos/
// update) så Game.js hus-maskineri kan använda den oförändrat. I stället för
// bok/dryck exponerar den en `shopPos` som Game.js läser för köp-interaktionen.
export class RangeShopScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0805);
    this.colliders = [];
    this.bounds = { minX: -3.9, maxX: 3.9, minZ: -3.9, maxZ: 3.8 };
    this.exitPos = new THREE.Vector3(0, 0, 4.1);

    // Inget bok/dryck här – Game.js hoppar över dem eftersom de är null.
    this.book = null;
    this.bookPos = null;
    this.potion = null;
    this.potionPos = null;
    this.potionTaken = false;

    // Köp-punkt framför disken.
    this.shopPos = new THREE.Vector3(0, 1.0, -2.6);

    this.scene.add(new THREE.AmbientLight(0xffe0b0, 0.45));
    const lamp = new THREE.PointLight(0xffb060, 25, 15);
    lamp.position.set(0, 2.6, 0);
    this.scene.add(lamp);

    const wood = new THREE.MeshLambertMaterial({ color: 0x8a6a45 });
    const darkWood = new THREE.MeshLambertMaterial({ color: 0x5a432a });
    const wallMat = new THREE.MeshLambertMaterial({ color: 0xa08560 });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), wood);
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);
    const ceiling = floor.clone();
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 3;
    this.scene.add(ceiling);

    const mkWall = (w, h, d, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      m.position.set(x, y, z);
      this.scene.add(m);
    };
    mkWall(0.3, 3, 9, -4.6, 1.5, 0);
    mkWall(0.3, 3, 9, 4.6, 1.5, 0);
    mkWall(9, 3, 0.3, 0, 1.5, -4.6);
    mkWall(9, 3, 0.3, 0, 1.5, 4.6);

    const door = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 2.2),
      new THREE.MeshLambertMaterial({ color: 0x3a2a1a })
    );
    door.position.set(0, 1.1, 4.43);
    door.rotation.y = Math.PI;
    this.scene.add(door);

    // --- disk längst bak ---
    const counter = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.0, 0.9), wood);
    counter.position.set(0, 0.5, -3.4);
    this.scene.add(counter);
    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 1.1), darkWood);
    counterTop.position.set(0, 1.02, -3.4);
    this.scene.add(counterTop);
    this.colliders.push({ x: 0, z: -3.4, radius: 1.9 });

    // skylt: "Pilhandel"
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.6, 0.1),
      new THREE.MeshLambertMaterial({ color: 0x6a4a2a })
    );
    sign.position.set(0, 2.2, -4.4);
    this.scene.add(sign);
    const signGlow = new THREE.PointLight(0xffd070, 4, 4);
    signGlow.position.set(0, 2.2, -4.0);
    this.scene.add(signGlow);

    // --- pilbuntar i en kruka på disken (det man köper) ---
    this._display = new THREE.Group();
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.22, 0.5, 12),
      new THREE.MeshLambertMaterial({ color: 0x7a5a38 })
    );
    pot.position.y = 0.25;
    this._display.add(pot);
    const shaftMat = new THREE.MeshLambertMaterial({ color: 0xeecc66 });
    const tipMat = new THREE.MeshBasicMaterial({ color: 0xbfd0e0 });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6), shaftMat);
      shaft.position.set(Math.cos(a) * 0.12, 0.85, Math.sin(a) * 0.12);
      shaft.rotation.z = Math.cos(a) * 0.18;
      shaft.rotation.x = -Math.sin(a) * 0.18;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 6), tipMat);
      tip.position.set(shaft.position.x, 1.32, shaft.position.z);
      tip.rotation.copy(shaft.rotation);
      this._display.add(shaft, tip);
    }
    this._display.position.set(0, 1.08, -3.4);
    this.scene.add(this._display);
  }

  update(delta) {
    if (this._display) this._display.rotation.y += delta * 0.6;
  }
}