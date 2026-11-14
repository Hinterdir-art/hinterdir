// Speko – Text-to-Speech (Voice-AI-Gateway, routet zum gewählten Anbieter)
// Doku: https://docs.speko.dev   SDK: @spekoai/sdk
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { Speko } from '@spekoai/sdk';
import { requireEnv } from './config.mjs';

let client;
const speko = () => (client ??= new Speko({ apiKey: requireEnv('SPEKO_API_KEY'), baseURL: process.env.SPEKO_BASE_URL }));

// Ergebnis des SDK in Bytes umwandeln (robust gegen verschiedene Rückgabeformen)
async function toBytes(r) {
  if (!r) throw new Error('Speko: leere Antwort');
  if (r instanceof Uint8Array) return Buffer.from(r);
  if (r instanceof ArrayBuffer) return Buffer.from(new Uint8Array(r));
  if (typeof r.arrayBuffer === 'function') return Buffer.from(await r.arrayBuffer());
  for (const k of ['audio', 'data', 'audioData', 'audio_base64', 'base64']) {
    const v = r[k];
    if (!v) continue;
    if (typeof v === 'string') return Buffer.from(v, 'base64');
    return toBytes(v);
  }
  throw new Error('Speko: unbekanntes Antwortformat: ' + Object.keys(r).join(','));
}

const duration = f => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());

// Wort-Timings schätzen: Sprechdauer proportional zur Wortlänge (+ Pausen an Satzzeichen)
function estimateWords(text, total) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const weight = w => w.length + 2 + (/[.!?…]$/.test(w) ? 6 : /[,;:—–-]$/.test(w) ? 3 : 0);
  const sum = words.reduce((a, w) => a + weight(w), 0);
  const speech = total * 0.97;
  let t = 0.05;
  return words.map(w => {
    const d = (weight(w) / sum) * speech;
    const item = { text: w.replace(/[„“"]/g, ''), start: t, end: t + d * 0.85 };
    t += d;
    return item;
  });
}

/**
 * Text → MP3 (outAudio) + geschätzte Wort-Timings für Untertitel.
 * voice: { provider, voice } aus config/settings.yaml
 */
export async function synthesize({ text, voice, outAudio }) {
  const opts = {
    language: voice.language || 'de',
    voice: voice.voice,
    ...(voice.provider ? { constraints: { allowedProviders: { tts: [voice.provider] } } } : {}),
  };
  const r = await speko().synthesize(text, opts);
  const raw = outAudio + '.src';
  fs.writeFileSync(raw, await toBytes(r));
  const pcm = (r?.contentType || r?.content_type || '').includes('pcm');
  const sr = String(r?.sampleRate || r?.sample_rate || 24000);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error',
    ...(pcm ? ['-f', 's16le', '-ar', sr, '-ac', '1'] : []), '-i', raw,
    '-ac', '2', '-ar', '48000', '-c:a', 'libmp3lame', '-b:a', '192k', outAudio]);
  fs.unlinkSync(raw);
  return { words: estimateWords(text, duration(outAudio)), provider: r?.provider };
}
