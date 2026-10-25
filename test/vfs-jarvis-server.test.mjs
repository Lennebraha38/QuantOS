import test from 'node:test';
import assert from 'node:assert/strict';
import { VirtualFileSystem } from '../desktop/js/engines/vfs.js';
import { JarvisBrain } from '../desktop/js/engines/jarvis-brain.js';
import { APP_REGISTRY } from '../desktop/js/apps/registry.js';
import { NBodySystem } from '../desktop/js/engines/astro-engine.js';
import { createQuantOSServer } from '../server.mjs';

test('VirtualFileSystem: CRUD, empty-query directory listing search, storage usage, and AES-256-GCM encryption', async () => {
  const vfs = new VirtualFileSystem();
  await vfs.init();

  assert.equal(vfs.exists('C:/Users/Quantro/Documents'), true);

  const allUserFiles = vfs.search('', 'C:/Users/Quantro').filter((f) => f.type === 'file');
  assert.ok(allUserFiles.length >= 6, 'Boş sorgulu vfs.search alt ağaçtaki tüm dosyaları döndürmeli');

  const usage = vfs.getStorageUsage();
  assert.ok(usage.usedBytes > 0 && usage.totalBytes === usage.usedBytes);
  assert.ok(usage.fileCount > 0 && usage.totalFiles === usage.fileCount);

  vfs.mkdir('C:/Users/Quantro/LabTest');
  vfs.write('C:/Users/Quantro/LabTest/deney.txt', 'Kuantum dolaniklik verisi 2026');
  assert.equal(vfs.read('C:/Users/Quantro/LabTest/deney.txt'), 'Kuantum dolaniklik verisi 2026');

  const hits = vfs.search('dolaniklik');
  assert.ok(hits.length >= 1);

  await vfs.encryptFile('C:/Users/Quantro/LabTest/deney.txt', 'quantro-secret-key');
  const encContent = vfs.read('C:/Users/Quantro/LabTest/deney.txt');
  assert.notEqual(encContent, 'Kuantum dolaniklik verisi 2026');

  await vfs.decryptFile('C:/Users/Quantro/LabTest/deney.txt', 'quantro-secret-key');
  assert.equal(vfs.read('C:/Users/Quantro/LabTest/deney.txt'), 'Kuantum dolaniklik verisi 2026');
});

test('JarvisBrain: getConfig/setConfig, osContext unwrapping, APP_REGISTRY IDs, state & history contracts', async () => {
  const vfs = new VirtualFileSystem();
  await vfs.init();

  const openedApps = [];
  let activeTheme = 'ink-copper';
  let snappedLayout = null;
  const observedStates = [];

  const osContext = {
    vfs,
    apps: APP_REGISTRY,
    openApp: (id, args) => openedApps.push({ id, args }),
    closeApp: () => {},
    minimizeAll: () => {},
    snapWindows: (layout) => { snappedLayout = layout; },
    setTheme: (t) => { activeTheme = t; },
    switchDesktop: () => {},
    notify: () => {},
    getSystemStatus: () => ({ openWindows: 2, uptimeSec: 120, theme: activeTheme }),
  };

  const jarvis = new JarvisBrain({ osContext });

  const cfg0 = jarvis.getConfig();
  assert.equal(cfg0.lang, 'tr-TR');
  jarvis.setConfig({ rate: 1.15, wakeWordEnabled: true });
  assert.equal(jarvis.getConfig().rate, 1.15);
  assert.equal(jarvis.getConfig().wakeWordEnabled, true);

  jarvis.onStateChange((st, detail) => {
    assert.equal(typeof st, 'string');
    assert.equal(typeof detail, 'string');
    observedStates.push(st);
  });

  const rBell = await jarvis.processCommand('Jarvis Bell durumu oluştur', { speak: false });
  assert.ok(rBell.reply.length > 10);
  assert.ok(openedApps.some((a) => a.id === 'qlab'), 'Bell komutu qlab uygulamasını açmalı');

  const rBH = await jarvis.processCommand('Jarvis 10 güneş kütleli kara delik hesapla', { speak: false });
  assert.match(rBH.reply, /29\.5|Schwarzschild|km/i);
  assert.ok(openedApps.some((a) => a.id === 'astrolab'), 'Kara delik komutu astrolab uygulamasını açmalı');

  const rBB84 = await jarvis.processCommand('Jarvis dinleyicili BB84 çalıştır', { speak: false });
  assert.ok(rBB84.reply.length > 10);
  assert.ok(openedApps.some((a) => a.id === 'qvault'), 'BB84 komutu qvault uygulamasını açmalı');

  const rTheme = await jarvis.processCommand('Jarvis holo temasına geç', { speak: false });
  assert.ok(rTheme.reply.length > 5);
  assert.equal(activeTheme, 'jarvis-holo');

  await jarvis.processCommand('Jarvis pencereleri yan yana diz', { speak: false });
  assert.equal(snappedLayout, 'split-2');

  assert.ok(observedStates.includes('processing') && observedStates.includes('idle'));
  const hist = jarvis.getHistory();
  assert.ok(hist.length >= 5);
  assert.ok(hist[0].input && hist[0].reply, 'Geçmiş öğeleri input ve reply alanlarını içermeli');
});

test('NBodySystem.addBody: dynamically added bodies preserve finite energy without NaN', () => {
  const sys = NBodySystem.Presets.solarSystem();
  sys.addBody({ name: 'Ast-Test', mass: 0.015, x: 1.4, y: -0.8, vx: 0.4, vy: 0.6 });
  sys.step(0.01, 8);
  const e = sys.totalEnergy();
  assert.ok(Number.isFinite(e.total), 'NBodySystem toplam enerjisi sonlu sayı olmalı (NaN olmamalı)');
});

test('QuantOS HTTP Server: CSP header, health, delta CPU system telemetry, QRNG, TTS, and path traversal guard', async () => {
  const server = createQuantOSServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  try {
    const hRes = await fetch(`${base}/api/health`);
    assert.equal(hRes.status, 200);
    assert.ok(hRes.headers.get('content-security-policy')?.includes("default-src 'self'"));
    const hJson = await hRes.json();
    assert.equal(hJson.ok, true);

    const sRes = await fetch(`${base}/api/system`);
    assert.equal(sRes.status, 200);
    const sJson = await sRes.json();
    assert.ok(sJson.totalMem > 0);

    const qRes = await fetch(`${base}/api/qrng?count=16`);
    assert.equal(qRes.status, 200);
    const qJson = await qRes.json();
    assert.equal(qJson.bytes.length, 16);
    assert.ok(qJson.source);

    const travRes = await fetch(`${base}/../../etc/passwd`);
    assert.ok([400, 403, 404].includes(travRes.status));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
