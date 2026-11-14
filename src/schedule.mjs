// Schritt 2: Fertige Videos (öffentlich auf GitHub Pages) in Buffer einplanen.
//   YouTube  → automatic   (Buffer veröffentlicht selbst)
//   TikTok   → notification (Push aufs Handy, du postest selbst)
//   Instagram→ notification
//   node src/schedule.mjs            (liest out/manifest.json)
//   node src/schedule.mjs --dry      (zeigt nur, was passieren würde)
import fs from 'node:fs';
import path from 'node:path';
import { loadSettings, slotsFor, localToUtc, mediaBaseUrl, p } from './lib/config.mjs';
import { scheduleVideo } from './lib/buffer.mjs';

const DRY = process.argv.includes('--dry');
const settings = loadSettings();
const manifest = JSON.parse(fs.readFileSync(p('out', 'manifest.json'), 'utf8'));
if (!manifest.items.length) { console.log('Nichts einzuplanen.'); process.exit(0); }

const weekend = manifest.weekend ?? [0, 6].includes(new Date(manifest.date + 'T12:00:00Z').getUTCDay());
const slots = slotsFor(settings, manifest.date, weekend);
const base = mediaBaseUrl(settings);

const channelEnv = { youtube: 'BUFFER_CHANNEL_YOUTUBE', tiktok: 'BUFFER_CHANNEL_TIKTOK', instagram: 'BUFFER_CHANNEL_INSTAGRAM' };
const latestUtc = localToUtc(manifest.date, settings.posting_window.latest, settings.timezone);

// Warten bis GitHub Pages das Video ausliefert (Deploy dauert 1–3 Min.)
async function waitForUrl(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { method: 'HEAD' });
      if (r.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 15000));
  }
  throw new Error(`Video nicht erreichbar: ${url}`);
}

function caption(item, platform) {
  const tags = [...(item.hashtags || []), ...(settings.brand.default_hashtags || [])];
  const unique = [...new Set(tags)].join(' ');
  const main = item[platform]?.caption || item.youtube?.title || item.hook || '';
  return `${main}\n\n${unique}`.trim();
}

const log = [];
for (const entry of manifest.items) {
  const slot = slots[entry.slot];
  const url = `${base}/${entry.mediaPath}`;
  console.log(`\n▶ ${entry.id}  →  ${url}`);
  if (!DRY) await waitForUrl(url);

  const results = {};
  for (const platform of ['youtube', 'tiktok', 'instagram']) {
    const cfg = settings.platforms[platform];
    if (!cfg?.enabled || !slot[platform]) continue;
    let due = slot[platform].utc;
    const minDue = new Date(Date.now() + 15 * 60000);
    if (due < minDue) {                     // Slot schon vorbei (z. B. manueller Lauf am Nachmittag)
      if (minDue > latestUtc) { console.log(`  ⏭  ${platform}: Slot vorbei & zu spät am Tag – übersprungen`); continue; }
      due = minDue;
    }
    const channelId = process.env[channelEnv[platform]];
    if (!channelId) { console.log(`  ⚠️  ${platform}: ${channelEnv[platform]} nicht gesetzt – übersprungen`); continue; }

    const local = due.toLocaleString('de-AT', { timeZone: settings.timezone });
    if (DRY) { console.log(`  [dry] ${platform} ${cfg.scheduling} @ ${local}`); continue; }
    const post = await scheduleVideo({
      platform, channelId, schedulingType: cfg.scheduling, dueAt: due, videoUrl: url,
      text: caption(entry.item, platform), meta: { title: entry.item.youtube?.title || entry.item.hook || entry.id }, settings,
    });
    console.log(`  ✓ ${platform} (${cfg.scheduling}) @ ${local}  [Buffer-ID ${post.id}]`);
    results[platform] = { id: post.id, dueAt: post.dueAt, scheduling: cfg.scheduling };
  }

  // Skript aus der Warteschlange nach content/done/ verschieben
  if (!DRY) {
    const from = p('content', 'queue', entry.queueFile);
    const doneDir = p('content', 'done', manifest.date);
    fs.mkdirSync(doneDir, { recursive: true });
    if (fs.existsSync(from)) fs.renameSync(from, path.join(doneDir, entry.queueFile));
  }
  log.push({ id: entry.id, url, results });
}

if (!DRY) {
  fs.mkdirSync(p('logs'), { recursive: true });
  fs.writeFileSync(p('logs', `${manifest.date}.json`), JSON.stringify(log, null, 2));
}
console.log('\n✅ Einplanen fertig.');
