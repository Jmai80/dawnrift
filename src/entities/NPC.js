import * as THREE from 'three';
import { getHeight } from '../world/terrain/Terrain.js';

const SKIN = 0xf0c8a0;
const HAIR = 0x5c4023;

export class NPC {
  constructor(scene, { x, z, name, color, lines, variant = 'man', wander = null }) {
    this.name = name;
    this.lines = lines;
    this.lineIndex = 0;

    this.mesh = new THREE.Group();
    if (variant === 'dress') this.buildDress(color);
    else if (variant === 'oldman') this.buildOldMan(color);
    else this.buildMan(color);

    this.mesh.position.set(x, getHeight(x, z), z);
    scene.add(this.mesh);

    // Virrig vandring i en ring runt (wander.x, wander.z). Sätts på vissa NPC:er
    // (t.ex. den förvirrade gubben). update(delta) flyttar dem; saknas wander
    // står NPC:n still som tidigare.
    this.wander = wander; // { x, z, radius, speed } | null
    if (wander) {
      this._ang = Math.atan2(z - wander.z, x - wander.x); // starta där vi spawnade på ringen
      this._angVel = (Math.random() < 0.5 ? -1 : 1) * 0.5;
      this._dirTimer = 0;
      this._wt = Math.random() * 10;
    }
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

  // "Den förvirrade gubben": samma kroppsform som buildMan men med grått hår,
  // en bredbrättad hatt och MYCKET stora glasögon. Benen sparas på this så att
  // update() kan vagga dem när han traskar runt.
  buildOldMan(color) {
    const coat = new THREE.MeshLambertMaterial({ color });
    const pants = new THREE.MeshLambertMaterial({ color: 0x3a352c });
    const skin  = new THREE.MeshLambertMaterial({ color: SKIN });
    const grey  = new THREE.MeshLambertMaterial({ color: 0xcfcabf }); // grått ålderdomligt hår

    const legGeo = new THREE.BoxGeometry(0.25, 0.7, 0.25);
    this.legL = new THREE.Mesh(legGeo, pants);
    this.legL.position.set(-0.18, 0.35, 0);
    this.legR = this.legL.clone();
    this.legR.position.x = 0.18;

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.4), coat);
    torso.position.y = 1.05;

    const armGeo = new THREE.BoxGeometry(0.18, 0.6, 0.18);
    const armL = new THREE.Mesh(armGeo, coat);
    armL.position.set(-0.44, 1.1, 0);
    const armR = armL.clone();
    armR.position.x = 0.44;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), skin);
    head.position.y = 1.68;
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.29, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.2),
      grey
    );
    hairCap.position.y = 1.72;

    // Grått skägg
    const beard = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.12), grey);
    beard.position.set(0, 1.5, 0.2);

    // --- Bredbrättad hatt ---
    const hatMat = new THREE.MeshLambertMaterial({ color: 0x4a3a26 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 18), hatMat);
    brim.position.y = 1.92;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.34, 18), hatMat);
    crown.position.y = 2.1;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.305, 0.325, 0.08, 18),
      new THREE.MeshLambertMaterial({ color: 0x2a2016 }));
    band.position.y = 1.98;

    // --- MYCKET stora glasögon (på +Z, framsidan, i ögonhöjd) ---
    const frameMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const lensMat = new THREE.MeshLambertMaterial({
      color: 0xbfe6ff, emissive: 0x335577, transparent: true, opacity: 0.7
    });
    const glasses = new THREE.Group();
    for (const gx of [-0.15, 0.15]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.035, 10, 22), frameMat);
      ring.position.set(gx, 0, 0);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.15, 22), lensMat);
      lens.position.set(gx, 0, 0.005);
      glasses.add(ring, lens);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.04), frameMat);
    glasses.add(bridge);
    // Skalmar ut mot öronen
    const armGlassGeo = new THREE.BoxGeometry(0.04, 0.04, 0.22);
    const tL = new THREE.Mesh(armGlassGeo, frameMat);
    tL.position.set(-0.3, 0, -0.1);
    const tR = tL.clone();
    tR.position.x = 0.3;
    glasses.add(tL, tR);
    glasses.position.set(0, 1.68, 0.26);

    this.mesh.add(this.legL, this.legR, torso, armL, armR, head, hairCap, beard,
      brim, crown, band, glasses, ...this.makeEyes(1.71));
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

  // Virrig vandring i en ring runt wander-centrum. Anropas varje världstick av
  // Game.js (men inte medan spelaren står och pratar – då vänder han sig mot dig).
  update(delta) {
    if (!this.wander) return;
    this._wt += delta;

    // Byt riktning/fart då och då – ibland en kort paus (virrigt).
    this._dirTimer -= delta;
    if (this._dirTimer <= 0) {
      this._dirTimer = 1.2 + Math.random() * 2.6;
      const r = Math.random();
      if (r < 0.25) this._angVel = 0;                               // tvekar/stannar
      else this._angVel = (r < 0.6 ? -1 : 1) * (0.25 + Math.random() * 0.6);
    }
    this._ang += this._angVel * delta;

    // Lite radie-vobbel så banan inte blir en perfekt cirkel.
    const radius = this.wander.radius + Math.sin(this._wt * 1.3) * 0.8;
    const nx = this.wander.x + Math.cos(this._ang) * radius;
    const nz = this.wander.z + Math.sin(this._ang) * radius;

    const moving = Math.abs(this._angVel) > 0.001;
    if (moving) this.mesh.lookAt(nx, this.mesh.position.y, nz); // vänd näsan åt gångriktningen
    this.mesh.position.x = nx;
    this.mesh.position.z = nz;
    this.mesh.position.y = getHeight(nx, nz);

    // Vagga benen när han går.
    if (this.legL && this.legR) {
      if (moving) {
        const swing = Math.sin(this._wt * 7) * 0.5;
        this.legL.rotation.x = swing;
        this.legR.rotation.x = -swing;
      } else {
        this.legL.rotation.x *= 0.9;
        this.legR.rotation.x *= 0.9;
      }
    }
  }
}