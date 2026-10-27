import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { QuantumCircuit, QuantumPresets } from '../desktop/js/engines/quantum-engine.js';
import { gravitationalLensing, NBodySystem } from '../desktop/js/engines/astro-engine.js';
import { JarvisBrain } from '../desktop/js/engines/jarvis-brain.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

test('Deep Architecture — Quantum Decoherence, Density Matrix, QFT & Deutsch-Jozsa', () => {
  // 1) QFT 3-qubit
  const qft = QuantumPresets.qft(3);
  assert.equal(qft.numQubits, 3);
  assert.equal(qft.dim, 8);
  const probs = qft.probabilities();
  assert.equal(probs.length, 8);

  // 2) Deutsch-Jozsa balanced
  const dj = QuantumPresets.deutschJozsa(true);
  assert.equal(dj.numQubits, 3);
  const djSample = dj.sample(256);
  assert.ok(djSample.shots === 256);

  // 3) Density matrix and noise simulation on Bell state
  const bell = QuantumPresets.bell();
  const rho = bell.densityMatrix();
  assert.equal(rho.length, 4);
  assert.equal(rho[0].length, 4);

  // Pure Bell state has purity = 1.0
  const pureRes = bell.simulateNoise({ depolarizing: 0, phaseDamping: 0 });
  assert.ok(Math.abs(pureRes.purity - 1.0) < 1e-6, `Pure Bell state purity should be ~1.0, got ${pureRes.purity}`);
  assert.ok(pureRes.isPure === true);

  // Under phase damping decoherence, purity drops and state becomes mixed
  const noisyRes = bell.simulateNoise({ phaseDamping: 0.8 });
  assert.ok(noisyRes.purity < 0.95, `Noisy purity should drop below 0.95, got ${noisyRes.purity}`);
});

test('Deep Architecture — Gravitational Lensing & Multi-body Presets', () => {
  // 1) Gravitational Lensing
  const lens = gravitationalLensing({ massSolar: 1e11, dLensMpc: 1000, dSourceMpc: 2000 });
  assert.ok(lens.thetaE_arcsec > 0.01, `Einstein ring should be > 0.01 arcsec, got ${lens.thetaE_arcsec}`);
  assert.ok(lens.deflectionArcsec > 0.01, `Deflection angle should be > 0.01 arcsec, got ${lens.deflectionArcsec}`);
  assert.ok(lens.magnification.total > 1.0, `Total magnification should be > 1.0, got ${lens.magnification.total}`);

  // 2) TRAPPIST-1 multi-body
  const trappist = NBodySystem.Presets.trappist1();
  assert.equal(trappist.bodies.length, 8, 'TRAPPIST-1 should have star + 7 planets');
  const e1 = trappist.totalEnergy();
  assert.ok(Number.isFinite(e1.total), 'Initial total energy must be finite');
  trappist.step(0.005);
  const e2 = trappist.totalEnergy();
  assert.ok(Math.abs(e2.total - e1.total) < 1e-4, 'Symplectic integrator must conserve energy in TRAPPIST-1');

  // 3) Lagrange Trojan L4/L5
  const trojan = NBodySystem.Presets.lagrangeTrojan();
  assert.equal(trojan.bodies.length, 4, 'Trojan preset should have Sun + Jupiter + L4 + L5');
  trojan.step(0.01);
  assert.ok(Number.isFinite(trojan.totalEnergy().total));
});

test('Deep Architecture — J.A.R.V.I.S. Cognitive Working Memory & Autonomous Tools', async () => {
  const jarvis = new JarvisBrain({
    osContext: {
      sound: { playJarvisAck: () => {}, playQuantumCollapse: () => {} },
      openApp: () => {}
    }
  });

  // Step 1: User asks to calculate black hole
  const res1 = await jarvis.processCommand('10 güneş kütleli kara delik hesapla');
  assert.equal(res1.intent, 'astro.blackhole');
  assert.ok(res1.reply.includes('Schwarzschild yarıçapı'));

  // Step 2: User asks follow-up context question without repeating the mass
  const res2 = await jarvis.processCommand('Peki olay ufku ne kadar?');
  assert.equal(res2.intent, 'context.blackhole.horizon');
  assert.ok(res2.reply.includes('Güneş kütleli'));
  assert.ok(res2.reply.includes('olay ufku'));

  // Step 3: Another follow-up on Hawking radiation
  const res3 = await jarvis.processCommand('Hawking sıcaklığı kaç Kelvin?');
  assert.equal(res3.intent, 'context.blackhole.hawking');
  assert.ok(res3.reply.includes('Hawking'));

  // Step 4: Autonomous Web Search Tool
  const resWeb = await jarvis.processCommand('Google\'da James Webb teleskobu ara');
  assert.equal(resWeb.intent, 'tool.search_web');
  assert.ok(resWeb.reply.includes('James Webb'));

  // Step 5: Autonomous Terminal Exec Tool
  const resTerm = await jarvis.processCommand('Terminalde whoami çalıştır');
  assert.equal(resTerm.intent, 'tool.terminal_exec');
});

test('Deep Architecture — AArch64 Bare-Metal Kernel Syscall & IPC Artifacts', () => {
  const bootloaderEfi = path.join(ROOT, 'bootloader/BOOTAA64.EFI');
  assert.ok(fs.existsSync(bootloaderEfi), 'bootloader/BOOTAA64.EFI mevcut olmalı');

  const kernelElf = path.join(ROOT, 'build/kernel');
  if (fs.existsSync(kernelElf)) {
    const espKernel = path.join(ROOT, 'esp/boot/kernel');
    assert.ok(fs.existsSync(espKernel), 'esp/boot/kernel mevcut olmalı');
  }

  assert.ok(fs.existsSync(path.join(ROOT, 'kernel/include/syscall.h')), 'kernel/include/syscall.h mevcut olmalı');
  assert.ok(fs.existsSync(path.join(ROOT, 'kernel/arch/aarch64/syscall.c')), 'kernel/arch/aarch64/syscall.c mevcut olmalı');
  assert.ok(fs.existsSync(path.join(ROOT, 'kernel/include/ipc.h')), 'kernel/include/ipc.h mevcut olmalı');
  assert.ok(fs.existsSync(path.join(ROOT, 'kernel/lib/ipc.c')), 'kernel/lib/ipc.c mevcut olmalı');
});

test('Deep Architecture — Windows 11 Settings 11 Categories & 64 Modules', async () => {
  const { mountSettingsApp } = await import('../desktop/js/apps/settings-app.js');
  const mockContainer = {
    _html: '',
    set innerHTML(val) { this._html = val; },
    get innerHTML() { return this._html; },
    querySelector(sel) {
      return {
        innerHTML: '',
        value: '',
        checked: false,
        textContent: '',
        querySelectorAll: () => [],
        querySelector: () => ({ addEventListener: () => {}, textContent: '', value: '' }),
        addEventListener: () => {}
      };
    },
    querySelectorAll: () => []
  };

  const sections = ['system', 'devices', 'network', 'personalize', 'apps', 'accounts', 'time', 'accessibility', 'privacy', 'jarvis', 'update'];
  for (const sec of sections) {
    const handle = mountSettingsApp(mockContainer, {
      getSystemStatus: () => ({ theme: 'ink-copper', brightness: 1, textScale: 100 }),
      jarvis: { getConfig: () => ({ rate: 1.0, pitch: 1.0 }) },
      sound: { getVolume: () => 0.65 },
      vfs: { getStorageUsage: () => ({ totalBytes: 1024, fileCount: 5 }) }
    }, { section: sec });
    assert.ok(handle, `Settings app must mount section "${sec}" cleanly`);
  }
});

test('Deep Architecture — J.A.R.V.I.S. Speech Recognition Commit, Silence Debounce & Speech Cadence', async () => {
  const { JarvisBrain } = await import('../desktop/js/engines/jarvis-brain.js');
  const { SoundEngine } = await import('../desktop/js/engines/sound-engine.js');

  const sound = new SoundEngine();
  sound.muted = false;
  sound.volume = 0.8;

  let ackPlayed = false;
  let cadencePlayed = false;
  const originalAck = sound.playJarvisAck.bind(sound);
  sound.playJarvisAck = () => { ackPlayed = true; originalAck(); };
  const originalCadence = sound.playJarvisSpeechCadence.bind(sound);
  sound.playJarvisSpeechCadence = (txt) => { cadencePlayed = true; return originalCadence(txt); };

  const jarvis = new JarvisBrain({
    osContext: {
      sound,
      openApp: () => {}
    }
  });

  // Test 1: _sanitizeForSpeech removes markdown formatting
  const rawText = '### Kuantum Raporu\n**Bell** durumu: `|00> + |11>` oluşturuldu.\nhttps://quantro.org adresi ve /root/projects/QuantOS/kernel/main.c dosyasını inceleyin.';
  const sanitized = jarvis._sanitizeForSpeech(rawText);
  assert.ok(!sanitized.includes('###'));
  assert.ok(!sanitized.includes('**'));
  assert.ok(!sanitized.includes('`'));
  assert.ok(sanitized.includes('web bağlantısı'));
  assert.ok(sanitized.includes('dosya yolu'));

  // Test 2: SoundEngine playJarvisSpeechCadence bumps activity
  sound.playJarvisSpeechCadence('Kuantum devreleri analizi tamamlandı.');
  assert.ok(cadencePlayed);
  assert.ok(sound.getActivityLevel() > 0);

  // Test 3: Closing microphone manually (stopListening with triggerCommit) commits and executes
  jarvis._latestHeardText = 'Jarvis nasılsın';
  jarvis.listening = true;
  await jarvis.stopListening({ triggerCommit: true });
  assert.equal(jarvis.listening, false);
  assert.equal(jarvis._latestHeardText, '');
  const h1 = jarvis.getHistory();
  assert.ok(h1[h1.length - 1].reply.length > 0);

  // Test 4: Silence debounce auto-commit works
  jarvis._latestHeardText = 'Jarvis saat kaç';
  jarvis.listening = true;
  await jarvis._commitHeardText('silence');
  assert.equal(jarvis.listening, false);
  assert.equal(jarvis._latestHeardText, '');
  const h2 = jarvis.getHistory();
  assert.equal(h2[h2.length - 1].intent, 'system.datetime');

  // Test 5: Empty mic close gives immediate spoken feedback instead of dead silence
  jarvis._latestHeardText = '';
  jarvis.listening = true;
  jarvis.stopListening({ triggerCommit: true });
  assert.equal(jarvis.listening, false);
  const history = jarvis.getHistory();
  const lastEntry = history[history.length - 1];
  assert.equal(lastEntry.intent, 'mic.no_input');
  assert.ok(lastEntry.reply.includes('Sizi tam duyamadım'));

  // Test 6: Zero-echo microphone attachment
  assert.equal(typeof sound.attachMicrophoneStream, 'function');
  assert.equal(typeof sound.detachMicrophone, 'function');
  sound.detachMicrophone();
});

test('Deep Architecture — J.A.R.V.I.S. Ultra Zeka Cognitive Capabilities', async () => {
  const { JarvisBrain } = await import('../desktop/js/engines/jarvis-brain.js');
  const jarvis = new JarvisBrain({
    osContext: {
      sound: { playJarvisAck: () => {}, playQuantumCollapse: () => {}, playJarvisSpeechCadence: () => {} },
      openApp: () => {}
    }
  });

  // 1. Math Evaluator
  const mathRes = await jarvis.processCommand('hesapla: 25 çarpı 48');
  assert.equal(mathRes.intent, 'math.eval');
  assert.ok(mathRes.reply.includes('1200'));

  // 2. Special Relativity
  const relRes = await jarvis.processCommand('özel görelilik hız 0.8c');
  assert.equal(relRes.intent, 'physics.relativity');
  assert.ok(relRes.reply.includes('Lorentz faktörü'));
  assert.ok(relRes.data.gamma > 1.6);

  // 3. Escape Velocity
  const escRes = await jarvis.processCommand('Dünya kurtulma hızı nedir?');
  assert.equal(escRes.intent, 'astro.escape_velocity');
  assert.ok(escRes.reply.includes('11.186'));

  // 4. Photon Energy
  const fotonRes = await jarvis.processCommand('500 nm foton enerjisi hesapla');
  assert.equal(fotonRes.intent, 'quantum.photon_energy');
  assert.ok(fotonRes.reply.includes('eV'));

  // 5. Code Assistant
  const codeRes = await jarvis.processCommand('Python kuantum kod yaz');
  assert.equal(codeRes.intent, 'assistant.code_gen');
  assert.ok(codeRes.reply.includes('def bell_fidelity'));

  // 6. Quantum Interpretations
  const interRes = await jarvis.processCommand('Kopenhag ve çoklu dünyalar yorumu');
  assert.equal(interRes.intent, 'chat.quantum_interpretations');
  assert.ok(interRes.reply.includes('Hugh Everett'));
});
