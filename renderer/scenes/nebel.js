// Szene „nebel“ – düsterer Gang im Nebel, flackerndes Licht, eine Tür am Ende,
// hinter der etwas wartet. Passend zu „wahre unheimliche Fälle“.
// params: { speed?: 1, accent?: "#8B0000", flicker?: 1 }

export default function createScene({ THREE, scene, camera, params, brand, duration }) {
  const speed = params.speed ?? 1;
  const accent = new THREE.Color(params.accent || brand.accent_color || '#8B0000');
  const flickerAmount = params.flicker ?? 1;

  scene.background = new THREE.Color('#050507');
  scene.fog = new THREE.FogExp2('#0a0a0e', 0.055);

  // Gang: Boden, Decke, Wände
  const wallMat = new THREE.MeshStandardMaterial({ color: '#2a2a31', roughness: 0.95, metalness: 0 });
  const floorMat = new THREE.MeshStandardMaterial({ color: '#1c1c21', roughness: 0.6, metalness: 0.1 });
  const L = 60, W = 4, H = 5;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, L), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, -H / 2, -L / 2 + 5); scene.add(floor);
  const ceil = floor.clone(); ceil.material = wallMat; ceil.rotation.x = Math.PI / 2; ceil.position.y = H / 2; scene.add(ceil);
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(L, H), wallMat);
    wall.rotation.y = -side * Math.PI / 2; wall.position.set(side * W / 2, 0, -L / 2 + 5); scene.add(wall);
  }

  // Türrahmen-Pfeiler in regelmäßigen Abständen (Tiefe)
  const pillarMat = new THREE.MeshStandardMaterial({ color: '#232329', roughness: 0.9 });
  for (let z = 0; z > -50; z -= 6) {
    for (const side of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, H, 0.4), pillarMat);
      p.position.set(side * (W / 2 - 0.15), 0, z); scene.add(p);
    }
  }

  // Tür am Ende mit Lichtspalt
  const doorZ = -40;
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.4, 0.1), new THREE.MeshStandardMaterial({ color: '#0d0d10', roughness: 0.7 }));
  door.position.set(0, -H / 2 + 1.7, doorZ); scene.add(door);
  const gap = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.06), new THREE.MeshBasicMaterial({ color: accent }));
  gap.position.set(0, -H / 2 + 0.04, doorZ + 0.06); gap.rotation.x = -Math.PI / 2; scene.add(gap);
  const doorGlow = new THREE.PointLight(accent, 14, 14, 1.6); doorGlow.position.set(0, -H / 2 + 0.3, doorZ + 0.8); scene.add(doorGlow);

  // Deckenlampen (flackern)
  scene.add(new THREE.AmbientLight('#404050', 0.3));
  const lamps = [];
  for (let i = 0; i < 6; i++) {
    const z = -2 - i * 7;
    const light = new THREE.PointLight('#cfd6ff', 10, 11, 1.8); light.position.set(0, H / 2 - 0.4, z); scene.add(light);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.25), new THREE.MeshBasicMaterial({ color: '#dfe5ff' }));
    bulb.position.set(0, H / 2 - 0.05, z); scene.add(bulb);
    lamps.push({ light, bulb, base: 10, seed: i * 13.37 });
  }

  // Staub/Partikel (Seed-Zufall)
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const N = 500, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (rand() - 0.5) * W; pos[i * 3 + 1] = (rand() - 0.5) * H; pos[i * 3 + 2] = -rand() * 45 + 4; }
  const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dGeo, new THREE.PointsMaterial({ color: '#9aa0b5', size: 0.03, transparent: true, opacity: 0.5 }));
  scene.add(dust);

  // Schatten-Silhouette, die gegen Ende kurz in der Tür auftaucht
  const shadow = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.6, 4, 8), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0 }));
  shadow.position.set(0, -H / 2 + 1.2, doorZ + 0.3); scene.add(shadow);

  // deterministisches „Rauschen“ fürs Flackern
  const noise = (x) => { const s = Math.sin(x * 12.9898) * 43758.5453; return s - Math.floor(s); };

  return (t) => {
    const p = Math.min(t / duration, 1);
    // Kamera gleitet langsam den Gang entlang, leichtes Atmen/Wackeln
    camera.position.set(Math.sin(t * 0.7) * 0.08, Math.sin(t * 1.1) * 0.05 - 0.2, 4 - p * 22 * speed);
    camera.lookAt(Math.sin(t * 0.3) * 0.15, -0.3, camera.position.z - 10);

    for (const l of lamps) {
      const k = Math.floor(t * 18 + l.seed);
      const off = noise(k) < 0.12 * flickerAmount ? 0.05 : 1;          // kurze Aussetzer
      const v = l.base * off * (0.85 + 0.15 * noise(k * 0.37));
      l.light.intensity = v;
      l.bulb.material.color.setScalar(off < 1 ? 0.15 : 0.9);
    }
    doorGlow.intensity = 12 + Math.sin(t * 2.2) * 4;
    dust.position.y = Math.sin(t * 0.2) * 0.2;
    // Silhouette im letzten Viertel kurz sichtbar
    const s = (p - 0.75) / 0.25;
    shadow.material.opacity = s > 0 && s < 1 ? Math.sin(s * Math.PI) * 0.9 : 0;
  };
}
