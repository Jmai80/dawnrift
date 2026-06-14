import * as THREE from 'three';
import { getHeight, createTerrain } from './terrain/Terrain.js';
import { addTree, addFlower, addSunflower } from './props/vegetation.js';
import { addHouse, addManor, addTowerHouse } from './props/houses.js';
import { addCave } from './props/caves.js';
import { addShootingRange } from './props/shootingRange.js';

export class WorldScene {
  constructor() {
    this.colliders = [];
    this.caves = [];
    this.houseDoors = [];

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87b5d8);
    this.scene.fog = new THREE.Fog(0x87b5d8, 60, 250);

    this.scene.add(new THREE.AmbientLight(0x8899bb, 0.85));

    this.sunOffset = new THREE.Vector3(35, 140, 30);
    this.sunTarget = new THREE.Object3D();
    this.scene.add(this.sunTarget);

    this.sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
    this.sun.position.copy(this.sunOffset);
    this.sun.target = this.sunTarget;
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45;
    sc.near = 5; sc.far = 400;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.4;
    this.scene.add(this.sun);

    const terrain = createTerrain();
    terrain.receiveShadow = true;
    this.scene.add(terrain);

    this.addMonument();

    addFlower(this.scene, 2.8, 1.4, 1.0);
    addFlower(this.scene, -2.2, 2.6, 0.65);

    addHouse(this.scene, this.colliders, this.houseDoors, 15, -20, { owner: 'elda' });
    addHouse(this.scene, this.colliders, this.houseDoors, -25, 10, { owner: 'torvald' });
    addHouse(this.scene, this.colliders, this.houseDoors, 30, 25, { locked: true });
    addManor(this.scene, this.colliders, this.houseDoors, 0, -48);



// litet tornhus öster om herrgården

    addTowerHouse(
  this.scene,
  this.colliders,
  this.houseDoors,
  18, -48);

    addSunflower(this.scene, -8,   -41, 1.0);
    addSunflower(this.scene, -5,   -41, 1.15);
    addSunflower(this.scene, -2,   -41, 0.9);
    addSunflower(this.scene,  2,   -41, 1.1);
    addSunflower(this.scene,  5,   -41, 0.95);
    addSunflower(this.scene,  8,   -41, 1.2);
    addSunflower(this.scene, -7.5, -55, 0.85);
    addSunflower(this.scene,  7.5, -55, 0.9);

    for (let i = 0; i < 40; i++) {
      addTree(
        this.scene,
        this.colliders,
        (Math.random() - 0.5) * 350,
        (Math.random() - 0.5) * 350
      );
    }

    addCave(this.scene, this.caves, 10, -120);
    addCave(this.scene, this.caves, 140, 10);
    addCave(this.scene, this.caves, -100, 115);

    // Skyttebana öster om tornet, norr om östra grottan (på utplattad mark).
    this.archeryTarget = addShootingRange(this.scene, this.colliders, this.houseDoors);
  }

  addMonument() {
    const y0 = getHeight(0, 0);
    const stone = new THREE.MeshLambertMaterial({ color: 0x8a8780 });
    const g = new THREE.Group();

    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 0.5, 8), stone);
    base.position.y = 0.25; base.castShadow = true; base.receiveShadow = true;
    const base2 = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.9, 0.5, 8), stone);
    base2.position.y = 0.75; base2.castShadow = true;
    const obelisk = new THREE.Mesh(new THREE.BoxGeometry(1.0, 4.2, 1.0), stone);
    obelisk.position.y = 3.1; obelisk.castShadow = true;
    g.add(base, base2, obelisk);

    const symMat = new THREE.MeshBasicMaterial({ color: 0x66ddff });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.06, 10, 24), symMat);
    ring.position.set(0, 3.4, 0.55);
    g.add(ring);
    const barGeo = new THREE.BoxGeometry(0.06, 0.8, 0.04);
    for (let k = -1; k <= 1; k++) {
      const bar = new THREE.Mesh(barGeo, symMat);
      bar.position.set(k * 0.18, 3.4, 0.56);
      g.add(bar);
    }

    g.position.set(0, y0, 0);
    this.scene.add(g);

    this.monumentGlow = new THREE.PointLight(0x66ddff, 6, 14);
    this.monumentGlow.position.set(0, y0 + 3.4, 1.2);
    this.scene.add(this.monumentGlow);

    this.monumentPos = new THREE.Vector3(0, y0, 0);
    this.colliders.push({ x: 0, z: 0, radius: 2.4 });
    this.monumentText = '<b>Stenstoden:</b> En sliten obelisk reser sig mitt i byn. På framsidan lyser samma symbol som i Torvalds bok — en cirkel genomborrad av tre streck. Stenen känns märkligt varm. Något verkar vänta på att väckas.';
  }

  updateSun(p) {
    this.sun.position.set(
      p.x + this.sunOffset.x,
      p.y + this.sunOffset.y,
      p.z + this.sunOffset.z
    );
    this.sunTarget.position.set(p.x, p.y, p.z);
    this.sunTarget.updateMatrixWorld();

    if (this.monumentGlow) {
      this.monumentGlow.intensity = 4 + Math.sin(Date.now() * 0.002) * 2;
    }
  }
}