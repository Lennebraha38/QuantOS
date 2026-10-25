#!/usr/bin/env node
/**
 * QuantOS — Bütünlük, Güvenlik ve Bilimsel Doğruluk Denetleyicisi
 * 1. Tüm JS/MJS dosyalarının sözdizimi (node --check)
 * 2. Gizli anahtar (GitHub PAT, API key) sızıntı kontrolü
 * 3. Gerekli dizin/modül varlık kontrolü (Çekirdek + Motorlar + 14 Uygulama)
 * 4. HTML referans kontrolü
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const errors = [];
const checks = [];

function record(ok, label, detail = '') {
  checks.push({ ok, label, detail });
  if (!ok) errors.push(`${label}${detail ? ': ' + detail : ''}`);
}

function walkFiles(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'build', 'esp'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, result);
    else result.push(full);
  }
  return result;
}

const requiredFiles = [
  'package.json',
  'server.mjs',
  'Makefile',
  'limine.conf',
  'desktop/index.html',
  'desktop/manifest.webmanifest',
  'desktop/sw.js',
  'desktop/js/os.js',
  'desktop/js/wm.js',
  'desktop/js/engines/quantum-engine.js',
  'desktop/js/engines/bb84-engine.js',
  'desktop/js/engines/astro-engine.js',
  'desktop/js/engines/vfs.js',
  'desktop/js/engines/sound-engine.js',
  'desktop/js/engines/jarvis-brain.js',
  'kernel/main.c',
  'kernel/quantum/qpu.c',
  'kernel/astro/astro.c',
  'kernel/jarvis/jarvis.c',
];

for (const rel of requiredFiles) {
  const exists = fs.existsSync(path.join(ROOT, rel));
  record(exists, `Zorunlu dosya mevcut: ${rel}`);
}

const allFiles = walkFiles(ROOT);

// 1. Secret leak scan
const secretPatterns = [
  /ghp_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /sk-[A-Za-z0-9]{32,}/,
];
let secretClean = true;
for (const file of allFiles) {
  if (file.endsWith('.EFI') || file.endsWith('limine') || file.endsWith('.png')) continue;
  const rel = path.relative(ROOT, file);
  if (rel === 'scripts/verify-integrity.mjs') continue;
  const content = fs.readFileSync(file, 'utf8');
  for (const pat of secretPatterns) {
    if (pat.test(content)) {
      secretClean = false;
      record(false, `Gizli anahtar sızıntısı tespit edildi`, rel);
    }
  }
}
record(secretClean, 'Gizli anahtar (token/secret) sızıntı taraması temiz');

// 2. Syntax check all .js and .mjs files
const jsFiles = allFiles.filter((f) => f.endsWith('.js') || f.endsWith('.mjs'));
let syntaxOk = true;
for (const jf of jsFiles) {
  try {
    execFileSync(process.execPath, ['--check', jf], { stdio: 'pipe' });
  } catch (err) {
    syntaxOk = false;
    record(false, `JS sözdizimi hatası: ${path.relative(ROOT, jf)}`, err.stderr?.toString() || err.message);
  }
}
record(syntaxOk, `JS/MJS sözdizimi doğrulaması (${jsFiles.length} dosya)`);

// 3. HTML local asset check
const indexHtmlPath = path.join(ROOT, 'desktop/index.html');
if (fs.existsSync(indexHtmlPath)) {
  const html = fs.readFileSync(indexHtmlPath, 'utf8');
  const refs = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map((m) => m[1]);
  let refsOk = true;
  for (const ref of refs) {
    if (/^(https?:|data:|#|mailto:)/.test(ref)) continue;
    const cleanRef = ref.split('?')[0].split('#')[0].replace(/^\//, '');
    const resolved = path.join(ROOT, 'desktop', cleanRef);
    if (!fs.existsSync(resolved)) {
      refsOk = false;
      record(false, `desktop/index.html kırık referans`, ref);
    }
  }
  record(refsOk, 'desktop/index.html statik dosya referansları geçerli');
}

const passed = checks.filter((c) => c.ok).length;
console.log(`[QuantOS Integrity] ${passed}/${checks.length} kontrol başarılı.`);
if (errors.length > 0) {
  console.error('Hatalar:\n - ' + errors.join('\n - '));
  process.exit(1);
}
