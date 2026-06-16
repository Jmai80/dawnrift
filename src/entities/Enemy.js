import * as THREE from 'three';

export class Enemy {
  constructor(scene, {
    x, z, name = 'Grottvätte', hp = 3, speed = 2.1, scale = 1,
    color = 0x7a2222, colliders = [], bounds = null,
    home = null, leashRange = 11, aggroRange = 9
  }) {
    this.name = name;
    this.scene = scene;
    this.hp = hp;
    this.speed = speed;
    this.alive = true;
    this.hitFlash = 0;
    this.invuln = 0;
    this.baseColor = color;
    this.colliders = colliders;
    this.bounds = bounds;
    this.radius = 0.55 * scale;
    // Vakt-beteende: om `home` anges patrullerar fienden där, jagar spelaren bara
    // inom aggroRange OCH så länge spelaren är inom leashRange från hemmet, och
    // söker sig annars tillbaka hem. Utan `home` gäller det gamla beteendet.
    this.home = home ? { x: home.x, z: home.z } : null;
    this.leashRange = leashRange;
    this.aggroRange = aggroRange;

    this.mesh = new THREE.Group();
    this.bodyMat = new THREE.MeshLambertMaterial({ color });
    // Lite mörkare nyans till lemmar/öron, härledd ur grundfärgen.
    const darker = new THREE.Color(color).multiplyScalar(0.7).getHex();
    this.limbMat = new THREE.MeshLambertMaterial({ color: darker });

    // Bål (något avsmalnande) – huvudkroppen, behåller bodyMat för hit-flash.
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.44, 0.8, 8), this.bodyMat);
    torso.position.y = 0.7;
    torso.castShadow = true;

    // Mage (rundad) för en knubbigare siluett.
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), this.bodyMat);
    belly.position.y = 0.62; belly.scale.set(1, 0.8, 0.9);

    // Huvud.
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 10), this.bodyMat);
    head.position.y = 1.32; head.scale.set(1, 0.95, 1.05);
    head.castShadow = true;

    // Spetsiga öron.
    const earGeo = new THREE.ConeGeometry(0.12, 0.34, 6);
    const earL = new THREE.Mesh(earGeo, this.limbMat);
    earL.position.set(-0.34, 1.42, 0); earL.rotation.z = Math.PI / 2.2;
    const earR = new THREE.Mesh(earGeo, this.limbMat);
    earR.position.set(0.34, 1.42, 0); earR.rotation.z = -Math.PI / 2.2;

    // Pannbryn (ger en argare blick) + nos.
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.12), this.limbMat);
    brow.position.set(0, 1.46, 0.3); brow.rotation.x = 0.3;
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.22, 8), this.bodyMat);
    snout.position.set(0, 1.28, 0.34); snout.rotation.x = Math.PI / 2;

    // Ögon (lysande gula) – sitter nu insjunkna under brynet.
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffdd33 });
    const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), eyeMat);
    eye1.position.set(-0.15, 1.36, 0.31);
    const eye2 = eye1.clone(); eye2.position.x = 0.15;

    // Två små huggtänder.
    const tuskMat = new THREE.MeshLambertMaterial({ color: 0xe8e4d0 });
    const tusk1 = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 6), tuskMat);
    tusk1.position.set(-0.1, 1.18, 0.33); tusk1.rotation.x = Math.PI;
    const tusk2 = tusk1.clone(); tusk2.position.x = 0.1;

    // Armar.
    const armGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.6, 6);
    const armL = new THREE.Mesh(armGeo, this.limbMat);
    armL.position.set(-0.5, 0.78, 0); armL.rotation.z = 0.35;
    const armR = new THREE.Mesh(armGeo, this.limbMat);
    armR.position.set(0.5, 0.78, 0); armR.rotation.z = -0.35;
    // Nävar.
    const fistL = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), this.limbMat);
    fistL.position.set(-0.62, 0.5, 0);
    const fistR = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), this.limbMat);
    fistR.position.set(0.62, 0.5, 0);

    // Ben.
    const legGeo = new THREE.CylinderGeometry(0.13, 0.11, 0.5, 6);
    const legL = new THREE.Mesh(legGeo, this.limbMat);
    legL.position.set(-0.18, 0.25, 0);
    const legR = new THREE.Mesh(legGeo, this.limbMat);
    legR.position.set(0.18, 0.25, 0);

    this.mesh.add(
      torso, belly, head, earL, earR, brow, snout,
      eye1, eye2, tusk1, tusk2,
      armL, armR, fistL, fistR, legL, legR
    );
    // Spara svängbara lemmar för en enkel gånganimation.
    this._armL = armL; this._armR = armR; this._legL = legL; this._legR = legR;
    this._fistL = fistL; this._fistR = fistR;
    this._walkT = 0;

    this.mesh.scale.setScalar(scale);
    this.mesh.position.set(x, 0, z);
    scene.add(this.mesh);
  }

  update(delta, playerPos) {
    if (!this.alive) return;

    if (this.invuln > 0) this.invuln -= delta;
    if (this.hitFlash > 0) {
      this.hitFlash -= delta;
      const flashing = this.hitFlash > 0;
      this.bodyMat.color.setHex(flashing ? 0xffffff : this.baseColor);
      if (this.limbMat) {
        const darker = new THREE.Color(this.baseColor).multiplyScalar(0.7).getHex();
        this.limbMat.color.setHex(flashing ? 0xffffff : darker);
      }
    }

    if (this.home) {
      // Vakt: jaga bara om spelaren är nära OCH inte har dragit sig för långt
      // från vaktposten. Annars traska tillbaka hem och patrullera.
      const p = this.mesh.position;
      const dPlayer = p.distanceTo(playerPos);
      const playerFromHome = Math.hypot(playerPos.x - this.home.x, playerPos.z - this.home.z);
      const dHome = Math.hypot(p.x - this.home.x, p.z - this.home.z);
      if (dPlayer < this.aggroRange && playerFromHome < this.leashRange && dPlayer > 1.0) {
        const dir = playerPos.clone().sub(p).setY(0).normalize();
        p.addScaledVector(dir, this.speed * delta);
        this.mesh.lookAt(playerPos.x, p.y, playerPos.z);
        this._animateWalk(delta);
      } else if (dHome > 0.4) {
        const dir = new THREE.Vector3(this.home.x - p.x, 0, this.home.z - p.z).normalize();
        p.addScaledVector(dir, this.speed * delta);
        this.mesh.lookAt(this.home.x, p.y, this.home.z);
        this._animateWalk(delta);
      } else {
        // Vid posten: vänd blicken österut (mot byn) och vänta.
        this.mesh.lookAt(p.x + 1, p.y, p.z);
        this._restPose(delta);
      }
      this.resolveCollisions();
      return;
    }

    const dist = this.mesh.position.distanceTo(playerPos);
    if (dist < 14 && dist > 1.0) {
      const dir = playerPos.clone().sub(this.mesh.position).setY(0).normalize();
      this.mesh.position.addScaledVector(dir, this.speed * delta);
      this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);
      this._animateWalk(delta);
    } else {
      this._restPose(delta);
    }

    this.resolveCollisions();
  }

  resolveCollisions() {
    for (const c of this.colliders) {
      const dx = this.mesh.position.x - c.x;
      const dz = this.mesh.position.z - c.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      const min = c.radius + this.radius;
      if (d < min && d > 0.0001) {
        const push = (min - d) / d;
        this.mesh.position.x += dx * push;
        this.mesh.position.z += dz * push;
      }
    }
    if (this.bounds) {
      this.mesh.position.x = Math.min(this.bounds.maxX, Math.max(this.bounds.minX, this.mesh.position.x));
      this.mesh.position.z = Math.min(this.bounds.maxZ, Math.max(this.bounds.minZ, this.mesh.position.z));
    }
  }

  distanceTo(pos) {
    return this.mesh.position.distanceTo(pos);
  }

  // Enkel gånganimation: sväng armar/ben i motfas medan vätten rör sig.
  _animateWalk(delta) {
    this._walkT += delta * 9;
    const s = Math.sin(this._walkT) * 0.5;
    if (this._legL) this._legL.rotation.x = s;
    if (this._legR) this._legR.rotation.x = -s;
    if (this._armL) this._armL.rotation.x = -s;
    if (this._armR) this._armR.rotation.x = s;
  }

  // Återställ lemmar till vila när vätten står still.
  _restPose(delta) {
    for (const part of [this._legL, this._legR, this._armL, this._armR]) {
      if (part) part.rotation.x += (0 - part.rotation.x) * Math.min(1, delta * 8);
    }
  }

  takeDamage(fromPos) {
    if (!this.alive || this.invuln > 0) return;
    this.hp--;
    this.hitFlash = 0.15;
    this.invuln = 0.6;
    if (fromPos) {
      const dir = this.mesh.position.clone().sub(fromPos).setY(0).normalize();
      this.mesh.position.addScaledVector(dir, 1.6);
    }
    if (this.hp <= 0) this.die();
  }

  die() {
    this.alive = false;
    this.scene.remove(this.mesh);
  }
}