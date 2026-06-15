import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────
// PUSSELRUMMET – Sokoban-inspirerat lådpussel.
//
// Gränssnittet matchar HouseScene/RangeShopScene:
//   scene, colliders, bounds, exitPos, update, book=null, potion=null
// …plus:
//   pushBoxAt(playerPos, playerDir)  – anropas av Game.js (E-tangent)
//   isSolved()                       – Game.js kollar efter varje push
//   reward (pickup-objekt)           – visas när pusslet är klart
//
// GRID (cell = 2 world units)
// Koordinaternas origo i scenen: x=[−13,13], z=[0,−22]
// Söder (z+) är ingången; norr (z−) är pusslets djup.
//
// Karta (rad 0 = z=0, kolumn 0 = x=−13):
//   # = vägg, . = golv, B = låda, X = lådmål, @ = spelarstart
//
// Layouten är genererad baklänges (drar lådor från löst läge) och därefter
// verifierad framåt med en BFS-lösare: garanterat lösbar, lösningsdjup ~21
// push-lager. 4 lådor, 4 mål. Två par inre väggblock tvingar fram omvägar.
const MAP = [
  '##############',
  '#............#',
  '#............#',
  '#...##..##...#',
  '#..X......X..#',
  '#.........B..#',
  '#...##..##...#',
  '#.B...@......#',
  '#..B...B.....#',
  '#...X....X...#',
  '#............#',
  '##############',
];

const CELL = 2;          // en cell = 2 world units
const COLS = 14;
const ROWS = 12;
const OX   = -13;        // x-offset: kolumn 0 → world x = −13
const OZ   =  0;         // z-offset: rad 0 → world z = 0

// Centrumet för en cell (kolumn c, rad r) i world-space
function cx(c) { return OX + c * CELL + CELL / 2; }
function cz(r) { return OZ - r * CELL - CELL / 2; }

export class PuzzleHouseScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d0a06);

    // Samma gränssnitt som HouseScene (Game.js kontrollerar dessa)
    this.colliders = [];
    this.bounds = { minX: OX + 0.5, maxX: OX + COLS * CELL - 0.5, minZ: OZ - ROWS * CELL + 0.5, maxZ: OZ - 0.5 };
    // Spelaren spawnar på '@'-cellen i kartan (rad 7, kol 6) – en öppen, central
    // ruta inne i rummet (inte intryckt mot västväggen bredvid en låda).
    this.entryPos = { x: cx(6), z: cz(7) };   // (0, -15)
    this.faceY = 0;                            // titta in i rummet (mot norr, -z)
    // Utgången är en nåbar golvruta nära södra änden (rad 1), inte i sydväggen.
    // y = spelarens höjd så att triggern blir horisontell (~1 enhets radie).
    this.exitPos = new THREE.Vector3(cx(6), 0.9, cz(1));  // (0, -3)
    // Hög, tillbakadragen ovanifrån-vy: kameran ligger klart över väggarna
    // (4 höga) så den aldrig hamnar inuti dem, och hela rutnätet syns tydligt
    // så man ser var man puttar.
    this.cameraMaxY = 17;
    this.cameraOffset = { x: 0, y: 13, z: 11 };
    this.book    = null;
    this.bookPos = null;
    this.potion  = null;
    this.potionPos = null;
    this.potionTaken = false;

    // Spelstate
    this.boxes  = [];   // { col, row, mesh, colliderIdx }
    this.goals  = [];   // { col, row }
    this.solved = false;
    this.reward = null; // skapas när pusslet klaras

    // Belysning
    this.scene.add(new THREE.AmbientLight(0xfff0d8, 0.45));
    const ceiling = new THREE.PointLight(0xffe8b0, 30, 30);
    ceiling.position.set(0, 3.5, -11);
    this.scene.add(ceiling);

    // Material
    const brickMat  = new THREE.MeshLambertMaterial({ color: 0x8a5a3a });
    const floorMat  = new THREE.MeshLambertMaterial({ color: 0x5a4a36 });
    const ceilMat   = new THREE.MeshLambertMaterial({ color: 0x3a2e22 });
    this.wallMat    = brickMat;
    this.floorMat   = floorMat;

    // Bygg geometrin ur kartan
    this._buildFromMap(brickMat, floorMat, ceilMat);

    // Utgångsdörr (visuell, södra väggen) + glödande utgångsplatta vid exitPos
    const doorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 2.8),
      new THREE.MeshLambertMaterial({ color: 0x2a1e0e })
    );
    doorMesh.position.set(cx(6), 1.4, OZ - 0.12);
    doorMesh.rotation.y = Math.PI;
    this.scene.add(doorMesh);

    // Utgångsplatta – en blå glödande ring på golvet som visar var man lämnar.
    const exitPad = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.85, 24),
      new THREE.MeshBasicMaterial({ color: 0x44aaff, side: THREE.DoubleSide })
    );
    exitPad.rotation.x = -Math.PI / 2;
    exitPad.position.set(this.exitPos.x, 0.03, this.exitPos.z);
    this.scene.add(exitPad);
    const exitLight = new THREE.PointLight(0x44aaff, 6, 6);
    exitLight.position.set(this.exitPos.x, 1.2, this.exitPos.z);
    this.scene.add(exitLight);

    // Återställningsplatta – orange ring nära spelarens start. Står man på den
    // och trycker E återställs alla lådor till sina startrutor (för den som
    // puttat in en låda i en återvändsgränd, t.ex. mot en vägg).
    this.resetPos = new THREE.Vector3(cx(7), 0.9, cz(7));  // (2, -15), nära entrén
    const resetPad = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.78, 24),
      new THREE.MeshBasicMaterial({ color: 0xffa030, side: THREE.DoubleSide })
    );
    resetPad.rotation.x = -Math.PI / 2;
    resetPad.position.set(this.resetPos.x, 0.03, this.resetPos.z);
    this.scene.add(resetPad);
    const resetLight = new THREE.PointLight(0xffa030, 5, 5);
    resetLight.position.set(this.resetPos.x, 1.0, this.resetPos.z);
    this.scene.add(resetLight);

    // Fakkel-ljus längs korriorerna
    this._addTorches();

    // Pulsande mål-markörer byggs i _buildFromMap; spara dem för animation
    this._goalMeshes = [];
    this._buildGoalMarkers();
  }

  _buildFromMap(brickMat, floorMat, ceilMat) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const ch = MAP[r][c];
        const wx = cx(c), wz = cz(r);

        if (ch === '#') {
          // Väggblock
          const wall = new THREE.Mesh(new THREE.BoxGeometry(CELL, 4, CELL), brickMat);
          wall.position.set(wx, 2, wz);
          wall.castShadow = true;
          this.scene.add(wall);
          // Kollider i mitten på cellen
          this.colliders.push({ x: wx, z: wz, radius: 1.05 });
        } else {
          // Golv
          const floor = new THREE.Mesh(new THREE.PlaneGeometry(CELL, CELL), floorMat);
          floor.rotation.x = -Math.PI / 2;
          floor.position.set(wx, 0, wz);
          this.scene.add(floor);
          // (Inget innertak: kameran ligger högt och ett tak skulle skymma sikten.
          //  Husets yttertak syns ändå utifrån.)

          if (ch === 'B') {
            this._spawnBox(c, r);
          }
          if (ch === 'X') {
            this.goals.push({ col: c, row: r });
          }
        }
      }
    }
  }

  _spawnBox(col, row) {
    const boxMat = new THREE.MeshLambertMaterial({ color: 0x5a8ac8 });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x3a5a88 });
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.55, 1.55), boxMat);
    body.position.y = 0.78;
    // Kanter/spröjs
    for (const [ex, ez] of [[-0.79, 0], [0.79, 0], [0, -0.79], [0, 0.79]]) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 0.08), darkMat);
      edge.position.set(ex, 0.78, ez);
      g.add(edge);
    }
    const arrow = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.06), darkMat);
    arrow.position.set(0, 1.2, -0.79);
    g.add(body, arrow);
    g.position.set(cx(col), 0, cz(row));
    this.scene.add(g);

    const idx = this.colliders.length;
    this.colliders.push({ x: cx(col), z: cz(row), radius: 0.85 });
    // body sparas för att kunna färga om lådan (grön på mål, blå annars).
    this.boxes.push({ col, row, mesh: g, body, colliderIdx: idx, startCol: col, startRow: row });
  }

  _buildGoalMarkers() {
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x44ff88 });
    for (const goal of this.goals) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.07, 8, 24), glowMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(cx(goal.col), 0.04, cz(goal.row));
      this.scene.add(ring);
      this._goalMeshes.push(ring);

      const pt = new THREE.PointLight(0x44ff88, 4, 4);
      pt.position.set(cx(goal.col), 0.5, cz(goal.row));
      this.scene.add(pt);
      goal.light = pt;
    }
  }

  _addTorches() {
    const positions = [
      [2, 2], [11, 2], [2, 6], [11, 6], [5, 5], [8, 5],
      [2, 8], [11, 8], [5, 9], [2, 10], [11, 10]
    ];
    for (const [c, r] of positions) {
      if (MAP[r]?.[c] === '#') continue; // sätt ej i väggar
      const pt = new THREE.PointLight(0xff8830, 12, 10);
      pt.position.set(cx(c), 3.2, cz(r));
      this.scene.add(pt);
    }
  }

  // Returnerar vilken box (om någon) som finns i cell (col, row)
  _boxAt(col, row) {
    return this.boxes.find(b => b.col === col && b.row === row && !b.removed) ?? null;
  }

  // Är cell (col, row) ett golv (inte vägg, inte utanför kartan)?
  _isFloor(col, row) {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
    const ch = MAP[row][col];
    return ch !== '#';
  }

  // Är cell (col, row) fri att flytta in i (golv och ingen låda)?
  _isFree(col, row) {
    return this._isFloor(col, row) && !this._boxAt(col, row);
  }

  // Pussellösaren: prova att trycka en låda i riktningen (dc, dr).
  // Anropas av Game.js när spelaren trycker E nära en låda.
  tryPush(playerPos) {
    if (this.solved) return false;

    // Räkna ut spelarens cell
    const pCol = Math.round((playerPos.x - OX) / CELL - 0.5);
    const pRow = Math.round((OZ - playerPos.z) / CELL - 0.5);

    // Hitta närmaste låda inom en cells räckvidd
    let closest = null, closestDist = Infinity;
    for (const box of this.boxes) {
      if (box.removed) continue;
      const dc = box.col - pCol, dr = box.row - pRow;
      const dist = Math.abs(dc) + Math.abs(dr);
      if (dist === 1 && dist < closestDist) {
        closestDist = dist;
        closest = { box, dc, dr };
      }
    }
    if (!closest) return false;

    const { box, dc, dr } = closest;
    const newCol = box.col + dc;
    const newRow = box.row + dr;

    // Kontrollera att destinationen är fri
    if (!this._isFree(newCol, newRow)) return false;

    // Flytta lådan
    box.col = newCol;
    box.row = newRow;
    box.mesh.position.set(cx(newCol), 0, cz(newRow));
    // Uppdatera kollider
    this.colliders[box.colliderIdx].x = cx(newCol);
    this.colliders[box.colliderIdx].z = cz(newRow);

    // Färga lådan grön när den står på ett mål, annars blå (gäller även om man
    // puttar bort en tidigare placerad låda).
    const onGoal = this.goals.some(g => g.col === newCol && g.row === newRow);
    box.body.material.color.set(onGoal ? 0x44cc66 : 0x5a8ac8);

    this._checkSolved();
    return true;
  }

  _checkSolved() {
    const allPlaced = this.goals.every(g =>
      this.boxes.some(b => !b.removed && b.col === g.col && b.row === g.row)
    );
    if (allPlaced && !this.solved) {
      this.solved = true;
      this._onSolved();
    }
  }

  // Återställ alla lådor till sina startpositioner. Tillåts bara innan pusslet
  // är löst (efteråt finns inget behov). Räddar spelaren ur självförvållade
  // återvändsgränder, t.ex. en låda puttad mot en vägg.
  reset() {
    if (this.solved) return false;
    for (const box of this.boxes) {
      box.col = box.startCol;
      box.row = box.startRow;
      box.mesh.position.set(cx(box.col), 0, cz(box.row));
      this.colliders[box.colliderIdx].x = cx(box.col);
      this.colliders[box.colliderIdx].z = cz(box.row);
      box.body.material.color.set(0x5a8ac8); // tillbaka till blått
    }
    return true;
  }

  _onSolved() {
    // Spärra ihop alla mål-lampor med starkare vitt sken
    for (const goal of this.goals) {
      if (goal.light) { goal.light.color.set(0xffffff); goal.light.intensity = 20; }
    }
    // Spawn belöning: en ädelstensbrosch (dyr quest-reward)
    const g = new THREE.Group();
    const goldMat = new THREE.MeshLambertMaterial({ color: 0xe8c34a, emissive: 0x4a3800 });
    const gemMat  = new THREE.MeshLambertMaterial({ color: 0x2299ff, emissive: 0x003366 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.1, 16), goldMat);
    base.position.y = 0.05;
    const gem = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), gemMat);
    gem.position.y = 0.22;
    gem.scale.y = 1.3;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 8, 20), goldMat);
    rim.position.y = 0.18;
    rim.rotation.x = Math.PI / 2;
    g.add(base, gem, rim);

    // Placera belöningen längst in i rummet (rad 10, kolumn 6)
    const rwx = cx(6), rwz = cz(10);
    g.position.set(rwx, 0.5, rwz);
    this.scene.add(g);
    this._rewardMesh = g;

    const glow = new THREE.PointLight(0x2299ff, 20, 8);
    glow.position.set(rwx, 2, rwz);
    this.scene.add(glow);
    this._rewardGlow = glow;

    this.reward = {
      group: g,
      position: new THREE.Vector3(rwx, 0.5, rwz),
      taken: false,
      loot: { id: 'azurbrosch', name: 'Azurbröschen', icon: '💎', usable: false }
    };
  }

  isSolved() { return this.solved; }

  // Återställ pusslet till löst läge vid laddning av en sparning. Lägger lådorna
  // på målen, färgar dem gröna och tänder målljusen. Om belöningen inte hämtats
  // än spawnas den så att spelaren kan ta den; annars hoppas den över.
  restoreSolved(rewardTaken) {
    this.solved = true;
    this.goals.forEach((g, i) => {
      const box = this.boxes[i];
      if (!box) return;
      box.col = g.col; box.row = g.row;
      box.mesh.position.set(cx(g.col), 0, cz(g.row));
      this.colliders[box.colliderIdx].x = cx(g.col);
      this.colliders[box.colliderIdx].z = cz(g.row);
      box.body.material.color.set(0x44cc66);
      if (g.light) { g.light.color.set(0xffffff); g.light.intensity = 20; }
    });
    if (!rewardTaken) this._onSolved();
  }

  update(delta) {
    // Pulsera mål-markeringar
    const t = Date.now() * 0.003;
    for (const ring of this._goalMeshes) {
      ring.rotation.z += delta * 0.8;
      ring.material.opacity = 0.6 + Math.sin(t) * 0.4;
    }
    // Rotera/sväva belöningen
    if (this._rewardMesh) {
      this._rewardMesh.rotation.y += delta * 1.1;
      this._rewardMesh.position.y = 0.5 + Math.sin(t * 1.5) * 0.12;
      if (this._rewardGlow) {
        this._rewardGlow.intensity = 16 + Math.sin(t * 2) * 6;
      }
    }
  }
}