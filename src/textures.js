import * as THREE from 'three';

// Carregamento de texturas com as configurações que todas as texturas do projeto usam.
const loader = new THREE.TextureLoader();
let maxAnisotropy = 1;

// Chamar uma vez, depois de criar o renderer.
export function initTextures(renderer) {
  maxAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
}

// srgb: true só para mapas de COR (diffuse). Normal, relevo e rugosidade guardam
//       dados, não cores, e precisam ficar em espaço linear.
// repeat: quantas vezes a textura se repete sobre as coordenadas UV (0..1).
export function loadTexture(url, { srgb = false, repeat = [1, 1] } = {}) {
  const t = loader.load(url);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = maxAnisotropy; // evita borrar o chão em ângulos rasantes
  return t; // mipmaps: gerados automaticamente (generateMipmaps = true)
}
