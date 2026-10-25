/**
 * Uygulama 6: QuantShell / Windows Terminal
 * Çok sekmeli terminal, komut geçmişi (Up/Down), Tab tamamlama ve 30+ gerçek OS / Bilim komutu
 */
import { QuantumPresets } from '../engines/quantum-engine.js';
import { simulateBB84, generateQRNGBytes, computeByteStats } from '../engines/bb84-engine.js';
import { blackHoleMetrics, cosmologyMetrics, siderealAndJulian } from '../engines/astro-engine.js';

const COMMAND_LIST = [
  'help', 'clear', 'ls', 'dir', 'cd', 'pwd', 'cat', 'mkdir', 'touch', 'write', 'rm',
  'cp', 'mv', 'find', 'sysinfo', 'neofetch', 'ps', 'kill', 'qsim', 'bb84', 'qrng',
  'blackhole', 'cosmo', 'sidereal', 'jarvis', 'theme', 'open', 'whoami', 'date', 'echo'
];

export function mountTerminalApp(container, osContext) {
  const vfs = osContext.vfs;
  const tabs = [
    { id: 1, title: 'QuantShell 7.4', cwd: 'C:/Users/Quantro', lines: [], history: [], histIdx: -1 },
  ];
  let activeTabId = 1;
  let tabSeq = 2;

  function bootLines() {
    return [
      { cls: 'ok', text: 'QuantOS PowerShell / QuantShell [Sürüm 24H2 · AArch64 + Bilimsel Çekirdek]' },
      { cls: '', text: '(c) 2026 Quantro AR-GE. Komut listesi için "help" veya "jarvis <soru>" yazın.' },
    ];
  }
  tabs[0].lines = bootLines();

  container.innerHTML = `
    <div class="app-shell">
      <div class="app-tabs" id="tm-tabs"></div>
      <div class="terminal-screen" id="tm-screen">
        <div id="tm-lines"></div>
        <div class="term-input-row">
          <span class="term-prompt" id="tm-prompt">PS C:/Users/Quantro&gt;</span>
          <input type="text" class="term-input" id="tm-input" autocomplete="off" spellcheck="false" aria-label="Terminal Komut Satırı" />
        </div>
      </div>
      <div class="app-statusbar">
        <span>Kabuk: QuantShell UTF-8 (tr-TR)</span>
        <span id="tm-status">Sekme: 1 · Geçmiş için ↑/↓, Tamamlama için Tab</span>
      </div>
    </div>
  `;

  const tabsEl = container.querySelector('#tm-tabs');
  const screenEl = container.querySelector('#tm-screen');
  const linesEl = container.querySelector('#tm-lines');
  const promptEl = container.querySelector('#tm-prompt');
  const inputEl = container.querySelector('#tm-input');

  const curTab = () => tabs.find((t) => t.id === activeTabId) || tabs[0];

  function resolveRel(cwd, target) {
    if (!target) return cwd;
    if (/^[cC]:/.test(target)) return vfs.normalizePath(target);
    if (target === '..') {
      const clean = cwd.replace(/\/+$/, '');
      const i = clean.lastIndexOf('/');
      return i > 2 ? clean.slice(0, i) : 'C:/';
    }
    if (target === '.') return cwd;
    return vfs.normalizePath(`${cwd.replace(/\/$/, '')}/${target}`);
  }

  function render() {
    const t = curTab();
    tabsEl.innerHTML =
      tabs
        .map(
          (tb) =>
            `<button type="button" class="app-tab ${tb.id === t.id ? 'active' : ''}" data-tid="${tb.id}">${tb.title}</button>`
        )
        .join('') +
      `<button type="button" class="btn btn-sm btn-ghost" id="tm-add-tab" style="margin-left:4px;">+ Sekme</button>`;

    linesEl.innerHTML = t.lines
      .map((l) => {
        const safe = String(l.text)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        return `<div class="term-line ${l.cls || ''}">${safe}</div>`;
      })
      .join('');

    promptEl.textContent = `PS ${t.cwd}>`;
    screenEl.scrollTop = screenEl.scrollHeight;
  }

  function pushOut(t, text, cls = '') {
    t.lines.push({ cls, text });
  }

  async function execLine(raw) {
    const t = curTab();
    const line = raw.trim();
    pushOut(t, `PS ${t.cwd}> ${line}`, 'cmd');
    if (!line) {
      render();
      return;
    }
    t.history.push(line);
    t.histIdx = t.history.length;

    const [cmdRaw, ...rest] = line.split(/\s+/);
    const cmd = cmdRaw.toLowerCase();
    const argStr = rest.join(' ');

    try {
      switch (cmd) {
        case 'help':
          pushOut(
            t,
            [
              'Kullanılabilir QuantOS Komutları:',
              '  Dosya/VFS : ls, dir, cd <yol>, pwd, cat <dosya>, mkdir <ad>, touch <ad>, write <ad> <metin>, rm <yol>, find <sorgu>',
              '  Sistem    : sysinfo, neofetch, ps, kill <winId>, theme <ink-copper|jarvis-holo|win11-mica|vellum-light>, open <appId>',
              '  Bilimsel  : qsim [bell|ghz|grover2], bb84 [--eve], qrng, blackhole <M_gunes>, cosmo <z>, sidereal',
              '  Yapay Zekâ: jarvis <komut veya soru>',
            ].join('\n'),
            'ok'
          );
          break;
        case 'clear':
        case 'cls':
          t.lines = [];
          break;
        case 'pwd':
          pushOut(t, t.cwd);
          break;
        case 'whoami':
          pushOut(t, 'quantro\\bas-arastirmaci (SID: S-1-5-21-QUANTRO-38)');
          break;
        case 'date':
          pushOut(t, new Date().toLocaleString('tr-TR', { dateStyle: 'full', timeStyle: 'long' }));
          break;
        case 'echo':
          pushOut(t, argStr);
          break;
        case 'ls':
        case 'dir': {
          const target = resolveRel(t.cwd, rest[0]);
          const items = vfs.list(target);
          if (!items.length) pushOut(t, '(boş dizin)');
          else {
            const rows = items.map(
              (i) => `${i.type === 'dir' ? '<DIR> ' : '      '} ${String(i.size || 0).padStart(7)} B  ${i.name}`
            );
            pushOut(t, rows.join('\n'));
          }
          break;
        }
        case 'cd': {
          const next = resolveRel(t.cwd, rest[0] || 'C:/Users/Quantro');
          const st = vfs.stat(next);
          if (!st || st.type !== 'dir') pushOut(t, `Dizin bulunamadı: ${next}`, 'err');
          else t.cwd = next;
          break;
        }
        case 'cat':
        case 'type': {
          const p = resolveRel(t.cwd, rest[0]);
          pushOut(t, vfs.read(p));
          break;
        }
        case 'mkdir': {
          const p = resolveRel(t.cwd, rest[0]);
          vfs.mkdir(p);
          pushOut(t, `Klasör oluşturuldu: ${p}`, 'ok');
          break;
        }
        case 'touch': {
          const p = resolveRel(t.cwd, rest[0]);
          vfs.write(p, '');
          pushOut(t, `Dosya oluşturuldu: ${p}`, 'ok');
          break;
        }
        case 'write': {
          const p = resolveRel(t.cwd, rest[0]);
          vfs.write(p, rest.slice(1).join(' '));
          pushOut(t, `Yazıldı: ${p}`, 'ok');
          break;
        }
        case 'rm':
        case 'del': {
          const p = resolveRel(t.cwd, rest[0]);
          vfs.remove(p);
          pushOut(t, `Silindi: ${p}`, 'ok');
          break;
        }
        case 'cp':
        case 'copy': {
          vfs.copy(resolveRel(t.cwd, rest[0]), resolveRel(t.cwd, rest[1]));
          pushOut(t, 'Kopyalandı.', 'ok');
          break;
        }
        case 'mv':
        case 'ren': {
          vfs.rename(resolveRel(t.cwd, rest[0]), resolveRel(t.cwd, rest[1]));
          pushOut(t, 'Taşındı / yeniden adlandırıldı.', 'ok');
          break;
        }
        case 'find': {
          const hits = vfs.search(argStr || '', t.cwd);
          pushOut(t, hits.length ? hits.map((h) => h.path).join('\n') : 'Eşleşme yok.');
          break;
        }
        case 'ps':
        case 'tasklist': {
          const wins = osContext.wm.getAllWindows();
          pushOut(
            t,
            wins.length
              ? wins.map((w) => `${w.id.padEnd(8)} Masaüstü:${w.desktop + 1}  ${w.appId.padEnd(11)} ${w.title}`).join('\n')
              : 'Açık pencere süreci yok.'
          );
          break;
        }
        case 'kill':
        case 'taskkill':
          osContext.closeApp(rest[0]);
          pushOut(t, `Süreç kapatma sinyali gönderildi: ${rest[0]}`, 'ok');
          break;
        case 'sysinfo':
        case 'neofetch': {
          const st = osContext.getSystemStatus();
          const usage = vfs.getStorageUsage();
          pushOut(
            t,
            [
              '   ██████╗ ██╗   ██╗   QuantOS 24H2 (Quantro AR-GE Sürümü)',
              '  ██╔═══██╗██║   ██║   ----------------------------------------',
              '  ██║   ██║██║   ██║   Çekirdek   : AArch64 Limine UEFI + WebDWM Hibrit',
              '  ██║▄▄ ██║██║   ██║   Asistan    : J.A.R.V.I.S. Sesli Bilimsel Komutan',
              `  ╚██████╔╝╚██████╔╝   Aktif Tema : ${st.theme}`,
              `   ╚══▀▀═╝  ╚═════╝    Pencereler : ${st.openWindows} açık süreç`,
              `                       VFS Disk   : ${usage.totalFiles} dosya (${(usage.totalBytes / 1024).toFixed(1)} KB)`,
              `                       Çalışma    : ${st.uptimeSec} sn`,
            ].join('\n'),
            'ok'
          );
          break;
        }
        case 'qsim': {
          const name = (rest[0] || 'bell').toLowerCase();
          const fn = QuantumPresets[name] || QuantumPresets.bell;
          const qc = fn().run();
          const sample = qc.sample(1024);
          pushOut(
            t,
            `[QPU] ${name.toUpperCase()} (${qc.numQubits} kübit, 1024 ölçüm): ` +
              Object.entries(sample.counts)
                .map(([k, v]) => `|${k}⟩=${v}`)
                .join('  '),
            'ok'
          );
          break;
        }
        case 'bb84': {
          const eve = rest.includes('--eve') || rest.includes('eve');
          const r = simulateBB84({ length: 128, eavesdrop: eve });
          pushOut(
            t,
            `[BB84] Elenmiş=${r.siftedAlice.length} bit · QBER=%${(r.qber * 100).toFixed(1)} · Durum=${r.secure ? 'GÜVENLİ' : 'EVE TESPİT EDİLDİ!'} · Anahtar=${r.keyHex}`,
            r.secure ? 'ok' : 'err'
          );
          break;
        }
        case 'qrng': {
          const b = generateQRNGBytes(32);
          const s = computeByteStats(b);
          pushOut(t, `[QRNG] Entropi=${s.shannonEntropy.toFixed(3)} bit/B · Hex=${s.hex}`, 'ok');
          break;
        }
        case 'blackhole': {
          const mass = Number(rest[0]) || 10;
          const bh = blackHoleMetrics(mass, 0);
          pushOut(
            t,
            `[Astro] M=${mass} M☉ -> R_s=${bh.schwarzschildRadiusKm.toFixed(2)} km · Foton Küresi=${bh.photonSphereKm.toFixed(2)} km · ISCO=${bh.iscoProgradeKm.toFixed(2)} km · Hawking T=${bh.hawkingTempK.toExponential(2)} K`,
            'ok'
          );
          break;
        }
        case 'cosmo': {
          const z = Number(rest[0]) || 1.0;
          const c = cosmologyMetrics({ z });
          pushOut(
            t,
            `[ΛCDM] z=${z} -> Evren Yaşı=${c.universeAgeNowGyr.toFixed(2)} Gyr · Geriye Bakış=${c.lookbackTimeGyr.toFixed(2)} Gyr · d_C=${c.comovingDistanceMpc.toFixed(1)} Mpc · d_L=${c.luminosityDistanceMpc.toFixed(1)} Mpc`,
            'ok'
          );
          break;
        }
        case 'sidereal': {
          const s = siderealAndJulian(new Date(), 35.4853);
          pushOut(
            t,
            `[Kayseri Gözlemevi] JD=${s.julianDate.toFixed(5)} · LMST=${s.lmstFormatted} · Yörünge Hızı=${s.earthOrbitalSpeedKmS.toFixed(3)} km/s`,
            'ok'
          );
          break;
        }
        case 'theme':
          osContext.setTheme(rest[0] || 'ink-copper');
          pushOut(t, `Tema değiştirildi: ${rest[0] || 'ink-copper'}`, 'ok');
          break;
        case 'open':
          osContext.openApp(rest[0] || 'qlab');
          pushOut(t, `Uygulama başlatıldı: ${rest[0] || 'qlab'}`, 'ok');
          break;
        case 'jarvis': {
          const res = await osContext.jarvis.processCommand(argStr || 'durum raporu', { speak: true });
          pushOut(t, `[J.A.R.V.I.S.] ${res.reply}`, 'ok');
          break;
        }
        default:
          pushOut(t, `Komut tanınmadı: "${cmd}". Yardım için "help" veya "jarvis ${line}" deneyin.`, 'err');
      }
    } catch (err) {
      pushOut(t, `Hata: ${err.message}`, 'err');
    }
    render();
  }

  inputEl.addEventListener('keydown', (e) => {
    const t = curTab();
    if (e.key === 'Enter') {
      const val = inputEl.value;
      inputEl.value = '';
      execLine(val);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (t.history.length && t.histIdx > 0) {
        t.histIdx--;
        inputEl.value = t.history[t.histIdx];
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (t.histIdx < t.history.length - 1) {
        t.histIdx++;
        inputEl.value = t.history[t.histIdx];
      } else {
        t.histIdx = t.history.length;
        inputEl.value = '';
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const val = inputEl.value.trim();
      const match = COMMAND_LIST.find((c) => c.startsWith(val));
      if (match) inputEl.value = `${match} `;
    }
  });

  screenEl.addEventListener('click', () => inputEl.focus());

  tabsEl.addEventListener('click', (e) => {
    if (e.target.closest('#tm-add-tab')) {
      const id = tabSeq++;
      tabs.push({
        id,
        title: `QuantShell #${id}`,
        cwd: 'C:/Users/Quantro',
        lines: bootLines(),
        history: [],
        histIdx: -1,
      });
      activeTabId = id;
      render();
      inputEl.focus();
      return;
    }
    const btn = e.target.closest('[data-tid]');
    if (btn) {
      activeTabId = Number(btn.dataset.tid);
      render();
      inputEl.focus();
    }
  });

  render();
  setTimeout(() => inputEl.focus(), 60);
  return {};
}
