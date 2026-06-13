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

  if (owner || locked) {
    const door = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 2.2),
      new THREE.MeshLambertMaterial({ color: locked ? 0x2a2018 : 0x3a2a1a })
    );
    door.position.set(x, getHeight(x, z) + 1.1, z + 3.01);
    scene.add(door);
    houseDoors.push({ x, z: z + 3, owner, locked });
  }
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
  houseDoors.push({ x: mx, z: mz + half, owner: null, locked: true });

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