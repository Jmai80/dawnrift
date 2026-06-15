import { NPC } from '../entities/NPC.js';
import { RANGE } from '../world/props/shootingRange.js';
import { GUBBE_HOUSE_POS } from '../world/WorldScene.js';

// Gubbens vandringsring – exporteras så att Game.js kan läsa centrumet för
// sin quest-logik (t.ex. "promenera till huset söder om här").
export const GUBBE_RING = { x: 0, z: 60, radius: 5, speed: 1 };

// Skapar byns NPC:er, registrerar deras colliders i världen och slår på skuggor.
// Returnerar dem både namngivna (för quest-skript) och som lista (för loopar).
export function createNPCs(world) {
  const elda = new NPC(world.scene, {
    x: 12, z: -16, name: 'Elda', color: 0xaa3355, variant: 'dress',
    lines: [
      'Välkommen till Dawnrift, främling. Du föll bokstavligen från himlen!',
      'Det sägs att grottorna i bergen gömmer både skatter och faror.',
      'Var försiktig där ute.'
    ]
  });
  const torvald = new NPC(world.scene, {
    x: -22, z: 7, name: 'Torvald', color: 0x336655,
    lines: [
      'Min farfar gick in i grottan norrut. Han kom aldrig tillbaka...',
      'Om du hittar hans gamla svärd, får du gärna behålla det.'
    ]
  });
  // Bryn – bågskytteinstruktör vid skyttebanan. Repliker är fallback; den
  // kontextkänsliga dialogen (bågkrav, träningsframsteg) sköts i Game.js.
  const bryn = new NPC(world.scene, {
    x: RANGE.npc.x, z: RANGE.npc.z, name: 'Bryn', color: 0x556b2f,
    lines: ['Välkommen till skyttebanan. Sikta lugnt och andas ut.']
  });
  bryn.faceToward({ x: RANGE.target.x, z: RANGE.target.z }); // blicka mot tavlan tills spelaren kommer

  // Den förvirrade gubben – en viktig figur som traskar virrigt runt i en ring
  // söder om byns mitt (söder = +z; jfr kompassens S nedåt på minimapen).
  // Ringens centrum ligger ungefär mitt emellan byns mitt (0,0) och minimapens
  // södra kant. Mansformad som Torvald/spelaren men med hatt och stora glasögon.
  const gubbe = new NPC(world.scene, {
    x: GUBBE_RING.x + GUBBE_RING.radius, z: GUBBE_RING.z,
    name: 'Den förvirrade gubben', color: 0x6b5a7a, variant: 'oldman',
    wander: GUBBE_RING,
    lines: [
      // Rad 0 – första mötet: han vet att han letar men vet inte efter vad
      'Va? Vem är du? Förlåt... jag... jag letar efter något. Något viktigt. Det borde finnas i mitt hus — sydost härifrån — men jag minns inte vad det är.',
      // Rad 1 – efter att spelaren hittat prylen (sätts dynamiskt av Game.js)
      'Du hittade den! Min medaljon... min hustrus medaljon. Plötsligt minns jag allt. Vänta — ta den här kartan. Den leder till en plats som ingen utom jag känner till.',
      // Rad 2 – efter att kartan delats ut
      'Kartan pekar mot en plats djupt i skogen söderut. Var försiktig. Jag vet inte vad som väntar där nu.',
    ]
  });

  // --- Placeholder-NPC:er (ännu utan spelfunktion) -------------------------
  // Placerade långt från byn på i dagsläget outforskad mark. De har bara
  // fallback-repliker; ingen quest- eller specialhantering i Game.js krävs,
  // eftersom dialogen drivs helt av lines-arrayen för NPC:er utan specialfall.
  // Koordinatrymden är ±200 (terrängplanet är 400×200), och båda lägena
  // undviker terrängens utplattningsdiskar (skyttebana, pusselhus, väktarhall).

  // Vandraren – långt i nordväst, öppen mark bortom byn och väktarhallen.
  const vandraren = new NPC(world.scene, {
    x: -95, z: -95, name: 'Vandraren', color: 0x7a6a4a, variant: 'man',
    lines: ['Hej hej. Jag bara vilar benen en stund.']
  });

  // Eremiten – långt i sydöst, bortom skogen och allt nuvarande innehåll.
  const eremiten = new NPC(world.scene, {
    x: 130, z: 120, name: 'Eremiten', color: 0x4a6a7a, variant: 'oldman',
    lines: ['Hej hej. Få ser hela vägen hit ut.']
  });

  const npcs = [elda, torvald, bryn, gubbe, vandraren, eremiten];
  npcs.forEach(n => {
    // Vandrande NPC:er får ingen fast collider (den skulle ligga kvar där de
    // spawnade); de andra får en som förut.
    if (!n.wander) world.colliders.push({ x: n.mesh.position.x, z: n.mesh.position.z, radius: 0.7 });
    n.mesh.traverse(o => { if (o.isMesh) o.castShadow = true; });
  });

  return { elda, torvald, bryn, gubbe, vandraren, eremiten, npcs };
}