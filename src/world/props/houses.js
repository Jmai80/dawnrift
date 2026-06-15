import * as THREE from 'three';
import { getHeight } from '../terrain/Terrain.js';

export function addHouse(scene, colliders, houseDoors, x, z, { owner = null, locked = false } = {}) {
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
  scene.add(house);
  colliders.push({ x, z, radius: 4.6 });

  const baseY = getHeight(x, z);

  // Två fina ljusa fönster som flankerar framsidan (samma stil som herrgården).
  addBrightWindow(scene, x - 1.85, baseY + 2.5, z + 3.04, 0);
  addBrightWindow(scene, x + 1.85, baseY + 2.5, z + 3.04, 0);

  if (owner || locked) {
    const door = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 2.2),
      new THREE.MeshLambertMaterial({ color: locked ? 0x2a2018 : 0x3a2a1a })
    );
    door.position.set(x, baseY + 1.1, z + 3.01);
    scene.add(door);
    houseDoors.push({ x, z: z + 3, owner, locked });
  }
}

// Litet, ljust fönster med karm, glas och spröjskors. Glaset är starkt
// självlysande så det läser som "tänt" utan att kosta en ljuskälla.
export function addBrightWindow(scene, x, y, z, ry = 0) {
  const frameMat = new THREE.MeshLambertMaterial({ color: 0x3a2c1c });
  const glassMat = new THREE.MeshLambertMaterial({
    color: 0xdff1ff, emissive: 0x9fd0ee, emissiveIntensity: 1.0
  });
  const win = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.25, 0.16), frameMat);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.0), glassMat);
  glass.position.z = 0.1;
  const barV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.05, 0.2), frameMat);
  const barH = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.2), frameMat);
  win.add(frame, glass, barV, barH);
  win.position.set(x, y, z);
  win.rotation.y = ry;
  scene.add(win);
}

export function addManor(scene, colliders, houseDoors, mx, mz) {
  const groundY = getHeight(mx, mz);
  const half = 6;
  const wallMat  = new THREE.MeshLambertMaterial({ color: 0x8f8a7a });
  const roofMat  = new THREE.MeshLambertMaterial({ color: 0x4f4a58 });
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
  scene.add(g);

  const door = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 3.2),
    new THREE.MeshLambertMaterial({ color: 0x2a2018 })
  );
  door.position.set(mx, groundY + 1.6, mz + half + 0.02);
  scene.add(door);
  // Herrgården har nu en interiör (handelsbod). owner: 'manor' kopplar dörren
  // till ManorShopScene via houses['manor']. Den börjar olåst.
  houseDoors.push({ x: mx, z: mz + half, owner: 'manor', locked: false });

  // --- Fönster ---
  const frameMat = new THREE.MeshLambertMaterial({ color: 0x3a3530 });
  const glassMat = new THREE.MeshLambertMaterial({
    color: 0x9fd0e0, emissive: 0x2a4450, transparent: true, opacity: 0.85
  });
  const addWindow = (wx, wy, wz, ry) => {
    const win = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.7, 0.18), frameMat);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 1.35), glassMat);
    glass.position.z = 0.1;
    // Spröjs (kors)
    const barV = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.22), frameMat);
    const barH = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.22), frameMat);
    win.add(frame, glass, barV, barH);
    win.position.set(wx, wy, wz);
    win.rotation.y = ry;
    scene.add(win);
  };
  const fz = mz + half + 0.05;
  // Två fönster som flankerar dörren på framsidan
  addWindow(mx - 3.2, groundY + 3.4, fz, 0);
  addWindow(mx + 3.2, groundY + 3.4, fz, 0);
  // Ett fönster på varje sida för liv åt huset
  addWindow(mx + half + 0.05, groundY + 3.4, mz, Math.PI / 2);
  addWindow(mx - half - 0.05, groundY + 3.4, mz, Math.PI / 2);

  // --- Skylt ovanför dörren ---
  const sign = new THREE.Group();
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.9, 0.18),
    new THREE.MeshLambertMaterial({ color: 0x5a4326 })
  );
  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 0.18, 0.1),
    new THREE.MeshLambertMaterial({ color: 0x2f2416 })
  );
  trim.position.y = 0.52;
  const trimB = trim.clone();
  trimB.position.y = -0.52;
  // Symbolen från stenstoden – en glödande ring som "vapensköld"
  const crest = new THREE.Mesh(
    new THREE.TorusGeometry(0.26, 0.05, 8, 20),
    new THREE.MeshBasicMaterial({ color: 0x66ddff })
  );
  crest.position.z = 0.12;
  sign.add(board, trim, trimB, crest);
  sign.position.set(mx, groundY + 3.9, mz + half + 0.18);
  sign.castShadow = true;
  scene.add(sign);
  const signLight = new THREE.PointLight(0x66ddff, 3, 6);
  signLight.position.set(mx, groundY + 3.9, mz + half + 1.0);
  scene.add(signLight);

  addWallLine(colliders, mx - half, mz + half, mx + half, mz + half);
  addWallLine(colliders, mx - half, mz - half, mx + half, mz - half);
  addWallLine(colliders, mx - half, mz - half, mx - half, mz + half);
  addWallLine(colliders, mx + half, mz - half, mx + half, mz + half);

  addCrate(scene, colliders, mx - half + 0.5, mz + half + 1.4);
  addBarrel(scene, colliders, mx + half - 0.5, mz + half + 1.4);
  addGrass(scene, mx - half - 0.8, mz - half - 0.8);
  addGrass(scene, mx + half + 0.8, mz - half - 0.8);
  addGrass(scene, mx + half + 0.8, mz + half + 0.8);
  addGrass(scene, mx - half - 0.8, mz + half + 0.8);
}

// Gubbens hus – litet, slitet och lite skevt. Skilt från byn, lite längre söderut
// (placerat av WorldScene). Samma dörrkoppling som de andra husen men med owner:'gubbe'.
// Exteriören är mer nedgången: blekat virke, skev takvinkel, inga fina fönster.
// Pussel-huset: tegelbyggnad, färgglatt tak, blommor utanför entrén.
// Större än gubbens hus men mindre än herrgården. Marken under huset plattas
// ut i Terrain.js, så huset står plant. En stensockel (som herrgårdens) och en
// trappa upp till dörren ger en tydlig, plan entré.
// Väktarhallen rakt västerut: en lång, låg hall med annorlunda proportion än
// byns små kvadratiska hus. Dörren sitter på östra sidan (mot byn), så att
// spelaren måste passera de vaktande vättarna öster om hallen för att nå in.
// Dörren börjar låst; Game.js låser upp den när alla tre grottor är clearade.
export function addGuardHall(scene, colliders, houseDoors, x, z) {
  const groundY = getHeight(x, z);
  const halfX = 4, halfZ = 8;   // 8 bred (x) × 16 lång (z) – avlång hall

  const wallMat = new THREE.MeshLambertMaterial({ color: 0x6f6a60 }); // grå sten
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x33414a }); // mörkt skiffer
  const darkWood = new THREE.MeshLambertMaterial({ color: 0x241c12 });

  const g = new THREE.Group();

  // Låg sockel
  const base = new THREE.Mesh(new THREE.BoxGeometry(halfX * 2 + 1, 1.0, halfZ * 2 + 1),
    new THREE.MeshLambertMaterial({ color: 0x55504a }));
  base.position.y = 0.0;

  // Låga väggar (lägre än de vanliga husen → annan proportion)
  const walls = new THREE.Mesh(new THREE.BoxGeometry(halfX * 2, 4.5, halfZ * 2), wallMat);
  walls.position.y = 2.75;
  walls.castShadow = true; walls.receiveShadow = true;

  // Avlångt tak: en fyrsidig kon utdragen längs z (longhouse-rygg)
  const roof = new THREE.Mesh(new THREE.ConeGeometry(6.2, 2.6, 4), roofMat);
  roof.position.y = 6.3;
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(0.75, 1, 1.7);   // smal i x, lång i z
  roof.castShadow = true;

  g.add(base, walls, roof);
  g.position.set(x, groundY, z);
  scene.add(g);

  // Dörr på ÖSTRA sidan (+x), mot byn – en BoxGeometry-nisch i väggen
  // (PlaneGeometry flyter utanför väggytan och ser konstig ut utifrån).
  const doorInset = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 2.8, 1.8),
    new THREE.MeshLambertMaterial({ color: 0x241c12 })
  );
  doorInset.position.set(x + halfX - 0.05, groundY + 1.4, z);
  scene.add(doorInset);
  // Stenkarm runt dörren
  const frameMat = new THREE.MeshLambertMaterial({ color: 0x4a4640 });
  for (const dz of [-1.05, 1.05]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.45, 3.2, 0.3), frameMat);
    post.position.set(x + halfX - 0.05, groundY + 1.6, z + dz);
    scene.add(post);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 2.7), frameMat);
  lintel.position.set(x + halfX - 0.05, groundY + 3.05, z);
  scene.add(lintel);

  // Smala höga gluggar längs långsidorna (annan fönsterkaraktär än byns hus)
  const slitMat = new THREE.MeshLambertMaterial({
    color: 0x9ab0c0, emissive: 0x1a2630, emissiveIntensity: 0.7,
    transparent: true, opacity: 0.8
  });
  for (const sz of [-4.5, 0, 4.5]) {
    for (const sx of [-halfX - 0.04, halfX + 0.04]) {
      const slit = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 1.6), slitMat);
      slit.position.set(x + sx, groundY + 3.0, z + sz);
      slit.rotation.y = Math.PI / 2;
      scene.add(slit);
    }
  }

  // Dörren börjar låst (Game.js låser upp efter tre clearade grottor)
  houseDoors.push({ x: x + halfX, z, owner: 'guardhall', locked: true });

  // Kollision: rätblocks-perimeter
  addWallLine(colliders, x - halfX, z - halfZ, x + halfX, z - halfZ);
  addWallLine(colliders, x - halfX, z + halfZ, x + halfX, z + halfZ);
  addWallLine(colliders, x - halfX, z - halfZ, x - halfX, z + halfZ);
  addWallLine(colliders, x + halfX, z - halfZ, x + halfX, z + halfZ);
}

export function addPuzzleHus(scene, colliders, houseDoors, x, z) {
  const groundY = getHeight(x, z);   // ≈ 0 tack vare utplattningen
  const half = 8;    // halva bredden – byggnaden är 16×24 (djupare än bred)
  const halfD = 12;
  const PLINTH = 0.8; // sockelns höjd över marken; husets golvplan

  const brickMat = new THREE.MeshLambertMaterial({ color: 0x9a5c38 });
  const mortarMat = new THREE.MeshLambertMaterial({ color: 0xb8a890 });
  const roofMat  = new THREE.MeshLambertMaterial({ color: 0x2d7a9a }); // blågrön
  const roofTrim = new THREE.MeshLambertMaterial({ color: 0xe84040 }); // röd list
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x6f6a60 });
  const darkWood = new THREE.MeshLambertMaterial({ color: 0x2c1e0e });

  const g = new THREE.Group();

  // Stensockel: större än väggarna, sträcker sig ned under marken (fyller ev.
  // glipa i kanten av utplattningen) och höjer husets golvplan PLINTH över marken.
  const found = new THREE.Mesh(
    new THREE.BoxGeometry(half * 2 + 1.4, 2.6, halfD * 2 + 1.4),
    stoneMat
  );
  found.position.y = PLINTH - 1.3; // topp vid +PLINTH, botten ~1.8 under mark
  found.castShadow = true;
  found.receiveShadow = true;

  // Väggar (tegelfärgade) – vilar på sockeln
  const walls = new THREE.Mesh(new THREE.BoxGeometry(half * 2, 6, halfD * 2), brickMat);
  walls.position.y = PLINTH + 3;
  walls.castShadow = true;
  walls.receiveShadow = true;

  // Tegelmönster: horisontella fogar
  for (let hgt = PLINTH + 0.4; hgt < PLINTH + 6; hgt += 0.55) {
    const fog = new THREE.Mesh(new THREE.BoxGeometry(half * 2 + 0.02, 0.07, halfD * 2 + 0.02), mortarMat);
    fog.position.y = hgt;
    g.add(fog);
  }

  // Tak
  const roof = new THREE.Mesh(new THREE.ConeGeometry(13.5, 3.5, 4), roofMat);
  roof.position.y = PLINTH + 7.75;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  const trim = new THREE.Mesh(new THREE.BoxGeometry(half * 2 + 0.4, 0.3, halfD * 2 + 0.4), roofTrim);
  trim.position.y = PLINTH + 5.95;

  g.add(found, walls, roof, trim);
  g.position.set(x, groundY, z);
  scene.add(g);

  // Dörr: centrerad på södra sidan, börjar vid sockeltoppen
  const door = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 3.4),
    new THREE.MeshLambertMaterial({ color: 0x3a2a12 }));
  door.position.set(x, groundY + PLINTH + 1.7, z + halfD + 0.05);
  scene.add(door);
  for (const dx of [-1.15, 1.15]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.7, 0.22), darkWood);
    post.position.set(x + dx, groundY + PLINTH + 1.85, z + halfD + 0.1);
    scene.add(post);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 0.22), darkWood);
  lintel.position.set(x, groundY + PLINTH + 3.55, z + halfD + 0.1);
  scene.add(lintel);

  // Trappa upp till dörren: 4 stensteg från marken upp till sockeltoppen.
  // Stegen ligger framför södra väggen (z växer söderut). Rent visuella –
  // marken är platt så spelaren går rakt fram in i dörrens närzon.
  const STEPS = 4;
  const stepW = 3.0, stepRun = 0.55, stepRise = PLINTH / STEPS;
  for (let i = 0; i < STEPS; i++) {
    // Steg i: lägst längst ut, högst närmast dörren
    const topY = (i + 1) * stepRise;        // ovansidans höjd
    const depth = stepRun * (STEPS - i);     // nedersta steget sticker ut längst
    const stepZ = z + halfD + stepRun * (STEPS - i) / 2 + 0.05;
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(stepW, topY, depth),
      stoneMat
    );
    step.position.set(x, groundY + topY / 2, stepZ);
    step.castShadow = true;
    step.receiveShadow = true;
    scene.add(step);
  }

  houseDoors.push({ x, z: z + halfD, owner: 'puzzle', locked: false });

  // Fönster på framsidan (flankerande dörren) – höjda med sockeln
  addBrightWindow(scene, x - 4.5, groundY + PLINTH + 3.5, z + halfD + 0.07, 0);
  addBrightWindow(scene, x + 4.5, groundY + PLINTH + 3.5, z + halfD + 0.07, 0);
  addBrightWindow(scene, x - half - 0.07, groundY + PLINTH + 3.5, z, Math.PI / 2);
  addBrightWindow(scene, x + half + 0.07, groundY + PLINTH + 3.5, z, Math.PI / 2);

  // Kollision: rätblocks-perimeter
  addWallLine(colliders, x - half, z + halfD, x + half, z + halfD);
  addWallLine(colliders, x - half, z - halfD, x + half, z - halfD);
  addWallLine(colliders, x - half, z - halfD, x - half, z + halfD);
  addWallLine(colliders, x + half, z - halfD, x + half, z + halfD);
}

export function addGubbeHus(scene, colliders, houseDoors, x, z) {
  const groundY = getHeight(x, z);
  const house = new THREE.Group();

  // Blekt, sprucket virke
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x7a6448 });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x4a3428 });
  const darkWood = new THREE.MeshLambertMaterial({ color: 0x3c2e1a });

  const walls = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.5, 5.5), wallMat);
  walls.position.y = 1.75;
  walls.castShadow = true;
  walls.receiveShadow = true;

  // Taket är lite snett och lågt – en kon roterad ±skev
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.3, 2.5, 4), roofMat);
  roof.position.y = 4.25;
  roof.rotation.y = Math.PI / 4 + 0.12; // lite skev
  roof.rotation.z = 0.03;               // lutar svagt
  roof.castShadow = true;

  house.add(walls, roof);
  house.position.set(x, groundY, z);
  scene.add(house);
  colliders.push({ x, z, radius: 4.2 });

  // Dörr – lite lägre och mörkare än de vanliga husen
  const door = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 2.0),
    new THREE.MeshLambertMaterial({ color: 0x2a1e10 })
  );
  door.position.set(x, groundY + 1.0, z + 2.77);
  scene.add(door);
  houseDoors.push({ x, z: z + 2.8, owner: 'gubbe', locked: false });

  // Ett litet grumligt fönster (självlysande men svagt och lite smutsigt)
  const glassMat = new THREE.MeshLambertMaterial({
    color: 0x8aaa99, emissive: 0x1a2f28, emissiveIntensity: 0.6,
    transparent: true, opacity: 0.75
  });
  const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.14), darkWood);
  winFrame.position.set(x + 1.6, groundY + 2.1, z + 2.78);
  const winGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), glassMat);
  winGlass.position.set(x + 1.6, groundY + 2.1, z + 2.84);
  scene.add(winFrame, winGlass);

  // Skräpiga detaljer utanför: en välta tunna och lite ogräs
  addBarrel(scene, colliders, x - 2.0, z + 2.6);
  addGrass(scene, x + 2.2, z + 2.8);
  addGrass(scene, x - 2.3, z + 2.4);
  addGrass(scene, x + 2.0, z - 2.0);

  // En skev stolpe utan funktion – hänger bara mot husväggen
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.8, 0.1), darkWood);
  post.position.set(x - 2.4, groundY + 0.9, z + 2.6);
  post.rotation.z = 0.18;
  scene.add(post);
}

export function addWallLine(colliders, ax, az, bx, bz, radius = 0.8, spacing = 1.3) {
  const len = Math.hypot(bx - ax, bz - az);
  const n = Math.max(1, Math.ceil(len / spacing));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    colliders.push({ x: ax + (bx - ax) * t, z: az + (bz - az) * t, radius });
  }
}

export function addCrate(scene, colliders, x, z) {
  const y = getHeight(x, z);
  const crate = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.2, 1.2),
    new THREE.MeshLambertMaterial({ color: 0x8a6a3a })
  );
  crate.position.set(x, y + 0.6, z);
  crate.rotation.y = 0.3;
  crate.castShadow = true;
  crate.receiveShadow = true;
  scene.add(crate);
  colliders.push({ x, z, radius: 0.85 });
}

export function addBarrel(scene, colliders, x, z) {
  const y = getHeight(x, z);
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.5, 1.3, 12),
    new THREE.MeshLambertMaterial({ color: 0x7a5230 })
  );
  barrel.position.set(x, y + 0.65, z);
  barrel.castShadow = true;
  barrel.receiveShadow = true;
  scene.add(barrel);

  const ringMat = new THREE.MeshLambertMaterial({ color: 0x3a2a1a });
  for (const ry of [0.3, 1.0]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.57, 0.05, 8, 16), ringMat);
    ring.position.set(x, y + ry, z);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
  }
  colliders.push({ x, z, radius: 0.7 });
}

export function addGrass(scene, x, z) {
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
  scene.add(g);
}

// Högt torn (rätblock), ungefär dubbelt så högt som herrgården, öster om den.
// Det går att gå in i (owner: 'tower' -> TowerScene). Den plana framsidan låter
// dörren och fönstren sitta i liv med väggen precis som husen.
export function addTowerHouse(scene, colliders, houseDoors, x, z) {
  const y = getHeight(x, z);
  const half = 2.8;            // halva bredden -> 5.6 × 5.6 fotavtryck
  const height = 18;           // herrgårdens nock ligger på ~11.5 -> tornets ~23 = dubbelt

  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x7b746c });
  const roofMat  = new THREE.MeshLambertMaterial({ color: 0x4f4a58 });
  const woodMat  = new THREE.MeshLambertMaterial({ color: 0x4a3826 });
  const baseMat  = new THREE.MeshLambertMaterial({ color: 0x615d56 });

  const tower = new THREE.Group();

  // Stengrund/plint som täcker glipan när tornet står i en sluttning (samma
  // idé som herrgårdens grund). Toppen ligger i liv med kroppens botten (y=0)
  // och sträcker sig ned under marken så att inget svävar på nedförssidan.
  const foundation = new THREE.Mesh(
    new THREE.BoxGeometry(half * 2 + 0.6, 1.8, half * 2 + 0.6),
    baseMat
  );
  foundation.position.y = -0.8; // spänner lokal -1.7 .. +0.1
  foundation.castShadow = true;
  foundation.receiveShadow = true;

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(half * 2, height, half * 2),
    stoneMat
  );
  body.position.y = height / 2; // står på marken, topp vid y = height
  body.castShadow = true;
  body.receiveShadow = true;

  // Pyramidtak (4-sidig kon roterad 45°) precis som husen och herrgården
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.4, 5, 4), roofMat);
  roof.position.y = height + 2.5; // basen vilar på tornets topp; nock ~y=23
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;

  tower.add(foundation, body, roof);
  tower.position.set(x, y, z);
  scene.add(tower);

  // --- Dörr: framåtvänd, infattad trädörr i liv med väggen ---
  const doorGroup = new THREE.Group();
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 2.4),
    new THREE.MeshLambertMaterial({ color: 0x3a2a1a })
  );
  panel.position.set(0, 1.2, 0.02);
  const postL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.7, 0.2), woodMat);
  postL.position.set(-0.72, 1.35, 0.04);
  const postR = postL.clone();
  postR.position.x = 0.72;
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.18, 0.2), woodMat);
  lintel.position.set(0, 2.6, 0.04);
  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 8, 8),
    new THREE.MeshLambertMaterial({ color: 0xb89b5e })
  );
  knob.position.set(0.42, 1.15, 0.07);
  doorGroup.add(panel, postL, postR, lintel, knob);
  doorGroup.position.set(x, y, z + half + 0.02);
  scene.add(doorGroup);

  // Olåst och kopplad till torninteriören (TowerScene via houses['tower']).
  houseDoors.push({ x, z: z + half, owner: 'tower', locked: false });

  // --- Ljusa fönster uppför framsidan (ger liv åt det höga tornet) ---
  for (const wy of [5.2, 9.2, 13.2]) {
    addBrightWindow(scene, x, y + wy, z + half + 0.05, 0);
  }
  // ett fönster på var sida högt upp
  addBrightWindow(scene, x + half + 0.05, y + 11, z, Math.PI / 2);
  addBrightWindow(scene, x - half - 0.05, y + 11, z, Math.PI / 2);

  // --- Kollision: sluten rätblocks-perimeter (som herrgården) ---
  addWallLine(colliders, x - half, z + half, x + half, z + half);
  addWallLine(colliders, x - half, z - half, x + half, z - half);
  addWallLine(colliders, x - half, z - half, x - half, z + half);
  addWallLine(colliders, x + half, z - half, x + half, z + half);
}