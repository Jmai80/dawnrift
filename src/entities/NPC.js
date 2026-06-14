import * as THREE from 'three';
import { getHeight } from '../world/terrain/Terrain.js';

const SKIN = 0xf0c8a0;
const HAIR = 0x5c4023;

export class NPC {
  constructor(scene, { x, z, name, color, lines, variant = 'man' }) {
    this.name = name;
    this.lines = lines;
    this.lineIndex = 0;

    this.mesh = new THREE.Group();
    if (variant === 'dress') this.buildDress(color);
    else this.buildMan(color);

    this.mesh.position.set(x, getHeight(x, z), z);
    scene.add(this.mesh);
  }

  // Ögon på +Z-sidan så att lookAt() vänder ansiktet mot spelaren
  makeEyes(y) {
    const eyeGeo = new THREE.SphereGeometry(0.04, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.1, y, 0.24);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.1;
    return [eyeL, eyeR];
  }

  buildMan(color) {
    const tunic = new THREE.MeshLambertMaterial({ color });
    const pants = new THREE.MeshLambertMaterial({ color: 0x44403a });
    const skin  = new THREE.MeshLambertMaterial({ color: SKIN });
    const hair  = new THREE.MeshLambertMaterial({ color: HAIR });

    const legGeo = new THREE.BoxGeometry(0.25, 0.7, 0.25);
    const legL = new THREE.Mesh(legGeo, pants);
    legL.position.set(-0.18, 0.35, 0);
    const legR = legL.clone();
    legR.position.x = 0.18;

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.4), tunic);
    torso.position.y = 1.05;

    const armGeo = new THREE.BoxGeometry(0.18, 0.6, 0.18);
    const armL = new THREE.Mesh(armGeo, tunic);
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

    this.mesh.add(legL, legR, torso, armL, armR, head, hairCap, ...this.makeEyes(1.71));
  }

  buildDress(color) {
    const dress = new THREE.MeshLambertMaterial({ color });
    const skin  = new THREE.MeshLambertMaterial({ color: SKIN });
    const hair  = new THREE.MeshLambertMaterial({ color: HAIR });

    // Kjol – kon som är vid nedtill
    const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.0, 14), dress);
    skirt.position.y = 0.5;

    // Liv
    const bodice = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.32), dress);
    bodice.position.y = 1.25;

    const armGeo = new THREE.BoxGeometry(0.16, 0.55, 0.16);
    const armL = new THREE.Mesh(armGeo, dress);
    armL.position.set(-0.33, 1.2, 0);
    const armR = armL.clone();
    armR.position.x = 0.33;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), skin);
    head.position.y = 1.78;
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.29, 14, 8, 0, Math.PI * 2, 0, Math.PI / 1.8),
      hair
    );
    hairCap.position.y = 1.82;
    // Långt hår ner mot axlarna
    const longHair = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.18), hair);
    longHair.position.set(0, 1.6, -0.18);

    this.mesh.add(skirt, bodice, armL, armR, head, hairCap, longHair, ...this.makeEyes(1.81));
  }

  setLines(lines) {
    this.lines = lines;
    this.lineIndex = 0;
  }

  distanceTo(pos) {
    return this.mesh.position.distanceTo(pos);
  }

  nextLine() {
    const line = this.lines[this.lineIndex];
    this.lineIndex = (this.lineIndex + 1) % this.lines.length;
    return line;
  }

  faceToward(pos) {
    this.mesh.lookAt(pos.x, this.mesh.position.y, pos.z);
  }
}