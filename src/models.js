import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { buildMaterial, registerMaterial } from './materials.js';

// Os arquivos ficam em /public/models/... (servidos na raiz pelo Vite).
// size: maior dimensão final do modelo na cena (a escala original é arbitrária).
// position: onde fica o centro (x, z) e o chão (y) do modelo.
// textures: { map, normalMap, bumpMap, roughnessMap } aplicadas manualmente (OBJ sem .mtl e FBX
//           sem referências de textura). repeat: repetição UV.
// material: parâmetros do MeshStandardMaterial usados no lugar do material original.
// base: nome da malha que define o CHÃO do modelo (escala, centro e altura são medidos nela;
//       sem isso, usa a caixa do modelo inteiro).
// hide: nomes de malhas a esconder depois de posicionar o modelo.
// Créditos e licenças de cada modelo vão no README.
export const MODELS = [
  // A cidade traz: prédios, um plano de chão branco (Plane_Material.011_0) e uma cúpula-céu
  // com foto panorâmica (Sphere_Material.010_0) cujo fundo desce ~0,27 abaixo da rua.
  // Medir a caixa do modelo inteiro faria a cidade flutuar; por isso alinhamos pelo plano da
  // rua e o escondemos: o asfalto texturizado do terreno passa a ser o chão da cidade.
  { name: 'Cidade noturna (glTF)', format: 'gltf', url: '/models/city/scene.gltf',
    base: 'Plane_Material011_0', hide: ['Plane_Material011_0'],
    size: 60, position: [0, 0, 0], color: 0x4466ff },

  // Poste: o OBJ veio sem textura, mas com UVs (0..1). Usa textura procedural de metal
  // pintado (tools/gerar_texturas.py): cor + bump map (relevo) + mapa de rugosidade.
  { name: 'Poste (OBJ)', format: 'obj', url: '/models/poste/poste.obj',
    textures: {
      map: '/textures/metal_diffuse.jpg',
      bumpMap: '/textures/metal_bump.png',
      roughnessMap: '/textures/metal_roughness.jpg',
    },
    material: { metalness: 0.5, roughness: 1, bumpScale: 2 },
    repeat: [2, 2],
    size: 6, position: [-9, 0, 38], color: 0xff8844 },

  // Moto Akira: textura difusa + normal map (relevo) do autor do modelo.
  // Se o relevo parecer invertido, tente material.normalScale = new THREE.Vector2(1, -1).
  { name: 'Moto Akira (FBX)', format: 'fbx', url: '/models/akira/AM_LP.fbx',
    textures: {
      map: '/models/akira/textures/sketchfab_diffuse.jpg',
      normalMap: '/models/akira/textures/AM_LP_01_-_Default_Normal.png',
    },
    material: { metalness: 0.5, roughness: 0.45 },
    size: 2.2, position: [9, 0, 38], color: 0x44cc88 },
];

function loadRaw(m) {
  return new Promise((resolve, reject) => {
    if (m.format === 'gltf') {
      new GLTFLoader().load(m.url, (g) => resolve(g.scene), undefined, reject);
    } else if (m.format === 'fbx') {
      new FBXLoader().load(m.url, resolve, undefined, reject);
    } else if (m.format === 'obj') {
      const objLoader = new OBJLoader();
      const loadObj = () => objLoader.load(m.url, resolve, undefined, reject);
      if (m.mtl) {
        const base = m.mtl.slice(0, m.mtl.lastIndexOf('/') + 1);
        new MTLLoader().setResourcePath(base).load(m.mtl, (mats) => {
          mats.preload();
          objLoader.setMaterials(mats);
          loadObj();
        }, undefined, reject);
      } else {
        loadObj();
      }
    } else {
      reject(new Error('Formato não suportado: ' + m.format));
    }
  });
}

// Substitui os materiais originais por um MeshStandardMaterial compartilhado pelo modelo.
function applyMaterials(obj, m) {
  if (!m.textures && !m.material) return;
  const mat = buildMaterial({ params: m.material, textures: m.textures, repeat: m.repeat });
  registerMaterial(m.name, mat); // entra no painel "Materiais e texturas"
  obj.traverse((o) => { if (o.isMesh) o.material = mat; });
}

// Se o arquivo não existir (ainda), usa um cubo colorido para a cena continuar funcionando.
function placeholder(m) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: m.color ?? 0xff00ff })));
  return g;
}

// Os nomes passam pelo GLTFLoader (que remove pontos etc.): compara só letras e números.
const clean = (t) => t.replace(/[^A-Za-z0-9]/g, '');
function findByName(root, name) {
  let found = null;
  root.traverse((o) => { if (!found && clean(o.name) === clean(name)) found = o; });
  return found;
}

function normalize(obj, size, position, baseName) {
  obj.updateMatrixWorld(true); // as matrizes dos filhos precisam estar atualizadas antes de medir
  const base = baseName ? findByName(obj, baseName) : null;
  if (baseName && !base) console.warn(`[modelo] malha de base "${baseName}" não encontrada; usando o modelo inteiro`);
  const ref = base ?? obj;

  let box = new THREE.Box3().setFromObject(ref);
  const dims = box.getSize(new THREE.Vector3());
  obj.scale.multiplyScalar(size / Math.max(dims.x, dims.y, dims.z));
  obj.updateMatrixWorld(true);

  box = new THREE.Box3().setFromObject(ref);
  const c = box.getCenter(new THREE.Vector3());
  obj.position.x += position[0] - c.x;
  obj.position.y += position[1] - box.min.y; // apoia o chão do modelo em y = position[1]
  obj.position.z += position[2] - c.z;
}

export async function loadModels(scene, onStatus) {
  await Promise.all(MODELS.map(async (m) => {
    let obj;
    let ok = true;
    try {
      obj = await loadRaw(m);
      applyMaterials(obj, m);
    } catch (err) {
      console.warn(`[modelo] não foi possível carregar ${m.url}`, err);
      obj = placeholder(m);
      ok = false;
    }
    normalize(obj, m.size, m.position, m.base);
    for (const name of m.hide ?? []) {
      const o = findByName(obj, name);
      if (o) o.visible = false;
    }
    obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(obj);
    onStatus(m.name, ok);
  }));
}
