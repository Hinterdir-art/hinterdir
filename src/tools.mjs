// Hilfs-Befehle
//   npm run channels   → Buffer-Kanal-IDs anzeigen (für GitHub Variables)
//   npm run voice-test → Hörprobe der eingestellten Speko-Stimme
//   npm run plan       → Posting-Plan der nächsten 7 Tage prüfen (ohne API)
import { loadSettings, slotsFor, localDate } from './lib/config.mjs';

const cmd = process.argv[2];
const settings = loadSettings();

if (cmd === 'channels') {
  const { listChannels } = await import('./lib/buffer.mjs');
  for (const { org, channels } of await listChannels()) {
    console.log(`\nOrganisation: ${org.name} (${org.id})`);
    for (const c of channels) console.log(`  ${c.service.padEnd(10)} ${c.name.padEnd(30)} ${c.id}`);
  }
  console.log('\n→ Diese IDs als GitHub-Variables BUFFER_CHANNEL_YOUTUBE / _TIKTOK / _INSTAGRAM eintragen.');
} else if (cmd === 'voice-test') {
  // Erzeugt eine Hörprobe mit der Stimme aus settings.yaml → out/media/videos/stimmprobe.mp3
  const fs = await import('node:fs');
  const { synthesize } = await import('./lib/speko.mjs');
  fs.mkdirSync('out/media/videos', { recursive: true });
  await synthesize({ text: 'Hinter dir passiert gerade etwas, das du nie bemerkst. Das ist eine Stimmprobe.', voice: settings.voice, outAudio: 'out/media/videos/stimmprobe.mp3' });
  console.log('Stimmprobe: out/media/videos/stimmprobe.mp3 (als Artifact herunterladen)');
} else if (cmd === 'plan') {
  for (let d = 0; d < 7; d++) {
    const { date, weekend } = localDate(settings.timezone, new Date(Date.now() + d * 86400000));
    const slots = slotsFor(settings, date, weekend);
    console.log(`\n${date}${weekend ? ' (Wochenende)' : ''}`);
    slots.forEach((s, i) => console.log(`  Video ${i + 1}: ` + Object.entries(s).map(([pf, v]) => `${pf} ${v.local.slice(11)} (UTC ${v.utc.toISOString().slice(11, 16)})`).join(' | ')));
  }
} else {
  console.log('Befehle: channels | voice-test | plan');
}
