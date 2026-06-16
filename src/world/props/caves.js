import * as THREE from 'three';
import { getHeight } from '../terrain/Terrain.js';

export function addCave(scene, caves, x, z) {
  const y = getHeight(x, z);

  const rock = new THREE.Mesh(
    new THREE.SphereGeometry(6, 16, 12),
    new THREE.MeshLambertMaterial({ color: 0x6b6b6b })
  );
  rock.position.set(x, y, z);
  rock.scale.y = 0.8;
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);

  // Öppningen vetter mot byn (riktning från grottan mot origo).
  const dir = new THREE.Vector3(-x, 0, -z);
  if (dir.lengthSq() < 0.0001) dir.set(0, 0, 1);
  dir.normalize();

  const openX = x + dir.x * 5.9;
  const openZ = z + dir.z * 5.9;

  // Spara grottans center OCH öppningens läge + utåtriktning, så att Game.js
  // kan kräva att spelaren faktiskt står vid öppningen (och kommer utifrån,
  // mot grottan) för att räknas som en ÄKTA ingång – inte bara är nära klippan.
  caves.push({
    x, z,                       // center (bakåtkompatibelt)
    openX, openZ,               // öppningens världsposition
    dirX: dir.x, dirZ: dir.z    // enhetsriktning utåt (från grotta mot byn)
  });

  const opening = new THREE.Mesh(
    new THREE.CircleGeometry(2, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  opening.position.set(openX, y + 1.5, openZ);
  opening.rotation.y = Math.atan2(dir.x, dir.z);
  scene.add(opening);
}