import * as THREE from 'three';
import { loadTexture } from './textures.js';

// Monta um MeshStandardMaterial (PBR) a partir de uma descrição.
//  params:   parâmetros do material (metalness, roughness, bumpScale...)
//  textures: { map, normalMap, bumpMap, roughnessMap } com as URLs das imagens
//  repeat:   repetição UV das texturas
export function buildMaterial({ params = {}, textures = {}, repeat = [1, 1] }) {
  const p = { ...params };
  if (textures.map) p.map = loadTexture(textures.map, { srgb: true, repeat });
  if (textures.normalMap) p.normalMap = loadTexture(textures.normalMap, { repeat });
  if (textures.bumpMap) p.bumpMap = loadTexture(textures.bumpMap, { repeat });
  if (textures.roughnessMap) p.roughnessMap = loadTexture(textures.roughnessMap, { repeat });
  return new THREE.MeshStandardMaterial(p);
}

// Materiais registrados aqui aparecem no painel "Materiais e texturas".
const registry = [];
const SLOTS = ['map', 'normalMap', 'bumpMap', 'roughnessMap'];

export function registerMaterial(name, material) {
  const original = {};
  for (const s of SLOTS) original[s] = material[s];
  registry.push({ name, material, original });
}

// Painel para comparar "com" e "sem" cada mapa (serve para as imagens antes/depois do README).
export function createMaterialControls(gui) {
  const f = gui.addFolder('Materiais e texturas');
  const s = { cor: true, relevo: true, rugosidade: true, normalScale: 1, bumpScale: 2, fator: 1 };

  const refresh = () => {
    for (const { material: m, original: o } of registry) {
      m.map = s.cor ? o.map : null;
      m.normalMap = s.relevo ? o.normalMap : null;
      m.bumpMap = s.relevo ? o.bumpMap : null;
      m.roughnessMap = s.rugosidade ? o.roughnessMap : null;
      m.needsUpdate = true; // mudar um mapa muda o shader (defines USE_MAP etc.)
    }
  };
  f.add(s, 'cor').name('Textura de cor').onChange(refresh);
  f.add(s, 'relevo').name('Relevo (normal / bump)').onChange(refresh);
  f.add(s, 'rugosidade').name('Mapa de rugosidade').onChange(refresh);
  f.add(s, 'normalScale', 0, 3, 0.05).name('Força do normal map').onChange((v) => {
    registry.forEach((r) => r.material.normalScale.set(v, v));
  });
  f.add(s, 'bumpScale', 0, 10, 0.1).name('Força do bump map').onChange((v) => {
    registry.forEach((r) => { r.material.bumpScale = v; });
  });
  // Com roughnessMap, a rugosidade final = roughness × valor do mapa.
  f.add(s, 'fator', 0, 1, 0.01).name('Rugosidade (fator)').onChange((v) => {
    registry.filter((r) => r.original.roughnessMap).forEach((r) => { r.material.roughness = v; });
  });
  f.close();
  return f;
}
