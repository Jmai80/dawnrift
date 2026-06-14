import * as THREE from 'three';

export function getHeight(x, z) {
  let h =
    Math.sin(x * 0.04) * Math.cos(z * 0.04) * 6 +
    Math.sin(x * 0.013 + 5) * Math.cos(z * 0.019 + 2) * 10 +
    Math.sin(x * 0.09) * Math.sin(z * 0.07) * 1.5;

  const dist = Math.sqrt(x * x + z * z);
  const factor = THREE.MathUtils.smoothstep(dist, 30, 90);
  h *= factor;

  // Platta ut en generös disk runt skyttebanan så HELA banan (stuga, bana,
  // tavla, kameralägen) ligger djupt i den platta delen, långt från den
  // lutande kanten. Centrum matchar RANGE.center i props/shootingRange.js.
  const rd = Math.hypot(x - 78, z + 21);
  h *= THREE.MathUtils.smoothstep(rd, 24, 44);

  return h;
}

export function createTerrain() {
  const geo = new THREE.PlaneGeometry(400, 400, 128, 128);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, getHeight(pos.getX(i), pos.getZ(i)));
  }
  geo.computeVertexNormals();

  return new THREE.Mesh(
    geo,
    new THREE.MeshLambertMaterial({ color: 0x4a7c3f })
  );
}