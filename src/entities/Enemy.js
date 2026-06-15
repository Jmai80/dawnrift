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
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 1.1, 0.7),
      this.bodyMat
    );
    body.position.y = 0.55;

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffdd33 });
    const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeMat);
    eye1.position.set(-0.2, 0.85, 0.36);
    const eye2 = eye1.clone();
    eye2.position.x = 0.2;

    this.mesh.add(body, eye1, eye2);
    this.mesh.scale.setScalar(scale);
    this.mesh.position.set(x, 0, z);
    scene.add(this.mesh);
  }

  update(delta, playerPos) {
    if (!this.alive) return;

    if (this.invuln > 0) this.invuln -= delta;
    if (this.hitFlash > 0) {
      this.hitFlash -= delta;
      this.bodyMat.color.setHex(this.hitFlash > 0 ? 0xffffff : this.baseColor);
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
      } else if (dHome > 0.4) {
        const dir = new THREE.Vector3(this.home.x - p.x, 0, this.home.z - p.z).normalize();
        p.addScaledVector(dir, this.speed * delta);
        this.mesh.lookAt(this.home.x, p.y, this.home.z);
      } else {
        // Vid posten: vänd blicken österut (mot byn) och vänta.
        this.mesh.lookAt(p.x + 1, p.y, p.z);
      }
      this.resolveCollisions();
      return;
    }

    const dist = this.mesh.position.distanceTo(playerPos);
    if (dist < 14 && dist > 1.0) {
      const dir = playerPos.clone().sub(this.mesh.position).setY(0).normalize();
      this.mesh.position.addScaledVector(dir, this.speed * delta);
      this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);
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