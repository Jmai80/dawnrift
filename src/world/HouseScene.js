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
    else if (owner === 'gubbe') this.buildGubbeInterior(wood);
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

  buildGubbeInterior(wood) {
    // Mörkt, skabbigt rum. Dämpad lampa, sliten golv- och väggfärg – allt är
    // lite mer nedgånget än de andra husen. Inget prydligt skrivbord: i stället
    // en sönderluggad säng, staplade lådor, ett stjälpt bord och damm överallt.

    // Rummet är lite mindre och mörkare
    this.scene.background = new THREE.Color(0x06050300);

    // Sängen – skev, kudden borttappad
    const bedMat = new THREE.MeshLambertMaterial({ color: 0x3a2d1e });
    const mattMat = new THREE.MeshLambertMaterial({ color: 0x7a6a50 }); // urtvättad
    const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 2.4), bedMat);
    bedFrame.position.set(-3, 0.18, -3);
    bedFrame.rotation.y = 0.08; // lite snett
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.2, 2.2), mattMat);
    mattress.position.set(-3.05, 0.42, -2.95);
    mattress.rotation.y = 0.08;
    // Trasig filt i stället för kudde – knycklad ihop
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.9), mattMat);
    blanket.position.set(-3, 0.55, -3.5);
    blanket.rotation.set(0.15, 0.2, 0.05);
    this.scene.add(bedFrame, mattress, blanket);
    this.colliders.push({ x: -3, z: -3, radius: 1.4 });

    // Stjälpt stol vid ett skadat bord (ett ben kortare → lutar)
    const tableMat = new THREE.MeshLambertMaterial({ color: 0x5c4030 });
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 1.0), tableMat);
    tableTop.position.set(2.5, 0.72, -3.5);
    tableTop.rotation.z = 0.07; // lutar lite
    this.scene.add(tableTop);
    const legGeo = new THREE.BoxGeometry(0.1, 0.7, 0.1);
    for (const [lx, lh, lz] of [
      [-0.8, 0.7, -0.4], [0.8, 0.7, -0.4],
      [-0.8, 0.7,  0.4], [0.8, 0.55, 0.4] // kortare ben = bordet lutar
    ]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, lh, 0.1), tableMat);
      leg.position.set(2.5 + lx, lh / 2, -3.5 + lz);
      this.scene.add(leg);
    }
    this.colliders.push({ x: 2.5, z: -3.5, radius: 1.2 });

    // Välta stol
    const chairMat = new THREE.MeshLambertMaterial({ color: 0x4a3522 });
    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.6), chairMat);
    chairSeat.position.set(2.4, 0.2, -1.8);
    chairSeat.rotation.z = 1.2; // vältt på sidan
    chairSeat.rotation.x = 0.3;
    this.scene.add(chairSeat);

    // Staplade kistlådor i hörnet (i stället för ett prydligt skrivbord)
    const boxMat = new THREE.MeshLambertMaterial({ color: 0x6a5030 });
    const crateA = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 0.9), boxMat);
    crateA.position.set(3.0, 0.35, 2.5);
    crateA.rotation.y = 0.15;
    const crateB = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.65, 0.8), boxMat);
    crateB.position.set(3.0, 1.03, 2.6);
    crateB.rotation.y = -0.2;
    this.scene.add(crateA, crateB);
    this.colliders.push({ x: 3.0, z: 2.5, radius: 0.9 });

    // Sopig hög i nordväst-hörnet: slumpmässiga kuber och cylindrar
    const garbMat = new THREE.MeshLambertMaterial({ color: 0x4a3c28 });
    for (const [gx, gy, gz, gy0, rx, rz] of [
      [-3.2, 0.15, 2.8,  0,     0.1, 0.05],
      [-2.5, 0.12, 3.0,  0,    -0.2, 0.1],
      [-3.4, 0.18, 3.2,  0,     0.3, -0.1],
      [-2.8, 0.28, 2.5,  0.1,   0.0, 0.2],
    ]) {
      const junk = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.3), garbMat);
      junk.position.set(gx, gy0 + gy, gz);
      junk.rotation.set(rx, Math.random() * 0.5, rz);
      this.scene.add(junk);
    }

    // Sprickor i väggen (mörka linjer/fyrkanter mot väggens yta)
    const crackMat = new THREE.MeshBasicMaterial({ color: 0x1a1510 });
    const crack1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.04), crackMat);
    crack1.position.set(-4.57, 1.8, 0.5);
    const crack2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.04), crackMat);
    crack2.position.set(-4.57, 1.5, 0.7);
    this.scene.add(crack1, crack2);

    // Spindelnät i taket (tunn torus + trådar)
    const webMat = new THREE.MeshBasicMaterial({ color: 0x888880, transparent: true, opacity: 0.35 });
    const web = new THREE.Group();
    const webRing = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.012, 6, 16), webMat);
    web.add(webRing);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.62), webMat);
      spoke.rotation.y = a;
      web.add(spoke);
    }
    web.position.set(-2.5, 2.92, 2.0);
    web.rotation.x = Math.PI / 2;
    this.scene.add(web);

    // ── PRYLEN: gubbens käraste ägodel ──
    // En liten rund amulett/medaljong som glöder svagt gulaktigt.
    // Den ligger undangömd under det lutande bordet, lite smutsig men fortfarande
    // vacker. När spelaren plockar upp den startar quest-kedjan nästa steg.
    this.trinket = new THREE.Group();
    const discMat = new THREE.MeshLambertMaterial({ color: 0xc8a84a, emissive: 0x3a2800 });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 18), discMat);
    const rimMat = new THREE.MeshLambertMaterial({ color: 0xe8c860, emissive: 0x4a3800 });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 8, 20), rimMat);
    rim.rotation.x = Math.PI / 2;
    const engraving = new THREE.Mesh(
      new THREE.TorusGeometry(0.07, 0.012, 6, 16),
      new THREE.MeshBasicMaterial({ color: 0x4a3800 })
    );
    engraving.rotation.x = Math.PI / 2;
    engraving.position.y = 0.025;
    this.trinket.add(disc, rim, engraving);
    this.trinket.position.set(1.9, 0.05, -2.9); // under bordet
    this.scene.add(this.trinket);
    this.trinketPos = this.trinket.position.clone();
    this.trinketTaken = false;

    this._trinketGlow = new THREE.PointLight(0xffcc44, 3, 2.5);
    this._trinketGlow.position.set(1.9, 0.5, -2.9);
    this.scene.add(this._trinketGlow);

    // ── KARTAN ──
    // Dyker upp på bordet när gubben minns och spelaren återvänder.
    // Visuellt: ett hopvikt pergamentark.
    this.map = new THREE.Group();
    const parchMat = new THREE.MeshLambertMaterial({ color: 0xd4b87a, emissive: 0x201800 });
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.7), parchMat);
    const fold = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.035, 0.22), parchMat);
    fold.position.set(0, 0.038, 0.24);
    fold.rotation.x = -0.4;
    // Lite symbolik: tre små linjer som antyder en karta/symbol
    const inkMat = new THREE.MeshBasicMaterial({ color: 0x3a2800 });
    for (let i = -1; i <= 1; i++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.008, 0.025), inkMat);
      line.position.set(i * 0.1, 0.025, -0.1 + i * 0.06);
      this.map.add(line);
    }
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), inkMat);
    dot.position.set(0.12, 0.025, 0.05);
    this.map.add(sheet, fold, dot);
    this.map.position.set(2.5, 0.78, -3.4);
    this.map.rotation.y = 0.4;
    this.map.visible = false;
    this.scene.add(this.map);
    this.mapPos = this.map.position.clone();
    this.mapTaken = false;

    this._mapGlow = new THREE.PointLight(0xffa030, 0, 3);
    this._mapGlow.position.set(2.5, 1.3, -3.4);
    this.scene.add(this._mapGlow);
  }

  takeTrinket() {
    this.trinketTaken = true;
    this.trinket.visible = false;
    this._trinketGlow.intensity = 0;
  }

  spawnMap() {
    if (this.mapTaken || this.map.visible) return;
    this.map.visible = true;
    this._mapGlow.intensity = 8;
  }

  takeMap() {
    this.mapTaken = true;
    this.map.visible = false;
    this._mapGlow.intensity = 0;
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
    if (this.trinket && !this.trinketTaken) {
      this.trinket.rotation.y += delta * 0.8;
      this.trinket.position.y = 0.05 + Math.sin(Date.now() * 0.004) * 0.03;
      if (this._trinketGlow) this._trinketGlow.intensity = 2.5 + Math.sin(Date.now() * 0.005) * 1;
    }
    if (this.map && this.map.visible && !this.mapTaken) {
      this.map.rotation.y += delta * 0.3;
      if (this._mapGlow) this._mapGlow.intensity = 6 + Math.sin(Date.now() * 0.003) * 2;
    }
  }
}