import * as THREE from 'three';
import { createNavigation } from './navigation.js';
import { createDiagnostics } from './diagnostics.js';
import { loadModels } from './models.js';
import { createLights } from './lights.js';
import { initTextures } from './textures.js';
import { buildMaterial, registerMaterial, createMaterialControls } from './materials.js';
import { createEnvironment } from './environment.js';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.info.autoReset = false; // o modo diagnóstico faz o reset manualmente
document.body.appendChild(renderer.domElement);

// --- Cena e câmera ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 150);
camera.position.set(0, 1.7, 50); // altura dos olhos, olhando para -Z

// --- Terreno: asfalto molhado (M3) ---
// Textura de cor + normal map (relevo do grão) + mapa de rugosidade (poças = liso, seco = áspero).
// O PlaneGeometry tem UV 0..1; repeat 60 repete a textura 60x (1 tile = 5 unidades).
initTextures(renderer);
const groundMat = buildMaterial({
  params: { metalness: 0, roughness: 1 },
  textures: {
    map: '/textures/asfalto_diffuse.jpg',
    normalMap: '/textures/asfalto_normal.png',
    roughnessMap: '/textures/asfalto_roughness.jpg',
  },
  repeat: [60, 60],
});
registerMaterial('Asfalto (terreno)', groundMat);
// y = -0.02 evita z-fighting com a base dos modelos, que ficam em y = 0.
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(300, 300),
  groundMat,
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.02;
ground.receiveShadow = true;
scene.add(ground);

// --- Módulos ---
const nav = createNavigation(camera, renderer.domElement);
const diag = createDiagnostics({ renderer, scene, camera });
const lights = createLights(scene, renderer, diag.gui); // luzes e sombras: ver lights.js
createEnvironment(scene, renderer, diag.gui);           // neblina + reflexos: ver environment.js
createMaterialControls(diag.gui);                       // painel de materiais: ver materials.js

const modelStatus = {};
loadModels(scene, (name, ok) => { modelStatus[name] = ok; }).then(() => diag.apply());

window.addEventListener('resize', () => renderer.setSize(window.innerWidth, window.innerHeight));

// --- HUD ---
const hud = document.getElementById('hud');
let hudTime = 0;
let hudFrames = 0;
function updateHud(dt) {
  hudTime += dt;
  hudFrames++;
  if (hudTime < 0.25) return;
  const models = Object.entries(modelStatus)
    .map(([n, ok]) => `  ${ok ? '✔' : '✖ (placeholder)'} ${n}`).join('\n');
  hud.textContent =
    `FPS ${Math.round(hudFrames / hudTime)}\n` +
    `Draw calls ${diag.stats.calls} · Triângulos ${diag.stats.triangles}\n` +
    `Frustum culling ${diag.state.frustumCulling ? 'ON' : 'OFF'}\n` +
    `Modelos:\n${models}\n\n` +
    `WASD mover · Q/E descer/subir · Shift correr · setas/mouse girar\n` +
    `1 Wireframe · 2 Depth · 3 Back-face · 4 Frustum · 5 Frustum culling`;
  hudTime = 0;
  hudFrames = 0;
}

// --- Loop ---
// THREE.Timer: update() uma vez por quadro, ANTES de getDelta().
const timer = new THREE.Timer();
renderer.setAnimationLoop((timestamp) => {
  timer.update(timestamp);
  const dt = Math.min(timer.getDelta(), 0.1); // limita saltos (ex.: aba em segundo plano)
  nav.update(dt);
  lights.update();
  diag.render();
  updateHud(dt);
});
