import * as THREE from 'three';

export class HouseScene {
  constructor({ owner = 'elda' } = {}) {
    this.owner = owner;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0805);
    this.colliders = [];
    this.bounds = { minX: -3.9, maxX: 3.9, minZ: -3.9, maxZ: 3.8 };
    this.exitPos = new THREE.Vector3(0, 0, 4.1);
    this.book = null;
    this.bookPos = null;
    this.bookText = '';
    this.potion = null;
    this.potionPos = null;
    this.potionTaken = false;

    this.scene.add(new THREE.AmbientLight(0xffe0b0, 0.4));
    const lamp = new THREE.PointLight(0xffb060, 25, 15);
    lamp.position.set(0, 2.6, 0);
    this.scene.add(lamp);

    const wood = new THREE.MeshLambertMaterial({ color: 0x8a6a45 });
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

    if (owner === 'elda') this.buildEldaInterior(wood);
    else this.buildTorvaldInterior(wood);
  }

  addDesk(wood, x, z) {
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1), wood);
    deskTop.position.set(x, 0.78, z);
    this.scene.add(deskTop);
    const legGeo = new THREE.BoxGeometry(0.1, 0.75, 0.1);
    for (const [lx, lz] of [[-0.95, -0.4], [0.95, -0.4], [-0.95, 0.4], [0.95, 0.4]]) {
      const leg = new THREE.Mesh(legGeo, wood);
      leg.position.set(x + lx, 0.375, z + lz);
      this.scene.add(leg);
    }
    const stool = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.5), wood);
    stool.position.set(x, 0.225, z + 1.1);
    this.scene.add(stool);
    this.colliders.push({ x, z: z + 0.2, radius: 1.3 });
  }

  buildEldaInterior(wood) {
    const bedFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.4, 2.6),
      new THREE.MeshLambertMaterial({ color: 0x5c4033 })
    );
    bedFrame.position.set(-3, 0.2, -3);
    const mattress = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.2, 2.4),
      new THREE.MeshLambertMaterial({ color: 0xd8d0c0 })
    );
    mattress.position.set(-3, 0.45, -3);
    const pillow = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.15, 0.6),
      new THREE.MeshLambertMaterial({ color: 0xf5f0e5 })
    );
    pillow.position.set(-3, 0.6, -3.9);
    this.scene.add(bedFrame, mattress, pillow);
    this.colliders.push({ x: -3, z: -3, radius: 1.4 });

    this.addDesk(wood, 2.8, -3.6);

    const candle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.25, 8),
      new THREE.MeshLambertMaterial({ color: 0xfff5dd })
    );
    candle.position.set(3.4, 0.97, -3.6);
    this.scene.add(candle);
    const candleLight = new THREE.PointLight(0xffaa44, 6, 5);
    candleLight.position.set(3.4, 1.2, -3.6);
    this.scene.add(candleLight);

    // Läkedryck (dold tills hjälten skadats i en grotta)
    this.potion = new THREE.Group();
    const potMat = new THREE.MeshLambertMaterial({
      color: 0xcc2233, emissive: 0x440008, transparent: true, opacity: 0.85
    });
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.3, 12), potMat);
    glass.position.y = 0.15;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.12, 8), potMat);
    neck.position.y = 0.36;
    const cork = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.06, 8),
      new THREE.MeshLambertMaterial({ color: 0x6b4b2a })
    );
    cork.position.y = 0.45;
    this.potion.add(glass, neck, cork);
    this.potion.position.set(-1.0, 0.2, -2.4);
    this.potion.visible = false;
    this.scene.add(this.potion);
    this.potionPos = this.potion.position.clone();

    this._potionGlow = new THREE.PointLight(0xff5566, 0, 3);
    this._potionGlow.position.set(-1.0, 0.7, -2.4);
    this.scene.add(this._potionGlow);
  }

  buildTorvaldInterior(wood) {
    const bedFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.35, 2.4),
      new THREE.MeshLambertMaterial({ color: 0x4a3322 })
    );
    bedFrame.position.set(-3, 0.18, -3);
    const mattress = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.18, 2.2),
      new THREE.MeshLambertMaterial({ color: 0xc8bca8 })
    );
    mattress.position.set(-3, 0.42, -3);
    this.scene.add(bedFrame, mattress);
    this.colliders.push({ x: -3, z: -3, radius: 1.4 });

    this.addDesk(wood, 2.8, -3.6);

    this.book = new THREE.Group();
    const cover = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.08, 0.65),
      new THREE.MeshLambertMaterial({ color: 0x6a2b2b })
    );
    const pages = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.06, 0.58),
      new THREE.MeshLambertMaterial({ color: 0xeae0c8 })
    );
    pages.position.y = 0.01;
    this.book.add(cover, pages);
    this.book.position.set(2.8, 0.88, -3.6);
    this.book.rotation.y = 0.3;
    this.scene.add(this.book);

    const bookGlow = new THREE.PointLight(0xffcc66, 4, 3);
    bookGlow.position.set(2.8, 1.2, -3.6);
    this.scene.add(bookGlow);

    this.bookPos = this.book.position.clone();
    this.bookText = '<b>Torvalds bok:</b> Sidorna är fyllda med en handstil du inte känner igen. En symbol återkommer gång på gång — en cirkel genomborrad av tre streck. Du anar att den betyder något... men inte ännu.';
  }

  spawnPotion() {
    if (!this.potion || this.potionTaken) return;
    this.potion.visible = true;
    this._potionGlow.intensity = 6;
  }

  takePotion() {
    this.potionTaken = true;
    this.potion.visible = false;
    this._potionGlow.intensity = 0;
  }

  update(delta) {
    if (this.book) this.book.rotation.y += delta * 0.5;
    if (this.potion && this.potion.visible) {
      this.potion.rotation.y += delta;
      this.potion.position.y = 0.2 + Math.sin(Date.now() * 0.003) * 0.06;
    }
  }
}