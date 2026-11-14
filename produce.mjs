// Schritt 1: Nächste Videos aus content/queue/ nehmen → Stimme (Speko) → 3D-Render → MP4
//   node src/produce.mjs                 (heute, Anzahl aus settings)
//   node src/produce.mjs --test          (ohne Speko: stumme Tonspur, Test-Untertitel)
//   node src/produce.mjs --date 2026-11-20 --count 1
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadSettings, loadYaml, localDate, p } from './lib/config.mjs';
import { synthesize } from './lib/speko.mjs';
import { renderVideo } from './lib/render.mjs';

const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const TEST = args.includes('--test');

const settings = loadSettings();
const today = localDate(settings.timezone);
const date = arg('--date', today.date);
const count = Number(arg('--count', settings.videos_per_day));

const queueDir = p('content', 'queue');
const files = fs.readdirSync(queueDir).filter(f => /\.ya?ml$/.test(f) && !f.startsWith('_')).sort().slice(0, count);
if (!files.length) {
  console.log('⚠️  content/queue/ ist leer – heute wird nichts produziert.');
  fs.mkdirSync(p('out'), { recursive: true });
  fs.writeFileSync(p('out', 'manifest.json'), JSON.stringify({ date, items: [] }, null, 2));
  process.exit(0);
}

const mediaDir = p('out', 'media', 'videos', date);
const workDir = p('out', 'work');
fs.mkdirSync(mediaDir, { recursive: true });
fs.mkdirSync(workDir, { recursive: true });

const items = [];
for (const [idx, file] of files.entries()) {
  const item = loadYaml(path.join(queueDir, file));
  const id = (item.id || path.parse(file).name).replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
  console.log(`\n▶ [${idx + 1}/${files.length}] ${id}`);

  const audio = path.join(workDir, `${id}.mp3`);
  let words = [];
  if (TEST) {
    const text = String(item.script || '').replace(/\s+/g, ' ').trim().split(' ');
    const per = 0.38;
    words = text.map((w, i) => ({ text: w, start: i * per, end: i * per + per * 0.9 }));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', String(Math.max(3, text.length * per)), '-c:a', 'libmp3lame', audio]);
  } else {
    const voice = { ...settings.voice, ...(item.voice || {}) };
    const r = await synthesize({ text: item.script, voice, outAudio: audio });
    words = r.words;
    console.log(`  Stimme ok (${voice.provider || 'auto'}/${voice.voice}, ${words.length} Wörter)`);
  }

  const outFile = path.join(mediaDir, `${id}.mp4`);
  const { duration } = await renderVideo({ settings, item, words, audioFile: audio, outFile });
  console.log(`  Video ok: ${path.relative(p(), outFile)} (${duration.toFixed(1)} s)`);
  items.push({ slot: idx, id, queueFile: file, mediaPath: `videos/${date}/${id}.mp4`, duration, item });
}

fs.writeFileSync(p('out', 'manifest.json'), JSON.stringify({ date, weekend: date === today.date ? today.weekend : null, items }, null, 2));
console.log(`\n✅ ${items.length} Video(s) produziert → out/manifest.json`);
