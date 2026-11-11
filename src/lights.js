import * as THREE from 'three';

// Iluminação da cena noturna. Quatro tipos de luz:
//  - HemisphereLight: luz ambiente (céu azulado / chão escuro), sem sombra.
//  - DirectionalLight (lua): raios paralelos, sombra com câmera ortográfica.
//  - SpotLight (lâmpada do poste): cone, sombra com câmera perspectiva.
//  - PointLight (neon perto da moto): todas as direções, sombra em cube map (6 renders).
// Intensidades em unidades físicas (three r155+): spot/point em candela, com decay = 2.
export function createLights(scene, renderer, gui) {
  const hemi = new THREE.HemisphereLight(0x8fa4ff, 0x1a1a24, 0.5);
  scene.add(hemi);

  // --- Lua (direcional) ---
  const moon = new THREE.DirectionalLight(0xaec3ff, 1.5);
  moon.position.set(40, 60, 20);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -50, right: 50, top: 50, bottom: -50, near: 1, far: 150 });
  moon.shadow.camera.updateProjectionMatrix();
  moon.shadow.bias = -0.0005;
  scene.add(moon);

  // --- Lâmpada do poste (spot) ---
  // O poste fica em (-9, 0, 38) com 6 de altura e a cúpula começa em y ≈ 5.8.
  // A luz fica logo abaixo da cúpula e um pouco fora do eixo: dentro do tubo do
  // poste o próprio mesh bloquearia o shadow map inteiro.
  const spot = new THREE.SpotLight(0xffc477, 60, 20, THREE.MathUtils.degToRad(50), 0.4, 2);
  spot.position.set(-8.6, 5.5, 38);
  spot.target.position.set(-8, 0, 38);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.camera.near = 0.2;
  spot.shadow.camera.far = 20;
  spot.shadow.bias = -0.0005;
  spot.shadow.normalBias = 0.02;
  scene.add(spot, spot.target);

  // --- Neon perto da moto (point) ---
  const neon = new THREE.PointLight(0xff3cac, 25, 15, 2);
  neon.position.set(11.5, 2.2, 39.5);
  neon.castShadow = true;
  neon.shadow.mapSize.set(512, 512); // cube map: 6 × 512², mantém o custo baixo
  neon.shadow.camera.near = 0.1;
  neon.shadow.camera.far = 15;
  neon.shadow.bias = -0.001;
  neon.shadow.normalBias = 0.02;
  scene.add(neon);

  // Esferas emissivas marcando a fonte de cada luz (não projetam sombra:
  // a luz está dentro delas e o shadow map ficaria todo bloqueado).
  const bulb = (light, radius) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 8),
      new THREE.MeshBasicMaterial({ color: light.color }));
    m.castShadow = false;
    m.receiveShadow = false;
    light.add(m);
    return m;
  };
  const spotBulb = bulb(spot, 0.12);
  const neonBulb = bulb(neon, 0.1);

  // --- Helpers (desligados por padrão) ---
  const helpers = [
    new THREE.DirectionalLightHelper(moon, 5),
    new THREE.CameraHelper(moon.shadow.camera),
    new THREE.SpotLightHelper(spot),
    new THREE.CameraHelper(spot.shadow.camera),
    new THREE.PointLightHelper(neon, 0.4),
  ];
  for (const h of helpers) { h.visible = false; scene.add(h); }

  const state = { helpers: false, shadowType: 'PCFSoft' };
  const shadowTypes = {
    Basic: THREE.BasicShadowMap,
    PCF: THREE.PCFShadowMap,
    PCFSoft: THREE.PCFSoftShadowMap,
    VSM: THREE.VSMShadowMap,
  };

  if (gui) {
    const fl = gui.addFolder('Luzes e sombras');
    fl.add(state, 'helpers').name('Mostrar helpers').onChange((v) => helpers.forEach((h) => { h.visible = v; }));
    fl.add(state, 'shadowType', Object.keys(shadowTypes)).name('Tipo de sombra').onChange((v) => {
      renderer.shadowMap.type = shadowTypes[v];
      // o tipo de filtragem entra no shader: recompila os materiais
      scene.traverse((o) => {
        if (o.material) [].concat(o.material).forEach((m) => { m.needsUpdate = true; });
      });
    });

    const addLight = (folder, light, max, bulbMesh) => {
      folder.add(light, 'visible').name('Ligada');
      folder.add(light, 'intensity', 0, max, 0.1).name('Intensidade');
      folder.addColor(light, 'color').name('Cor').onChange(() => bulbMesh?.material.color.copy(light.color));
      if (light.shadow) folder.add(light, 'castShadow').name('Projeta sombra');
      folder.close();
      return folder;
    };
    addLight(fl.addFolder('Ambiente (hemisphere)'), hemi, 3);
    addLight(fl.addFolder('Lua (directional)'), moon, 5);
    const fs = addLight(fl.addFolder('Poste (spot)'), spot, 200, spotBulb);
    fs.add(spot, 'angle', 0.1, Math.PI / 2, 0.01).name('Abertura (rad)');
    fs.add(spot, 'penumbra', 0, 1, 0.01).name('Penumbra');
    const fn = addLight(fl.addFolder('Neon (point)'), neon, 100, neonBulb);
    fn.add(neon, 'distance', 0, 40, 0.5).name('Alcance');
    fl.close();
  }

  // Helpers precisam acompanhar mudanças de ângulo/cor.
  function update() {
    if (!state.helpers) return;
    for (const h of helpers) h.update?.();
  }

  return { hemi, moon, spot, neon, update };
}
