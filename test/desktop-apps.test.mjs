import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { APP_REGISTRY, APP_MAP } from '../desktop/js/apps/registry.js';
import { getAppIcon } from '../desktop/js/apps/icons.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

test('APP_REGISTRY: contains all 16 Windows 11 + Quantro AR-GE apps with SVG icons', () => {
  const expectedIds = [
    'jarvis', 'qlab', 'astrolab', 'qvault',
    'explorer', 'terminal', 'code', 'taskmgr',
    'settings', 'browser', 'calculator', 'notepad',
    'spectrum', 'store', 'snipping', 'quantmark',
  ];

  assert.equal(APP_REGISTRY.length, 16);
  for (const id of expectedIds) {
    const app = APP_MAP.get(id);
    assert.ok(app, `Eksik uygulama: ${id}`);
    assert.equal(typeof app.mount, 'function', `${id}.mount fonksiyon olmalı`);
    assert.ok(app.title.length > 2, `${id}.title dolu olmalı`);
    const svg = getAppIcon(id, 24);
    assert.ok(svg.includes('<svg'), `${id} ikonu geçerli SVG döndürmeli`);
  }
});

test('Desktop Shell DOM Contract: every static #id selector in os.js exists in desktop/index.html', () => {
  const html = fs.readFileSync(path.join(ROOT, 'desktop/index.html'), 'utf8');
  const osJs = fs.readFileSync(path.join(ROOT, 'desktop/js/os.js'), 'utf8');

  const htmlIds = new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map((m) => m[1]));
  const dollarIds = [...osJs.matchAll(/\$\(\s*['"]#([A-Za-z0-9_-]+)['"]\s*\)/g)].map((m) => m[1]);
  const byIdIds = [...osJs.matchAll(/getElementById\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);
  const queriedIds = [...new Set([...dollarIds, ...byIdIds])];

  assert.ok(queriedIds.length > 20, `os.js en az 20 kabuk DOM bileşenine bağlanmalı (bulunan: ${queriedIds.length})`);
  for (const id of queriedIds) {
    assert.ok(htmlIds.has(id), `os.js içinde aranan #${id} öğesi desktop/index.html içinde bulunamadı`);
  }
});

test('Host J.A.R.V.I.S. Voice Bridge CLI & AArch64 Kernel Build Artifacts', () => {
  const bridgePath = path.join(ROOT, 'scripts/jarvis-voice-bridge.py');
  assert.ok(fs.existsSync(bridgePath), 'scripts/jarvis-voice-bridge.py mevcut olmalı');

  let pyBin = 'python3';
  try {
    execFileSync('python3', ['--version'], { stdio: 'ignore' });
  } catch {
    pyBin = 'python';
  }

  const helpOut = execFileSync(pyBin, [bridgePath, '--help'], { encoding: 'utf8' });
  assert.ok(helpOut.includes('JARVIS_SPEAK'), 'Voice bridge --help çıktısı [JARVIS_SPEAK] içermeli');

  const selfOut = execFileSync(pyBin, [bridgePath, '--self-test', 'Test mesaji'], {
    encoding: 'utf8',
    env: { ...process.env, PYTHONIOENCODING: 'utf-8', QUANTOS_NO_TTS: '1' },
  });
  assert.ok(selfOut.includes('J.A.R.V.I.S. KOMUTA YANITI') && selfOut.includes('Test mesaji'));

  assert.ok(fs.existsSync(path.join(ROOT, 'kernel/quantum/qpu.c')), 'kernel/quantum/qpu.c mevcut olmalı');
  assert.ok(fs.existsSync(path.join(ROOT, 'kernel/astro/astro.c')), 'kernel/astro/astro.c mevcut olmalı');
  assert.ok(fs.existsSync(path.join(ROOT, 'kernel/jarvis/jarvis.c')), 'kernel/jarvis/jarvis.c mevcut olmalı');
  assert.ok(fs.existsSync(path.join(ROOT, 'kernel/gfx/gui.c')), 'kernel/gfx/gui.c mevcut olmalı');
});
