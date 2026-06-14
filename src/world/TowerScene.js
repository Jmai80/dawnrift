import * as THREE from 'three';

// Torninteriör i tre nivåer: bottenvåning -> trappa -> mellanvåning (lampa +
// staty + trappa) -> översta våningen (skrivbord, lampa, läkedryck, bok).
//
// Knepet för att få spelarens befintliga höjdfysik att klättra utan att vi
// behöver skriva om något: våningarna "rullas ut" längs z-axeln i stället för
// att staplas rakt ovanpå varandra. Då hör varje (x,z) till exakt EN nivå, så
// markhöjden kan beskrivas av en enkel, tillståndslös groundFn(x,z) – spelaren
// går helt enkelt uppför rampen och `Player.update` lägger foten på rätt höjd.
// Eftersom kollisions-cylindrarna också är platta (x,z) gäller de automatiskt
// bara på den våning där de råkar ligga.
export class TowerScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0a12);

    this.colliders = [];
    // Spelaren hålls inne i schaktet via bounds (som husen). Höjden sköter
    // groundFn; kameran får klättra fritt via cameraMaxY.
    this.bounds = { minX: -5.4, maxX: 5.4, minZ: -29, maxZ: 12.4 };
    this.cameraMaxY = 999;            // ingen kamerahöjdsklamp i tornet
    this.entryPos = { x: 0, z: 8.5 }; // där spelaren dyker upp innanför dörren
    this.faceY = 0;                   // vänd inåt schaktet (-z) vid entré
    this.exitPos = new THREE.Vector3(0, 0.9, 12);

    // nivåhöjder
    this.Y_GROUND = 0;
    this.Y_MEZZ = 8;
    this.Y_TOP = 16;

    // gränssnitt som Game.js förväntar sig av en interiör
    this.book = null;
    this.bookPos = null;
    this.bookText = '';
    this.potion = null;
    this.potionPos = null;
    this.potionTaken = false;
    this._potionBaseY = 0;

    // Markhöjd per (x,z). Brytpunkterna matchar plattformarna och trapporna.
    this.groundFn = (x, z) => {
      if (z >= 3)   return this.Y_GROUND;             // bottenvåning
      if (z >= -5)  return this.Y_GROUND + (3 - z);   // trappa 1: 0 -> 8
      if (z >= -13) return this.Y_MEZZ;               // mellanvåning
      if (z >= -21) return this.Y_MEZZ + (-13 - z);   // trappa 2: 8 -> 16
      return this.Y_TOP;                              // översta våningen
    };

    this._build();
  }

  // ---- bygghjälpare -------------------------------------------------------

  _platform(mat, zCenter, depth, topY, width = 11.4) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(width, 0.5, depth), mat);
    slab.position.set(0, topY - 0.25, zCenter);
    slab.receiveShadow = true;
    this.scene.add(slab);
  }

  // Trappa längs z, från (zStart, yStart) ned/in till (zEnd, yEnd) där zEnd < zStart.
  _stairs(mat, zStart, zEnd, yStart, yEnd, width = 11.0) {
    const n = 16;
    const dz = (zStart - zEnd) / n; // positivt
    const dy = (yEnd - yStart) / n;
    for (let i = 0; i < n; i++) {
      const topY = yStart + (i + 1) * dy;
      const zc = zStart - (i + 0.5) * dz;
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(width, dy + 0.08, dz + 0.04), mat
      );
      step.position.set(0, topY - dy / 2, zc);
      step.receiveShadow = true;
      step.castShadow = true;
      this.scene.add(step);
    }
  }

  _wall(mat, w, h, d, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.receiveShadow = true;
    this.scene.add(m);
  }

  _lamp(x, y, z, color = 0xffc070) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 1.8, 8),
      new THREE.MeshLambertMaterial({ color: 0x2a2622 })
    );
    post.position.set(x, y + 0.9, z);
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 14, 12),
      new THREE.MeshBasicMaterial({ color })
    );
    orb.position.set(x, y + 1.95, z);
    this.scene.add(post, orb);
    const light = new THREE.PointLight(color, 22, 22);
    light.position.set(x, y + 2.0, z);
    this.scene.add(light);
    this.colliders.push({ x, z, radius: 0.45 });
  }

  _statue(x, y, z) {
    const stone = new THREE.MeshLambertMaterial({ color: 0x9a958c });
    const dark = new THREE.MeshLambertMaterial({ color: 0x6f6a62 });
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.0), dark);
    pedestal.position.set(x, y + 0.5, z);
    pedestal.castShadow = true;
    // liten robad figur ovanpå sockeln
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 0.95, 10), stone);
    body.position.set(x, y + 1.0 + 0.48, z);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), stone);
    head.position.set(x, y + 1.0 + 1.05, z);
    body.castShadow = true;
    head.castShadow = true;
    this.scene.add(pedestal, body, head);
    this.colliders.push({ x, z, radius: 0.7 });
  }

  _desk(wood, x, z, floorY) {
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1.0), wood);
    top.position.set(x, floorY + 0.78, z);
    top.castShadow = true;
    this.scene.add(top);
    const legGeo = new THREE.BoxGeometry(0.1, 0.75, 0.1);
    for (const [lx, lz] of [[-0.95, -0.4], [0.95, -0.4], [-0.95, 0.4], [0.95, 0.4]]) {
      const leg = new THREE.Mesh(legGeo, wood);
      leg.position.set(x + lx, floorY + 0.375, z + lz);
      this.scene.add(leg);
    }
    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.55), wood);
    chair.position.set(x, floorY + 0.25, z - 0.95);
    this.scene.add(chair);
    this.colliders.push({ x, z, radius: 1.35 });
    return floorY + 0.78 + 0.06; // y för skrivbordsskivans ovansida
  }

  // ---- scenuppbyggnad -----------------------------------------------------

  _build() {
    const stoneWall = new THREE.MeshLambertMaterial({ color: 0x4a4750 });
    const stoneStep = new THREE.MeshLambertMaterial({ color: 0x6d6862 });
    const floorMat  = new THREE.MeshLambertMaterial({ color: 0x5b5048 });
    const wood      = new THREE.MeshLambertMaterial({ color: 0x8a6a45 });

    // ljus
    this.scene.add(new THREE.AmbientLight(0xb8c0e0, 0.45));
    const entranceLight = new THREE.PointLight(0x9fb4d8, 10, 18);
    entranceLight.position.set(0, 3.2, 9);
    this.scene.add(entranceLight);

    // ytterväggar runt hela schaktet (z 13 -> -30), höga som ett torn
    const H = 22, midZ = -8.5, lenZ = 43;
    this._wall(stoneWall, 0.4, H, lenZ, -6, H / 2, midZ);     // vänster
    this._wall(stoneWall, 0.4, H, lenZ, 6, H / 2, midZ);      // höger
    this._wall(stoneWall, 12, H, 0.4, 0, H / 2, -30);         // bortre vägg
    this._wall(stoneWall, 12, H, 0.4, 0, H / 2, 13);          // främre vägg (dörr)
    // tak högt upp
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(12, lenZ), stoneWall);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, H, midZ);
    this.scene.add(ceil);

    // inre dörr (synlig) på främre väggen, vänd inåt
    const doorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 2.4),
      new THREE.MeshLambertMaterial({ color: 0x2a2018 })
    );
    doorMesh.position.set(0, 1.2, 12.78);
    doorMesh.rotation.y = Math.PI;
    this.scene.add(doorMesh);

    // --- bottenvåning ---
    this._platform(floorMat, 8, 10, this.Y_GROUND);
    // --- trappa 1 ---
    this._stairs(stoneStep, 3, -5, this.Y_GROUND, this.Y_MEZZ);
    // --- mellanvåning ---
    this._platform(floorMat, -9, 8, this.Y_MEZZ);
    this._lamp(-2.4, this.Y_MEZZ, -8.5, 0xffc070);
    this._statue(2.4, this.Y_MEZZ, -9.5);
    // --- trappa 2 ---
    this._stairs(stoneStep, -13, -21, this.Y_MEZZ, this.Y_TOP);
    // --- översta våningen ---
    this._platform(floorMat, -25, 8, this.Y_TOP);
    this._lamp(-2.2, this.Y_TOP, -24, 0xfff0c0);

    const deskTopY = this._desk(wood, 0.4, -25.6, this.Y_TOP);

    // läkedryck på skrivbordet (alltid synlig, plockas med E)
    this.potion = new THREE.Group();
    const potMat = new THREE.MeshLambertMaterial({
      color: 0xcc2233, emissive: 0x440008, transparent: true, opacity: 0.9
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
    this._potionBaseY = deskTopY + 0.16;
    this.potion.position.set(-0.5, this._potionBaseY, -25.15);
    this.scene.add(this.potion);
    this.potionPos = this.potion.position.clone();
    this._potionGlow = new THREE.PointLight(0xff5566, 5, 3);
    this._potionGlow.position.set(-0.5, this._potionBaseY + 0.4, -25.15);
    this.scene.add(this._potionGlow);

    // bok på skrivbordet – ännu otydbar
    this.book = new THREE.Group();
    const cover = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.09, 0.66),
      new THREE.MeshLambertMaterial({ color: 0x2f3d6a })
    );
    const pages = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.06, 0.6),
      new THREE.MeshLambertMaterial({ color: 0xe6dcc0 })
    );
    pages.position.y = 0.02;
    this.book.add(cover, pages);
    this.book.position.set(1.25, deskTopY + 0.06, -25.15);
    this.book.rotation.y = -0.4;
    this.scene.add(this.book);
    const bookGlow = new THREE.PointLight(0x88aaff, 3, 3);
    bookGlow.position.set(1.25, deskTopY + 0.4, -25.15);
    this.scene.add(bookGlow);
    this.bookPos = this.book.position.clone();
    this.bookText = '<b>En främmande bok:</b> Sidorna är täckta av ett skrivtecken du inte kan tyda. ' +
      'Bläcket tycks nästan röra sig när du tittar bort. Mitt bland raderna återkommer en symbol – ' +
      'en cirkel genomborrad av tre streck – densamma som på stenstoden. Innehållet förblir oläsligt... tills vidare.';
  }

  takePotion() {
    this.potionTaken = true;
    if (this.potion) this.potion.visible = false;
    if (this._potionGlow) this._potionGlow.intensity = 0;
  }

  update(delta) {
    if (this.book) this.book.rotation.y += delta * 0.5;
    if (this.potion && this.potion.visible) {
      this.potion.rotation.y += delta;
      this.potion.position.y = this._potionBaseY + Math.sin(Date.now() * 0.003) * 0.06;
    }
  }
}