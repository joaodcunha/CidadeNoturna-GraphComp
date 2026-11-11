import * as THREE from 'three';
import GUI from 'lil-gui';

// Modo diagnóstico do pipeline: painel lil-gui + atalhos 1 a 5.
export function createDiagnostics({ renderer, scene, camera }) {
  const state = {
    wireframe: false,
    depth: false,
    backFaceCulling: true,
    frustumView: false,
    frustumCulling: true,
    zFightDemo: false,
    zOffset: 0.00002,
  };
  const stats = { calls: 0, triangles: 0 };

  // [2] Profundidade: material que substitui todos os da cena
  const depthMat = new THREE.MeshDepthMaterial();

  // [4] Frustum da câmera do jogador, visto por uma segunda câmera (de cima)
  const helper = new THREE.CameraHelper(camera);
  helper.frustumCulled = false;
  helper.visible = false;
  scene.add(helper);
  const topCam = new THREE.PerspectiveCamera(50, 1, 1, 1000);
  topCam.position.set(0, 220, 0);
  topCam.up.set(0, 0, -1); // -Z fica para cima na tela
  topCam.lookAt(0, 0, 0);

  // Caso de diagnóstico: dois planos quase coplanares (z-fighting)
  const mk = (color) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshBasicMaterial({ color }));
    p.rotation.x = -Math.PI / 2;
    return p;
  };
  const zA = mk(0xff3344);
  const zB = mk(0x33aaff);
  const zGroup = new THREE.Group();
  zGroup.add(zA, zB);
  zGroup.position.set(0, 0.05, 38);
  zGroup.visible = false;
  scene.add(zGroup);

  // Aplica o estado a todos os objetos (chamar também depois que os modelos carregarem)
  function apply() {
    depthMat.wireframe = state.wireframe;           // [1] também no modo profundidade
    zGroup.visible = state.zFightDemo;
    zB.position.y = state.zOffset;
    const side = state.backFaceCulling ? THREE.FrontSide : THREE.DoubleSide;
    scene.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = state.frustumCulling;       // [5]
      for (const m of [].concat(o.material)) {
        m.wireframe = state.wireframe;              // [1]
        if (m.side !== side) { m.side = side; m.needsUpdate = true; } // [3]
      }
    });
    document.getElementById('divider').style.display = state.frustumView ? 'block' : 'none';
  }

  const gui = new GUI({ title: 'Diagnóstico do pipeline' });
  gui.add(state, 'wireframe').name('[1] Wireframe').onChange(apply);
  gui.add(state, 'depth').name('[2] Profundidade (depth)');
  gui.add(state, 'backFaceCulling').name('[3] Back-face culling').onChange(apply);
  gui.add(state, 'frustumView').name('[4] Frustum (viewport dividida)').onChange(apply);
  gui.add(state, 'frustumCulling').name('[5] Frustum culling').onChange(apply);
  const fc = gui.addFolder('Câmera');
  fc.add(camera, 'fov', 30, 100, 1).onChange(() => camera.updateProjectionMatrix());
  fc.add(camera, 'near', 0.01, 5, 0.01).onChange(() => camera.updateProjectionMatrix());
  fc.add(camera, 'far', 20, 1000, 10).onChange(() => camera.updateProjectionMatrix());
  const fz = gui.addFolder('Caso: z-fighting');
  fz.add(state, 'zFightDemo').name('Planos coplanares').onChange(apply);
  fz.add(state, 'zOffset', 0, 0.001, 0.00001).name('Separação (y)').onChange(apply);

  const shortcuts = { Digit1: 'wireframe', Digit2: 'depth', Digit3: 'backFaceCulling',
                      Digit4: 'frustumView', Digit5: 'frustumCulling' };
  window.addEventListener('keydown', (e) => {
    const key = shortcuts[e.code];
    if (!key || e.repeat) return;
    state[key] = !state[key];
    apply();
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
  });

  // Renderiza a câmera principal (e, se ativo, a vista de cima na metade direita)
  function render() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const mainW = state.frustumView ? Math.floor(w / 2) : w;

    renderer.info.reset(); // autoReset = false: zeramos 1x por quadro
    renderer.setScissorTest(true);

    camera.aspect = mainW / h;
    camera.updateProjectionMatrix();
    renderer.setViewport(0, 0, mainW, h);
    renderer.setScissor(0, 0, mainW, h);
    helper.visible = false;
    scene.overrideMaterial = state.depth ? depthMat : null;
    renderer.render(scene, camera);
    // [5] contadores só da vista principal
    stats.calls = renderer.info.render.calls;
    stats.triangles = renderer.info.render.triangles;
    scene.overrideMaterial = null;

    if (state.frustumView) {
      const sw = w - mainW;
      topCam.aspect = sw / h;
      topCam.updateProjectionMatrix();
      renderer.setViewport(mainW, 0, sw, h);
      renderer.setScissor(mainW, 0, sw, h);
      camera.updateMatrixWorld();
      helper.update();
      helper.visible = true;
      renderer.render(scene, topCam);
    }
  }

  apply();
  return { state, stats, gui, apply, render };
}
