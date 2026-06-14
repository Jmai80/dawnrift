// Fasta, deterministiska trädpositioner (world-space).
//
// Tidigare placerades träden med Math.random() vid varje start, vilket gjorde att
// de kunde hamna i eller alldeles intill byggnader och flyttade sig mellan körningar.
// Nu är listan fryst: samma positioner varje gång, helt utanför byggnaders
// uteslutningszoner. Eftersom positionerna är fasta kan de refereras stabilt när
// NPC:er och platser i framtiden ska placeras i relation till enskilda träd
// (t.ex. TREE_POSITIONS[7]). Genererad en gång med seedat PRNG + uteslutningszoner.
export const TREE_POSITIONS = [
  { x: 9.86, z: 25.05 },
  { x: 69.01, z: 44.51 },
  { x: 73.14, z: -120.44 },
  { x: 66.92, z: 62.83 },
  { x: -63.22, z: 125.87 },
  { x: 111.88, z: -42.26 },
  { x: 65.85, z: -104.97 },
  { x: 135.43, z: 64.77 },
  { x: 154.93, z: -117.84 },
  { x: 143.39, z: -6.19 },
  { x: -35.6, z: -82.86 },
  { x: 50.32, z: -159.63 },
  { x: -138.45, z: 131.77 },
  { x: 31.67, z: 54.23 },
  { x: 45.31, z: 157.85 },
  { x: 50.17, z: 82.3 },
  { x: -134.67, z: -126.76 },
  { x: -145.84, z: 43.09 },
  { x: -101.84, z: 140.09 },
  { x: -27.94, z: 62.87 },
  { x: -112.25, z: 27.26 },
  { x: -35.42, z: -47.17 },
  { x: 59.81, z: -142.93 },
  { x: 85.41, z: -120.43 },
  { x: 44.19, z: 43.08 },
  { x: 112.94, z: -51.35 },
  { x: 82.33, z: 91.09 },
  { x: 64.02, z: -46.45 },
  { x: 139.97, z: 131.8 },
  { x: -146.19, z: -73.41 },
  { x: -127.36, z: 79.23 },
  { x: -85.28, z: 9.45 },
  { x: -67.11, z: -41 },
  { x: 11.43, z: -65.41 },
  { x: -69.16, z: 5.25 },
  { x: 99.03, z: -0.43 },
  { x: 122.02, z: -155.71 },
  { x: 8.91, z: 124 },
  { x: -81.87, z: 15.77 },
  { x: -94.37, z: 132.07 },
];