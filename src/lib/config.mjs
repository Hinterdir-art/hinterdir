// Gemeinsame Helfer: Config laden, Zeitzonen, Pfade.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const p = (...parts) => path.join(ROOT, ...parts);

export function loadSettings() {
  return YAML.parse(fs.readFileSync(p('config', 'settings.yaml'), 'utf8'));
}

export function loadYaml(file) {
  return YAML.parse(fs.readFileSync(file, 'utf8'));
}

export function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Umgebungsvariable ${name} fehlt (GitHub Secret / .env).`);
  return v;
}

// ── Zeitzonen ohne externe Library ──────────────────────────────
// Offset (Minuten) einer Zeitzone zu einem UTC-Zeitpunkt
function tzOffsetMinutes(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map(x => [x.type, x.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUtc - date.getTime()) / 60000);
}

// "2026-11-14" + "18:30" in Europe/Vienna  →  Date (UTC)
export function localToUtc(dateStr, timeStr, timeZone) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  let off = tzOffsetMinutes(guess, timeZone);
  let result = new Date(guess.getTime() - off * 60000);
  const off2 = tzOffsetMinutes(result, timeZone); // Sommerzeit-Korrektur
  if (off2 !== off) result = new Date(guess.getTime() - off2 * 60000);
  return result;
}

// Heutiges Datum (YYYY-MM-DD) und Wochentag in der Zeitzone
export function localDate(timeZone, date = new Date()) {
  const s = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  const wd = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date);
  return { date: s, weekend: wd === 'Sat' || wd === 'Sun' };
}

const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

// Liefert die Slots für einen Tag inkl. Prüfung des Posting-Fensters
export function slotsFor(settings, dateStr, weekend) {
  const list = weekend ? settings.slots.weekend : settings.slots.weekday;
  const { earliest, latest } = settings.posting_window;
  for (const slot of list) {
    for (const [platform, t] of Object.entries(slot)) {
      if (toMin(t) < toMin(earliest) || toMin(t) > toMin(latest)) {
        throw new Error(`Slot ${platform} ${t} liegt außerhalb des Posting-Fensters ${earliest}–${latest}. Bitte config/settings.yaml korrigieren.`);
      }
    }
  }
  return list.slice(0, settings.videos_per_day).map(slot =>
    Object.fromEntries(Object.entries(slot).map(([pf, t]) => [pf, { local: `${dateStr} ${t}`, utc: localToUtc(dateStr, t, settings.timezone) }]))
  );
}

export function mediaBaseUrl(settings) {
  if (settings.media_base_url) return settings.media_base_url.replace(/\/$/, '');
  const repo = process.env.GITHUB_REPOSITORY; // owner/repo
  if (!repo) throw new Error('media_base_url leer und GITHUB_REPOSITORY nicht gesetzt.');
  const [owner, name] = repo.split('/');
  return `https://${owner.toLowerCase()}.github.io/${name}`;
}
