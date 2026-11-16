// Läuft im (headless) Browser. Wird von src/render.mjs Frame für Frame gesteuert.
// Kein requestAnimationFrame → jedes Frame ist deterministisch (gleiches Ergebnis bei jedem Render).
import * as THREE from 'three';

let ctx = null;

window.__setup = async (data) => {
  const { width, height, brand, scene: sceneName, params, words, hook, captions, duration } = data;
  document.documentElement.style.setProperty('--accent', brand.accent_color);
  document.body.style.fontFamily = brand.font;

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.getElementById('stage').appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(brand.background_color);
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 200);
  camera.position.set(0, 0, 9);

  const mod = await import(`./scenes/${sceneName}.js`);
  const update = mod.default({ THREE, scene, camera, renderer, params: params || {}, brand, duration });

  // Untertitel in 3-Wort-Gruppen
  const groups = [];
  if (captions && words?.length) {
    let cur = [];
    const flush = () => { if (cur.length) groups.push({ start: cur[0].start, end: cur[cur.length - 1].end, words: cur }); cur = []; };
    words.forEach((w, i) => {
      const prev = cur[cur.length - 1];
      if (prev && (/[.!?…]$/.test(prev.text) || w.start - prev.end > 0.35 || cur.length >= 3)) flush();
      cur.push(w);
    });
    flush();
  }
  document.getElementById('hook').textContent = hook || '';
  ctx = { renderer, scene, camera, update, groups, duration };
  return true;
};

window.__frame = (t) => {
  const { renderer, scene, camera, update, groups } = ctx;
  update(t);
  renderer.render(scene, camera);

  // Hook nach 2,5 s ausblenden
  const hookEl = document.getElementById('hook');
  hookEl.style.opacity = String(Math.max(0, Math.min(1, (3 - t) / 0.5)));

  const capEl = document.getElementById('captions');
  const g = groups.find((x, i) => t >= x.start - 0.03 && t < (groups[i + 1] ? Math.min(groups[i + 1].start - 0.03, x.end + 0.4) : x.end + 0.6));
  capEl.innerHTML = g
    ? g.words.map(w => `<span class="${t >= w.start && t <= w.end + 0.1 ? 'on' : ''}">${escapeHtml(w.text)}</span>`).join(' ')
    : '';
  return true;
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
