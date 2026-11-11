import * as THREE from 'three';

// Ambiente noturno coerente: neblina na cor do céu + mapa de ambiente (reflexos).
// Sem mapa de ambiente, superfícies metálicas e molhadas só refletem as luzes pontuais
// e ficam "mortas". Aqui geramos um céu noturno com manchas de neon e usamos o PMREM
// (pré-filtragem por rugosidade) para que cada material reflita de acordo com seu roughness.
function buildNightEnvMap(renderer) {
  const envScene = new THREE.Scene();

  // Cúpula com gradiente: azul quase preto no topo, brilho violeta no horizonte
  const R = 50;
  const geo = new THREE.SphereGeometry(R, 32, 16);
  const top = new THREE.Color(0x04061a);
  const horizon = new THREE.Color(0x3a2a6a);
  const bottom = new THREE.Color(0x020308);
  const pos = geo.attributes.position;
  const colors = [];
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / R;
    const c = y > 0 ? horizon.clone().lerp(top, Math.pow(y, 0.6))
                    : horizon.clone().lerp(bottom, Math.pow(-y, 0.5));
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  envScene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));

  // Manchas emissivas (valores > 1 são válidos: o PMREM renderiza em HDR)
  const blob = (hex, k, x, y, z, r) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 8),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k) }));
    m.position.set(x, y, z);
    envScene.add(m);
  };
  blob(0xff3cac, 4, 30, 8, -20, 6);   // neon magenta
  blob(0xffc477, 3, -30, 10, 10, 6);  // âmbar (postes)
  blob(0x33ccff, 2.5, 0, 5, -35, 6);  // ciano

  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(envScene, 0.02).texture;
  pmrem.dispose();
  geo.dispose();
  return tex;
}

export function createEnvironment(scene, renderer, gui) {
  scene.environment = buildNightEnvMap(renderer);
  scene.environmentIntensity = 0.35; // noite: reflexo discreto

  // Mesma cor do fundo da cena: os objetos distantes se dissolvem no céu
  scene.fog = new THREE.FogExp2(0x0b1020, 0.006);

  const f = gui.addFolder('Ambiente');
  f.add(scene, 'environmentIntensity', 0, 2, 0.05).name('Reflexo do ambiente');
  f.add(scene.fog, 'density', 0, 0.03, 0.001).name('Densidade da neblina');
  f.close();
}
