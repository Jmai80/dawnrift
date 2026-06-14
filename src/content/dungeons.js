import { DungeonScene } from '../world/DungeonScene.js';
import { Enemy } from '../entities/Enemy.js';

// Bygger de tre grottorna med deras pickups och fiende-roster och kopplar dem
// till sina ingångar i världen. Ren data/innehåll – ingen motorlogik här.
export function createDungeons(world) {
  const dungeonNorth = new DungeonScene({ length: 60 });
  const dungeonEast = new DungeonScene({ length: 80 });
  const dungeonDeep = new DungeonScene({ layout: 'complex', bg: 0x070510 });

  dungeonNorth.addPickup('sword', 0, dungeonNorth.endZ,
    { id: 'rostigt_svard', name: 'Torvalds farfars svärd', icon: '🗡️' });
  dungeonEast.addPickup('amulet', 0, dungeonEast.endZ,
    { id: 'forntida_amulett', name: 'Forntida amulett', icon: '🔮' });
  dungeonDeep.addPickup('bow', -9, -20, { id: 'pilbage', name: 'Jägarens pilbåge', icon: '🏹' });
  dungeonDeep.addPickup('potion', 8, -14, { id: 'lakedryck', name: 'Läkedryck', icon: '🧪', usable: true });
  dungeonDeep.addPickup('potion', 9, -22, { id: 'lakedryck', name: 'Läkedryck', icon: '🧪', usable: true });
  dungeonDeep.addPickup('relic', 0, -47, { id: 'gyllene_kalk', name: 'Förgylld kalk', icon: '🏆' });

  return {
    north: {
      sceneObj: dungeonNorth,
      entrance: world.caves[0],
      enemies: [new Enemy(dungeonNorth.scene, {
        x: 0, z: -42, colliders: dungeonNorth.colliders, bounds: dungeonNorth.bounds
      })]
    },
    east: {
      sceneObj: dungeonEast,
      entrance: world.caves[1],
      enemies: [
        new Enemy(dungeonEast.scene, {
          x: -2, z: -35, colliders: dungeonEast.colliders, bounds: dungeonEast.bounds
        }),
        new Enemy(dungeonEast.scene, {
          x: 0, z: -62, name: 'Grottans väktare', hp: 6, speed: 2.4, scale: 1.5,
          color: 0x4a1a5a, colliders: dungeonEast.colliders, bounds: dungeonEast.bounds
        })
      ]
    },
    deep: {
      sceneObj: dungeonDeep,
      entrance: world.caves[2],
      enemies: [
        new Enemy(dungeonDeep.scene, {
          x: -9, z: -25, name: 'Skuggvätte', hp: 3, speed: 2.2,
          colliders: dungeonDeep.colliders, bounds: dungeonDeep.bounds
        }),
        new Enemy(dungeonDeep.scene, {
          x: 8, z: -25, name: 'Skuggvätte', hp: 3, speed: 2.2,
          colliders: dungeonDeep.colliders, bounds: dungeonDeep.bounds
        }),
        new Enemy(dungeonDeep.scene, {
          x: 0, z: -45, name: 'Djupets väktare', hp: 8, speed: 2.5, scale: 1.7,
          color: 0x6a1a3a, colliders: dungeonDeep.colliders, bounds: dungeonDeep.bounds
        })
      ]
    }
  };
}