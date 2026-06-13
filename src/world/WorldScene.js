import * as THREE from 'three';
import { getHeight, createTerrain } from './Terrain.js';
import { addSunflower } from './props/vegetation.js';

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

    // röda blommor
    this.addFlower(2.8, 1.4, 1.0);
    this.addFlower(-2.2, 2.6, 0.65);

    this.addHouse(15, -20, { owner: 'elda' });
    this.addHouse(-25, 10, { owner: 'torvald' });
    this.addHouse(30, 25, { locked: true });
    this.addManor(0, -48); // stor herrgård i utkanten, mot byn

    // Solrosor bla vid stora herrgården
    addSunflower(this.scene,-8,  -41, 1.0);
    addSunflower(this.scene, -5,  -41, 1.15);
    addSunflower(this.scene, -2,  -41, 0.9);
    addSunflower(this.scene, 2,  -41, 1.1);
    addSunflower(this.scene, 5,  -41, 0.95);
    addSunflower(this.scene, 8,  -41, 1.2);
    addSunflower(this.scene,-7.5, -55, 0.85);
    addSunflower(this.scene, 7.5, -55, 0.9);

    for (let i = 0; i < 40; i++) {
      this.addTree(
        (Math.random() - 0.5) * 350,
        (Math.random() - 0.5) * 350
      );
    }

    this.addCave(10, -120);
    this.addCave(140, 10);
    this.addCave(-100, 115);
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

  addHouse(x, z, { owner = null, locked = false } = {}) {
    const house = new THREE.Group();
    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(6, 4, 6),
      new THREE.MeshLambertMaterial({ color: 0x9b7653 })
    );
    walls.position.y = 2;
    walls.castShadow = true;
    walls.receiveShadow = true;
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(5, 3, 4),
      new THREE.MeshLambertMaterial({ color: 0x7a3b2e })
    );
    roof.position.y = 5.5;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    house.add(walls, roof);
    house.position.set(x, getHeight(x, z), z);
    this.scene.add(house);
    this.colliders.push({ x, z, radius: 4.6 });

    if (owner || locked) {
      const door = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 2.2),
        new THREE.MeshLambertMaterial({ color: locked ? 0x2a2018 : 0x3a2a1a })
      );
      door.position.set(x, getHeight(x, z) + 1.1, z + 3.01);
      this.scene.add(door);
      this.houseDoors.push({ x, z: z + 3, owner, locked });
    }
  }

  addManor(mx, mz) {
    const groundY = getHeight(mx, mz);
    const half = 6;
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x8f8a7a });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x4f4a58 });
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x6f6a60 });

    const g = new THREE.Group();

    const foundation = new THREE.Mesh(new THREE.BoxGeometry(13, 1.2, 13), stoneMat);
    foundation.position.y = 0;
    foundation.castShadow = true;
    foundation.receiveShadow = true;

    const walls = new THREE.Mesh(new THREE.BoxGeometry(12, 7, 12), wallMat);
    walls.position.y = 4.0;
    walls.castShadow = true;
    walls.receiveShadow = true;

    const roof = new THREE.Mesh(new THREE.ConeGeometry(9, 4.5, 4), roofMat);
    roof.position.y = 9.75;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;

    g.add(foundation, walls, roof);
    g.position.set(mx, groundY - 0.5, mz);
    this.scene.add(g);

    // Låst dörr på framsidan (+z), vänd mot byn
    const door = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 3.2),
      new THREE.MeshLambertMaterial({ color: 0x2a2018 })
    );
    door.position.set(mx, groundY + 1.6, mz + half + 0.02);
    this.scene.add(door);
    this.houseDoors.push({ x: mx, z: mz + half, owner: null, locked: true });

    // Väggkolliders runt hela huset
    this.addWallLine(mx - half, mz + half, mx + half, mz + half);
    this.addWallLine(mx - half, mz - half, mx + half, mz - half);
    this.addWallLine(mx - half, mz - half, mx - half, mz + half);
    this.addWallLine(mx + half, mz - half, mx + half, mz + half);

    // Dekorationer
    this.addCrate(mx - half + 0.5, mz + half + 1.4);
    this.addBarrel(mx + half - 0.5, mz + half + 1.4);
    this.addGrass(mx - half - 0.8, mz - half - 0.8);
    this.addGrass(mx + half + 0.8, mz - half - 0.8);
    this.addGrass(mx + half + 0.8, mz + half + 0.8);
    this.addGrass(mx - half - 0.8, mz + half + 0.8);
  }

  addWallLine(ax, az, bx, bz, radius = 0.8, spacing = 1.3) {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.ceil(len / spacing));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      this.colliders.push({ x: ax + (bx - ax) * t, z: az + (bz - az) * t, radius });
    }
  }

  addCrate(x, z) {
    const y = getHeight(x, z);
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.2, 1.2),
      new THREE.MeshLambertMaterial({ color: 0x8a6a3a })
    );
    crate.position.set(x, y + 0.6, z);
    crate.rotation.y = 0.3;
    crate.castShadow = true;
    crate.receiveShadow = true;
    this.scene.add(crate);
    this.colliders.push({ x, z, radius: 0.85 });
  }

  addBarrel(x, z) {
    const y = getHeight(x, z);
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.5, 1.3, 12),
      new THREE.MeshLambertMaterial({ color: 0x7a5230 })
    );
    barrel.position.set(x, y + 0.65, z);
    barrel.castShadow = true;
    barrel.receiveShadow = true;
    this.scene.add(barrel);

    const ringMat = new THREE.MeshLambertMaterial({ color: 0x3a2a1a });
    for (const ry of [0.3, 1.0]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.57, 0.05, 8, 16), ringMat);
      ring.position.set(x, y + ry, z);
      ring.rotation.x = Math.PI / 2;
      this.scene.add(ring);
    }
    this.colliders.push({ x, z, radius: 0.7 });
  }

  addGrass(x, z) {
    const y = getHeight(x, z);
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0x3a7d2c });
    for (let i = 0; i < 7; i++) {
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.5, 4), mat);
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.35;
      blade.position.set(Math.cos(a) * r, 0.25, Math.sin(a) * r);
      blade.rotation.z = (Math.random() - 0.5) * 0.5;
      blade.rotation.x = (Math.random() - 0.5) * 0.5;
      g.add(blade);
    }
    g.position.set(x, y, z);
    this.scene.add(g);
  }

  addTree(x, z) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.4, 2),
      new THREE.MeshLambertMaterial({ color: 0x5c4033 })
    );
    trunk.position.y = 1;
    trunk.castShadow = true;
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(1.8, 4, 8),
      new THREE.MeshLambertMaterial({ color: 0x2d5a27 })
    );
    crown.position.y = 4;
    crown.castShadow = true;
    tree.add(trunk, crown);
    tree.position.set(x, getHeight(x, z), z);
    this.scene.add(tree);
    this.colliders.push({ x, z, radius: 0.9 });
  }

  addCave(x, z) {
    this.caves.push({ x, z });
    const y = getHeight(x, z);

    const rock = new THREE.Mesh(
      new THREE.SphereGeometry(6, 16, 12),
      new THREE.MeshLambertMaterial({ color: 0x6b6b6b })
    );
    rock.position.set(x, y, z);
    rock.scale.y = 0.8;
    rock.castShadow = true;
    rock.receiveShadow = true;
    this.scene.add(rock);

    // Mynningen (variant 1) vänds mot byn (origo) – spelarens vanligaste utgångspunkt
    const dir = new THREE.Vector3(-x, 0, -z);
    if (dir.lengthSq() < 0.0001) dir.set(0, 0, 1);
    dir.normalize();

    const opening = new THREE.Mesh(
      new THREE.CircleGeometry(2, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    opening.position.set(x + dir.x * 5.9, y + 1.5, z + dir.z * 5.9);
    opening.rotation.y = Math.atan2(dir.x, dir.z);
    this.scene.add(opening);
  }
  addFlower(x, z, scale = 1.0) {
  const y = getHeight(x, z);
  const g = new THREE.Group();

  const stemMat = new THREE.MeshLambertMaterial({ color: 0x2d7a1f });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x1a5c10 });
  const petalMat = new THREE.MeshLambertMaterial({ color: 0xcc1122 });
  const budMat = new THREE.MeshLambertMaterial({ color: 0xee2233 });

  // Stjälk
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.09, 1.1, 8),
    stemMat
  );
  stem.position.y = 0.55;
  g.add(stem);

  // Blad vänster
  const leafGeo = new THREE.SphereGeometry(0.28, 8, 5);
  leafGeo.scale(1, 0.28, 0.55);
  const leafL = new THREE.Mesh(leafGeo, leafMat);
  leafL.position.set(-0.28, 0.38, 0);
  leafL.rotation.z = 0.5;
  g.add(leafL);

  // Blad höger
  const leafR = leafL.clone();
  leafR.position.set(0.28, 0.52, 0);
  leafR.rotation.z = -0.5;
  g.add(leafR);

  // Blomknopp – ett litet ägglikt bär
  const bud = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 10),
    budMat
  );
  bud.scale.y = 1.35;
  bud.position.y = 1.2;
  g.add(bud);

  // Kronblad runt knoppen
  const petalGeo = new THREE.SphereGeometry(0.14, 8, 6);
  petalGeo.scale(1, 0.4, 1);
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const petal = new THREE.Mesh(petalGeo, petalMat);
    petal.position.set(
      Math.cos(angle) * 0.28,
      1.14,
      Math.sin(angle) * 0.28
    );
    petal.rotation.y = -angle;
    petal.rotation.z = 0.55;
    g.add(petal);
  }

  g.scale.setScalar(scale);
  g.position.set(x, y, z);
  this.scene.add(g);
}

}