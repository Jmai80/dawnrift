import * as THREE from 'three';
import { getHeight } from '../terrain/Terrain.js';

// Skyttebanans nyckelpositioner. Delas av WorldScene (bygger), content/npcs.js
// (instruktörs-NPC) och content/minimapMarkers.js (kartmarkör). Centrum matchar
// utplattningen i terrain/Terrain.js. Banan löper längs x = laneX, norrut (-z);
// stugan står VID SIDAN (väster) så att kameran bakom skytten aldrig hamnar i
// huset när man siktar mot tavlan i norr.
export const RANGE = {
  center: { x: 78, z: -21 },
  hut: { x: 70, z: -10 },
  npc: { x: 74, z: -11 },
  laneX: 80,
  fireLineZ: -12,
  target: { x: 80, z: -36 },
  laneHalfWidth: 2.4
};

// Lägger en liten låda med BOTTEN på marken vid (x,z) – följer terrängen.
function groundBox(scene, x, z, w, h, d, mat) {
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  box.position.set(x, getHeight(x, z) + h / 2 + 0.01, z);
  scene.add(box);
  return box;
}

// En markremsa (räls) längs z byggd av markföljande segment, så den ligger
// rätt mot marken hela vägen även om terrängen skulle luta.
function addStripe(scene, x, z0, z1, w, h, mat) {
  const n = Math.max(2, Math.round(Math.abs(z0 - z1) / 1.8));
  const dz = (z1 - z0) / n;
  for (let i = 0; i < n; i++) {
    const zc = z0 + dz * (i + 0.5);
    groundBox(scene, x, zc, w, h, Math.abs(dz) + 0.03, mat);
  }
}

// Bygger stuga + markerad bana + piltavla. Returnerar tavlans träffdata.
export function addShootingRange(scene, colliders, houseDoors) {
  const wood = new THREE.MeshLambertMaterial({ color: 0x6b4f30 });
  const darkWood = new THREE.MeshLambertMaterial({ color: 0x4a3722 });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x5a3a2a });
  const laneMat = new THREE.MeshLambertMaterial({ color: 0xe6d2a8 });

  const laneX = RANGE.laneX;

  // --- liten stuga vid sidan (väster om skjutlinjen) ---
  const hx = RANGE.hut.x, hz = RANGE.hut.z;
  const hy = getHeight(hx, hz);
  const hut = new THREE.Group();
  const walls = new THREE.Mesh(new THREE.BoxGeometry(5, 3.2, 4), wood);
  walls.position.y = 1.6;
  walls.castShadow = true;
  walls.receiveShadow = true;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.1, 2, 4), roofMat);
  roof.position.y = 4.2;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.1),
    new THREE.MeshLambertMaterial({ color: 0x3a2a1a }));
  door.position.set(0, 1.05, 2.02); // söderväggen (+z), mot byn/spelaren
  hut.add(walls, roof, door);
  hut.position.set(hx, hy, hz);
  scene.add(hut);
  colliders.push({ x: hx, z: hz, radius: 3.0 });
  // Ingångsbar: dörren leder till butiken (houses['rangeshop'] i Game.js).
  houseDoors.push({ x: hx, z: hz + 2, owner: 'rangeshop', locked: false });

  // --- markerad bana: två markföljande kantremsor + skjutlinje + avståndsstreck ---
  const z0 = RANGE.fireLineZ;        // skjutlinje
  const z1 = RANGE.target.z + 1.5;   // strax framför tavlan
  addStripe(scene, laneX - RANGE.laneHalfWidth, z0, z1, 0.16, 0.1, darkWood);
  addStripe(scene, laneX + RANGE.laneHalfWidth, z0, z1, 0.16, 0.1, darkWood);
  groundBox(scene, laneX, z0, RANGE.laneHalfWidth * 2, 0.1, 0.22, laneMat); // skjutlinje
  for (let z = z0 - 5; z > z1; z -= 5) {
    groundBox(scene, laneX, z, RANGE.laneHalfWidth * 2, 0.08, 0.14, laneMat);
  }

  // --- piltavla (halmtavla med röda/vita ringar) vid norra änden ---
  const tx = RANGE.target.x, tz = RANGE.target.z;
  const ty = getHeight(tx, tz);
  const centerY = 1.9; // i nivå med pilens flyghöjd på platt mark
  const target = new THREE.Group();

  for (const sx of [-0.8, 0.8]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, centerY + 0.9, 0.13), darkWood);
    leg.position.set(sx, (centerY + 0.9) / 2, 0.05);
    leg.rotation.z = sx > 0 ? -0.08 : 0.08;
    leg.castShadow = true;
    target.add(leg);
  }

  const straw = new THREE.Mesh(
    new THREE.CylinderGeometry(1.35, 1.35, 0.28, 28),
    new THREE.MeshLambertMaterial({ color: 0xc9a24a })
  );
  straw.rotation.x = Math.PI / 2;
  straw.position.set(0, centerY, 0);
  straw.castShadow = true;
  target.add(straw);

  const rings = [
    { r: 1.18, c: 0xf4f1ea },
    { r: 0.92, c: 0xc62f2f },
    { r: 0.66, c: 0xf4f1ea },
    { r: 0.40, c: 0xc62f2f },
    { r: 0.16, c: 0xe23b3b } // bullseye
  ];
  rings.forEach((ring, i) => {
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(ring.r, 28),
      new THREE.MeshLambertMaterial({ color: ring.c })
    );
    disc.position.set(0, centerY, 0.15 + i * 0.004); // CircleGeometry vänder mot +z (skytten)
    target.add(disc);
  });

  target.position.set(tx, ty, tz);
  scene.add(target);
  colliders.push({ x: tx, z: tz, radius: 1.0 });

  return {
    group: target,
    center: new THREE.Vector3(tx, ty + centerY, tz + 0.16),
    radius: 1.18,
    bullseyeRadius: 0.28
  };
}