import * as THREE from 'three';
import { getHeight } from '../terrain/Terrain.js';

// Skyttebanans nyckelpositioner. Delas av WorldScene (bygger), content/npcs.js
// (placerar instruktörs-NPC:n) och content/minimapMarkers.js (kartmarkör).
// Centrum matchar utplattningen i terrain/Terrain.js.
export const RANGE = {
  center: { x: 80, z: -24 },
  hut: { x: 80, z: -8 },
  npc: { x: 75, z: -13 },
  fireLineZ: -14,
  target: { x: 80, z: -37 },
  laneHalfWidth: 2.4
};

// Bygger stuga + markerad bana + piltavla. Returnerar tavlans träffdata så att
// Game.js kan registrera pilträffar mot den i världen.
export function addShootingRange(scene, colliders) {
  const wood = new THREE.MeshLambertMaterial({ color: 0x6b4f30 });
  const darkWood = new THREE.MeshLambertMaterial({ color: 0x4a3722 });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x5a3a2a });
  const laneMat = new THREE.MeshLambertMaterial({ color: 0xe6d2a8 });
  const cx = RANGE.center.x;

  // --- liten stuga vid banans södra ände ---
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
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.1), darkWood);
  door.position.set(0, 1.05, -2.02); // mot banan (-z)
  door.rotation.y = Math.PI;
  hut.add(walls, roof, door);
  hut.position.set(hx, hy, hz);
  scene.add(hut);
  colliders.push({ x: hx, z: hz, radius: 3.0 });

  // --- markerad bana: kantremsor + skjutlinje + avståndsstreck ---
  const laneZ0 = RANGE.fireLineZ;        // skjutlinje
  const laneZ1 = RANGE.target.z + 1.5;   // strax framför tavlan
  const laneLen = laneZ0 - laneZ1;
  const laneMidZ = (laneZ0 + laneZ1) / 2;
  const groundAt = z => getHeight(cx, z);

  for (const side of [-1, 1]) {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, laneLen), darkWood);
    edge.position.set(cx + side * RANGE.laneHalfWidth, groundAt(laneMidZ) + 0.05, laneMidZ);
    scene.add(edge);
  }
  const fireLine = new THREE.Mesh(
    new THREE.BoxGeometry(RANGE.laneHalfWidth * 2, 0.1, 0.22), laneMat
  );
  fireLine.position.set(cx, groundAt(laneZ0) + 0.05, laneZ0);
  scene.add(fireLine);
  for (let z = laneZ0 - 5; z > laneZ1; z -= 5) {
    const mark = new THREE.Mesh(
      new THREE.BoxGeometry(RANGE.laneHalfWidth * 2, 0.08, 0.14), laneMat
    );
    mark.position.set(cx, groundAt(z) + 0.04, z);
    scene.add(mark);
  }

  // --- piltavla (halmtavla med röda/vita ringar) vid norra änden ---
  const tx = RANGE.target.x, tz = RANGE.target.z;
  const ty = getHeight(tx, tz);
  const centerY = 1.9; // i nivå med pilens flyghöjd på platt mark
  const target = new THREE.Group();

  for (const sx of [-0.8, 0.8]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, centerY + 0.9, 0.13), darkWood);
    leg.position.set(sx, (centerY + 0.9) / 2, 0.05);
    leg.rotation.z = sx > 0 ? -0.08 : 0.08; // lätt isärspretande stativ
    leg.castShadow = true;
    target.add(leg);
  }

  // halmskiva som baksida, vänd mot skytten (+z)
  const straw = new THREE.Mesh(
    new THREE.CylinderGeometry(1.35, 1.35, 0.28, 28),
    new THREE.MeshLambertMaterial({ color: 0xc9a24a })
  );
  straw.rotation.x = Math.PI / 2;
  straw.position.set(0, centerY, 0);
  straw.castShadow = true;
  target.add(straw);

  // ringar utifrån och in, växlande vitt/rött, röd prick i mitten
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
    disc.position.set(0, centerY, 0.15 + i * 0.004); // CircleGeometry vänder mot +z
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