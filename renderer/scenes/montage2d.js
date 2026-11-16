// Szene „montage2d“ – flacher Scherenschnitt-/Comic-Stil (2D) mit schnellen Schnitten.
// Silhouetten in Schwarz auf düsterem Verlauf, rote Akzente, Filmkorn, Vignette, Parallax.
// params: { shot?: 2.6, order?: ["mond","haus","spuren","tuer","gestalt"], accent?: "#E0242E" }

export default function createScene({ THREE, scene, camera, renderer, params, brand, duration }) {
  const SHOT = params.shot ?? 2.6;
  const accent = params.accent || brand.accent_color || '#E0242E';
  const W = 1080, H = 1920;

  // Orthografische Kamera: 1 Einheit = 1 Pixel, Mitte = (0,0)
  const cam = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -10, 10);
  camera.position.set(0, 0, 5); // Perspektiv-Kamera bleibt ungenutzt
  scene.background = new THREE.Color('#06060a');
  scene.fog = null;

  let seed = 23;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const noise = (x) => { const s = Math.sin(x * 12.9898) * 43758.5453; return s - Math.floor(s); };
  const flat = (c, o = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: o < 1, opacity: o });
  const shape = (pts, m) => { const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))); return new THREE.Mesh(new THREE.ShapeGeometry(s), m); };

  // Verlaufs-Hintergrund als Textur
  const gradTex = (top, bottom) => {
    const c = document.createElement('canvas'); c.width = 4; c.height = 256;
    const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, top); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const sky = (top, bottom) => new THREE.Mesh(new THREE.PlaneGeometry(W * 1.4, H * 1.4), new THREE.MeshBasicMaterial({ map: gradTex(top, bottom) }));

  const black = flat('#000000');
  const tree = (x, y, s) => {
    const g = new THREE.Group();
    g.add(shape([[-8, 0], [8, 0], [5, 260], [-5, 260]], black));
    for (let i = 0; i < 4; i++) { const w = 120 - i * 25, yy = 120 + i * 70; g.add(shape([[-w, yy], [w, yy], [0, yy + 140]], black)); }
    g.position.set(x, y, 0); g.scale.setScalar(s); return g;
  };

  const shots = {};

  // ── Mond über dem Wald ──
  {
    const g = new THREE.Group(); g.add(sky('#1a2240', '#05060c'));
    const moon = new THREE.Mesh(new THREE.CircleGeometry(170, 48), flat('#e8ecff')); moon.position.set(180, 420, 0.1); g.add(moon);
    const halo = new THREE.Mesh(new THREE.CircleGeometry(260, 48), flat('#9aa8ff', 0.15)); halo.position.copy(moon.position); halo.position.z = 0.05; g.add(halo);
    const far = new THREE.Group(), near = new THREE.Group();
    for (let i = 0; i < 12; i++) far.add(tree(-650 + i * 120 + rand() * 40, -700, 0.9 + rand() * 0.5));
    for (let i = 0; i < 7; i++) near.add(tree(-700 + i * 230 + rand() * 60, -1000, 1.8 + rand() * 0.8));
    far.position.z = 0.2; near.position.z = 0.3; g.add(far, near);
    const gr = shape([[-W, -H], [W, -H], [W, -700], [-W, -700]], black); gr.position.z = 0.25; g.add(gr);
    shots.mond = { g, update: (lt) => { far.position.x = -lt * 25; near.position.x = -lt * 70; moon.position.y = 420 + lt * 10; } };
  }

  // ── Hof mit Fenster ──
  {
    const g = new THREE.Group(); g.add(sky('#2a0f14', '#07060a'));
    const ground = shape([[-W, -H], [W, -H], [W, -380], [-W, -380]], black); ground.position.z = 0.1; g.add(ground);
    const house = new THREE.Group();
    house.add(shape([[-260, -380], [260, -380], [260, 0], [-260, 0]], black));
    house.add(shape([[-320, 0], [320, 0], [0, 260]], black));
    const winMat = flat('#ffb35c');
    const win = shape([[-170, -170], [-90, -170], [-90, -70], [-170, -70]], winMat); win.position.z = 0.01; house.add(win);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(140, 32), flat('#ffb35c', 0.18)); glow.position.set(-130, -120, 0.005); house.add(glow);
    house.position.z = 0.2; g.add(house);
    shots.haus = { g, update: (lt, k) => {
      const s = 1 + lt * 0.06; house.scale.setScalar(s);
      const on = noise(Math.floor(lt * 14) + k * 5) > 0.18; winMat.color.set(on ? '#ffb35c' : '#2a1a0a'); glow.visible = on;
    } };
  }

  // ── Fußspuren im Schnee (Draufsicht) ──
  {
    const g = new THREE.Group(); g.add(sky('#c3c8d3', '#8d93a1'));
    const prints = [];
    for (let i = 0; i < 16; i++) {
      const p = new THREE.Mesh(new THREE.CircleGeometry(26, 16), flat('#2b2f38'));
      p.scale.set(0.65, 1.3, 1); p.position.set((i % 2 ? 50 : -50) + Math.sin(i * 0.5) * 90, -900 + i * 120, 0.1); g.add(p); prints.push(p);
    }
    shots.spuren = { g, update: (lt) => { prints.forEach((p, i) => (p.visible = i < 2 + lt * 6)); g.position.y = -lt * 60; } };
  }

  // ── Tür am Ende des Gangs (flache Perspektive) ──
  {
    const g = new THREE.Group(); g.add(sky('#101016', '#050507'));
    const wallL = shape([[-W / 2, H / 2], [-150, 260], [-150, -260], [-W / 2, -H / 2]], flat('#16161c'));
    const wallR = shape([[W / 2, H / 2], [150, 260], [150, -260], [W / 2, -H / 2]], flat('#16161c'));
    const floor = shape([[-W / 2, -H / 2], [W / 2, -H / 2], [150, -260], [-150, -260]], flat('#0c0c10'));
    [wallL, wallR, floor].forEach((m) => { m.position.z = 0.1; g.add(m); });
    const door = shape([[-90, -260], [90, -260], [90, 120], [-90, 120]], black); door.position.z = 0.2; g.add(door);
    const crack = shape([[-90, -262], [90, -262], [90, -250], [-90, -250]], flat(accent)); crack.position.z = 0.3; g.add(crack);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(180, 40), flat(accent, 0.25)); glow.position.set(0, -270, 0.25); g.add(glow);
    shots.tuer = { g, update: (lt) => { g.scale.setScalar(1 + lt * 0.12); glow.material.opacity = 0.2 + 0.12 * Math.sin(lt * 6); } };
  }

  // ── Gestalt hinter dir ──
  {
    const g = new THREE.Group(); g.add(sky('#1a1d2b', '#040406'));
    const fig = new THREE.Group();
    fig.add(new THREE.Mesh(new THREE.CircleGeometry(70, 32), black)); fig.children[0].position.y = 260;
    fig.add(shape([[-150, -700], [150, -700], [110, 200], [-110, 200]], black));
    fig.position.set(0, -250, 0.2); g.add(fig);
    const eyes = [-25, 25].map((x) => { const e = new THREE.Mesh(new THREE.CircleGeometry(9, 12), flat(accent)); e.position.set(x, 270, 0.01); fig.add(e); return e; });
    shots.gestalt = { g, update: (lt, k) => {
      fig.scale.setScalar(0.6 + lt * 0.18);
      const blink = noise(Math.floor(lt * 10) + k) < 0.15; eyes.forEach((e) => (e.visible = !blink && lt > 0.6));
    } };
  }

  const order = (params.order || ['mond', 'haus', 'spuren', 'tuer', 'gestalt']).filter((n) => shots[n]);
  for (const n of Object.keys(shots)) { shots[n].g.visible = false; scene.add(shots[n].g); }

  // Filmkorn + Vignette + Blitz als Overlays
  const grainCanvas = document.createElement('canvas'); grainCanvas.width = 270; grainCanvas.height = 480;
  const gctx = grainCanvas.getContext('2d'); const grainTex = new THREE.CanvasTexture(grainCanvas);
  const grain = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: grainTex, transparent: true, opacity: 0.08 }));
  grain.position.z = 5; scene.add(grain);
  const vc = document.createElement('canvas'); vc.width = vc.height = 256; const vg = vc.getContext('2d');
  const rg = vg.createRadialGradient(128, 128, 60, 128, 128, 180); rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,0.85)');
  vg.fillStyle = rg; vg.fillRect(0, 0, 256, 256);
  const vignette = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(vc), transparent: true }));
  vignette.position.z = 5.5; scene.add(vignette);
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0 }));
  flash.position.z = 6; scene.add(flash);

  // Statt der Perspektiv-Kamera mit der orthografischen rendern
  const origRender = renderer.render.bind(renderer);
  renderer.render = (sc) => origRender(sc, cam);

  return (t) => {
    const k = Math.floor(t / SHOT), lt = t - k * SHOT;
    const name = order[k % order.length];
    for (const n of order) shots[n].g.visible = n === name;
    shots[name].update(lt, k);
    flash.material.opacity = k > 0 ? Math.max(0, 0.8 - lt / 0.12) : 0;
    // Korn pro Frame (deterministisch)
    const img = gctx.createImageData(270, 480); let s = Math.floor(t * 8) * 7919 + 1; // Korn nur 8× pro Sekunde neu → kleinere Datei
    for (let i = 0; i < img.data.length; i += 4) { s = (s * 16807) % 2147483647; const v = s & 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    gctx.putImageData(img, 0, 0); grainTex.needsUpdate = true;
  };
}
