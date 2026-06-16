import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────
// SYMBOLRUMMET – minnes-/symbolpussel kopplat till den mystiska symbolen
// ("en cirkel genomborrad av tre streck").
//
// Fyra glödande symbolplattor i golvet. Pusslet spelar upp en SEKVENS (plattor
// lyser en i taget), och spelaren ska sedan KLIVA på plattorna i samma ordning.
// Klarar man en runda blir nästa sekvens längre. Efter att ha klarat
// TARGET_ROUNDS i följd öppnas altaret och en dyrgrip (Symbolens nyckel) dyker
// upp. Kliver man fel börjar sekvensen om från runda 1.
//
// Gränssnittet matchar HouseScene (Game.js kontrollerar dessa):
//   scene, colliders, bounds, entryPos, faceY, exitPos, update(delta, playerPos)
//   book/bookPos/potion/potionPos = null
// …plus, för Game.js-koppling:
//   solved (bool), reward { taken, position, group }, restoreSolved()
//   onSolvedOnce (callback som Game.js sätter – körs när pusslet just lösts)
//   onProgress (callback för meddelanden: (type, payload))
//
// Allt minnesspel-state sköts HÄR; Game.js behöver bara läsa solved/reward.

const TARGET_ROUNDS = 3;       // antal rundor i rad för att lösa pusslet
const PAD_COLORS = [0x66ffd8, 0xffd24a, 0xff5a6a, 0x5a8aff]; // 4 plattors grundfärg

export class SymbolPuzzleHouseScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080b10);

    this.colliders = [];
    this.bounds = { minX: -8.4, maxX: 8.4, minZ: -12.4, maxZ: 7.4 };
    this.entryPos = { x: 0, z: 5.5 };
    this.faceY = 0;                 // titta in i rummet (-z)
    this.exitPos = new THREE.Vector3(0, 0.9, 6.5);
    this.cameraMaxY = 16;
    this.cameraOffset = { x: 0, y: 9, z: 10 }; // svagt ovanifrån så plattorna syns
    this.groundFn = () => 0;        // platt golv
    this.book = null; this.bookPos = null;
    this.potion = null; this.potionPos = null; this.potionTaken = false;

    // Pussel-state
    this.solved = false;
    this.round = 0;                 // klarade rundor
    this.sequence = [];             // index 0..3 i visningsordning
    this.inputIndex = 0;            // hur långt spelaren kommit i inmatningen
    this.phase = 'idle';            // 'idle' | 'showing' | 'input' | 'win' | 'fail'
    this._showTimer = 0;
    this._showStep = -1;            // vilken platta som lyser just nu under 'showing'
    this._litPad = -1;             // platta som blinkar
    this._padCooldown = 0;          // hindrar dubbelregistrering när man står kvar
    this._lastStandPad = -1;
    this._flashTimer = 0;           // nedräkning för input-blink
    this._t = 0;

    this.reward = null;
    this.onSolvedOnce = null;       // sätts av Game.js
    this.onProgress = null;         // sätts av Game.js (meddelanden)

    this.pads = [];                 // { mesh, glowMat, light, baseColor, cx, cz }
    this._build();
  }

  // Plattornas världspositioner: fyra plattor i en kvadrat mitt i rummet.
  _padPositions() {
    return [
      { x: -3, z: -3 }, // 0
      { x:  3, z: -3 }, // 1
      { x: -3, z: -8 }, // 2
      { x:  3, z: -8 }, // 3
    ];
  }

  _build() {
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x2a3038 });
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x3a4048 });

    // golv
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 20), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -2.5);
    floor.receiveShadow = true;
    this.scene.add(floor);

    // väggar + tak
    const H = 8;
    const mkWall = (w, d, x, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, H, d), wallMat);
      m.position.set(x, H / 2, z);
      m.receiveShadow = true;
      this.scene.add(m);
    };
    mkWall(0.4, 20, -8.6, -2.5);   // vänster
    mkWall(0.4, 20,  8.6, -2.5);   // höger
    mkWall(18, 0.4, 0, -12.6);     // bortre
    mkWall(18, 0.4, 0, 6.6);       // främre (dörr)
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(18, 20), wallMat);
    ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, -2.5);
    this.scene.add(ceil);

    // väggkollision (tät rad, lämna lucka vid dörren x≈0)
    this._wallLine(-8.0, -12.0, -8.0, 6.0);
    this._wallLine( 8.0, -12.0,  8.0, 6.0);
    this._wallLine(-8.0, -12.0,  8.0, -12.0);
    this._wallLine(-8.0, 6.0, -1.1, 6.0);
    this._wallLine( 1.1, 6.0,  8.0, 6.0);

    // svag rumsbelysning
    this.scene.add(new THREE.AmbientLight(0x8090a0, 0.35));
    const lamp = new THREE.PointLight(0xaab4c8, 8, 22);
    lamp.position.set(0, 6.5, -2);
    this.scene.add(lamp);

    // dörr (synlig)
    const door = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 2.6),
      new THREE.MeshLambertMaterial({ color: 0x1a1410 })
    );
    door.position.set(0, 1.3, 6.4);
    door.rotation.y = Math.PI;
    this.scene.add(door);

    // De fyra symbolplattorna
    const positions = this._padPositions();
    positions.forEach((p, i) => {
      const baseColor = PAD_COLORS[i];
      // Själva plattan byter färg dramatiskt: mörk när släckt, full färg när
      // tänd. Vi använder MeshBasicMaterial så den lyser oberoende av rumsljus
      // (emissiv känsla) och kan gå hela vägen från nästan svart till klarfärg.
      const padMat = new THREE.MeshBasicMaterial({ color: 0x1a1f26 });
      const pad = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.35, 3.2), padMat);
      pad.position.set(p.x, 0.18, p.z);
      this.scene.add(pad);

      // symbolen ovanpå plattan (kontrastram så den syns mot plattan)
      const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
      const symbol = this._symbolMesh(glowMat);
      symbol.position.set(p.x, 0.38, p.z);
      symbol.rotation.x = -Math.PI / 2;
      this.scene.add(symbol);

      const light = new THREE.PointLight(baseColor, 0, 9);
      light.position.set(p.x, 1.4, p.z);
      this.scene.add(light);

      // förberäknade färger för släckt/tänt läge
      const darkCol = new THREE.Color(0x1a1f26);
      const brightCol = new THREE.Color(baseColor);

      this.pads.push({
        mesh: symbol, padMesh: pad, padMat, glowMat, light,
        baseColor, darkCol, brightCol, cx: p.x, cz: p.z
      });
    });

    // Altare längst bort – öppnas (lyser upp) när pusslet är löst, då dyrgripen syns.
    const altar = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.2, 1.4),
      new THREE.MeshLambertMaterial({ color: 0x4a4038 })
    );
    altar.position.set(0, 0.6, -11.4);
    altar.castShadow = true; altar.receiveShadow = true;
    this.scene.add(altar);
    this._altarSymbol = this._symbolMesh(
      new THREE.MeshBasicMaterial({ color: 0x6a6a6a, transparent: true, opacity: 0.5 })
    );
    this._altarSymbol.position.set(0, 1.25, -11.4);
    this._altarSymbol.rotation.x = -Math.PI / 3;
    this.scene.add(this._altarSymbol);

    // instruktionsstod nära ingången
    const sign = new THREE.PointLight(0xffe0a0, 3, 8);
    sign.position.set(0, 2.5, 4);
    this.scene.add(sign);
  }

  // Bygger symbolen "cirkel genomborrad av tre streck" som en plan grupp.
  _symbolMesh(mat) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.12, 10, 28), mat);
    g.add(ring);
    for (let i = 0; i < 3; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 2.6), mat);
      bar.rotation.y = (i - 1) * 0.5; // tre streck som korsar ringen
      g.add(bar);
    }
    return g;
  }

  _wallLine(ax, az, bx, bz, radius = 0.6, spacing = 0.6) {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.ceil(len / spacing));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      this.colliders.push({ x: ax + (bx - ax) * t, z: az + (bz - az) * t, radius });
    }
  }

  // Game.js anropar denna för att starta/starta om pusslet (t.ex. via E vid en
  // startplatta) – men vi startar också automatiskt när spelaren kliver in.
  startPuzzle() {
    // Omspelbart: körs även efter att pusslet redan är löst. Belöningen ges
    // dock bara första gången (se _win). Nollställ alltid till en ny frö-sekvens.
    this.round = 0;
    // Frö-sekvens: två slumpade färger. Varje följande runda LÄGGER TILL en ny
    // färg sist, så sekvensen växer kumulativt (2 -> 3 -> 4) precis som Simon.
    this.sequence = [
      Math.floor(Math.random() * 4),
      Math.floor(Math.random() * 4)
    ];
    this._beginRound();
  }

  _beginRound() {
    // round 0 = visa frö-sekvensen (längd 2). Varje senare runda har redan fått
    // en ny färg tillagd i _advanceRound() innan denna körs.
    this.inputIndex = 0;
    this.phase = 'showing';
    this._showStep = 0;
    this._showTimer = 0.6; // kort paus innan första blinket
    this._litPad = -1;
    if (this.onProgress) this.onProgress('show', { round: this.round + 1, total: TARGET_ROUNDS });
  }

  // Klarade en runda: lägg till en ny slumpad färg och visa den växande sekvensen.
  _advanceRound() {
    this.round++;
    this.sequence.push(Math.floor(Math.random() * 4));
    this._beginRound();
  }

  // Anropas av Game.js varje frame med spelarens position.
  update(delta, playerPos) {
    this._t += delta;

    // Plattans färg sätts DIREKT (ingen mjuk interpolering som kan släpa efter):
    // tänd platta = full klarfärg, släckt = nästan svart. MeshBasicMaterial är
    // obelyst så färgen syns exakt som satt, oavsett rumsljus.
    for (let i = 0; i < this.pads.length; i++) {
      const pad = this.pads[i];
      const lit = (i === this._litPad);
      pad.padMat.color.copy(lit ? pad.brightCol : pad.darkCol);
      pad.glowMat.opacity = lit ? 1.0 : 0.3;
      pad.light.intensity = lit ? 34 : 0;
      pad.mesh.rotation.z += delta * (lit ? 2.4 : 0.1);
      const sc = lit ? 1.3 : 1.0;
      pad.mesh.scale.x += (sc - pad.mesh.scale.x) * Math.min(1, delta * 20);
      pad.mesh.scale.y += (sc - pad.mesh.scale.y) * Math.min(1, delta * 20);
    }

    // räkna ner en pågående input-blink (ersätter den gamla setTimeout-baserade)
    if (this._flashTimer > 0) {
      this._flashTimer -= delta;
      if (this._flashTimer <= 0 && this.phase === 'input') this._litPad = -1;
    }

    if (this.solved) {
      if (this.reward && !this.reward.taken) {
        this.reward.group.rotation.y += delta * 0.9;
        this.reward.group.position.y = 1.7 + Math.sin(this._t * 1.6) * 0.08;
      }
      return;
    }

    if (this._padCooldown > 0) this._padCooldown -= delta;

    if (this.phase === 'showing') {
      this._showTimer -= delta;
      if (this._showTimer <= 0) {
        if (this._litPad === -1) {
          // tänd nästa platta i sekvensen
          if (this._showStep < this.sequence.length) {
            this._litPad = this.sequence[this._showStep];
            this._showTimer = 0.65; // hur länge plattan lyser
          } else {
            // klar med uppvisning -> spelarens tur
            this.phase = 'input';
            this.inputIndex = 0;
            this._litPad = -1;
            if (this.onProgress) this.onProgress('input', { round: this.round + 1, total: TARGET_ROUNDS });
          }
        } else {
          // släck och gå till nästa steg
          this._litPad = -1;
          this._showStep++;
          this._showTimer = 0.35; // paus mellan blinkar
        }
      }
      return;
    }

    if (this.phase === 'input') {
      const padIdx = this._standingOnPad(playerPos);
      // registrera bara när man kliver på en NY platta (inte står kvar)
      if (padIdx !== -1 && padIdx !== this._lastStandPad && this._padCooldown <= 0) {
        this._lastStandPad = padIdx;
        this._padCooldown = 0.25;
        this._flashPad(padIdx);
        if (padIdx === this.sequence[this.inputIndex]) {
          this.inputIndex++;
          if (this.inputIndex >= this.sequence.length) {
            // Hela den nuvarande sekvensen klarad korrekt.
            // Slutmål: sekvenslängd = 2 + (TARGET_ROUNDS-1) (dvs 2 -> 3 -> 4).
            const finalLen = 2 + (TARGET_ROUNDS - 1);
            if (this.sequence.length >= finalLen) {
              this._win();
            } else {
              if (this.onProgress) this.onProgress('round_ok', { round: this.round + 1, total: TARGET_ROUNDS });
              // Lägg till en ny färg och visa den växande sekvensen igen.
              this._advanceRound();
            }
          }
        } else {
          // Fel platta -> börja om från en NY frö-sekvens (två färger).
          if (this.onProgress) this.onProgress('fail', {});
          this.round = 0;
          this.sequence = [
            Math.floor(Math.random() * 4),
            Math.floor(Math.random() * 4)
          ];
          this.phase = 'showing';
          this._showStep = 0;
          this._showTimer = 1.0;
          this._litPad = -1;
          this.inputIndex = 0;
        }
      } else if (padIdx === -1) {
        this._lastStandPad = -1; // lämnade plattan -> kan kliva på nästa
      }
      return;
    }
  }

  _flashPad(i) {
    this._litPad = i;
    this._flashTimer = 0.3; // räknas ner i update(); släcker plattan sen
  }

  _standingOnPad(playerPos) {
    for (let i = 0; i < this.pads.length; i++) {
      const p = this.pads[i];
      if (Math.abs(playerPos.x - p.cx) < 1.6 && Math.abs(playerPos.z - p.cz) < 1.6) return i;
    }
    return -1;
  }

  _win() {
    const firstTime = !this.solved;
    this.solved = true;
    this.phase = 'win';
    this._litPad = -1;
    // altaret "öppnas": symbolen lyser gyllene
    if (this._altarSymbol) {
      this._altarSymbol.children.forEach(c => {
        c.material = new THREE.MeshBasicMaterial({ color: 0xffd24a });
      });
    }
    // Belöningen ges BARA första gången pusslet löses. Vid omspel firar vi bara.
    if (firstTime) {
      this._spawnReward();
      if (this.onSolvedOnce) this.onSolvedOnce();
    }
    if (this.onProgress) this.onProgress('win', { replay: !firstTime });
  }

  _spawnReward() {
    if (this.reward) return;
    const group = new THREE.Group();
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.5, 0),
      new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.95 })
    );
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.06, 8, 22),
      new THREE.MeshBasicMaterial({ color: 0xffd24a })
    );
    halo.rotation.x = Math.PI / 2;
    group.add(gem, halo);
    group.position.set(0, 1.7, -11.4);
    this.scene.add(group);
    const light = new THREE.PointLight(0xffd24a, 16, 12);
    light.position.set(0, 2.0, -11.4);
    this.scene.add(light);
    this.reward = { taken: false, group, position: new THREE.Vector3(0, 1.7, -11.4) };
  }

  // Återställ löst läge vid laddning (utan att spela om).
  restoreSolved(rewardTaken) {
    this.solved = true;
    this.phase = 'win';
    if (this._altarSymbol) {
      this._altarSymbol.children.forEach(c => {
        c.material = new THREE.MeshBasicMaterial({ color: 0xffd24a });
      });
    }
    if (!rewardTaken) this._spawnReward();
    else this.reward = { taken: true, group: null, position: new THREE.Vector3(0, 1.7, -11.4) };
  }

  // Nollställ till väntläge (anropas när spelaren lämnar olöst).
  abortToIdle() {
    if (this.solved) return;
    this.phase = 'idle';
    this.round = 0;
    this.sequence = [];
    this.inputIndex = 0;
    this._litPad = -1;
    this._lastStandPad = -1;
  }

  isSolved() { return this.solved; }
}