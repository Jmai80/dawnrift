import * as THREE from 'three';

// Norra tornet – torninteriör i tre nivåer som det befintliga tornet, men med
// SWITCHBACK-trappor: en rad halvvåningar där varje ny trappa ligger BREDVID
// den förra (inte rakt fram), precis som ett klassiskt torntrapphus utan spiral.
//
// Teknik: det gamla tornet "rullar ut" våningarna längs z och har därför en
// groundFn som bara beror på z. En switchback har två trappor på SAMMA z-spann
// men på olika sidor i x, så här grenar groundFn på BÅDE z (vilken zon) och x
// (vilken sida trappan ligger). Tornet delas i en vänster- och högerhalva:
//
//   z-zon          vänster halva (x<0)      höger halva (x>0)
//   -------------------------------------------------------------
//   botten         golv y=0                 golv y=0
//   trappzon A     TRAPPA 0->8 (uppåt)      mellanvilplan y=8
//   mellanplan     golv y=8                 golv y=8
//   trappzon B     mellanvilplan y=8        TRAPPA 8->16 (uppåt)
//   toppen         golv y=16                golv y=16
//
// Spelaren går upp vänster trappa, vänder 180°, går upp höger trappa. Eftersom
// kollisions-cylindrarna är platta (x,z) gäller de bara på den våning de råkar
// ligga på, precis som i det ursprungliga tornet.
export class NorthTowerScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f14); // svalare blågrön natt (vs gamla tornets 0x0b0a12)

    this.colliders = [];
    // Schakt: bredd för två trapplaner (x ±6.5), djup för fram-golv + trappor +
    // bakre vändplatta (z 12 .. -16).
    this.bounds = { minX: -6.2, maxX: 6.2, minZ: -16.2, maxZ: 12.2 };
    this.cameraMaxY = 999;             // ingen kamerahöjdsklamp i tornet
    this.entryPos = { x: -3, z: 9.5 }; // spawn på vänster sida (vid trappa A:s fot)
    this.faceY = 0;                    // vänd inåt schaktet (-z) vid entré
    this.exitPos = new THREE.Vector3(-3, 0.9, 12);

    // nivåhöjder
    this.Y_GROUND = 0;
    this.Y_MEZZ = 8;
    this.Y_TOP = 16;

    // ÄKTA U-SVÄNG (180°), två fulla golv. Sett uppifrån (x vänster<->höger,
    // z fram(+, dörr)<->bak(-)). Mittvägg vid x=0 skiljer de två trapplanen
    // utom vid bakre vändplattan.
    //
    //   FRAM (z=12, dörr) ....................... BAK (z=-16)
    //   VÄNSTER (x<0):  bottengolv | TRAPPA A upp 0->8 (bakåt) --> vändplatta
    //   HÖGER  (x>0):   toppgolv   | TRAPPA B upp 8->16 (framåt) <- vändplatta
    //
    // Trappa A och B ligger SIDA VID SIDA i x men klättrar åt MOTSATT håll i z
    // – det är just det som gör det till en U-sväng. Vändplattan längst bak
    // (full bredd, y=8) binder ihop A:s topp (bak-vänster) med B:s fot (bak-höger).
    // Varje (x,z) har exakt EN höjd, inga hål:
    //   z>=2  : vänster=botten(0), höger=topp(16)
    //   -12<=z<2 : vänster=trappa A (0->8), höger=trappa B (16->8)
    //   z<-12 : vändplatta, full bredd (y=8)
    this.Z_STAIR_FRONT = 2;    // trappornas främre ände
    this.Z_STAIR_BACK = -12;   // trappornas bakre ände
    this.Z_LANDING_BACK = -16; // vändplattans bakkant

    this.groundFn = (x, z) => {
      const L = x < 0;

      // Främre golv: vänster = botten (0), höger = topp (16)
      if (z >= this.Z_STAIR_FRONT) return L ? this.Y_GROUND : this.Y_TOP;

      // Trappzon: A (vänster) klättrar 0->8 bakåt; B (höger) är 16 fram -> 8 bak
      if (z >= this.Z_STAIR_BACK) {
        const t = (this.Z_STAIR_FRONT - z) / (this.Z_STAIR_FRONT - this.Z_STAIR_BACK); // 0..1 fram->bak
        if (L) return this.Y_GROUND + t * (this.Y_MEZZ - this.Y_GROUND);  // 0 -> 8
        return this.Y_TOP - t * (this.Y_TOP - this.Y_MEZZ);               // 16 -> 8
      }

      // Vändplatta längst bak: full bredd på mellanhöjd (y=8)
      return this.Y_MEZZ;
    };

    // gränssnitt som Game.js förväntar sig (inga föremål än)
    this.book = null;
    this.bookPos = null;
    this.bookText = '';
    this.potion = null;
    this.potionPos = null;
    this.potionTaken = false;

    this._spin = []; // dekorationer som roterar i update()
    this._build();
  }

  // ---- bygghjälpare -------------------------------------------------------

  _platform(mat, xCenter, zCenter, width, depth, topY) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(width, 0.5, depth), mat);
    slab.position.set(xCenter, topY - 0.25, zCenter);
    slab.receiveShadow = true;
    this.scene.add(slab);
  }

  // Trappa längs z på en bestämd x-sida. Fungerar i båda riktningarna:
  // (zA, yA) är nedre änden och (zB, yB) den övre; zA/zB får vara i valfri ordning.
  _stairs(mat, xCenter, width, zA, zB, yA, yB) {
    const n = 14;
    for (let i = 0; i < n; i++) {
      const f0 = i / n, f1 = (i + 1) / n;
      const zLo = zA + (zB - zA) * f0;
      const zHi = zA + (zB - zA) * f1;
      const yTop = yA + (yB - yA) * f1;
      const yBot = yA + (yB - yA) * f0;
      const zc = (zLo + zHi) / 2;
      const depth = Math.abs(zHi - zLo);
      const h = Math.abs(yTop - yBot);
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(width, h + 0.08, depth + 0.04), mat
      );
      // stegets ovansida ska ligga vid den högre av yTop/yBot
      const stepTop = Math.max(yTop, yBot);
      step.position.set(xCenter, stepTop - (h + 0.08) / 2, zc);
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

  // --- dekorationer (nya typer: glimrande kristall, ljusstake, glödklot) ----

  // Svävande, långsamt roterande kristall med inre ljus.
  _crystal(x, y, z, color = 0x66ffd8) {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 });
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 6), mat);
    top.position.y = 0.55;
    const bot = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 6), mat);
    bot.position.y = 0.1; bot.rotation.x = Math.PI;
    g.add(top, bot);
    g.position.set(x, y + 1.1, z);
    this.scene.add(g);
    const light = new THREE.PointLight(color, 14, 9);
    light.position.set(x, y + 1.4, z);
    this.scene.add(light);
    this._spin.push({ obj: g, baseY: y + 1.1, speed: 0.8, bob: 0.12 });
    this.colliders.push({ x, z, radius: 0.5 });
  }

  // Ljusstake: smal pelare med en liten låga (glödande sfär) överst.
  _candleStand(x, y, z, color = 0xffd27a) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.09, 1.4, 8),
      new THREE.MeshLambertMaterial({ color: 0x2a241c })
    );
    post.position.set(x, y + 0.7, z);
    post.castShadow = true;
    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 10, 8),
      new THREE.MeshBasicMaterial({ color })
    );
    flame.position.set(x, y + 1.5, z);
    this.scene.add(post, flame);
    const light = new THREE.PointLight(color, 10, 7);
    light.position.set(x, y + 1.55, z);
    this.scene.add(light);
    this._flames = this._flames || [];
    this._flames.push(light);
    this.colliders.push({ x, z, radius: 0.35 });
  }

  // Klunga av små glödande klot som svävar och roterar runt en mittpunkt.
  _orbCluster(x, y, z, color = 0xaa88ff) {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const r = 0.45;
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.08 + (i % 2) * 0.03, 10, 8), mat);
      orb.position.set(Math.cos(a) * r, Math.sin(a * 1.5) * 0.2, Math.sin(a) * r);
      g.add(orb);
    }
    g.position.set(x, y + 1.3, z);
    this.scene.add(g);
    const light = new THREE.PointLight(color, 8, 8);
    light.position.set(x, y + 1.3, z);
    this.scene.add(light);
    this._spin.push({ obj: g, baseY: y + 1.3, speed: -0.6, bob: 0.18 });
  }

  // ---- scenuppbyggnad -----------------------------------------------------

  _build() {
    // Egen färgpalett – svalare och grönare än det gamla tornet.
    const stoneWall = new THREE.MeshLambertMaterial({ color: 0x3a4a48 });
    const stoneStep = new THREE.MeshLambertMaterial({ color: 0x5c6a64 });
    const floorMat  = new THREE.MeshLambertMaterial({ color: 0x46504a });

    // ljus
    this.scene.add(new THREE.AmbientLight(0xa0c0b8, 0.4));
    const entranceLight = new THREE.PointLight(0x9fd8c4, 9, 16);
    entranceLight.position.set(0, 3.2, 9);
    this.scene.add(entranceLight);

    // ytterväggar runt schaktet (z 12 -> -16, x -6 .. 6)
    const H = 24, midZ = -2, lenZ = 29;
    this._wall(stoneWall, 0.4, H, lenZ, -6.1, H / 2, midZ);  // vänster
    this._wall(stoneWall, 0.4, H, lenZ, 6.1, H / 2, midZ);   // höger
    this._wall(stoneWall, 12.6, H, 0.4, 0, H / 2, -16.2);    // bortre vägg
    this._wall(stoneWall, 12.6, H, 0.4, 0, H / 2, 12.2);     // främre vägg (dörr)
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(12.6, lenZ), stoneWall);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, H, midZ);
    this.scene.add(ceil);

    // inre dörr (synlig) på främre väggen, vänd inåt – på vänster sida (spawn)
    const doorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 2.4),
      new THREE.MeshLambertMaterial({ color: 0x1c241f })
    );
    doorMesh.position.set(-3, 1.2, 12.0);
    doorMesh.rotation.y = Math.PI;
    this.scene.add(doorMesh);

    const F = this.Z_STAIR_FRONT;   // 2
    const B = this.Z_STAIR_BACK;    // -12
    const Lb = this.Z_LANDING_BACK; // -16
    const halfW = 5.8;              // golvbredd per lan (~ -6..0 resp 0..6)

    // === FRÄMRE GOLV (z 2..12) ===
    // VÄNSTER = bottenplan (y=0); HÖGER = toppgolv (y=16).
    this._platform(floorMat, -3.0, (F + 12) / 2, halfW, 12 - F, this.Y_GROUND);
    this._platform(floorMat,  3.0, (F + 12) / 2, halfW, 12 - F, this.Y_TOP);
    // dekoration: botten-entré (vänster) + topp (höger)
    this._orbCluster(-3.5, this.Y_GROUND, 9.0, 0xaa88ff);
    this._candleStand(-1.2, this.Y_GROUND, 10.5, 0xffd27a);
    this._crystal(3.4, this.Y_TOP, 8.5, 0x88ffff);
    this._candleStand(2.0, this.Y_TOP, 10.5, 0xffe0a0);

    // === TRAPPOR (z F..B), sida vid sida, motsatt riktning ===
    // TRAPPA A (vänster): fot vid z=F (y=0), topp vid z=B (y=8) — klättrar bakåt.
    this._stairs(stoneStep, -3.0, halfW, F, B, this.Y_GROUND, this.Y_MEZZ);
    // TRAPPA B (höger): topp vid z=F (y=16), fot vid z=B (y=8) — klättrar framåt.
    this._stairs(stoneStep, 3.0, halfW, F, B, this.Y_TOP, this.Y_MEZZ);

    // Mittvägg vid x=0 som skiljer vänster lan (botten + trappa A) från höger
    // lan (toppgolv + trappa B) längs HELA längden fram till vändplattan.
    // Detta hindrar att man från entrén (fram-vänster, y=0) kan kliva rakt in i
    // toppgolvet (fram-höger, y=16) – den enda vägen upp är via trappa B från
    // vändplattan längst bak. Väggen slutar vid vändplattans framkant (z=B) så
    // att 180°-vändningen där bak är öppen.
    const wallZc = (12 + B) / 2;     // mitt mellan främre väggen (12) och z=B
    const wallLen = 12 - B;          // täcker både främre golvet och trappzonen
    this._wall(stoneWall, 0.3, H, wallLen, 0, H / 2, wallZc);
    // Kollisions-spärr längs mittväggen (tornet använder punkt-colliders, så
    // den synliga väggen räcker inte för fysiken). Tät rad från fram till z=B.
    for (let z = 11; z >= B; z -= 1.2) {
      this.colliders.push({ x: 0, z, radius: 0.7 });
    }

    // === VÄNDPLATTA (z B..Lb), full bredd, y=8 ===
    // Här kommer man upp för trappa A (bak-vänster) och vänder 180° in i
    // trappa B:s fot (bak-höger).
    this._platform(floorMat, 0, (B + Lb) / 2, 12, (B - Lb), this.Y_MEZZ);
    this._crystal(-3.6, this.Y_MEZZ, -14.5, 0x66ffd8);
    this._orbCluster(3.4, this.Y_MEZZ, -14.5, 0xff99cc);
    this._candleStand(0.0, this.Y_MEZZ, -13.0, 0xffd27a);
  }

  update(delta) {
    const t = Date.now() * 0.001;
    for (const s of this._spin) {
      s.obj.rotation.y += delta * s.speed;
      s.obj.position.y = s.baseY + Math.sin(t * 1.4 + s.baseY) * s.bob;
    }
    if (this._flames) {
      for (const f of this._flames) {
        f.intensity = 9 + Math.sin(t * 8 + f.position.x) * 2.5; // flackande låga
      }
    }
  }
}