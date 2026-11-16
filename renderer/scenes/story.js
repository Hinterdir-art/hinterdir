// Szene „story“ – zeigt, WAS erzählt wird. Jeder Shot ist an ein Wort im Ton gekoppelt
// (Zeiten kommen aus den echten Wort-Zeitstempeln, siehe tools/render.py).
//
// params.shots: [{ type, start, end, ...optionen }]
// Shot-Typen (Optionen in Klammern):
//   karte(lines)            Titelkarte: Ort / Datum, große Schrift
//   spuren                  Fußspuren im Schnee vom Wald her, nur in eine Richtung
//   hof(rauch, name)        Einsamer Hof im Schnee, Fenster flackert, optional Rauch aus dem Kamin
//   dachboden               Dachboden, Taschenlampe, Staub, Schritte (Kamera zuckt)
//   schluessel              Alter Schlüssel auf Holztisch – verschwindet
//   suche                   Laterne durchsucht dunklen Stall
//   kalender(pages)         Abreißkalender, Seiten fliegen weg
//   kerzen(n)               n Kerzen, erlöschen nacheinander
//   verdaechtige(n)         Raster aus Silhouetten, erscheinen nacheinander
//   akte(lines)             Ermittlungsakte mit Stempel
//   frage                   Kamera dreht sich um – Gestalt steht hinter dir
//   strand                  Strand in der Dämmerung, Wellen, Ufermauer, Laterne
//   jacke                   Jacke – Etikett herausgeschnitten, Schere
//   gift                    Glasfläschchen mit Fragezeichen
//   zettel(text)            Papierfetzen mit Handschrift
//   buch                    Altes Buch, letzte Seite herausgerissen
//   code(lines)             Buchstaben-Code erscheint Zeile für Zeile
//   dna                     Rotierende DNA-Doppelhelix
//   leuchtturm(an)          Leuchtturm auf Insel im Sturm, Licht an/aus
//   schiff                  Dampfer zieht vorbei, Leuchtturm dunkel
//   tuer                    Geschlossene Holztür in Steinmauer
//   kueche                  Aufgeräumter Tisch, geputzte Lampe
//   uhr                     Stehengebliebene Uhr
//   mantel                  Drei Haken – nur noch ein Mantel
//   welle                   Riesige Welle über Felsen
//   kamera(szene,zeit,cam)  Überwachungskamera vor Bar-Eingang: szene rein|leer|gespraech|weg
//   rolltreppe(zeit,cam)    Überwachungskamera: drei Personen fahren Rolltreppe hinauf
//   handy(text)             Handy auf Tisch klingelt dreimal, dann dunkel
//   abflug(rows,hi,fuss)    Abflugtafel, Zeile hi blinkt rot
//   wald / gang             Stimmungsbilder

export default function createScene({ THREE, scene, camera, params, brand, duration }) {
  const accent = brand.accent_color || '#E0242E';
  const shotsIn = (params.shots && params.shots.length) ? params.shots : [{ type: 'gang', start: 0, end: duration }];
  scene.background = new THREE.Color('#030305');
  const amb = new THREE.AmbientLight('#4a5068', 0.55); scene.add(amb);

  // ── Helfer ───────────────────────────────────────────────
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const noise = (x) => { const s = Math.sin(x * 12.9898) * 43758.5453; return s - Math.floor(s); };
  const M = (c, r = 0.85, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0, ...extra });
  const B = (c, extra = {}) => new THREE.MeshBasicMaterial({ color: c, ...extra });
  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const ease = (x) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);
  const ground = (c, size = 120) => { const g = new THREE.Mesh(new THREE.PlaneGeometry(size, size), M(c, 1)); g.rotation.x = -Math.PI / 2; g.position.y = -2; return g; };

  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function textPlane(lines, { font = 'bold 120px Georgia, serif', color = '#ece4d0', width = 6, cw = 1024, ch = 512, bg = null, align = 'center', lh = 1.18 } = {}) {
    const tex = canvasTex(cw, ch, (g, w, h) => {
      if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
      g.textAlign = align; g.textBaseline = 'middle';
      let size = parseInt(font.match(/(\d+)px/)[1], 10);
      const fit = () => { g.font = font.replace(/\d+px/, size + 'px'); return Math.max(...lines.map((l) => g.measureText(l).width)); };
      while (fit() > w * 0.9 && size > 20) size -= 4;
      g.fillStyle = color;
      const total = lines.length * size * lh;
      lines.forEach((l, i) => g.fillText(l, align === 'center' ? w / 2 : 40, h / 2 - total / 2 + size * lh * (i + 0.5)));
    });
    return new THREE.Mesh(new THREE.PlaneGeometry(width, width * ch / cw), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  }
  function tree(x, z, h, mTrunk, mLeaf) {
    const g = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, h, 6), mTrunk); t.position.y = -2 + h / 2; g.add(t);
    for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(1.1 - i * 0.25, h * 0.4, 7), mLeaf); c.position.y = -2 + h * (0.45 + i * 0.18); g.add(c); }
    g.position.set(x, 0, z); return g;
  }
  function farmhouse(withChimney = true) {
    const g = new THREE.Group();
    const wall = M('#3a3530'), roofM = M('#1a1716');
    const h = box(6, 3, 4, wall); h.position.y = -0.5; g.add(h);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.5, 2.2, 4), roofM); roof.rotation.y = Math.PI / 4; roof.position.y = 2.1; roof.scale.z = 0.75; g.add(roof);
    const barn = box(5, 2.6, 4, M('#2c2622')); barn.position.set(5.6, -0.7, 0); g.add(barn);
    const broof = new THREE.Mesh(new THREE.ConeGeometry(3.8, 1.6, 4), roofM); broof.rotation.y = Math.PI / 4; broof.position.set(5.6, 1.4, 0); broof.scale.z = 0.8; g.add(broof);
    if (withChimney) { const ch = box(0.5, 1.4, 0.5, M('#2a2522')); ch.position.set(-1.6, 2.6, 0); g.add(ch); g.userData.chimney = ch; }
    const winMat = B('#ffb35c'); const win = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), winMat); win.position.set(-1.5, -0.2, 2.01); g.add(win);
    const win2 = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), B('#0a0908')); win2.position.set(1.4, -0.2, 2.01); g.add(win2);
    const glow = new THREE.PointLight('#ffb35c', 5, 9, 2); glow.position.set(-1.5, -0.2, 3); g.add(glow);
    g.userData.win = winMat; g.userData.glow = glow; return g;
  }
  function sea(size = 80, color = '#0d1a24') {
    const geo = new THREE.PlaneGeometry(size, size, 60, 60); geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, M(color, 0.35, { flatShading: true }));
    const base = geo.attributes.position.array.slice();
    mesh.userData.update = (t, amp = 0.35) => {
      const p = geo.attributes.position.array;
      for (let i = 0; i < p.length; i += 3) { const x = base[i], z = base[i + 2]; p[i + 1] = base[i + 1] + Math.sin(x * 0.35 + t * 1.6) * amp + Math.cos(z * 0.5 + t * 1.2) * amp * 0.7; }
      geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
    };
    mesh.position.y = -2; return mesh;
  }
  // CCTV-Einblendung: hängt vor der Kamera (in update nach lookFrom aufrufen)
  function cctvOverlay(cam, zeit) {
    const [hh, mm, ss] = String(zeit).split(':').map((x) => parseInt(x, 10) || 0); const t0 = hh * 3600 + mm * 60 + ss;
    const cv = document.createElement('canvas'); cv.width = 540; cv.height = 960; const c = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.5246, 0.9326), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, fog: false }));
    mesh.renderOrder = 100; let last = -1;
    const draw = (lt) => {
      const sec = t0 + Math.floor(lt); const f = Math.floor(lt * 2);
      if (f === last) return; last = f;
      c.clearRect(0, 0, 540, 960);
      const vg = c.createRadialGradient(270, 480, 200, 270, 480, 620); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.75)'); c.fillStyle = vg; c.fillRect(0, 0, 540, 960);
      c.fillStyle = 'rgba(160,190,170,0.06)'; for (let y = 0; y < 960; y += 4) c.fillRect(0, y, 540, 1);
      c.font = 'bold 30px Courier New, monospace'; c.fillStyle = '#e8e8e8'; c.textAlign = 'left';
      const p2 = (n) => String(n).padStart(2, '0');
      c.fillText(cam, 26, 60); c.fillText(`${p2(Math.floor(sec / 3600) % 24)}:${p2(Math.floor(sec / 60) % 60)}:${p2(sec % 60)}`, 26, 98);
      if (f % 2 === 0) { c.fillStyle = '#ff2a2a'; c.beginPath(); c.arc(36, 128, 9, 0, 7); c.fill(); }
      c.fillStyle = '#ff2a2a'; c.font = 'bold 26px Courier New, monospace'; c.fillText('REC', 54, 137);
      c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 3; [[20, 20, 1, 1], [520, 20, -1, 1], [20, 760, 1, -1], [520, 760, -1, -1]].forEach(([x, y, sx, sy]) => { c.beginPath(); c.moveTo(x, y + sy * 40); c.lineTo(x, y); c.lineTo(x + sx * 40, y); c.stroke(); });
      tex.needsUpdate = true;
    };
    return { mesh, update: (lt) => {
      draw(lt); camera.updateMatrixWorld();
      mesh.position.copy(camera.position).add(new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)); mesh.quaternion.copy(camera.quaternion);
    } };
  }
  const lookFrom = (x, y, z, tx, ty, tz) => { camera.position.set(x, y, z); camera.lookAt(tx, ty, tz); };

  // ── Shot-Bibliothek ──────────────────────────────────────
  const LIB = {
    karte(o) {
      const g = new THREE.Group();
      const bg = new THREE.Mesh(new THREE.PlaneGeometry(14, 24), new THREE.MeshBasicMaterial({ map: canvasTex(256, 512, (c, w, h) => {
        const gr = c.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, h * 0.7); gr.addColorStop(0, '#2a1416'); gr.addColorStop(1, '#050304');
        c.fillStyle = gr; c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(255,255,255,0.05)'; for (let i = 0; i < 40; i++) { c.beginPath(); c.moveTo(0, i * 13); c.lineTo(w, i * 13 + 30); c.stroke(); }
      }) }));
      bg.position.z = -1; g.add(bg);
      const lines = o.lines || ['?'];
      const big = textPlane([lines[0]], { font: 'bold 150px Georgia, serif', width: 3.9 }); big.position.set(0, 0.9, 0); g.add(big);
      const small = lines.length > 1 ? textPlane(lines.slice(1), { font: '100px Georgia, serif', color: '#d64040', width: 3.6 }) : null;
      if (small) { small.position.set(0, -0.6, 0); g.add(small); }
      const line = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.03), B(accent)); line.position.set(0, 0.05, 0.01); g.add(line);
      return { g, update: (lt, d) => {
        lookFrom(0, 0, 8.5 - lt * 0.5, 0, 0, 0);
        const a = ease(lt / 0.5); big.material.opacity = a; if (small) small.material.opacity = ease((lt - 0.3) / 0.5);
        line.scale.x = ease(lt / 0.8);
      } };
    },

    spuren(o) {
      const g = new THREE.Group(); g.add(ground('#c9cfda'));
      const tr = M('#1b1d22'), lf = M('#1a2420');
      for (let i = 0; i < 40; i++) g.add(tree(-14 + rand() * 28, -34 - rand() * 12, 6 + rand() * 4, tr, lf));
      const sun = new THREE.DirectionalLight('#b8c6ff', 1.6); sun.position.set(-6, 10, 8); g.add(sun);
      const pm = B('#4a5160'); const prints = [];
      for (let i = 0; i < 34; i++) {
        const p = new THREE.Mesh(new THREE.CircleGeometry(0.17, 12), pm); p.scale.set(0.7, 1.45, 1); p.rotation.x = -Math.PI / 2;
        const z = -32 + i * 1.0; p.position.set((i % 2 ? 0.28 : -0.28) + Math.sin(i * 0.23) * 0.8, -1.99, z); p.rotation.z = Math.sin(i * 0.23) * 0.3; g.add(p); prints.push(p);
      }
      g.userData.fog = new THREE.Fog('#1c2030', 12, 55);
      return { g, update: (lt, d) => {
        const k = lt / d; lookFrom(Math.sin(k * 1.2) * 1.2, 0.8 + k * 0.6, 6 - k * 5, 0, -2, -14);
        prints.forEach((p, i) => (p.visible = i < 6 + (lt / d) * 34));
      } };
    },

    hof(o) {
      const g = new THREE.Group(); g.add(ground('#b7bdc8'));
      const h = farmhouse(true); h.position.set(-2, 0, -12); g.add(h);
      const tr = M('#1b1d22'), lf = M('#18211d');
      for (let i = 0; i < 18; i++) g.add(tree(-20 + rand() * 40, -26 - rand() * 10, 6 + rand() * 3, tr, lf));
      const moon = new THREE.DirectionalLight('#9fb0ff', 1.3); moon.position.set(6, 12, 6); g.add(moon);
      const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(1.6, 32), B('#e6ebff', { fog: false })); moonDisc.position.set(8, 9, -40); g.add(moonDisc);
      const smoke = [];
      if (o.rauch) for (let i = 0; i < 26; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: '#8a8f99', transparent: true, opacity: 0.35, depthWrite: false })); g.add(s); smoke.push({ s, off: i / 26 }); }
      let label = null;
      if (o.name) { label = textPlane([o.name], { font: 'bold 110px Georgia, serif', width: 6 }); label.position.set(0, 4.8, -10); g.add(label); }
      g.userData.fog = new THREE.Fog('#151826', 14, 60);
      return { g, update: (lt, d) => {
        const k = lt / d; const close = o.rauch ? 1 : 0;
        lookFrom(3 - k * 4, 0.2 + close * 1.5, 8 - k * 3 - close * 5, -2, 0.5 + close * 2, -12);
        const on = noise(Math.floor(lt * 12) + 3) > 0.12; h.userData.win.color.set(on ? '#ffb35c' : '#3a2210'); h.userData.glow.intensity = on ? 5 : 0.4;
        const c = h.userData.chimney.getWorldPosition(new THREE.Vector3());
        smoke.forEach(({ s, off }) => { const p = (lt * 0.25 + off) % 1; s.position.set(c.x + Math.sin(p * 6 + off * 9) * 0.4 + p * 1.2, c.y + 0.6 + p * 5, c.z); s.scale.setScalar(0.6 + p * 2.2); s.material.opacity = 0.4 * (1 - p); });
        if (label) label.material.opacity = ease((lt - 0.2) / 0.6);
      } };
    },

    dachboden(o) {
      const g = new THREE.Group();
      const wood = M('#3b2a1c', 0.9), dark = M('#21170f', 0.95);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 20), M('#2e2116', 0.9)); floor.rotation.x = -Math.PI / 2; floor.position.y = -2; g.add(floor);
      for (const sd of [-1, 1]) { const r = new THREE.Mesh(new THREE.PlaneGeometry(4, 20), dark); r.rotation.order = 'ZXY'; r.rotation.x = -Math.PI / 2; r.rotation.z = 0; r.rotation.y = sd * 0.95; r.position.set(sd * 1.3, 1.0, -6); g.add(r); }
      for (let i = 0; i < 9; i++) { const z = 2 - i * 2.2; for (const s of [-1, 1]) { const b = box(0.2, 5.2, 0.2, wood); b.position.set(s * 1.6, 0.2, z); b.rotation.z = s * 0.55; g.add(b); } const cross = box(4.4, 0.18, 0.18, wood); cross.position.set(0, 1.8, z); g.add(cross); }
      const spot = new THREE.SpotLight('#fff1cf', 60, 25, 0.32, 0.5, 1.4); spot.position.set(0, 0, 3); g.add(spot); g.add(spot.target);
      const dust = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 900 }, (_, i) => i % 3 === 0 ? (rand() - 0.5) * 4 : i % 3 === 1 ? (rand() - 0.5) * 4 : -rand() * 18), 3)), new THREE.PointsMaterial({ color: '#d8c9a8', size: 0.025, transparent: true, opacity: 0.7 }));
      g.add(dust);
      g.userData.fog = new THREE.FogExp2('#0a0705', 0.07);
      return { g, update: (lt, d) => {
        const step = [0.6, 1.3, 2.0, 2.7].some((s) => lt > s && lt < s + 0.08) ? 0.04 : 0;     // „Schritte“
        lookFrom(Math.sin(lt * 0.8) * 0.1, -0.6 + step, 3.5 - lt * 0.8, 0, -0.2, -10);
        spot.position.copy(camera.position); spot.target.position.set(Math.sin(lt * 1.3) * 1.4, 0.4 + Math.cos(lt * 0.9) * 0.8, camera.position.z - 6);
        dust.position.y = -lt * 0.05;
      } };
    },

    schluessel(o) {
      const g = new THREE.Group();
      const table = box(8, 0.3, 5, M('#4a3322', 0.7)); table.position.y = -1; g.add(table);
      const keyM = M('#8a7a55', 0.35, { metalness: 0.7, transparent: true });
      const key = new THREE.Group();
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.08, 10, 24), keyM); bow.rotation.x = Math.PI / 2; key.add(bow);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 10), keyM); shaft.rotation.z = Math.PI / 2; shaft.position.x = 1.1; key.add(shaft);
      for (const [x, h] of [[1.7, 0.25], [1.5, 0.18]]) { const tth = box(0.1, h, 0.08, keyM); tth.position.set(x, 0, -h / 2 - 0.04); tth.rotation.x = Math.PI / 2; key.add(tth); }
      key.position.set(-0.7, -0.78, 0); g.add(key);
      const outline = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.7), B('#2c1e13', { transparent: true, opacity: 0 })); outline.rotation.x = -Math.PI / 2; outline.position.set(0.2, -0.84, 0); g.add(outline);
      const spot = new THREE.SpotLight('#ffe6b8', 80, 14, 0.4, 0.6); spot.position.set(0, 5, 2); spot.target = key; g.add(spot);
      return { g, update: (lt, d) => {
        lookFrom(0.5, 1.6 - lt * 0.15, 3.2 - lt * 0.2, 0.2, -0.8, 0);
        const f = 1 - ease((lt - d * 0.45) / (d * 0.3)); keyM.opacity = f; outline.material.opacity = (1 - f) * 0.8;
        spot.intensity = noise(Math.floor(lt * 15)) < 0.08 ? 10 : 80;
      } };
    },

    suche(o) {
      const g = new THREE.Group(); g.add(ground('#1d1712'));
      const hay = M('#5a4a2a', 1);
      for (let i = 0; i < 14; i++) { const b = box(1.4, 0.9, 0.9, hay); b.position.set(-4 + rand() * 8, -1.55 + (i % 3 === 0 ? 0.9 : 0), -3 - rand() * 12); g.add(b); }
      for (let i = 0; i < 6; i++) { const p = box(0.3, 7, 0.3, M('#2a1f15')); p.position.set(i % 2 ? 3.5 : -3.5, 1.5, -2 - i * 3); g.add(p); }
      const lantern = new THREE.PointLight('#ffb366', 14, 9, 1.6); g.add(lantern);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), B('#ffd9a0')); g.add(lamp);
      g.userData.fog = new THREE.FogExp2('#080604', 0.09);
      return { g, update: (lt, d) => {
        const x = Math.sin(lt * 1.7) * 2.5, z = -3 - lt * 2.2; lantern.position.set(x, -0.3, z); lamp.position.copy(lantern.position);
        lookFrom(x * 0.4, 0.2, z + 5, x, -0.6, z - 2);
        lantern.intensity = 14 * (0.85 + 0.15 * noise(Math.floor(lt * 20)));
      } };
    },

    kalender(o) {
      const g = new THREE.Group();
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 20), M('#2b241d', 1)); wall.position.z = -0.3; g.add(wall);
      const pages = (o.pages || ['31\nMÄRZ']).map((p, i) => {
        const [num, mon] = p.split('\n');
        const tex = canvasTex(512, 640, (c, w, h) => {
          c.fillStyle = '#e9e1cf'; c.fillRect(0, 0, w, h); c.fillStyle = '#9c1c1c'; c.fillRect(0, 0, w, 120);
          c.fillStyle = '#f5efe2'; c.font = 'bold 70px Georgia, serif'; c.textAlign = 'center'; c.fillText(mon || '', w / 2, 82);
          c.fillStyle = '#1a1512'; c.font = 'bold 280px Georgia, serif'; c.fillText(num, w / 2, 470);
          c.font = '40px Georgia, serif'; c.fillText(o.year || '', w / 2, 590);
        });
        const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide }));
        m.position.z = 0.01 * (o.pages.length - i); g.add(m); return m;
      });
      const lamp = new THREE.PointLight('#ffe2b0', 12, 10, 1.8); lamp.position.set(1.5, 2, 3); g.add(lamp);
      return { g, update: (lt, d) => {
        lookFrom(0, 0, 5 - lt * 0.4, 0, 0, 0);
        const per = d / Math.max(pages.length, 1);
        pages.forEach((p, i) => { const k = (lt - per * (i + 1) + 0.25) / 0.35; const fly = i < pages.length - 1 ? ease(k) : 0; p.position.y = fly * 4; p.rotation.x = -fly * 1.2; p.rotation.z = fly * 0.4; p.visible = fly < 0.99; });
        lamp.intensity = noise(Math.floor(lt * 14)) < 0.07 ? 2 : 12;
      } };
    },

    kerzen(o) {
      const g = new THREE.Group(); const n = o.n || 6;
      const table = box(9, 0.3, 3, M('#2a1d14', 0.8)); table.position.y = -1.6; g.add(table);
      const flames = [];
      for (let i = 0; i < n; i++) {
        const per = Math.ceil(n / 2), row = Math.floor(i / per), col = i % per;
        const x = (col - (per - 1) / 2) * 0.55 + row * 0.27, z = -row * 0.8, hgt = 1.1 - row * 0.15;
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, hgt, 14), M('#e8e0cc', 0.6)); c.position.set(x, -1.45 + hgt / 2, z); g.add(c);
        const f = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 10), B('#ffcf73')); f.position.set(x, -1.45 + hgt + 0.13, z); g.add(f);
        const l = new THREE.PointLight('#ffb35c', 2.4, 4, 2); l.position.set(x, -1.45 + hgt + 0.3, z + 0.3); g.add(l);
        flames.push({ f, l });
      }
      g.userData.fog = new THREE.FogExp2('#050404', 0.05);
      return { g, update: (lt, d) => {
        lookFrom(0, 0.6, 4.6 - lt * 0.3, 0, -0.9, -0.4);
        flames.forEach(({ f, l }, i) => { const out = lt > d * (0.25 + 0.11 * i); f.visible = !out; l.intensity = out ? 0 : 2.4 * (0.8 + 0.2 * noise(Math.floor(lt * 25) + i)); f.scale.y = 1 + 0.2 * Math.sin(lt * 20 + i); });
      } };
    },

    verdaechtige(o) {
      const g = new THREE.Group(); const n = o.n || 100, cols = 8;
      const mat = B('#15151a'); const heads = [];
      const geoH = new THREE.CircleGeometry(0.18, 16), geoB = new THREE.CircleGeometry(0.32, 16, 0, Math.PI);
      for (let i = 0; i < n; i++) {
        const s = new THREE.Group(); const hd = new THREE.Mesh(geoH, mat); hd.position.y = 0.32; s.add(hd); const bd = new THREE.Mesh(geoB, mat); s.add(bd);
        s.position.set((i % cols - (cols - 1) / 2) * 0.62, (Math.floor(i / cols) - (Math.ceil(n / cols) - 1) / 2) * -0.7, 0); g.add(s); heads.push(s);
      }
      const bg = new THREE.Mesh(new THREE.PlaneGeometry(12, 16), B('#5a1416')); bg.position.z = -0.1; g.add(bg);
      const q = textPlane(['?'], { font: 'bold 400px Georgia, serif', color: '#ffffff', width: 4 }); q.position.z = 0.2; g.add(q);
      return { g, update: (lt, d) => {
        lookFrom(0, 0, 15 - lt * 0.6, 0, 0, 0);
        heads.forEach((h, i) => (h.visible = i < (lt / (d * 0.7)) * n));
        q.material.opacity = ease((lt - d * 0.7) / 0.4) * 0.85;
      } };
    },

    akte(o) {
      const g = new THREE.Group();
      const desk = new THREE.Mesh(new THREE.PlaneGeometry(12, 18), M('#2a1e15', 0.9)); desk.position.z = -0.05; g.add(desk);
      const tex = canvasTex(600, 800, (c, w, h) => {
        c.fillStyle = '#c9b48a'; c.fillRect(0, 0, w, h); c.fillStyle = '#3a2a18'; c.textAlign = 'left';
        const ls = o.lines || ['MORDFALL', 'AKTE NR. ???']; let fs = 54;
        do { c.font = `bold ${fs}px Courier New, monospace`; fs -= 2; } while (Math.max(...ls.map((l) => c.measureText(l).width)) > w - 100 && fs > 20);
        ls.forEach((l, i) => c.fillText(l, 50, 110 + i * (fs + 18)));
        c.strokeStyle = 'rgba(60,40,20,0.4)'; for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(50, 330 + i * 45); c.lineTo(w - 50, 330 + i * 45); c.stroke(); }
      });
      const folder = new THREE.Mesh(new THREE.PlaneGeometry(3, 4), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })); folder.rotation.z = 0.05; g.add(folder);
      const stamp = textPlane([o.stempel || 'UNGELÖST'], { font: 'bold 150px Courier New, monospace', color: '#c41a1a', width: 3.6 }); stamp.rotation.z = -0.25; stamp.position.set(0, -0.6, 0.02); g.add(stamp);
      const lamp = new THREE.PointLight('#ffe0a8', 14, 10, 1.8); lamp.position.set(-1.5, 1.5, 3); g.add(lamp);
      return { g, update: (lt, d) => {
        lookFrom(0, -0.2, 5.6 - lt * 0.3, 0, 0, 0);
        const k = (lt - d * 0.35) / 0.15; stamp.material.opacity = k > 0 ? 1 : 0; stamp.scale.setScalar(k > 0 ? 1 + Math.max(0, 0.5 - k * 0.5) : 1);
      } };
    },

    frage(o) {
      const g = new THREE.Group();
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), M('#1e1813')); floor.rotation.x = -Math.PI / 2; floor.position.y = -2; g.add(floor);
      const wM = M('#2a241f', 1);
      [[0, 0, -5, 0], [0, 0, 5, Math.PI], [-5, 0, 0, Math.PI / 2], [5, 0, 0, -Math.PI / 2]].forEach(([x, y, z, r]) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), wM); w.position.set(x, 1, z); w.rotation.y = r; g.add(w); });
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.8), B('#3c4a72')); win.position.set(0, 0.6, -4.98); g.add(win);
      const moonL = new THREE.SpotLight('#8fa2ff', 25, 14, 0.5, 0.7); moonL.position.set(0, 0.8, -4.8); moonL.target.position.set(0, -2, 0); g.add(moonL, moonL.target);
      const door = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.4), B('#050404')); door.position.set(0, -0.3, 4.98); door.rotation.y = Math.PI; g.add(door);
      const fig = new THREE.Group(); const fm = B('#000000');
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 1.6, 4, 10), fm); body.position.y = -0.9; fig.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), fm); head.position.y = 0.4; fig.add(head);
      const eyes = [-0.1, 0.1].map((x) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), B(accent)); e.position.set(x, 0.44, -0.27); fig.add(e); return e; });
      fig.position.set(0, 0, 3.6); g.add(fig);
      const rim = new THREE.PointLight(accent, 10, 6, 1.5); rim.position.set(0, 0.5, 4.6); g.add(rim);
      return { g, update: (lt, d) => {
        const turn = ease((lt - d * 0.35) / (d * 0.35)) * Math.PI;                 // Kamera dreht sich um
        camera.position.set(0, -0.2, 0.5); camera.lookAt(Math.sin(turn) * 3, -0.1, 0.5 - Math.cos(turn) * 3);
        eyes.forEach((e) => (e.visible = turn > 2.6 && noise(Math.floor(lt * 8)) > 0.12));
      } };
    },

    strand(o) {
      const g = new THREE.Group();
      const sand = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), M('#8a7a62', 1)); sand.rotation.x = -Math.PI / 2; sand.position.set(0, -2.02, 8); g.add(sand);
      const water = sea(80, '#1b2b3a'); water.position.z = -20; g.add(water);
      const wall = box(40, 1.6, 1.2, M('#5a5650')); wall.position.set(0, -1.3, 12); g.add(wall);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4, 8), M('#222')); pole.position.set(3, 0, 11); g.add(pole);
      const bulb = new THREE.PointLight('#ffcf8a', 8, 10, 1.6); bulb.position.set(3, 2, 11); g.add(bulb);
      const sky = new THREE.Mesh(new THREE.PlaneGeometry(200, 60), new THREE.MeshBasicMaterial({ fog: false, map: canvasTex(4, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0c1028'); gr.addColorStop(0.7, '#4a2a3a'); gr.addColorStop(1, '#a0503a'); c.fillStyle = gr; c.fillRect(0, 0, w, h); }) }));
      sky.position.set(0, 18, -60); g.add(sky);
      const dusk = new THREE.DirectionalLight('#e89a7a', 1.1); dusk.position.set(0, 3, -30); g.add(dusk);
      g.userData.fog = new THREE.Fog('#2a2232', 20, 75);
      return { g, update: (lt, d) => { water.userData.update(lt, 0.3); lookFrom(-2 + lt * 0.6, 0.5, 16 - lt * 0.6, 0, -1.4, 0); } };
    },

    jacke(o) {
      const g = new THREE.Group();
      const bg = new THREE.Mesh(new THREE.PlaneGeometry(12, 18), M('#1b1a1e')); bg.position.z = -0.1; g.add(bg);
      const shape = new THREE.Shape(); [[-1.2, -2], [1.2, -2], [1.3, 1], [2.4, 0.4], [2.6, 1.2], [1.2, 2.1], [0.4, 2.2], [0, 1.6], [-0.4, 2.2], [-1.2, 2.1], [-2.6, 1.2], [-2.4, 0.4], [-1.3, 1]].forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
      const jacket = new THREE.Mesh(new THREE.ShapeGeometry(shape), M('#4a4238', 0.95)); g.add(jacket);
      const label = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.3), B('#e8e2d0')); label.position.set(0, 1.7, 0.02); g.add(label);
      const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.3), B('#0a0a0a')); hole.position.set(0, 1.7, 0.015); g.add(hole);
      const sc = new THREE.Group(); const sm = M('#9aa0aa', 0.3, { metalness: 0.8 });
      for (const r of [0.25, -0.25]) { const blade = box(1.4, 0.08, 0.02, sm); blade.position.x = 0.7; const arm = new THREE.Group(); arm.add(blade); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 8, 16), sm); ring.position.x = -0.2; arm.add(ring); arm.rotation.z = r; arm.userData.r = r; sc.add(arm); }
      sc.position.set(1.4, 1.9, 0.1); g.add(sc);
      const lamp = new THREE.PointLight('#fff0d0', 14, 10, 1.8); lamp.position.set(0, 1, 4); g.add(lamp);
      return { g, update: (lt, d) => {
        lookFrom(0, 0.8, 6.5 - lt * 0.8, 0, 1, 0);
        const cut = lt > d * 0.45; label.visible = !cut; sc.children.forEach((a) => (a.rotation.z = a.userData.r * (0.3 + 0.7 * Math.abs(Math.sin(lt * 6)))));
        sc.position.x = cut ? 1.4 + (lt - d * 0.45) * 1.5 : 0.9;
      } };
    },

    gift(o) {
      const g = new THREE.Group();
      const table = box(8, 0.3, 5, M('#2b2b30', 0.4)); table.position.y = -1.15; g.add(table);
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.3, 24), new THREE.MeshStandardMaterial({ color: '#7fa08a', transparent: true, opacity: 0.45, roughness: 0.1 })); glass.position.y = -0.35; g.add(glass);
      const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.6, 24), B('#3a6a4a', { transparent: true, opacity: 0.8 })); liquid.position.y = -0.7; g.add(liquid);
      const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.25, 14), M('#7a5a3a')); cork.position.y = 0.42; g.add(cork);
      const lab = textPlane(['?'], { font: 'bold 300px Georgia, serif', color: '#c41a1a', width: 0.9, cw: 512, ch: 512 }); lab.position.set(0, -0.3, 0.37); g.add(lab);
      const spot = new THREE.SpotLight('#dfffe6', 70, 12, 0.4, 0.6); spot.position.set(1, 4, 2); spot.target = glass; g.add(spot);
      return { g, update: (lt) => { lookFrom(Math.sin(lt * 0.5) * 0.8, 0.1, 3.4 - lt * 0.3, 0, -0.3, 0); } };
    },

    zettel(o) {
      const g = new THREE.Group();
      const bg = new THREE.Mesh(new THREE.PlaneGeometry(10, 16), M('#1a1612')); bg.position.z = -0.05; g.add(bg);
      const tex = canvasTex(800, 300, (c, w, h) => {
        c.fillStyle = '#e4d9bf'; c.beginPath(); c.moveTo(10, 30); for (let x = 10; x <= w - 10; x += 40) c.lineTo(x, 20 + Math.random() * 25); c.lineTo(w - 15, h - 30); for (let x = w - 15; x >= 10; x -= 40) c.lineTo(x, h - 25 - Math.random() * 25); c.closePath(); c.fill();
        c.fillStyle = '#1e1a16'; c.font = 'italic bold 120px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(o.text || '…', w / 2, h / 2);
      });
      const paper = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.35), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.9 })); paper.rotation.z = -0.06; g.add(paper);
      const spot = new THREE.SpotLight('#fff2d6', 60, 10, 0.35, 0.6); spot.position.set(0, 0.5, 4); spot.target = paper; g.add(spot);
      return { g, update: (lt) => { lookFrom(0, -0.1, 4.6 - lt * 0.5, 0, 0, 0); paper.rotation.z = -0.06 + Math.sin(lt) * 0.01; } };
    },

    buch(o) {
      const g = new THREE.Group();
      const table = box(8, 0.2, 5, M('#3a2a1c', 0.8)); table.position.y = -1.1; g.add(table);
      const pageTex = canvasTex(256, 360, (c, w, h) => { c.fillStyle = '#e6dcc4'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(40,30,20,0.55)'; for (let i = 0; i < 18; i++) c.fillRect(20, 30 + i * 17, w - 40 - (i % 4) * 20, 5); });
      const left = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.2), new THREE.MeshStandardMaterial({ map: pageTex, side: THREE.DoubleSide })); left.rotation.x = -Math.PI / 2; left.rotation.y = 0.12; left.position.set(-0.82, -0.95, 0); g.add(left);
      const rShape = new THREE.Shape(); rShape.moveTo(0, -1.1); rShape.lineTo(1.6, -1.1); rShape.lineTo(1.6, 0.3); rShape.lineTo(1.2, 0.5); rShape.lineTo(0.9, 0.3); rShape.lineTo(0.5, 0.6); rShape.lineTo(0, 0.5); rShape.closePath();
      const right = new THREE.Mesh(new THREE.ShapeGeometry(rShape), M('#e6dcc4', 0.9, { side: THREE.DoubleSide })); right.rotation.x = -Math.PI / 2; right.position.set(0.02, -0.95, 0); g.add(right);
      const cover = box(3.5, 0.08, 2.4, M('#3a1414')); cover.position.y = -1.0; g.add(cover);
      const spot = new THREE.SpotLight('#fff0cf', 70, 10, 0.45, 0.6); spot.position.set(0, 4, 1.5); spot.target = cover; g.add(spot);
      return { g, update: (lt) => { lookFrom(0.4 + lt * 0.1, 2.2 - lt * 0.15, 2.6 - lt * 0.1, 0.3, -1, 0); } };
    },

    code(o) {
      const g = new THREE.Group();
      const lines = o.lines || ['WRGOABABD', 'MLIAOI', 'WTBIMPANETP', 'MLIABOAIAQC', 'ITTMTSAMSTGAB'];
      const paperTex = canvasTex(512, 720, (c, w, h) => { c.fillStyle = '#ddd2b6'; c.fillRect(0, 0, w, h); });
      const paper = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.8), new THREE.MeshStandardMaterial({ map: paperTex, roughness: 0.95 })); g.add(paper);
      const rows = lines.map((l, i) => { const p = textPlane([l], { font: 'bold 92px Courier New, monospace', color: '#1c1813', width: 3.1, cw: 1024, ch: 160 }); p.position.set(0, 1.5 - i * 0.62, 0.01); g.add(p); return p; });
      const lamp = new THREE.PointLight('#fff2d0', 14, 10, 1.8); lamp.position.set(1, 1, 4); g.add(lamp);
      return { g, update: (lt, d) => { lookFrom(0, 0, 6 - lt * 0.5, 0, 0, 0); rows.forEach((r, i) => (r.material.opacity = ease((lt - i * (d * 0.15)) / 0.3))); } };
    },

    dna(o) {
      const g = new THREE.Group(); const a = B('#5fa8ff'), b = B(accent), rung = B('#c8d4e8');
      for (let i = 0; i < 40; i++) {
        const y = (i - 20) * 0.22, ang = i * 0.45;
        const p1 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), a); p1.position.set(Math.cos(ang), y, Math.sin(ang)); g.add(p1);
        const p2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), b); p2.position.set(-Math.cos(ang), y, -Math.sin(ang)); g.add(p2);
        const r = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2, 6), rung); r.position.set(0, y, 0); r.rotation.z = Math.PI / 2; r.rotation.y = -ang; g.add(r);
      }
      return { g, update: (lt) => { g.rotation.y = lt * 0.8; lookFrom(0, 0, 7 - lt * 0.6, 0, 0, 0); } };
    },

    leuchtturm(o) {
      const g = new THREE.Group();
      const water = sea(120, '#0b1620'); g.add(water);
      const rock = new THREE.Mesh(new THREE.ConeGeometry(7, 5, 9), M('#262622', 1)); rock.position.set(0, -1.6, -16); g.add(rock);
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.1, 6, 18), M('#d9d4c8', 0.7)); tower.position.set(0, 3.8, -16); g.add(tower);
      const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.9, 18), B(o.an ? '#fff2b0' : '#1a1a1a')); lantern.position.set(0, 7.2, -16); g.add(lantern);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.8, 18), M('#202020')); cap.position.set(0, 8, -16); g.add(cap);
      const house = box(3, 1.6, 2, M('#bdb6a8')); house.position.set(2.6, 1.2, -16); g.add(house);
      const beam = new THREE.Mesh(new THREE.ConeGeometry(2.5, 30, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#fff4c8', transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
      beam.geometry.translate(0, -15, 0); beam.rotation.z = Math.PI / 2; beam.position.set(0, 7.2, -16); beam.visible = !!o.an; g.add(beam);
      const storm = new THREE.DirectionalLight('#6f84b0', 1.3); storm.position.set(-5, 10, 5); g.add(storm); g.add(new THREE.HemisphereLight('#4a5a80', '#05080c', 0.6));
      const rp = new Float32Array(600 * 6);
      for (let i = 0; i < 600; i++) { const x = (rand() - 0.5) * 40, y = rand() * 20, z = -rand() * 30; rp.set([x, y, z, x + 0.15, y - 0.6, z], i * 6); }
      const rain = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(rp, 3)), new THREE.LineBasicMaterial({ color: '#8b98b5', transparent: true, opacity: 0.4 }));
      g.add(rain);
      g.userData.fog = new THREE.Fog('#141a26', 18, 70);
      return { g, update: (lt, d) => {
        water.userData.update(lt, 0.55); beam.rotation.y = lt * 1.6;
        lookFrom(-6 + lt * 0.8, 1.5, 10 - lt * 0.6, 0, 4, -16);
        rain.position.y = -((lt * 25) % 20); storm.intensity = noise(Math.floor(lt * 6) + 4) > 0.94 ? 6 : 1.3;   // Blitz
      } };
    },

    schiff(o) {
      const lh = LIB.leuchtturm({ an: false });
      const ship = new THREE.Group();
      const hull = box(7, 1.2, 1.6, M('#121212')); ship.add(hull);
      const deck = box(3, 1, 1.2, M('#1c1c1c')); deck.position.set(-0.5, 1, 0); ship.add(deck);
      const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 1.6, 12), M('#3a1a1a')); funnel.position.set(0, 2.2, 0); ship.add(funnel);
      for (let i = 0; i < 5; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.2), B('#ffd27a')); w.position.set(-1.6 + i * 0.5, 1.05, 0.61); ship.add(w); }
      ship.position.set(-25, -1.4, -6); lh.g.add(ship);
      return { g: lh.g, update: (lt, d) => { lh.update(lt, d); ship.position.x = -6 + lt * 2.6; ship.position.y = -1.4 + Math.sin(lt * 1.5) * 0.15; lookFrom(-1, 1.2, 12, 0, 1.5, -10); } };
    },

    tuer(o) {
      const g = new THREE.Group();
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), M('#4a4740', 1)); wall.position.z = -0.1; g.add(wall);
      for (let i = 0; i < 60; i++) { const s = box(0.9 + rand() * 0.5, 0.45, 0.12, M(rand() > 0.5 ? '#55514a' : '#3e3b35', 1)); s.position.set(-6 + (i % 10) * 1.25 + (Math.floor(i / 10) % 2) * 0.6, -2.5 + Math.floor(i / 10) * 0.5, 0); g.add(s); }
      const door = box(1.8, 3.2, 0.2, M('#3a2516', 0.8)); door.position.set(0, -0.6, 0.15); g.add(door);
      for (const y of [-1.6, 0.4]) { const band = box(1.85, 0.12, 0.05, M('#1a1a1a', 0.4, { metalness: 0.6 })); band.position.set(0, y, 0.27); g.add(band); }
      const lamp = new THREE.PointLight('#cfd8ff', 35, 14, 1.4); lamp.position.set(2, 2, 4); g.add(lamp); g.add(new THREE.HemisphereLight('#8090b0', '#201810', 0.8));
      return { g, update: (lt) => { lookFrom(0, -0.3, 5 - lt * 0.5, 0, -0.5, 0); } };
    },

    kueche(o) {
      const g = new THREE.Group();
      const table = box(4, 0.15, 2.4, M('#5a4430', 0.8)); table.position.y = -1; g.add(table);
      const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.3, 16), M('#8a6a3a', 0.3, { metalness: 0.7 })); lampBase.position.set(0.8, -0.78, 0); g.add(lampBase);
      const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.7, 16), new THREE.MeshStandardMaterial({ color: '#f5f0e0', transparent: true, opacity: 0.55, roughness: 0.05 })); chimney.position.set(0.8, -0.28, 0); g.add(chimney);
      for (let i = 0; i < 3; i++) { const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.04, 20), M('#e8e4da', 0.4)); plate.position.set(-0.8, -0.9 + i * 0.05, 0); g.add(plate); }
      const chair = box(0.8, 0.08, 0.8, M('#3a2a1c')); chair.position.set(0, -1.6, 1.6); g.add(chair);
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), M('#2e2a24', 1)); wall.position.set(0, 0, -2); g.add(wall);
      const light = new THREE.PointLight('#ffe8c0', 10, 9, 1.8); light.position.set(-2, 2, 2.5); g.add(light);
      return { g, update: (lt) => { lookFrom(1.8 - lt * 0.4, 0.4, 3.2, 0, -0.8, 0); } };
    },

    uhr(o) {
      const g = new THREE.Group();
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(12, 16), M('#2a241e', 1)); wall.position.z = -0.1; g.add(wall);
      const face = new THREE.Mesh(new THREE.CircleGeometry(1.4, 48), new THREE.MeshStandardMaterial({ roughness: 0.8, map: canvasTex(512, 512, (c, w, h) => {
        c.fillStyle = '#e6dcc4'; c.beginPath(); c.arc(256, 256, 250, 0, 7); c.fill(); c.fillStyle = '#1a1612'; c.font = 'bold 56px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2; c.fillText(String(i), 256 + Math.sin(a) * 195, 256 - Math.cos(a) * 195); }
      }) }));
      g.add(face);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.1, 10, 48), M('#5a3c22', 0.5)); g.add(rim);
      const hm = B('#111');
      const hour = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.75), hm); hour.geometry.translate(0, 0.33, 0); hour.position.z = 0.02; hour.rotation.z = -1.9; g.add(hour);
      const min = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 1.1), hm); min.geometry.translate(0, 0.5, 0); min.position.z = 0.03; min.rotation.z = -4.2; g.add(min);
      const sec = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 1.2), B(accent)); sec.geometry.translate(0, 0.5, 0); sec.position.z = 0.04; g.add(sec);
      const lamp = new THREE.PointLight('#ffe2b0', 12, 9, 1.8); lamp.position.set(-1.5, 1.5, 3); g.add(lamp);
      return { g, update: (lt, d) => {
        lookFrom(0, 0, 5 - lt * 0.5, 0, 0, 0);
        const stopAt = d * 0.6; const ticks = Math.floor(Math.min(lt, stopAt) * 2); sec.rotation.z = -ticks * (Math.PI / 30) - 0.5;
      } };
    },

    mantel(o) {
      const g = new THREE.Group();
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(12, 14), M('#3a3630', 1)); wall.position.z = -0.1; g.add(wall);
      const board = box(4.2, 0.3, 0.1, M('#4a3422')); board.position.set(0, 1.4, 0); g.add(board);
      [-1.4, 0, 1.4].forEach((x, i) => {
        const hook = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 8, 14, Math.PI), M('#1a1a1a', 0.4, { metalness: 0.6 })); hook.position.set(x, 1.2, 0.12); hook.rotation.z = Math.PI; g.add(hook);
        if (i === 2) {
          const s = new THREE.Shape(); [[-0.5, 1.15], [0.5, 1.15], [0.9, -1.6], [-0.9, -1.6]].forEach(([px, py], k) => (k ? s.lineTo(px, py) : s.moveTo(px, py)));
          const coat = new THREE.Mesh(new THREE.ShapeGeometry(s), M('#c9a227', 0.7)); coat.position.set(x, 0, 0.15); g.add(coat); g.userData.coat = coat;
        }
      });
      const lamp = new THREE.PointLight('#e0e6ff', 12, 10, 1.8); lamp.position.set(-2, 1, 3); g.add(lamp);
      return { g, update: (lt) => { lookFrom(-0.6 + lt * 0.4, 0.3, 5.2 - lt * 0.4, 0, 0.3, 0); g.userData.coat.rotation.z = Math.sin(lt * 1.3) * 0.02; } };
    },

    welle(o) {
      const g = new THREE.Group();
      const water = sea(120, '#0e1c26'); g.add(water);
      const rocks = new THREE.Mesh(new THREE.ConeGeometry(6, 4, 8), M('#24241f', 1)); rocks.position.set(0, -1.5, 0); g.add(rocks);
      const geo = new THREE.PlaneGeometry(40, 14, 40, 14); const wave = new THREE.Mesh(geo, M('#3f6f86', 0.25, { side: THREE.DoubleSide, flatShading: true }));
      const base = geo.attributes.position.array.slice(); wave.position.set(0, -2, -20); g.add(wave);
      const foam = new THREE.Mesh(new THREE.PlaneGeometry(40, 1.2), B('#c8d6dc', { transparent: true, opacity: 0.6 })); g.add(foam);
      const storm = new THREE.DirectionalLight('#9fb4e0', 2.2); storm.position.set(-4, 8, 8); g.add(storm); g.add(new THREE.HemisphereLight('#6a7fa8', '#0a0f14', 0.9));
      g.userData.fog = new THREE.Fog('#1a2230', 18, 80);
      return { g, update: (lt, d) => {
        water.userData.update(lt, 0.7);
        const k = ease(lt / d); const p = geo.attributes.position.array;
        for (let i = 0; i < p.length; i += 3) { const y = base[i + 1] + 7; p[i + 1] = y * k * 1.2 + Math.sin(base[i] * 0.3 + lt * 2) * 0.4; p[i + 2] = base[i + 2] + Math.pow(y / 14, 2) * 6 * k; }
        geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
        wave.position.z = -20 + k * 12; foam.position.set(0, -2 + 14 * 1.2 * k - 0.4, wave.position.z + 6 * k);
        lookFrom(0, 0.5, 9, 0, 3 * k, -10);
      } };
    },

    // ── Überwachungskamera-Shots (Fall Brian Shaffer, 2006) ─────
    kamera(o) {
      // szene: rein | leer | gespraech | weg   zeit: "01:55:10"   cam: "CAM 02"
      const g = new THREE.Group(); const mode = o.szene || 'leer';
      g.add(ground('#24242a', 60));
      const facade = new THREE.Mesh(new THREE.PlaneGeometry(30, 14), M('#33323a', 0.95)); facade.position.set(0, 5, -6); g.add(facade);
      for (const x of [-12, -8, -4, 4, 8, 12]) { const pil = box(0.5, 14, 0.4, M('#2a2930')); pil.position.set(x, 5, -5.8); g.add(pil); }
      const doorGlow = B('#d99a55'); const door = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.4), doorGlow); door.position.set(0, -0.3, -5.75); g.add(door);
      const frame = box(3.0, 0.2, 0.3, M('#111')); frame.position.set(0, 1.5, -5.7); g.add(frame);
      const sign = textPlane(['BAR'], { font: 'bold 160px Arial, sans-serif', color: '#ff3a3a', width: 2.6, cw: 512, ch: 256 }); sign.position.set(0, 2.6, -5.6); g.add(sign);
      const warm = new THREE.PointLight('#ffb070', 22, 14, 1.6); warm.position.set(0, 0.5, -4.5); g.add(warm);
      const street = new THREE.PointLight('#9fb0d0', 18, 30, 1.4); street.position.set(-6, 6, 4); g.add(street);
      g.add(new THREE.HemisphereLight('#6a6f80', '#101014', 0.6));
      const person = (c = '#0c0c0f') => { const f = new THREE.Group(); const m = M(c, 0.9);
        const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 1.25, 4, 10), m); b.position.y = -1.1; f.add(b);
        const h = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), m); h.position.y = -0.1; f.add(h); return f; };
      const hero = person('#15151a'); g.add(hero);
      const others = [];
      if (mode === 'gespraech' || mode === 'weg') for (const x of [1.0, 1.7]) { const w = person('#1d1a1f'); w.position.set(x, 0, -2.2); w.rotation.y = -0.6; g.add(w); others.push(w); }
      // Tracking-Rahmen um ihn
      const boxTex = canvasTex(256, 512, (c, w, h) => { c.strokeStyle = accent; c.lineWidth = 10; c.strokeRect(8, 8, w - 16, h - 16); });
      const track = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.2), new THREE.MeshBasicMaterial({ map: boxTex, transparent: true, depthTest: false })); track.renderOrder = 50; g.add(track);
      const ov = cctvOverlay(o.cam || 'CAM 02', o.zeit || '01:14:00'); g.add(ov.mesh);
      g.userData.fog = new THREE.Fog('#0c0c10', 10, 40);
      return { g, update: (lt, d) => {
        lookFrom(3.2, 4.2, 7 - lt * 0.12, 0, -0.6, -3.5);                  // feste Kamera oben, leichter Zoom
        const k = lt / d;
        if (mode === 'rein') { hero.visible = true; hero.position.set(0.6 - k * 0.6, 0, 3 - k * 8.2); hero.position.y = Math.abs(Math.sin(lt * 6)) * 0.05; hero.visible = hero.position.z > -5.4; }
        else if (mode === 'gespraech') { hero.position.set(0.1, 0, -2.3); hero.rotation.y = 0.6 + Math.sin(lt * 1.4) * 0.1; }
        else if (mode === 'weg') { hero.position.set(0.1 - ease(k * 1.3) * 7.5, Math.abs(Math.sin(lt * 6)) * 0.05, -2.3 + k * 1.5); }
        else hero.visible = false;
        others.forEach((w, i) => (w.rotation.y = -0.6 + Math.sin(lt * 1.1 + i) * 0.08));
        track.visible = hero.visible && mode !== 'leer' && (mode !== 'rein' || k < 0.85) && noise(Math.floor(lt * 8)) > 0.08;
        track.position.set(hero.position.x, -0.85, hero.position.z + 0.4); track.quaternion.copy(camera.quaternion);
        ov.update(lt);
      } };
    },

    rolltreppe(o) {
      const g = new THREE.Group(); g.add(ground('#1e1e24', 60));
      const ang = 0.55, len = 14, steps = [];
      const dir = new THREE.Vector3(0, Math.sin(ang), -Math.cos(ang));
      const stepM = M('#5a5a62', 0.5, { metalness: 0.4 });
      for (let i = 0; i < 34; i++) { const st = box(1.8, 0.08, 0.42, stepM); g.add(st); steps.push(st); }
      const railM = B('#ffd9a0');
      for (const x of [-1.05, 1.05]) {
        const side = box(0.08, 1.0, len, M('#2b2b33', 0.4)); side.position.set(x, -2 + dir.y * len / 2 + 0.45, 2 + dir.z * len / 2); side.rotation.x = ang; g.add(side);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, len), railM); rail.position.set(x, -2 + dir.y * len / 2 + 0.95, 2 + dir.z * len / 2); rail.rotation.x = ang; g.add(rail);
      }
      const top = new THREE.Mesh(new THREE.PlaneGeometry(8, 3), B('#d99a55')); top.position.set(0, -2 + dir.y * len + 1.4, 2 + dir.z * len - 0.6); g.add(top);
      const glow = new THREE.PointLight('#ffb070', 30, 20, 1.5); glow.position.copy(top.position).add(new THREE.Vector3(0, 0, 1.5)); g.add(glow);
      g.add(new THREE.HemisphereLight('#70768a', '#101014', 0.7));
      const lamp = new THREE.PointLight('#c8d4ff', 16, 20, 1.5); lamp.position.set(2, 3, 4); g.add(lamp);
      const people = [0, 1.3, 2.6].map((off, i) => { const f = new THREE.Group(); const m = M(i === 0 ? '#16161b' : '#202026', 0.9);
        const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.15, 4, 10), m); b.position.y = 0.85; f.add(b);
        const h = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), m); h.position.y = 1.8; f.add(h); g.add(f); return { f, off }; });
      const track = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.1), new THREE.MeshBasicMaterial({ map: canvasTex(256, 512, (c, w, h) => { c.strokeStyle = accent; c.lineWidth = 10; c.strokeRect(8, 8, w - 16, h - 16); }), transparent: true, depthTest: false })); track.renderOrder = 50; g.add(track);
      const ov = cctvOverlay(o.cam || 'CAM 01', o.zeit || '01:15:00'); g.add(ov.mesh);
      g.userData.fog = new THREE.Fog('#0c0c10', 12, 40);
      return { g, update: (lt, d) => {
        lookFrom(3.5, 3.2, 7.5, 0, 1.2, -3);
        steps.forEach((st, i) => { const s = ((i * 0.42 + lt * 0.9) % (34 * 0.42)); st.position.set(0, -2 + dir.y * s, 2 + dir.z * s); });
        people.forEach(({ f, off }, i) => { const s = 2.2 + off + lt * 0.9; f.position.set(i === 1 ? 0.35 : -0.2, -2 + dir.y * s + 0.05, 2 + dir.z * s); });
        const h = people[0].f.position; track.position.set(h.x, h.y + 1.2, h.z + 0.3); track.quaternion.copy(camera.quaternion);
        track.visible = noise(Math.floor(lt * 8) + 2) > 0.08;
        ov.update(lt);
      } };
    },

    handy(o) {
      const g = new THREE.Group();
      const table = new THREE.Mesh(new THREE.PlaneGeometry(14, 20), M('#141216', 0.6)); table.rotation.x = -Math.PI / 2; table.position.y = -1; g.add(table);
      const phone = new THREE.Group(); g.add(phone);
      const body = box(0.9, 0.08, 1.8, M('#1a1a1e', 0.3, { metalness: 0.5 })); phone.add(body);
      const onTex = canvasTex(256, 512, (c, w, h) => { c.fillStyle = '#0d0d10'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.textAlign = 'center';
        c.font = 'bold 24px Arial'; c.fillText(o.text || 'Eingehender Anruf', w / 2, 120); c.font = 'bold 70px Arial'; c.fillStyle = accent; c.fillText('☎', w / 2, 270);
        c.fillStyle = '#2bd463'; c.beginPath(); c.arc(w / 2, 420, 40, 0, 7); c.fill(); });
      const scrOn = new THREE.MeshBasicMaterial({ map: onTex }); const scrOff = B('#050506');
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.65), scrOff); screen.rotation.x = -Math.PI / 2; screen.position.y = 0.045; phone.add(screen);
      phone.position.set(0, -0.95, 0); phone.rotation.y = 0.25;
      const glow = new THREE.PointLight('#bcd0ff', 0, 4, 1.6); glow.position.set(0, -0.4, 0); g.add(glow);
      const rings = [0, 1, 2].map(() => { const r = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.0, 48), B(accent, { transparent: true, opacity: 0 })); r.rotation.x = -Math.PI / 2; r.position.y = -0.94; g.add(r); return r; });
      const labels = ['1', '2', '3'].map((n) => { const t = textPlane([n + '×'], { font: 'bold 180px Georgia, serif', color: '#ece4d0', width: 1.0, cw: 256, ch: 256 }); t.position.set(-1.05, 0.2, 0.3); t.rotation.x = -0.6; t.visible = false; g.add(t); return t; });
      return { g, update: (lt, d) => {
        lookFrom(0.4, 2.4 - lt * 0.1, 2.4 - lt * 0.1, 0, -0.95, 0);
        const ringT = [0.08, 0.3, 0.52].map((x) => x * d), dur = 0.16 * d;
        let on = false, n = -1;
        ringT.forEach((t0, i) => { const p = (lt - t0) / dur; if (p >= 0 && p < 1) { on = true; n = i; } if (lt >= t0) n = Math.max(n, i);
          rings[i].material.opacity = p >= 0 && p < 1 ? (1 - p) * 0.8 : 0; rings[i].scale.setScalar(0.6 + Math.max(0, p) * 1.4); });
        screen.material = on ? scrOn : scrOff; glow.intensity = on ? 3 : 0;
        phone.position.x = on ? Math.sin(lt * 90) * 0.015 : 0;
        labels.forEach((l, i) => (l.visible = i === n && lt < ringT[2] + dur * 1.5));
      } };
    },

    abflug(o) {
      const g = new THREE.Group();
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 20), M('#141418', 1)); wall.position.z = -0.2; g.add(wall);
      const rows = o.rows || [['MIAMI', 'ABGEFLOGEN']];
      const hi = o.hi ?? 0;
      const mk = (blink) => canvasTex(640, 900, (c, w, h) => {
        c.fillStyle = '#0a0a0c'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#f2c84b'; c.font = 'bold 56px Courier New, monospace'; c.textAlign = 'left'; c.fillText(o.titel || 'ABFLUG', 40, 90);
        c.fillStyle = '#333'; c.fillRect(30, 120, w - 60, 4);
        rows.forEach(([a, b], i) => { const y = 210 + i * 110; const isHi = i === hi;
          c.fillStyle = '#1a1a1e'; c.fillRect(30, y - 62, w - 60, 90);
          c.font = 'bold 50px Courier New, monospace'; c.fillStyle = isHi ? '#ffffff' : '#6a6a70'; c.fillText(a, 50, y);
          c.font = 'bold 36px Courier New, monospace'; c.fillStyle = isHi ? (blink ? accent : '#5a1010') : '#55555a'; c.textAlign = 'right'; c.fillText(b, w - 50, y); c.textAlign = 'left'; });
        if (o.fuss) { c.fillStyle = accent; c.font = 'bold 34px Courier New, monospace'; c.fillText(o.fuss, 40, h - 90); }
      });
      const mA = new THREE.MeshBasicMaterial({ map: mk(true) }), mB = new THREE.MeshBasicMaterial({ map: mk(false) });
      const board = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.375), mA); g.add(board);
      const lamp = new THREE.PointLight('#ffe0b0', 6, 8); lamp.position.set(0, 2, 3); g.add(lamp);
      return { g, update: (lt) => { lookFrom(0.3 - lt * 0.08, -0.1, 6.4 - lt * 0.15, 0, 0, 0); board.material = Math.floor(lt * 2.5) % 2 ? mB : mA; } };
    },

    wald(o) {
      const g = new THREE.Group(); g.add(ground('#0f1214'));
      const tr = M('#17181c'), lf = M('#111915');
      for (let i = 0; i < 70; i++) { const x = (rand() - 0.5) * 30; if (Math.abs(x) > 1.2) g.add(tree(x, -rand() * 45 + 2, 5 + rand() * 4, tr, lf)); }
      const moon = new THREE.DirectionalLight('#8fa6ff', 1.6); moon.position.set(-5, 10, -10); g.add(moon);
      g.userData.fog = new THREE.FogExp2('#0a0c12', 0.05);
      return { g, update: (lt) => lookFrom(Math.sin(lt) * 0.2, -0.6, 3 - lt * 1.6, 0, -0.2, -10 - lt * 1.6) };
    },

    gang(o) {
      const g = new THREE.Group(); const wall = M('#2a2a31'), L = 50, W = 4, H = 5;
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, L), M('#1c1c21', 0.6)); floor.rotation.x = -Math.PI / 2; floor.position.set(0, -H / 2, -L / 2 + 5); g.add(floor);
      for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(L, H), wall); w.rotation.y = -s * Math.PI / 2; w.position.set(s * W / 2, 0, -L / 2 + 5); g.add(w); }
      const door = box(1.6, 3.4, 0.1, M('#0d0d10')); door.position.set(0, -0.8, -30); g.add(door);
      const glow = new THREE.PointLight(accent, 14, 14, 1.6); glow.position.set(0, -2, -29.2); g.add(glow);
      const lamps = []; for (let i = 0; i < 4; i++) { const l = new THREE.PointLight('#cfd6ff', 10, 11, 1.8); l.position.set(0, H / 2 - 0.4, -2 - i * 7); g.add(l); lamps.push(l); }
      g.userData.fog = new THREE.FogExp2('#0a0a0e', 0.05);
      return { g, update: (lt) => { lookFrom(0, -0.2, 3 - lt * 2.2, 0, -0.3, -7 - lt * 2.2); lamps.forEach((l, i) => (l.intensity = noise(Math.floor(lt * 18) + i * 13) < 0.15 ? 0.3 : 10)); } };
    },
  };

  // ── Shots aufbauen ───────────────────────────────────────
  const shots = shotsIn.map((s, i) => {
    const make = LIB[s.type] || LIB.gang;
    const built = make(s); built.g.visible = false; scene.add(built.g);
    return { ...s, ...built, start: s.start ?? 0, end: s.end ?? duration };
  });

  const flash = new THREE.Mesh(new THREE.PlaneGeometry(4, 8), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, fog: false, depthTest: false }));
  flash.position.set(0, 0, -0.5); flash.renderOrder = 999; camera.add(flash); scene.add(camera);
  const fade = new THREE.Mesh(new THREE.PlaneGeometry(4, 8), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0, fog: false, depthTest: false }));
  fade.position.set(0, 0, -0.45); fade.renderOrder = 1000; camera.add(fade);

  return (t) => {
    let idx = shots.findIndex((s) => t >= s.start && t < s.end); if (idx < 0) idx = shots.length - 1;
    const s = shots[idx];
    shots.forEach((x, i) => (x.g.visible = i === idx));
    scene.fog = s.g.userData.fog || new THREE.FogExp2('#050507', 0.03);
    const lt = t - s.start, d = Math.max(0.1, s.end - s.start);
    s.update(lt, d);
    flash.material.opacity = idx > 0 && s.flash !== false ? Math.max(0, 0.7 - lt / 0.1) : 0;
    fade.material.opacity = idx === shots.length - 1 ? ease((t - (duration - 0.8)) / 0.8) : 0;
  };
}
