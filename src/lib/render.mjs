// Rendert eine Three.js-Szene Frame für Frame in Headless-Chrome und
// kodiert mit ffmpeg zu einem MP4 (1080×1920, H.264 + AAC).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer';
import { ROOT } from './config.mjs';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };

function startServer() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(ROOT, url);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); return res.end();
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

export function audioDuration(file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString();
  return parseFloat(out);
}

export async function renderVideo({ settings, item, words, audioFile, outFile }) {
  const r = settings.render;
  const duration = audioDuration(audioFile) + (r.tail_seconds ?? 0.8);
  const frames = Math.ceil(duration * r.fps);

  const server = await startServer();
  const port = server.address().port;
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars'],
  });

  const ffmpeg = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(r.fps), '-c:v', 'mjpeg', '-i', 'pipe:0',
    '-i', audioFile,
    '-filter_complex', `[0:v]scale=${r.width}:${r.height},setsar=1,format=yuv420p[v];[1:a]apad[a]`,
    '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-preset', r.preset || 'veryfast', '-crf', String(r.crf ?? 20), '-r', String(r.fps),
    '-c:a', 'aac', '-b:a', r.audio_bitrate || '160k', '-ar', '48000',
    '-t', duration.toFixed(3), '-movflags', '+faststart',
    outFile,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ffmpeg.on('close', c => (c === 0 ? res() : rej(new Error(`ffmpeg exit ${c}`)))));

  try {
    const page = await browser.newPage();
    page.on('pageerror', e => console.error('[renderer]', e.message));
    await page.setViewport({ width: r.width, height: r.height, deviceScaleFactor: 1 });
    await page.goto(`http://127.0.0.1:${port}/renderer/index.html`, { waitUntil: 'networkidle0' });
    await page.waitForFunction('typeof window.__setup === "function"');
    await page.evaluate(d => window.__setup(d), {
      width: r.width, height: r.height, brand: settings.brand,
      scene: item.scene || r.default_scene, params: item.scene_params || {},
      words, hook: item.hook || '', captions: item.captions !== false, duration,
    });

    for (let i = 0; i < frames; i++) {
      const t = i / r.fps;
      await page.evaluate(tt => window.__frame(tt), t);
      const buf = await page.screenshot({ type: 'jpeg', quality: 92, optimizeForSpeed: true });
      if (!ffmpeg.stdin.write(buf)) await new Promise(res => ffmpeg.stdin.once('drain', res));
      if (i % (r.fps * 5) === 0) console.log(`  Frame ${i}/${frames}`);
    }
  } finally {
    ffmpeg.stdin.end();
    await browser.close();
    server.close();
  }
  await done;
  return { duration };
}
