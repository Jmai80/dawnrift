import { RANGE } from '../world/props/shootingRange.js';
import { GUBBE_HOUSE_POS, PUZZLE_HOUSE_POS } from '../world/WorldScene.js';

export function buildMinimapMarkers(world) {
  return [
    { x: world.caves[0].x, z: world.caves[0].z, color: '#5ad8ff' },
    { x: world.caves[1].x, z: world.caves[1].z, color: '#c07cff' },
    { x: world.caves[2].x, z: world.caves[2].z, color: '#ff8855' },
    { x: 0, z: 0, color: '#ffe08a' },
    { x: 15, z: -20, color: '#caa46a' },
    { x: -25, z: 10, color: '#caa46a' },
    { x: 30, z: 25, color: '#caa46a' },
    { x: RANGE.center.x, z: RANGE.center.z, color: '#66ff99' },
    { x: GUBBE_HOUSE_POS.x,  z: GUBBE_HOUSE_POS.z,  color: '#b09070' },
    // Fyra väderstreckstorn – ritas som schacktorn (rook) i sin unika färg.
    { x: 10,   z: -175, color: '#88ffd8', shape: 'rook' }, // norr
    { x: 10,   z: 175,  color: '#ffd24a', shape: 'rook' }, // söder
    { x: 175,  z: -10,  color: '#ff5a6a', shape: 'rook' }, // öster
    { x: -175, z: 30,   color: '#5a8aff', shape: 'rook' }, // väster
    // Pussel-huset visas bara efter att kartan hittats (ändras dynamiskt av Game.js)
  ];
}