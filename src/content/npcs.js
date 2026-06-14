import { NPC } from '../entities/NPC.js';
import { RANGE } from '../world/props/shootingRange.js';

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

  const npcs = [elda, torvald, bryn];
  npcs.forEach(n => {
    world.colliders.push({ x: n.mesh.position.x, z: n.mesh.position.z, radius: 0.7 });
    n.mesh.traverse(o => { if (o.isMesh) o.castShadow = true; });
  });

  return { elda, torvald, bryn, npcs };
}