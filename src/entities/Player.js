import * as THREE from 'three';
import { getHeight } from '../world/terrain/Terrain.js';

export class Player {
  constructor(scene, colliders = []) {
    this.mesh = new THREE.Group();

    const tunic = new THREE.MeshLambertMaterial({ color: 0x3366cc });
    const pants = new THREE.MeshLambertMaterial({ color: 0x44403a });
    const skin  = new THREE.MeshLambertMaterial({ color: 0xf0c8a0 });
    const hair  = new THREE.MeshLambertMaterial({ color: 0x5c4023 });

    const legGeo = new THREE.BoxGeometry(0.25, 0.7, 0.25);
    legGeo.translate(0, -0.35, 0);
    this.legL = new THREE.Mesh(legGeo, pants);
    this.legL.position.set(-0.18, -0.2, 0);
    this.legR = this.legL.clone();
    this.legR.position.x = 0.18;

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.4), tunic);
    torso.position.y = 0.15;

    const armGeo = new THREE.BoxGeometry(0.18, 0.6, 0.18);
    armGeo.translate(0, -0.3, 0);
    this.armL = new THREE.Mesh(armGeo, tunic);
    this.armL.position.set(-0.44, 0.45, 0);
    this.armR = this.armL.clone();
    this.armR.position.x = 0.44;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), skin);
    head.position.y = 0.78;
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.29, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.2),
      hair
    );
    hairCap.position.y = 0.82;
    const eyeGeo = new THREE.SphereGeometry(0.04, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.1, 0.83, -0.24);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.1;

    this.mesh.add(this.legL, this.legR, torso, this.armL, this.armR, head, hairCap, eyeL, eyeR);

    this.swordPivot = new THREE.Group();
    this.swordPivot.position.set(0.55, -0.1, 0);
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 1.1),
      new THREE.MeshLambertMaterial({ color: 0xcccccc, emissive: 0x111122 })
    );
    blade.position.z = -0.75;
    const guard = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.07, 0.07),
      new THREE.MeshLambertMaterial({ color: 0xb89b5e })
    );
    guard.position.z = -0.15;
    this.swordPivot.add(blade, guard);
    this.swordPivot.visible = false;
    this.swordPivot.rotation.x = 1.3;
    this.mesh.add(this.swordPivot);

    this.mesh.position.set(0, 150, 0);
    scene.add(this.mesh);

    this.colliders = colliders;
    this.radius = 0.5;

    this.speed = 8;
    this.turnSpeed = 2.5;
    this.keys = {};

    this.heightOffset = 0.9;
    this.velocityY = 0;
    this.gravity = -25;
    this.isFalling = true;

    this.jumpSpeed = 10;
    this.isJumping = false;

    this.groundFn = getHeight;
    this.bounds = null;

    this.walkTime = 0;

    this.hasSword = false;
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.invulnTimer = 0;
    this.maxHp = 5;
    this.hp = this.maxHp;

    // Ljud för svärdsslag och skada
    this.slashSound = new Audio('/audio/swordSlash.mp3');
    this.slashSound.volume = 0.6;
    this.hurtSound = new Audio('/audio/hurt.mp3');
    this.hurtSound.volume = 0.7;

    this.inputEnabled = true;
    this.cameraMaxY = 4.4; // tak för kamerahöjd inomhus (höjs i flervånings-torn)
    this.cameraGroundClearance = 2.2; // håll kameran så här mycket ovanför marken under den
    // Kamerans position relativt spelaren (roteras med blickriktningen). Kan
    // sättas per scen via teleport-env, t.ex. en högre ovanifrån-vy i pusselrum.
    this.cameraOffset = new THREE.Vector3(0, 4, 8);

    window.addEventListener('keydown', e => {
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      if (!this.inputEnabled) return;
      this.keys[e.code] = true;
      if (e.code === 'KeyF') this.attack();
    });
    window.addEventListener('keyup', e => this.keys[e.code] = false);
  }

  setInputEnabled(on) {
    this.inputEnabled = on;
    if (!on) this.keys = {}; // släpp alla intryckta tangenter
  }

  get attackActive() {
    return this.attackTimer > 0;
  }

  equipSword() {
    this.hasSword = true;
    this.swordPivot.visible = true;
  }

  unequipSword() {
    this.hasSword = false;
    this.swordPivot.visible = false;
    this.attackTimer = 0;
  }

  attack() {
    if (!this.hasSword || this.attackCooldown > 0) return;
    this.attackTimer = 0.3;
    this.attackCooldown = 0.55;
    this.slashSound.currentTime = 0;
    this.slashSound.play().catch(() => {});
  }

  takeDamage(fromPos) {
    if (this.invulnTimer > 0) return false;
    this.hp--;
    this.invulnTimer = 1;
    // Spela hurt-ljud (samma autoplay-robusthet som swordSlash)
    this.hurtSound.currentTime = 0;
    this.hurtSound.play().catch(() => {});
    const dir = this.mesh.position.clone().sub(fromPos).setY(0).normalize();
    this.mesh.position.addScaledVector(dir, 1.5);
    return true;
  }

  animateWalk(delta, moving) {
    if (moving) {
      this.walkTime += delta * 9;
      const swing = Math.sin(this.walkTime) * 0.65;
      this.legL.rotation.x = swing;
      this.legR.rotation.x = -swing;
      this.armL.rotation.x = -swing * 0.8;
      this.armR.rotation.x = swing * 0.8;
    } else {
      const ease = Math.min(1, delta * 10);
      this.legL.rotation.x *= 1 - ease;
      this.legR.rotation.x *= 1 - ease;
      this.armL.rotation.x *= 1 - ease;
      this.armR.rotation.x *= 1 - ease;
    }
  }

  update(delta) {
    if (this.attackCooldown > 0) this.attackCooldown -= delta;
    if (this.invulnTimer > 0) this.invulnTimer -= delta;

    if (this.attackTimer > 0) {
      this.attackTimer -= delta;
      const t = 1 - this.attackTimer / 0.3;
      this.swordPivot.rotation.x = 0;
      this.swordPivot.rotation.y = 1.2 - 2.4 * t;
    } else if (this.hasSword) {
      this.swordPivot.rotation.x = 1.3;
      this.swordPivot.rotation.y = 0;
    }

    if (this.isFalling) {
      this.updateFall(delta);
      return;
    }

    if (this.keys['KeyA'] || this.keys['ArrowLeft'])  this.mesh.rotation.y += this.turnSpeed * delta;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) this.mesh.rotation.y -= this.turnSpeed * delta;

    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
    const forward = this.keys['KeyW'] || this.keys['ArrowUp'];
    const backward = this.keys['KeyS'] || this.keys['ArrowDown'];

    if (forward)  this.mesh.position.addScaledVector(dir, this.speed * delta);
    if (backward) this.mesh.position.addScaledVector(dir, -this.speed * delta);

    this.animateWalk(delta, forward || backward);

    const groundLevel = this.groundFn(this.mesh.position.x, this.mesh.position.z) + this.heightOffset;

    if (this.keys['Space'] && !this.isJumping) {
      this.isJumping = true;
      this.velocityY = this.jumpSpeed;
    }

    if (this.isJumping) {
      this.velocityY += this.gravity * delta;
      this.mesh.position.y += this.velocityY * delta;
      if (this.mesh.position.y <= groundLevel) {
        this.mesh.position.y = groundLevel;
        this.velocityY = 0;
        this.isJumping = false;
      }
    } else {
      this.mesh.position.y = groundLevel;
    }

    this.resolveCollisions();

    if (this.bounds) {
      this.mesh.position.x = Math.min(this.bounds.maxX, Math.max(this.bounds.minX, this.mesh.position.x));
      this.mesh.position.z = Math.min(this.bounds.maxZ, Math.max(this.bounds.minZ, this.mesh.position.z));
    }
  }

  updateFall(delta) {
    this.velocityY += this.gravity * delta;
    this.mesh.position.y += this.velocityY * delta;

    const drift = 6 * delta;
    if (this.keys['KeyW'] || this.keys['ArrowUp'])    this.mesh.position.z -= drift;
    if (this.keys['KeyS'] || this.keys['ArrowDown'])  this.mesh.position.z += drift;
    if (this.keys['KeyA'] || this.keys['ArrowLeft'])  this.mesh.position.x -= drift;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) this.mesh.position.x += drift;

    // Knuffas i sidled från t.ex. statyn så man inte landar inuti den
    this.resolveCollisions();

    this.walkTime += delta * 6;
    const flail = Math.sin(this.walkTime) * 0.4;
    this.legL.rotation.x = flail;
    this.legR.rotation.x = -flail;
    this.armL.rotation.x = -2.6 + flail * 0.5;
    this.armR.rotation.x = -2.6 - flail * 0.5;

    const groundLevel = this.groundFn(this.mesh.position.x, this.mesh.position.z) + this.heightOffset;
    if (this.mesh.position.y <= groundLevel) {
      this.mesh.position.y = groundLevel;
      this.velocityY = 0;
      this.isFalling = false;
      this.armL.rotation.x = 0;
      this.armR.rotation.x = 0;
    }
  }

  resolveCollisions() {
    for (const c of this.colliders) {
      const dx = this.mesh.position.x - c.x;
      const dz = this.mesh.position.z - c.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const minDist = c.radius + this.radius;

      if (dist < minDist) {
        if (dist < 0.0001) {
          // Exakt i mitten (t.ex. rakt ovanför statyn) – knuffa ut åt sidan
          this.mesh.position.x += minDist;
        } else {
          const push = (minDist - dist) / dist;
          this.mesh.position.x += dx * push;
          this.mesh.position.z += dz * push;
        }
      }
    }
  }

  teleport(x, z, env = {}) {
    if (env.groundFn) this.groundFn = env.groundFn;
    this.colliders = env.colliders || [];
    this.bounds = env.bounds || null;
    this.cameraMaxY = (env.cameraMaxY != null) ? env.cameraMaxY : 4.4;
    if (env.cameraOffset) this.cameraOffset.set(env.cameraOffset.x, env.cameraOffset.y, env.cameraOffset.z);
    else this.cameraOffset.set(0, 4, 8);  // återställ till standard utomhus/hus
    if (env.faceY != null) this.mesh.rotation.y = env.faceY;
    this.isFalling = false;
    this.isJumping = false;
    this.velocityY = 0;
    this.mesh.position.set(x, this.groundFn(x, z) + this.heightOffset, z);
  }

  updateCamera(camera) {
    if (this.isFalling) {
      camera.position.set(
        this.mesh.position.x + 4,
        this.mesh.position.y + 6,
        this.mesh.position.z + 4
      );
      camera.lookAt(
        this.mesh.position.x,
        this.mesh.position.y - 10,
        this.mesh.position.z
      );
      return;
    }

    const offset = this.cameraOffset.clone().applyQuaternion(this.mesh.quaternion);
    const target = this.mesh.position.clone().add(offset);

    if (this.bounds) {
      target.x = Math.min(this.bounds.maxX, Math.max(this.bounds.minX, target.x));
      target.z = Math.min(this.bounds.maxZ, Math.max(this.bounds.minZ, target.z));
      target.y = Math.min(this.cameraMaxY, target.y);
    }

    // Håll kameran ovanför golvet/trappan som ligger under DEN (inte under
    // spelaren). När man går nedför en trappa sitter kameran uppför bakom
    // spelaren, där marken är högre – utan detta hamnar den inuti trappstegen.
    if (this.groundFn) {
      const groundAtCam = this.groundFn(target.x, target.z) + this.cameraGroundClearance;
      if (target.y < groundAtCam) target.y = groundAtCam;
    }

    camera.position.lerp(target, 0.1);
    camera.lookAt(
      this.mesh.position.x,
      this.mesh.position.y + 1.5,
      this.mesh.position.z
    );
  }
}