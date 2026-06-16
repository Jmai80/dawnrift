import * as THREE from 'three';
import { getHeight } from '../terrain/Terrain.js';

export function addTree(scene, colliders, x, z) {
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
  scene.add(tree);
  colliders.push({ x, z, radius: 0.9 });
}

export function addFlower(scene, x, z, scale = 1.0) {
  const y = getHeight(x, z);
  const g = new THREE.Group();

  const stemMat  = new THREE.MeshLambertMaterial({ color: 0x2d7a1f });
  const leafMat  = new THREE.MeshLambertMaterial({ color: 0x1a5c10 });
  const petalMat = new THREE.MeshLambertMaterial({ color: 0xcc1122 });
  const budMat   = new THREE.MeshLambertMaterial({ color: 0xee2233 });

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1.1, 8), stemMat);
  stem.position.y = 0.55;
  g.add(stem);

  const leafGeo = new THREE.SphereGeometry(0.28, 8, 5);
  leafGeo.scale(1, 0.28, 0.55);
  const leafL = new THREE.Mesh(leafGeo, leafMat);
  leafL.position.set(-0.28, 0.38, 0);
  leafL.rotation.z = 0.5;
  g.add(leafL);

  const leafR = leafL.clone();
  leafR.position.set(0.28, 0.52, 0);
  leafR.rotation.z = -0.5;
  g.add(leafR);

  const bud = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), budMat);
  bud.scale.y = 1.35;
  bud.position.y = 1.2;
  g.add(bud);

  const petalGeo = new THREE.SphereGeometry(0.14, 8, 6);
  petalGeo.scale(1, 0.4, 1);
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const petal = new THREE.Mesh(petalGeo, petalMat);
    petal.position.set(Math.cos(angle) * 0.28, 1.14, Math.sin(angle) * 0.28);
    petal.rotation.y = -angle;
    petal.rotation.z = 0.55;
    g.add(petal);
  }

  g.scale.setScalar(scale);
  g.position.set(x, y, z);
  scene.add(g);
  return g;
}

export function addSunflower(scene, x, z, scale = 1.0) {
  const y = getHeight(x, z);
  const g = new THREE.Group();

  const stemMat   = new THREE.MeshLambertMaterial({ color: 0x3a7a1a });
  const leafMat   = new THREE.MeshLambertMaterial({ color: 0x2a6010 });
  const petalMat  = new THREE.MeshLambertMaterial({ color: 0xf5c400 });
  const centerMat = new THREE.MeshLambertMaterial({ color: 0x3a1f00 });
  const seedMat   = new THREE.MeshLambertMaterial({ color: 0x5a3200 });

  const stemBottom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.11, 1.4, 8), stemMat
  );
  stemBottom.position.y = 0.7;
  stemBottom.rotation.z = 0.06;
  g.add(stemBottom);

  const stemTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.07, 1.0, 8), stemMat
  );
  stemTop.position.set(0.06, 1.9, 0);
  stemTop.rotation.z = -0.08;
  g.add(stemTop);

  const mkLeaf = (side, yPos, zRot, yRot) => {
    const geo = new THREE.SphereGeometry(0.38, 8, 5);
    geo.scale(1, 0.22, 0.7);
    const leaf = new THREE.Mesh(geo, leafMat);
    leaf.position.set(side * 0.32, yPos, 0);
    leaf.rotation.set(0.15, yRot, zRot);
    g.add(leaf);
  };
  mkLeaf(-1, 0.55,  0.6,  0.2);
  mkLeaf( 1, 0.85, -0.6, -0.2);
  mkLeaf(-1, 1.25,  0.5,  0.15);

  const headY = 2.55;
  const center = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 0.12, 18), centerMat
  );
  center.position.y = headY;
  g.add(center);

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const seed = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), seedMat);
    seed.position.set(Math.cos(a) * 0.18, headY + 0.07, Math.sin(a) * 0.18);
    g.add(seed);
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const seed = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), seedMat);
    seed.position.set(Math.cos(a) * 0.09, headY + 0.07, Math.sin(a) * 0.09);
    g.add(seed);
  }

  const petalGeo = new THREE.SphereGeometry(1, 8, 5);
  petalGeo.scale(0.12, 0.08, 0.38);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const petal = new THREE.Mesh(petalGeo, petalMat);
    petal.position.set(Math.cos(a) * 0.56, headY, Math.sin(a) * 0.56);
    petal.rotation.y = -a;
    petal.rotation.z = 0.38;
    g.add(petal);
  }

  g.scale.setScalar(scale);
  g.position.set(x, y, z);
  scene.add(g);
  return g;
}
// Gerbera – lila blomma med platta kronblad som strålar ut från en mörk mitt.
// Signaturen följer addFlower/addSunflower: scene, x, z, scale (valfri).
// Rotation och liten slumpmässig storleksvariation sätts internt, precis som
// i originalfunktionen – blommor behöver inte deterministiska positioner
// eftersom de inte har kollision eller quest-beroenden.
export function addGerbera(scene, x, z, scale = 1.0) {
  const g = new THREE.Group();

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8),
    new THREE.MeshLambertMaterial({ color: 0x2d5a27 })
  );
  stem.position.y = 0.4;
  g.add(stem);

  const petalMat = new THREE.MeshLambertMaterial({
    color: 0xba55d3,
    side: THREE.DoubleSide
  });
  const petalGeo = new THREE.SphereGeometry(0.25, 8, 6);
  petalGeo.scale(1, 0.25, 2);
  const petalCount = 16;
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2;
    const petal = new THREE.Mesh(petalGeo, petalMat);
    petal.position.set(
      Math.cos(angle) * 0.18,
      0.8,
      Math.sin(angle) * 0.18
    );
    petal.rotation.y = -angle;
    petal.rotation.x = 0.3;
    g.add(petal);
  }

  const center = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 12, 8),
    new THREE.MeshLambertMaterial({ color: 0x4a2c2a })
  );
  center.position.y = 0.8;
  g.add(center);

  const y = getHeight(x, z);
  g.position.set(x, y, z);
  // Liten intern storleksvariation (×0.7–1.3) multiplicerad med scale-parametern,
  // så att man kan styra grovstorleken uppifrån utan att förlora naturlig variation.
  g.scale.setScalar(scale * (0.7 + Math.random() * 0.6));
  g.rotation.y = Math.random() * Math.PI * 2;
  scene.add(g);
  return g;
}

// Planteringsbädd: en rund odlingsbädd med en blandning av de tre blommorna
// och några större stenar. Stenarna får colliders (går ej att gå igenom);
// blommorna är dekor. Layouten är deterministisk (seedad) så den ser likadan
// ut varje start. Senare ska man kunna gräva här efter dyrgripar/ledtrådar –
// därför sparas bäddens center i `beds`-listan om en sådan skickas in.
//
// addPlanting(scene, colliders, cx, cz, beds?)
export function addPlanting(scene, colliders, cx, cz, beds = null) {
  const y = getHeight(cx, cz);

  // Liten seedad PRNG (mulberry32) – samma layout varje gång per (cx,cz).
  let seed = Math.floor((cx * 73856093) ^ (cz * 19349663)) >>> 0;
  const rnd = () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Jordbädd (mörk, låg cylinder) som markerar odlingsytan.
  const bedRadius = 5.5;
  const soil = new THREE.Mesh(
    new THREE.CylinderGeometry(bedRadius, bedRadius + 0.3, 0.4, 20),
    new THREE.MeshLambertMaterial({ color: 0x4a3a2a })
  );
  soil.position.set(cx, y + 0.05, cz);
  soil.receiveShadow = true;
  scene.add(soil);

  // Referenser vi behöver kunna ändra senare när bädden grävs upp.
  const flowerGroups = [];

  // En kant av små stenar runt bädden.
  const rimStone = new THREE.MeshLambertMaterial({ color: 0x807a72 });
  const rimN = 14;
  for (let i = 0; i < rimN; i++) {
    const a = (i / rimN) * Math.PI * 2;
    const rx = cx + Math.cos(a) * bedRadius;
    const rz = cz + Math.sin(a) * bedRadius;
    const s = 0.22 + rnd() * 0.12;
    const st = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rimStone);
    st.position.set(rx, getHeight(rx, rz) + s * 0.4, rz);
    st.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    st.castShadow = true;
    scene.add(st);
  }

  // Några större stenar inne i bädden – med colliders.
  const bigStoneMat = new THREE.MeshLambertMaterial({ color: 0x6f6a62 });
  const nStones = 3 + Math.floor(rnd() * 2); // 3–4
  for (let i = 0; i < nStones; i++) {
    const a = rnd() * Math.PI * 2;
    const r = rnd() * (bedRadius - 2);
    const sx = cx + Math.cos(a) * r;
    const sz = cz + Math.sin(a) * r;
    const s = 0.7 + rnd() * 0.6;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), bigStoneMat);
    stone.position.set(sx, getHeight(sx, sz) + s * 0.5, sz);
    stone.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    stone.castShadow = true;
    stone.receiveShadow = true;
    scene.add(stone);
    colliders.push({ x: sx, z: sz, radius: s * 0.8 });
  }

  // Blandning av de tre blommorna, utspridda i bädden.
  const nFlowers = 10 + Math.floor(rnd() * 5); // 10–14
  for (let i = 0; i < nFlowers; i++) {
    const a = rnd() * Math.PI * 2;
    const r = rnd() * (bedRadius - 1);
    const fx = cx + Math.cos(a) * r;
    const fz = cz + Math.sin(a) * r;
    const scale = 0.7 + rnd() * 0.6;
    const pick = Math.floor(rnd() * 3);
    let fg;
    if (pick === 0)      fg = addFlower(scene, fx, fz, scale);
    else if (pick === 1) fg = addSunflower(scene, fx, fz, scale);
    else                 fg = addGerbera(scene, fx, fz, scale);
    if (fg) flowerGroups.push(fg);
  }

  // Bäddobjektet. Utöver läget bär det en dig()-metod som ändrar utseendet till
  // en tydligt uppgrävd bädd (blommor borta, mörk vänd jord, central grop,
  // jordhögar runtom och en kvarlämnad spade). dig() är idempotent och anropas
  // både när spelaren gräver live och när ett sparat tillstånd återställs.
  const bed = { x: cx, z: cz, radius: bedRadius, dug: false };

  bed.dig = () => {
    if (bed.dug) return;
    bed.dug = true;

    // Blommorna har grävts upp – göm dem.
    for (const f of flowerGroups) f.visible = false;

    // Vänd jorden: mörkare "nyss uppgrävd" ton.
    soil.material = new THREE.MeshLambertMaterial({ color: 0x2e2113 });

    // Egen seedad PRNG så grävlooken ser likadan ut vid varje laddning.
    let s2 = ((Math.floor((cx * 19349663) ^ (cz * 73856093)) >>> 0) ^ 0x9e3779b9) >>> 0;
    const r2 = () => {
      s2 |= 0; s2 = (s2 + 0x6D2B79F5) | 0;
      let t = Math.imul(s2 ^ (s2 >>> 15), 1 | s2);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    // Central grop: en mörk, nedsänkt kon mitt i bädden.
    const pitR = 2.2;
    const pit = new THREE.Mesh(
      new THREE.CylinderGeometry(pitR, pitR * 0.6, 0.8, 18),
      new THREE.MeshLambertMaterial({ color: 0x1c130a })
    );
    pit.position.set(cx, y - 0.25, cz);
    pit.receiveShadow = true;
    scene.add(pit);

    // Uppgrävda jordhögar runt gropen (spoil heaps).
    const moundMat = new THREE.MeshLambertMaterial({ color: 0x3c2c1a });
    const nMounds = 6;
    for (let i = 0; i < nMounds; i++) {
      const a = (i / nMounds) * Math.PI * 2 + r2() * 0.5;
      const rr = pitR + 0.6 + r2() * 0.9;
      const mx = cx + Math.cos(a) * rr;
      const mz = cz + Math.sin(a) * rr;
      const ms = 0.5 + r2() * 0.55;
      const mound = new THREE.Mesh(new THREE.SphereGeometry(ms, 8, 6), moundMat);
      mound.scale.y = 0.45;
      mound.position.set(mx, getHeight(mx, mz) + ms * 0.22, mz);
      mound.castShadow = true;
      mound.receiveShadow = true;
      scene.add(mound);
    }

    // En spade som lämnats kvar i jorden – tydlig signal att här har grävts.
    const shovel = new THREE.Group();
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1.7, 8),
      new THREE.MeshLambertMaterial({ color: 0x6b4a2a })
    );
    handle.position.y = 0.85;
    handle.castShadow = true;
    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.07, 0.07),
      new THREE.MeshLambertMaterial({ color: 0x5a3d22 })
    );
    grip.position.y = 1.7;
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.55, 0.08),
      new THREE.MeshLambertMaterial({ color: 0x8a8f96 })
    );
    blade.position.y = 0.12;
    blade.castShadow = true;
    shovel.add(handle, grip, blade);
    shovel.position.set(cx + pitR * 0.5, y, cz - pitR * 0.45);
    shovel.rotation.z = 0.38;  // lutad, instucken i spoil-högen
    scene.add(shovel);
  };

  // Spara bäddens läge (+ dig-metod) för "gräv här"-funktionen.
  if (beds) beds.push(bed);
  return bed;
}