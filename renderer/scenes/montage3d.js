// Szene „montage3d“ – schnelle Schnitte zwischen mehreren düsteren 3D-Szenen.
// Schnitt alle `shot` Sekunden (Standard 2.6), kurzer Licht-Blitz bei jedem Schnitt.
// params: { shot?: 2.6, order?: ["wald","haus","spuren","gang","gestalt"], accent?: "#E0242E" }

export default function createScene({ THREE, scene, camera, params, brand, duration }) {
  const SHOT = params.shot ?? 2.6;
  const accent = new THREE.Color(params.accent || brand.accent_color || '#E0242E');
  scene.background = new THREE.Color('#040406');
  scene.fog = new THREE.FogExp2('#07070b', 0.06);
  scene.add(new THREE.AmbientLight('#3a4055', 0.35));

  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const noise = (x) => { const s = Math.sin(x * 12.9898) * 43758.5453; return s - Math.floor(s); };
  const mat = (c, r = 0.9) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0 });

  const shots = {};

  // ── Wald bei Nacht ──────────────────────────────────────────
  {
    const g = new THREE.Group();
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mat('#0d1013'));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -2; g.add(ground);
    const trunk = mat('#15161a'), leaf = mat('#0c120f');
    for (let i = 0; i < 70; i++) {
      const x = (rand() - 0.5) * 30, z = -rand() * 45 + 2;
      if (Math.abs(x) < 1.2) continue;
      const h = 5 + rand() * 4;
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, h, 6), trunk);
      t.position.set(x, -2 + h / 2, z); g.add(t);
      const c = new THREE.Mesh(new THREE.ConeGeometry(1 + rand(), h * 0.7, 7), leaf);
      c.position.set(x, -2 + h * 0.75, z); g.add(c);
    }
    const moon = new THREE.DirectionalLight('#8fa6ff', 1.4); moon.position.set(-5, 10, -10); g.add(moon);
    const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), new THREE.MeshBasicMaterial({ color: '#c9d4ff', fog: false }));
    moonDisc.position.set(-6, 9, -40); g.add(moonDisc);
    shots.wald = { g, update: (lt) => { camera.position.set(Math.sin(lt) * 0.2, -0.6, 3 - lt * 1.6); camera.lookAt(0, -0.2, camera.position.z - 10); } };
  }

  // ── Einsamer Hof mit erleuchtetem Fenster ───────────────────
  {
    const g = new THREE.Group();
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mat('#1b1d22'));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -2; g.add(ground);
    const house = new THREE.Mesh(new THREE.BoxGeometry(6, 3.2, 4), mat('#17181c'));
    house.position.set(0, -0.4, -14); g.add(house);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.6, 2.4, 4), mat('#0f0f12'));
    roof.rotation.y = Math.PI / 4; roof.position.set(0, 2.4, -14); g.add(roof);
    const winMat = new THREE.MeshBasicMaterial({ color: '#ffb35c' });
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.9), winMat); win.position.set(-1.4, 0, -11.98); g.add(win);
    const win2 = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.9), new THREE.MeshBasicMaterial({ color: '#0a0a0a' })); win2.position.set(1.4, 0, -11.98); g.add(win2);
    const glow = new THREE.PointLight('#ffb35c', 6, 10, 2); glow.position.set(-1.4, 0, -11); g.add(glow);
    const moon = new THREE.DirectionalLight('#7f93d9', 0.9); moon.position.set(6, 10, 4); g.add(moon);
    shots.haus = { g, update: (lt, k) => {
      camera.position.set(0.4, -0.8, 2 - lt * 1.1); camera.lookAt(0, 0, -14);
      const on = noise(Math.floor(lt * 14) + k * 7) > 0.15;
      winMat.color.set(on ? '#ffb35c' : '#2a1a0a'); glow.intensity = on ? 6 : 0.3;
    } };
  }

  // ── Fußspuren im Schnee ─────────────────────────────────────
  {
    const g = new THREE.Group();
    const snow = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mat('#aab0bd', 1));
    snow.rotation.x = -Math.PI / 2; snow.position.y = -2; g.add(snow);
    const printMat = new THREE.MeshBasicMaterial({ color: '#3a3f4a' });
    const prints = [];
    for (let i = 0; i < 26; i++) {
      const p = new THREE.Mesh(new THREE.CircleGeometry(0.16, 12), printMat);
      p.scale.set(0.7, 1.4, 1); p.rotation.x = -Math.PI / 2;
      p.position.set((i % 2 ? 0.25 : -0.25) + Math.sin(i * 0.4) * 0.4, -1.99, 2 - i * 0.9); g.add(p); prints.push(p);
    }
    const farHouse = new THREE.Mesh(new THREE.BoxGeometry(3, 1.8, 2), mat('#101114')); farHouse.position.set(0.8, -1.1, -26); g.add(farHouse);
    const light = new THREE.DirectionalLight('#9fb0e0', 1.2); light.position.set(-4, 8, 6); g.add(light);
    shots.spuren = { g, update: (lt) => {
      camera.position.set(0, 0.6, 5 - lt * 1.2); camera.lookAt(0, -2, camera.position.z - 6);
      prints.forEach((p, i) => (p.visible = i < 6 + lt * 8));
    } };
  }

  // ── Gang mit flackerndem Licht ──────────────────────────────
  {
    const g = new THREE.Group();
    const wall = mat('#2a2a31'), L = 50, W = 4, H = 5;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, L), mat('#1c1c21', 0.6));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, -H / 2, -L / 2 + 5); g.add(floor);
    const ceil = floor.clone(); ceil.material = wall; ceil.rotation.x = Math.PI / 2; ceil.position.y = H / 2; g.add(ceil);
    for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(L, H), wall); w.rotation.y = -s * Math.PI / 2; w.position.set(s * W / 2, 0, -L / 2 + 5); g.add(w); }
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.4, 0.1), mat('#0d0d10')); door.position.set(0, -0.8, -30); g.add(door);
    const doorGlow = new THREE.PointLight(accent, 14, 14, 1.6); doorGlow.position.set(0, -2, -29.2); g.add(doorGlow);
    const lamps = [];
    for (let i = 0; i < 4; i++) { const l = new THREE.PointLight('#cfd6ff', 10, 11, 1.8); l.position.set(0, H / 2 - 0.4, -2 - i * 7); g.add(l); lamps.push(l); }
    shots.gang = { g, update: (lt, k) => {
      camera.position.set(Math.sin(lt * 0.7) * 0.08, -0.2, 3 - lt * 2.2); camera.lookAt(0, -0.3, camera.position.z - 10);
      lamps.forEach((l, i) => (l.intensity = noise(Math.floor(lt * 18) + i * 13 + k) < 0.15 ? 0.3 : 10));
    } };
  }

  // ── Gestalt im Nebel ────────────────────────────────────────
  {
    const g = new THREE.Group();
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mat('#121418'));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -2; g.add(ground);
    const figMat = new THREE.MeshBasicMaterial({ color: '#000000' });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.5, 4, 10), figMat); body.position.set(0, -0.9, -12); g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), figMat); head.position.set(0, 0.3, -12); g.add(head);
    const back = new THREE.PointLight(accent, 20, 16, 1.5); back.position.set(0, 0, -15); g.add(back);
    const lamp = new THREE.SpotLight('#dfe6ff', 30, 30, 0.5, 0.6); lamp.position.set(0, 6, -8); lamp.target = body; g.add(lamp); g.add(lamp.target);
    shots.gestalt = { g, update: (lt, k) => {
      camera.position.set(0, -0.6, 7 - lt * 1.4); camera.lookAt(0, -0.2, -12);
      lamp.intensity = noise(Math.floor(lt * 12) + k * 3) < 0.2 ? 0 : 30;
    } };
  }

  const order = (params.order || ['wald', 'haus', 'spuren', 'gang', 'gestalt']).filter((n) => shots[n]);
  for (const n of Object.keys(shots)) { shots[n].g.visible = false; scene.add(shots[n].g); }

  // Blitz beim Schnitt (Ebene direkt vor der Kamera)
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(4, 8), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, fog: false, depthTest: false }));
  flash.position.set(0, 0, -0.5); flash.renderOrder = 999; camera.add(flash); scene.add(camera);

  return (t) => {
    const k = Math.floor(t / SHOT), lt = t - k * SHOT;
    const name = order[k % order.length];
    for (const n of order) shots[n].g.visible = n === name;
    shots[name].update(lt, k);
    flash.material.opacity = k > 0 ? Math.max(0, 0.85 - lt / 0.12) : 0;
  };
}
