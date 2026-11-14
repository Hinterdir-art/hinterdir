// Standard-Szene (Platzhalter, bis das Video-Konzept steht).
// Jede Szene exportiert eine Funktion, die eine update(t)-Funktion zurückgibt.
// t = Sekunden seit Videostart. Nur von t abhängig sein (kein Math.random ohne Seed!).

export default function createScene({ THREE, scene, camera, params, brand, duration }) {
  const primary = new THREE.Color(brand.primary_color);
  const accent = new THREE.Color(brand.accent_color);
  const speed = params.speed ?? 1;

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 6, 8);
  scene.add(key);
  const rim = new THREE.PointLight(accent, 40, 30);
  rim.position.set(-5, -3, 4);
  scene.add(rim);

  const geo = params.shape === 'icosahedron'
    ? new THREE.IcosahedronGeometry(2.2, 1)
    : new THREE.TorusKnotGeometry(1.6, 0.55, 220, 32);
  const mat = new THREE.MeshStandardMaterial({ color: primary, metalness: 0.35, roughness: 0.25 });
  const hero = new THREE.Mesh(geo, mat);
  scene.add(hero);

  // Partikel mit festem Seed
  let seed = 42;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const N = 900;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (rand() - 0.5) * 30;
    pos[i * 3 + 1] = (rand() - 0.5) * 50;
    pos[i * 3 + 2] = (rand() - 0.5) * 30 - 5;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: accent, size: 0.06, transparent: true, opacity: 0.8 }));
  scene.add(particles);

  return (t) => {
    const intro = Math.min(1, t / 0.8);                  // Einflug
    const ease = 1 - Math.pow(1 - intro, 3);
    hero.scale.setScalar(0.4 + 0.6 * ease);
    hero.rotation.x = t * 0.4 * speed;
    hero.rotation.y = t * 0.7 * speed;
    hero.position.y = Math.sin(t * 1.3) * 0.25;
    particles.rotation.y = t * 0.03;
    particles.position.y = -t * 0.4;
    camera.position.z = 9 - Math.min(t / duration, 1) * 1.5;   // langsamer Zoom
    camera.lookAt(0, 0, 0);
  };
}
