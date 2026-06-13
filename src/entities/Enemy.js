import * as THREE from 'three';

export class Enemy {
  constructor(scene, { x, z, name = 'Grottvätte', hp = 3, speed = 2.1, scale = 1, color = 0x7a2222 }) {
    this.name = name;
    this.scene = scene;
    this.hp = hp;
    this.speed = speed;
    this.alive = true;
    this.hitFlash = 0;
    this.invuln = 0;
    this.baseColor = color;

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

    const dist = this.mesh.position.distanceTo(playerPos);
    if (dist < 14 && dist > 1.0) {
      const dir = playerPos.clone().sub(this.mesh.position).setY(0).normalize();
      this.mesh.position.addScaledVector(dir, this.speed * delta);
      this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);
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