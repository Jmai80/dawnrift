import { RANGE } from '../world/props/shootingRange.js';

// Markörer för minimapen. Grottornas markörer härleds ur world.caves så att de
// aldrig kan hamna fel om en grotta flyttas. Byggnads-/monumentmarkörerna anges
// explicit (deras centrum exponeras inte av WorldScene ännu).
export function buildMinimapMarkers(world) {
  return [
    { x: world.caves[0].x, z: world.caves[0].z, color: '#5ad8ff' },
    { x: world.caves[1].x, z: world.caves[1].z, color: '#c07cff' },
    { x: world.caves[2].x, z: world.caves[2].z, color: '#ff8855' },
    { x: 0, z: 0, color: '#ffe08a' },    // stenstoden
    { x: 15, z: -20, color: '#caa46a' },  // Eldas hus
    { x: -25, z: 10, color: '#caa46a' },  // Torvalds hus
    { x: 30, z: 25, color: '#caa46a' },   // låsta tredje huset
    { x: RANGE.center.x, z: RANGE.center.z, color: '#66ff99' } // skyttebanan
  ];
}