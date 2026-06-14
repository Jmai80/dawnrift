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
}