import * as THREE from 'three';

// Interiör för herrgården: en handelsbod där man kan köpa och sälja saker.
// Samma rumsgränssnitt som HouseScene/RangeShopScene (scene/colliders/bounds/
// exitPos/update) så Game.js hus-maskineri kan använda den oförändrat. I stället
// för bok/dryck exponerar den en `shopPos` framför bardisken som Game.js läser
// för köp-/sälj-interaktionen, samt en köpman som står bakom disken.
//
// Rummet är större än de vanliga husen eftersom herrgården är en storbyggnad –
// bounds och väggar är tilltagna därefter och disken är en bred "bardisk".
export class ManorShopScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c0a07);
    this.colliders = [];
    this.bounds = { minX: -5.9, maxX: 5.9, minZ: -5.9, maxZ: 5.8 };
    this.exitPos = new THREE.Vector3(0, 0, 6.1);

    // Inget bok/dryck här – Game.js hoppar över dem eftersom de är null.
    this.book = null;
    this.bookPos = null;
    this.potion = null;
    this.potionPos = null;
    this.potionTaken = false;

    // Köp-/sälj-punkt framför bardisken (där köpmannen står på andra sidan).
    this.shopPos = new THREE.Vector3(0, 1.0, -3.0);

    this.scene.add(new THREE.AmbientLight(0xffe6c0, 0.5));
    const lamp = new THREE.PointLight(0xffc070, 40, 22);
    lamp.position.set(0, 3.4, 0);
    this.scene.add(lamp);
    // Stämningsljus över disken
    const counterLamp = new THREE.PointLight(0xffd890, 14, 10);
    counterLamp.position.set(0, 2.8, -3.8);
    this.scene.add(counterLamp);

    const wood = new THREE.MeshLambertMaterial({ color: 0x8a6a45 });
    const darkWood = new THREE.MeshLambertMaterial({ color: 0x5a432a });
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x9a8468 });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), wood);
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);
    const ceiling = floor.clone();
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 4;
    this.scene.add(ceiling);

    const mkWall = (w, h, d, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      m.position.set(x, y, z);
      this.scene.add(m);
    };
    mkWall(0.3, 4, 13, -6.6, 2, 0);
    mkWall(0.3, 4, 13, 6.6, 2, 0);
    mkWall(13, 4, 0.3, 0, 2, -6.6);
    mkWall(13, 4, 0.3, 0, 2, 6.6);

    const door = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 2.8),
      new THREE.MeshLambertMaterial({ color: 0x3a2a1a })
    );
    door.position.set(0, 1.4, 6.43);
    door.rotation.y = Math.PI;
    this.scene.add(door);

    // --- stor bardisk längst bak ---
    const counter = new THREE.Mesh(new THREE.BoxGeometry(7.0, 1.1, 1.1), wood);
    counter.position.set(0, 0.55, -4.0);
    this.scene.add(counter);
    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(7.3, 0.14, 1.4), darkWood);
    counterTop.position.set(0, 1.12, -4.0);
    this.scene.add(counterTop);
    // Frontpanel-list för en barkänsla
    const trim = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.18, 0.06), darkWood);
    trim.position.set(0, 0.75, -3.45);
    this.scene.add(trim);
    // Disken spärrar – spelaren kan inte gå runt bakom köpmannen.
    this.colliders.push({ x: -2.2, z: -4.0, radius: 1.6 });
    this.colliders.push({ x: 0, z: -4.0, radius: 1.6 });
    this.colliders.push({ x: 2.2, z: -4.0, radius: 1.6 });

    // Hyllor bakom disken
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.12, 0.5), darkWood);
    shelf.position.set(0, 2.4, -6.2);
    this.scene.add(shelf);
    const shelf2 = shelf.clone();
    shelf2.position.y = 3.1;
    this.scene.add(shelf2);

    // Skylt över disken: handelns märke (samma glödande ring som herrgårdens skylt)
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.7, 0.12),
      new THREE.MeshLambertMaterial({ color: 0x5a4326 })
    );
    sign.position.set(0, 3.5, -6.3);
    this.scene.add(sign);
    const crest = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.05, 8, 20),
      new THREE.MeshBasicMaterial({ color: 0x66ddff })
    );
    crest.position.set(0, 3.5, -6.18);
    this.scene.add(crest);
    const signGlow = new THREE.PointLight(0x66ddff, 4, 6);
    signGlow.position.set(0, 3.5, -5.8);
    this.scene.add(signGlow);

    // --- prylar utlagda på bardisken ---
    this.buildWares(darkWood);

    // --- köpman bakom disken ---
    this.buildMerchant();
  }

  // Lite varor som ligger på disken: krukor, flaskor och en hög med mynt –
  // rent dekorativt men säljer in att det är en handelsbod.
  buildWares(darkWood) {
    // Två läkedrycker (röda flaskor) till vänster
    const healMat = new THREE.MeshLambertMaterial({
      color: 0xcc2233, emissive: 0x330006, transparent: true, opacity: 0.9
    });
    for (const dx of [-3.0, -2.5]) {
      const bottle = new THREE.Group();
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.28, 12), healMat);
      glass.position.y = 0.14;
      const cork = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.07, 8),
        new THREE.MeshLambertMaterial({ color: 0x6b4b2a })
      );
      cork.position.y = 0.32;
      bottle.add(glass, cork);
      bottle.position.set(dx, 1.19, -3.8);
      this.scene.add(bottle);
    }

    // Stärkande potion (glödande grön) – mittpunkt, lite upphöjd på ett fat
    this.strengthGlow = new THREE.PointLight(0x66ff88, 6, 4);
    this.strengthGlow.position.set(2.7, 1.6, -3.8);
    this.scene.add(this.strengthGlow);
    const strengthMat = new THREE.MeshLambertMaterial({
      color: 0x33dd66, emissive: 0x115522, transparent: true, opacity: 0.9
    });
    const sBottle = new THREE.Group();
    const sGlass = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), strengthMat);
    sGlass.position.y = 0.18;
    const sNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.16, 8), strengthMat);
    sNeck.position.y = 0.38;
    const sCork = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.07, 8),
      new THREE.MeshLambertMaterial({ color: 0x6b4b2a })
    );
    sCork.position.y = 0.48;
    sBottle.add(sGlass, sNeck, sCork);
    sBottle.position.set(2.7, 1.19, -3.8);
    this.scene.add(sBottle);
    this._strengthBottle = sBottle;

    // Myntstapel till höger – signalerar att man också kan sälja här
    const coinMat = new THREE.MeshLambertMaterial({ color: 0xe8c349, emissive: 0x3a2c00 });
    const coins = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 16), coinMat);
      coin.position.y = 0.02 + i * 0.035;
      coin.rotation.x = (Math.random() - 0.5) * 0.1;
      coins.add(coin);
    }
    coins.position.set(1.4, 1.19, -3.9);
    this.scene.add(coins);
  }

  // En enkel köpman bakom disken. Samma blockfigur-stil som NPC.buildMan, men
  // byggd lokalt så att scenen är fristående (köpmannen är ren rekvisita –
  // dialogen/handeln sköts av Game.js när spelaren interagerar vid shopPos).
  buildMerchant() {
    const robe = new THREE.MeshLambertMaterial({ color: 0x5a3a6a });
    const skin = new THREE.MeshLambertMaterial({ color: 0xf0c8a0 });
    const hair = new THREE.MeshLambertMaterial({ color: 0x444444 });

    const m = new THREE.Group();
    const legGeo = new THREE.BoxGeometry(0.25, 0.7, 0.25);
    const legL = new THREE.Mesh(legGeo, robe);
    legL.position.set(-0.18, 0.35, 0);
    const legR = legL.clone();
    legR.position.x = 0.18;

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.4), robe);
    torso.position.y = 1.05;

    const armGeo = new THREE.BoxGeometry(0.18, 0.6, 0.18);
    const armL = new THREE.Mesh(armGeo, robe);
    armL.position.set(-0.44, 1.1, 0);
    const armR = armL.clone();
    armR.position.x = 0.44;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), skin);
    head.position.y = 1.68;
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.29, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.2),
      hair
    );
    hairCap.position.y = 1.72;
    // Ögon på +Z-sidan – vänd hela figuren mot disken (mot +Z, dvs mot spelaren)
    const eyeGeo = new THREE.SphereGeometry(0.04, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.1, 1.71, 0.24);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.1;

    m.add(legL, legR, torso, armL, armR, head, hairCap, eyeL, eyeR);
    m.position.set(0, 0, -5.0); // bakom disken
    m.traverse(o => { if (o.isMesh) o.castShadow = true; });
    this.scene.add(m);
    this.merchant = m;
  }

  update(delta) {
    // Låt den stärkande potionen sväva och rotera så att den drar blicken.
    if (this._strengthBottle) {
      this._strengthBottle.rotation.y += delta * 0.8;
      this._strengthBottle.position.y = 1.19 + Math.sin(Date.now() * 0.003) * 0.04;
    }
    if (this.strengthGlow) {
      this.strengthGlow.intensity = 5 + Math.sin(Date.now() * 0.004) * 1.5;
    }
  }
}