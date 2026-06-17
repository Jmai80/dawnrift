import * as THREE from 'three';
import { getHeight, createTerrain } from './terrain/Terrain.js';
import { addTree, addFlower, addSunflower, addGerbera, addPlanting } from './props/vegetation.js';
import { addHouse, addManor, addTowerHouse, addNorthTower, addGubbeHus, addPuzzleHus, addGuardHall, addSymbolHouse } from './props/houses.js';
import { addCave } from './props/caves.js';
import { addShootingRange } from './props/shootingRange.js';
import { TREE_POSITIONS } from '../content/treePositions.js';

// Gubbens hus: söder om byn, lite öster om hans vandringsring (0, 60).
// Exporteras så att npcs.js kan läsa den utan cirkelimport.
export const GUBBE_HOUSE_POS  = { x: 18, z: 82 };
export const PUZZLE_HOUSE_POS = { x: -8, z: 155 }; // söder om gubbens hus
export const GUARDHALL_POS    = { x: -148, z: 0 };  // nära världens västra kant

export class WorldScene {
  constructor() {
    this.colliders = [];
    this.caves = [];
    this.houseDoors = [];
    this.plantingBeds = []; // för framtida 'gräv här'-funktion

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87b5d8);
    this.scene.fog = new THREE.Fog(0x87b5d8, 60, 250);

    this.scene.add(new THREE.AmbientLight(0x8899bb, 0.85));

    this.sunOffset = new THREE.Vector3(35, 140, 30);
    this.sunTarget = new THREE.Object3D();
    this.scene.add(this.sunTarget);

    this.sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
    this.sun.position.copy(this.sunOffset);
    this.sun.target = this.sunTarget;
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45;
    sc.near = 5; sc.far = 400;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.4;
    this.scene.add(this.sun);

    const terrain = createTerrain();
    terrain.receiveShadow = true;
    this.scene.add(terrain);

    this.addMonument();

    addFlower(this.scene, 2.8, 1.4, 1.0);
    addFlower(this.scene, -2.2, 2.6, 0.65);

    // Gerberor (lila) i tre klungor för att bryta av mot de röda blommorna
    // vid stenstoden och de gula solrosarna vid herrgården.
    // Klunge 1: nordost om stenstoden, längs stigen mot Eldas hus.
    addGerbera(this.scene,  6,  -6);
    addGerbera(this.scene,  8,  -4);
    addGerbera(this.scene,  5,  -9, 1.2);
    addGerbera(this.scene,  9, -10, 0.85);
    // Klunge 2: söder om byn – längs gubbens vandringsring (0, 60).
    addGerbera(this.scene,  4,  42);
    addGerbera(this.scene, -3,  45, 1.1);
    addGerbera(this.scene,  7,  50, 0.9);
    addGerbera(this.scene, -6,  52, 1.15);
    addGerbera(this.scene,  2,  56);
    // Klunge 3: väster om Torvalds hus, mot skogen.
    addGerbera(this.scene, -32, 18, 1.0);
    addGerbera(this.scene, -35, 22, 0.9);
    addGerbera(this.scene, -30, 25, 1.1);

    addHouse(this.scene, this.colliders, this.houseDoors, 15, -20, { owner: 'elda' });
    addHouse(this.scene, this.colliders, this.houseDoors, -25, 10, { owner: 'torvald' });
    addHouse(this.scene, this.colliders, this.houseDoors, 30, 25, { owner: 'finalhouse', locked: true });
    addManor(this.scene, this.colliders, this.houseDoors, 0, -48);



// litet tornhus öster om herrgården

    addTowerHouse(
  this.scene,
  this.colliders,
  this.houseDoors,
  18, -48);

    // Gubbens slitna lilla hus söder om byn
    addGubbeHus(this.scene, this.colliders, this.houseDoors,
      GUBBE_HOUSE_POS.x, GUBBE_HOUSE_POS.z);

    // Pussel-huset: den hemliga platsen kartan visar. Längre söderut,
    // en bit bort från allt annat. Blommor i varierande storlek utanför.
    const ph = PUZZLE_HOUSE_POS;
    addPuzzleHus(this.scene, this.colliders, this.houseDoors, ph.x, ph.z);
    // Blommor framför entrén (södra sidan, z + 12 = framsidan)
    addGerbera   (this.scene, ph.x - 7,   ph.z + 13.5, 1.3);
    addGerbera   (this.scene, ph.x - 5,   ph.z + 14.2, 0.8);
    addGerbera   (this.scene, ph.x + 6,   ph.z + 13.8, 1.1);
    addGerbera   (this.scene, ph.x + 8,   ph.z + 13.2, 0.9);
    addSunflower (this.scene, ph.x - 9,   ph.z + 12.5, 1.2);
    addSunflower (this.scene, ph.x + 9.5, ph.z + 12.8, 1.0);
    addSunflower (this.scene, ph.x - 6.5, ph.z + 15.0, 0.85);
    addFlower    (this.scene, ph.x - 3,   ph.z + 13.6, 0.9);
    addFlower    (this.scene, ph.x + 2,   ph.z + 14.0, 1.1);
    addFlower    (this.scene, ph.x + 4,   ph.z + 13.3, 0.75);
    addFlower    (this.scene, ph.x - 1,   ph.z + 15.1, 1.2);
    addFlower    (this.scene, ph.x + 7,   ph.z + 15.5, 0.8);

    // Väktarhallen rakt västerut (dörr på östra sidan, mot byn)
    addGuardHall(this.scene, this.colliders, this.houseDoors,
      GUARDHALL_POS.x, GUARDHALL_POS.z);

    addSunflower(this.scene, -8,   -41, 1.0);
    addSunflower(this.scene, -5,   -41, 1.15);
    addSunflower(this.scene, -2,   -41, 0.9);
    addSunflower(this.scene,  2,   -41, 1.1);
    addSunflower(this.scene,  5,   -41, 0.95);
    addSunflower(this.scene,  8,   -41, 1.2);
    addSunflower(this.scene, -7.5, -55, 0.85);
    addSunflower(this.scene,  7.5, -55, 0.9);

    // Fasta trädpositioner (se content/treePositions.js): samma varje start och
    // garanterat utanför byggnaders uteslutningszoner.
    for (const t of TREE_POSITIONS) {
      addTree(this.scene, this.colliders, t.x, t.z);
    }

    addCave(this.scene, this.caves, 10, -120);
    addCave(this.scene, this.caves, 140, 10);
    addCave(this.scene, this.caves, -100, 115);

    // Fyra väderstreckstorn (samma switchback-interiör, NorthTowerScene, men
    // olika färg + owner). Norr (grön), söder (sandstensbrun), öster (rödaktig),
    // väster (blågrå). Alla nära världens kant i sitt väderstreck.
    addNorthTower(this.scene, this.colliders, this.houseDoors, 10, -175,
      { owner: 'tower2', stone: 0x5f6f63, roof: 0x33474a, wood: 0x3a4030, base: 0x4c544a });
    addNorthTower(this.scene, this.colliders, this.houseDoors, 10, 175,
      { owner: 'tower3', stone: 0x8a7a5c, roof: 0x5a4634, wood: 0x4a3a26, base: 0x6a5c44 });
    addNorthTower(this.scene, this.colliders, this.houseDoors, 175, -10,
      { owner: 'tower4', stone: 0x8a5f5a, roof: 0x5a3330, wood: 0x432826, base: 0x6a4844 });
    addNorthTower(this.scene, this.colliders, this.houseDoors, -175, 30,
      { owner: 'tower5', stone: 0x5c6a7a, roof: 0x33424a, wood: 0x2a343a, base: 0x44525a });

    // Fyra planteringsbäddar halvvägs mellan tornen (diagonala hörn), lika nära
    // världskanten som tornen (~175 från centrum). Blandning av blommor + större
    // stenar; bäddarnas lägen sparas i plantingBeds för en kommande gräv-funktion.
    const kp = 175 / Math.SQRT2; // ~123.7 per axel => hypot ~175
    addPlanting(this.scene, this.colliders,  kp, -kp, this.plantingBeds); // NÖ (mellan norr & öster)
    addPlanting(this.scene, this.colliders,  kp,  kp, this.plantingBeds); // SÖ (mellan söder & öster)
    addPlanting(this.scene, this.colliders, -kp,  kp, this.plantingBeds); // SV (mellan söder & väster)
    addPlanting(this.scene, this.colliders, -kp, -kp, this.plantingBeds); // NV (mellan norr & väster)

    // Symbolhuset: avlägset, mystiskt stenhus i kartans tomma nordvästra trakt.
    // Inrymmer minnes-/symbolpusslet.
    addSymbolHouse(this.scene, this.colliders, this.houseDoors, -60, -160);

    // Skyttebana öster om tornet, norr om östra grottan (på utplattad mark).
    this.archeryTarget = addShootingRange(this.scene, this.colliders, this.houseDoors);
  }

  addMonument() {
    const y0 = getHeight(0, 0);
    const stone = new THREE.MeshLambertMaterial({ color: 0x8a8780 });
    const g = new THREE.Group();

    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 0.5, 8), stone);
    base.position.y = 0.25; base.castShadow = true; base.receiveShadow = true;
    const base2 = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.9, 0.5, 8), stone);
    base2.position.y = 0.75; base2.castShadow = true;
    const obelisk = new THREE.Mesh(new THREE.BoxGeometry(1.0, 4.2, 1.0), stone);
    obelisk.position.y = 3.1; obelisk.castShadow = true;
    g.add(base, base2, obelisk);

    const symMat = new THREE.MeshBasicMaterial({ color: 0x66ddff });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.06, 10, 24), symMat);
    ring.position.set(0, 3.4, 0.55);
    g.add(ring);
    const barGeo = new THREE.BoxGeometry(0.06, 0.8, 0.04);
    for (let k = -1; k <= 1; k++) {
      const bar = new THREE.Mesh(barGeo, symMat);
      bar.position.set(k * 0.18, 3.4, 0.56);
      g.add(bar);
    }

    g.position.set(0, y0, 0);
    this.scene.add(g);

    this.monumentGlow = new THREE.PointLight(0x66ddff, 6, 14);
    this.monumentGlow.position.set(0, y0 + 3.4, 1.2);
    this.scene.add(this.monumentGlow);

    this.monumentPos = new THREE.Vector3(0, y0, 0);
    this.colliders.push({ x: 0, z: 0, radius: 2.4 });
    this.monumentText = '<b>Stenstoden:</b> En sliten obelisk reser sig mitt i byn. På framsidan lyser samma symbol som i Torvalds bok — en cirkel genomborrad av tre streck. Stenen känns märkligt varm. Något verkar vänta på att väckas.';
    this._monumentGroup = g;
    this._monumentAwake = false;
  }

  // Väcks när spelaren avslöjat symbolens mening i väktarhallens altare.
  // Stoden skiftar från cyan till gyllene sken och texten uppdateras.
  awakenMonument() {
    if (this._monumentAwake) return;
    this._monumentAwake = true;
    if (this.monumentGlow) { this.monumentGlow.color.set(0xffcc44); this.monumentGlow.distance = 20; }
    // Färga symbolens lysande streck gyllene (de basmaterial som är cyan)
    this._monumentGroup.traverse(o => {
      if (o.material && o.material.color && o.material.color.getHex() === 0x66ddff) {
        o.material.color.set(0xffcc44);
      }
    });
    this.monumentText = '<b>Stenstoden (vaken):</b> Symbolen lyser nu gyllene. Du förstår den äntligen — cirkeln är byn, förseglad, och de tre strecken var de tre grottorna du tömt. Stoden har vaknat, och något i den tycks peka vidare mot de förseglade dörrarna i byn.';
  }

  updateSun(p) {
    this.sun.position.set(
      p.x + this.sunOffset.x,
      p.y + this.sunOffset.y,
      p.z + this.sunOffset.z
    );
    this.sunTarget.position.set(p.x, p.y, p.z);
    this.sunTarget.updateMatrixWorld();

    if (this.monumentGlow) {
      const base = this._monumentAwake ? 7 : 4;
      this.monumentGlow.intensity = base + Math.sin(Date.now() * 0.002) * 2;
    }
  }
}