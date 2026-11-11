import * as THREE from 'three';

// Navegação em primeira pessoa.
// Velocidades em unidades/segundo (deslocamento) e rad/segundo (giro por teclado),
// sempre multiplicadas por dt (intervalo entre quadros): independe do frame rate.
export function createNavigation(camera, domElement) {
  const cfg = {
    speed: 6,                 // unidades da cena por segundo
    runMultiplier: 2.5,       // com Shift
    turnSpeed: 1.8,           // rad/s (setas)
    mouseSensitivity: 0.0022, // rad por pixel; o mouse já entrega um deslocamento, não usa dt
    minHeight: 0.5,
  };

  const keys = new Set();
  let yaw = 0;
  let pitch = 0;
  const hint = document.getElementById('hint');

  camera.rotation.order = 'YXZ'; // yaw (Y) antes do pitch (X): evita "roll"

  domElement.addEventListener('click', () => domElement.requestPointerLock());
  document.addEventListener('pointerlockchange', () => {
    hint.style.display = document.pointerLockElement === domElement ? 'none' : 'flex';
  });
  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== domElement) return;
    yaw -= e.movementX * cfg.mouseSensitivity;
    pitch -= e.movementY * cfg.mouseSensitivity;
  });
  window.addEventListener('keydown', (e) => keys.add(e.code));
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  const dir = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const limit = Math.PI / 2 - 0.01;

  function update(dt) {
    if (keys.has('ArrowLeft')) yaw += cfg.turnSpeed * dt;
    if (keys.has('ArrowRight')) yaw -= cfg.turnSpeed * dt;
    if (keys.has('ArrowUp')) pitch += cfg.turnSpeed * dt;
    if (keys.has('ArrowDown')) pitch -= cfg.turnSpeed * dt;
    pitch = THREE.MathUtils.clamp(pitch, -limit, limit);
    camera.rotation.set(pitch, yaw, 0);

    // Direções no plano horizontal (ignoram o pitch)
    forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    right.set(Math.cos(yaw), 0, -Math.sin(yaw));

    dir.set(0, 0, 0);
    if (keys.has('KeyW')) dir.add(forward);
    if (keys.has('KeyS')) dir.sub(forward);
    if (keys.has('KeyD')) dir.add(right);
    if (keys.has('KeyA')) dir.sub(right);
    if (keys.has('KeyE')) dir.y += 1;
    if (keys.has('KeyQ')) dir.y -= 1;

    if (dir.lengthSq() > 0) {
      dir.normalize(); // diagonal não pode ser mais rápida
      const run = keys.has('ShiftLeft') || keys.has('ShiftRight') ? cfg.runMultiplier : 1;
      camera.position.addScaledVector(dir, cfg.speed * run * dt);
    }
    camera.position.y = Math.max(camera.position.y, cfg.minHeight);
  }

  return { cfg, update };
}
