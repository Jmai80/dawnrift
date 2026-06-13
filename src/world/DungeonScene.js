import * as THREE from 'three';

export class DungeonScene {
  constructor({ length = 60, layout = 'corridor', bg = 0x050508 } = {}) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(bg);
    this.scene.fog = new THREE.Fog(bg, 5, 45);
    this.colliders = [];
    this.pickups = [];

    this.stone = new THREE.MeshLambertMaterial({ color: 0x55504a });
    this.wallMat = new THREE.MeshLambertMaterial({ color: 0x3d3a36 });

    this.scene.add(new THREE.AmbientLight(0x555566, 0.6));

    if (layout === 'complex') this.buildComplex();
    else this.buildCorridor(length);

    this.exit = new THREE.Mesh(
      new THREE.CircleGeometry(1.2, 24),
      new THREE.MeshBasicMaterial({ color: 0x44aaff })
    );
    this.exit.rotation.x = -Math.PI / 2;
    this.exit.position.set(0, 0.02, this.exitZ);
    this.scene.add(this.exit);
  }

  mkWall(w, h, d, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.wallMat);
    m.position.set(x, y, z);
    this.scene.add(m);
  }

  mkFloorCeil(width, length, zCenter) {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, length), this.stone);
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = zCenter;
    this.scene.add(floor);
    const ceiling = floor.clone();
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 5;
    this.scene.add(ceiling);
  }

  torch(x, z, color = 0xff8830) {
    const t = new THREE.PointLight(color, 26, 18);
    t.position.set(x, 3.5, z);
    this.scene.add(t);
  }

  buildCorridor(length) {
    const zFar = -(length - 5);
    this.bounds = { minX: -6.2, maxX: 6.2, minZ: zFar + 1, maxZ: 4.2 };
    this.exitZ = 4;
    this.endZ = zFar + 5;
    const zCenter = (5 + zFar) / 2;

    this.mkFloorCeil(14, length + 2, zCenter);
    this.mkWall(1, 5, length + 2, -7.5, 2.5, zCenter);
    this.mkWall(1, 5, length + 2, 7.5, 2.5, zCenter);
    this.mkWall(14, 5, 1, 0, 2.5, zFar - 0.5);
    this.mkWall(14, 5, 1, 0, 2.5, 5.5);

    for (let z = -5; z >= zFar + 5; z -= 12) {
      this.torch(-6.5, z);
      this.torch(6.5, z - 6);
    }
  }

  buildComplex() {
    const minZ = -53, maxZ = 3, minX = -13, maxX = 13;
    this.bounds = { minX: minX + 0.7, maxX: maxX - 0.7, minZ: minZ + 1, maxZ: maxZ - 0.8 };
    this.exitZ = 2;
    const zc = (maxZ + minZ) / 2;
    const width = maxX - minX;
    const len = maxZ - minZ;

    this.mkFloorCeil(width, len + 2, zc);
    this.mkWall(1, 5, len + 2, minX - 0.5, 2.5, zc);
    this.mkWall(1, 5, len + 2, maxX + 0.5, 2.5, zc);
    this.mkWall(width + 2, 5, 1, 0, 2.5, minZ - 0.5);
    this.mkWall(width + 2, 5, 1, 0, 2.5, maxZ + 0.5);

    // Inre väggar med dörröppningar
    this.addInnerWall(-13, -8, -3, -8);   // entrévägg, lucka x[-3,3]
    this.addInnerWall(3, -8, 13, -8);
    this.addInnerWall(-4, -8, -4, -12);   // korridorens vänstervägg, lucka z[-12,-17]
    this.addInnerWall(-4, -17, -4, -30);
    this.addInnerWall(4, -8, 4, -20);     // korridorens högervägg, lucka z[-20,-25]
    this.addInnerWall(4, -25, 4, -30);

    this.torch(0, 0);
    this.torch(0, -16);
    this.torch(-9, -16, 0xffa040);
    this.torch(9, -16, 0xffa040);
    this.torch(-9, -28);
    this.torch(9, -28);
    this.torch(0, -42, 0x9a6cff);
    this.torch(0, -50, 0x9a6cff);
  }

  // Axelparallell innervägg: visuell box + cirkelkolliders längs sträckan
  addInnerWall(ax, az, bx, bz) {
    const len = Math.hypot(bx - ax, bz - az);
    const horizontal = Math.abs(bx - ax) >= Math.abs(bz - az);
    const w = horizontal ? len + 0.6 : 0.6;
    const d = horizontal ? 0.6 : len + 0.6;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 4.4, d), this.wallMat);
    wall.position.set((ax + bx) / 2, 2.2, (az + bz) / 2);
    this.scene.add(wall);
    const n = Math.max(1, Math.ceil(len / 1.1));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      this.colliders.push({ x: ax + (bx - ax) * t, z: az + (bz - az) * t, radius: 0.75 });
    }
  }

  addPickup(kind, x, z, loot) {
    const group = this.makePickupMesh(kind);
    group.position.set(x, 0.6, z);
    this.scene.add(group);

    const glowColor = kind === 'sword' ? 0x8899ff
      : kind === 'amulet' ? 0xcc66ff
      : kind === 'bow' ? 0x88ddff
      : kind === 'relic' ? 0xffd060
      : 0xff5566;
    const glow = new THREE.PointLight(glowColor, 16, 9);
    glow.position.set(x, 2, z);
    this.scene.add(glow);

    const pk = { group, glow, base: new THREE.Vector3(x, 0.6, z), taken: false, loot, kind };
    this.pickups.push(pk);
    return pk;
  }

  makePickupMesh(kind) {
    const g = new THREE.Group();
    if (kind === 'sword') {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 0.04),
        new THREE.MeshLambertMaterial({ color: 0xcccccc, emissive: 0x222244 }));
      blade.position.y = 0.9;
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.08),
        new THREE.MeshLambertMaterial({ color: 0xb89b5e }));
      guard.position.y = 0.2;
      g.add(blade, guard);
    } else if (kind === 'amulet') {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.08, 12, 24),
        new THREE.MeshLambertMaterial({ color: 0xd4af37, emissive: 0x332200 }));
      ring.position.y = 1;
      const gem = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12),
        new THREE.MeshLambertMaterial({ color: 0x9933cc, emissive: 0x551188 }));
      gem.position.y = 1;
      g.add(ring, gem);
    } else if (kind === 'bow') {
      const wood = new THREE.MeshLambertMaterial({ color: 0x7a4a22, emissive: 0x120800 });
      const limb = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 8, 24, Math.PI), wood);
      limb.position.y = 0.9;
      limb.rotation.z = -Math.PI / 2;
      const string = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.18, 0.02),
        new THREE.MeshBasicMaterial({ color: 0xeeeeee }));
      string.position.y = 0.9;
      g.add(limb, string);
    } else if (kind === 'relic') {
      const gold = new THREE.MeshLambertMaterial({ color: 0xe8c34a, emissive: 0x4a3800 });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.12, 16), gold);
      base.position.y = 0.55;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 12), gold);
      stem.position.y = 0.8;
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.12, 0.4, 16, 1, true), gold);
      cup.position.y = 1.2;
      const gem = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12),
        new THREE.MeshLambertMaterial({ color: 0xff3355, emissive: 0x661122 }));
      gem.position.y = 1.0;
      g.add(base, stem, cup, gem);
    } else { // potion
      const potMat = new THREE.MeshLambertMaterial({
        color: 0xcc2233, emissive: 0x440008, transparent: true, opacity: 0.85
      });
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.3, 12), potMat);
      glass.position.y = 0.15;
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.12, 8), potMat);
      neck.position.y = 0.36;
      const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 8),
        new THREE.MeshLambertMaterial({ color: 0x6b4b2a }));
      cork.position.y = 0.45;
      g.add(glass, neck, cork);
    }
    return g;
  }

  collect(pk) {
    pk.taken = true;
    this.scene.remove(pk.group);
    this.scene.remove(pk.glow);
  }

  update(delta) {
    for (const pk of this.pickups) {
      if (pk.taken) continue;
      pk.group.rotation.y += delta;
      pk.group.position.y = pk.base.y + Math.sin(Date.now() * 0.002) * 0.15;
    }
  }
}