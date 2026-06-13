import * as THREE from 'three';
import { getHeight, createTerrain } from './Terrain.js';

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

    this.addHouse(15, -20, { owner: 'elda' });
    this.addHouse(-25, 10, { owner: 'torvald' });
    this.addHouse(30, 25, { locked: true });

    for (let i = 0; i < 40; i++) {
      this.addTree(
        (Math.random() - 0.5) * 350,
        (Math.random() - 0.5) * 350
      );
    }

    this.addCave(10, -120);    // norr
    this.addCave(140, 10);     // öster
    this.addCave(-100, 115);   // sydväst (den avancerade)
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

    // Symbolen: en cirkel genomborrad av tre streck (samma som i boken)
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
    const opening = new THREE.Mesh(
      new THREE.CircleGeometry(2, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    opening.position.set(x, y + 1.5, z + 5.9);
    this.scene.add(rock, opening);
  }
}