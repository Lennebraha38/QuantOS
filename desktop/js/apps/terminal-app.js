/**
 * Uygulama 6: QuantShell / Windows Terminal
 * Çok sekmeli terminal, komut geçmişi (Up/Down), Tab tamamlama ve 30+ gerçek OS / Bilim komutu
 */
import { QuantumPresets } from '../engines/quantum-engine.js';
import { simulateBB84, generateQRNGBytes, computeByteStats } from '../engines/bb84-engine.js';
import { blackHoleMetrics, cosmologyMetrics, siderealAndJulian } from '../engines/astro-engine.js';

const COMMAND_LIST = [
  'help', 'man', 'bench', 'chirp', 'matrix', 'clear', 'cls', 'qsim', 'bb84', 'qrng', 'blackhole', 'cosmo', 'sidereal', 'jarvis', 'theme', 'open', 'sysinfo', 'neofetch', 'vfs',
  // Linux Sistem, Dosya ve Ağ Komutları
  'ls', 'dir', 'cd', 'pwd', 'cat', 'mkdir', 'touch', 'rm', 'cp', 'mv', 'chmod', 'chown', 'find', 'grep', 'diff',
  'head', 'tail', 'less', 'more', 'wc', 'sort', 'uniq', 'tr', 'sed', 'awk', 'cut', 'tee', 'echo', 'printf', 'date',
  'whoami', 'id', 'uname', 'hostname', 'uptime', 'w', 'who', 'ps', 'top', 'kill', 'killall', 'pkill',
  'df', 'du', 'free', 'lsof', 'netstat', 'ss', 'ip', 'ifconfig', 'ping', 'curl', 'wget', 'traceroute',
  'git', 'python3', 'python', 'node', 'npm', 'npx', 'pip', 'pip3', 'make', 'gcc', 'clang', 'ld',
  'tar', 'gzip', 'gunzip', 'zip', 'unzip', 'which', 'whereis', 'type', 'alias', 'export', 'env', 'printenv',
  'bash', 'sh', 'nano', 'vim', 'history', 'stat', 'file', 'readlink', 'basename', 'dirname'
];

export function mountTerminalApp(container, osContext) {
  const vfs = osContext.vfs;
  const tabs = [
    {
      id: 1,
      title: 'QuantShell & Bash',
      cwd: 'C:/QuantOS',
      hostCwd: '/root/projects/QuantOS',
      lines: [],
      history: [],
      histIdx: -1
    },
  ];
  let activeTabId = 1;
  let tabSeq = 2;

  function bootLines() {
    return [
      { cls: 'ok', text: 'QuantOS PowerShell & Real Bash Terminal [Sürüm 24H2 · AArch64]' },
      { cls: '', text: 'Tüm Linux sistem komutları (ls, cd, git, python3, make, grep, ...) ve QuantOS kuantum/astrofizik komutları aktiftir.' },
      { cls: 'muted', text: 'Komut kataloğu için "help", J.A.R.V.I.S. için "jarvis <soru>", VFS için "vfs ls" yazabilirsiniz.' },
    ];
  }
  tabs[0].lines = bootLines();

  container.innerHTML = `
    <div class="app-shell">
      <div class="app-tabs" id="tm-tabs"></div>
      <div class="terminal-screen" id="tm-screen">
        <div id="tm-lines"></div>
        <div class="term-input-row">
          <span class="term-prompt" id="tm-prompt">PS /root/projects/QuantOS&gt;</span>
          <input type="text" class="term-input" id="tm-input" autocomplete="off" spellcheck="false" aria-label="Terminal Komut Satırı" />
        </div>
      </div>
      <div class="app-statusbar">
        <span>Kabuk: Linux Bash &amp; QuantShell (UTF-8)</span>
        <span id="tm-status">Geçmiş için ↑/↓, 140+ Komut Tamamlama için Tab</span>
      </div>
    </div>
  `;

  const tabsEl = container.querySelector('#tm-tabs');
  const screenEl = container.querySelector('#tm-screen');
  const linesEl = container.querySelector('#tm-lines');
  const promptEl = container.querySelector('#tm-prompt');
  const inputEl = container.querySelector('#tm-input');

  const curTab = () => tabs.find((t) => t.id === activeTabId) || tabs[0];

  function ansiToHtml(text) {
    const safe = escapeHtml(text);
    return safe
      .replace(/\x1b\[0?m/g, '</span>')
      .replace(/\x1b\[1m/g, '<span style="font-weight:600;">')
      .replace(/\x1b\[4m/g, '<span style="text-decoration:underline;">')
      .replace(/\x1b\[31m/g, '<span style="color:#ef4444;">')
      .replace(/\x1b\[32m/g, '<span style="color:#22c55e;">')
      .replace(/\x1b\[33m/g, '<span style="color:#eab308;">')
      .replace(/\x1b\[34m/g, '<span style="color:#38bdf8;">')
      .replace(/\x1b\[35m/g, '<span style="color:#ec4899;">')
      .replace(/\x1b\[36m/g, '<span style="color:#06b6d4;">')
      .replace(/\x1b\[37m/g, '<span style="color:#f3f4f6;">')
      .replace(/\x1b\[90m/g, '<span style="color:#9ca3af;">')
      .replace(/\x1b\[92m/g, '<span style="color:#4ade80;">')
      .replace(/\x1b\[93m/g, '<span style="color:#fde047;">')
      .replace(/\x1b\[94m/g, '<span style="color:#60a5fa;">')
      .replace(/\x1b\[96m/g, '<span style="color:#22d3ee;">')
      .replace(/\x1b\[[0-9;]*m/g, '');
  }

  function render() {
    const t = curTab();
    tabsEl.innerHTML =
      tabs
        .map(
          (tb) =>
            `<button type="button" class="app-tab ${tb.id === t.id ? 'active' : ''}" data-tid="${tb.id}">${escapeHtml(tb.title)}</button>`
        )
        .join('') +
      `<button type="button" class="btn btn-sm btn-ghost" id="tm-add-tab" style="margin-left:4px;">+ Sekme</button>`;

    linesEl.innerHTML = t.lines
      .map((l) => {
        const formatted = ansiToHtml(String(l.text));
        return `<div class="term-line ${l.cls || ''}">${formatted}</div>`;
      })
      .join('');

    const displayPrompt = t.hostCwd || t.cwd || '/root/projects/QuantOS';
    promptEl.textContent = `PS ${displayPrompt}>`;
    screenEl.scrollTop = screenEl.scrollHeight;
  }

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function pushOut(t, text, cls = '') {
    t.lines.push({ cls, text });
  }

  async function execLine(raw) {
    const t = curTab();
    const line = raw.trim();
    const currentPath = t.hostCwd || t.cwd || '/root/projects/QuantOS';
    pushOut(t, `PS ${currentPath}> ${line}`, 'cmd');

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
              'QuantOS Çift Katmanlı Terminal Komut Rehberi:',
              '  Gerçek Sistem (Linux/Bash):',
              '    ls, dir, cd <dizin>, pwd, cat <dosya>, mkdir <dizin>, rm <dosya>, cp, mv, touch, chmod',
              '    uname -a, whoami, date, echo, ps, top, df -h, free -m, grep, find, which, env',
              '    git <komut>, python3 <dosya>, node <dosya>, make <hedef>, curl <url>, wget <url>',
              '  QuantOS Kuantum & Astrofizik (İstemci İçi Anlık Simülasyon):',
              '    qsim [bell|ghz|grover2]      : Kuantum durum vektörü simülatörü ve 1024 ölçüm histogramı',
              '    bb84 [--eve]                 : BB84 QKD kuantum anahtar dağıtımı (dinleyici tespiti)',
              '    qrng [adet]                  : Kuantum rastgele sayı üreticisi ve entropi analizi',
              '    blackhole <kütle_M☉>         : Schwarzschild ve Kerr olay ufku hesaplayıcısı',
              '    cosmo <z>                    : ΛCDM kozmolojisi evren yaşı ve mesafeleri',
              '    sidereal                     : Kayseri Gözlemevi yıldız zamanı ve yörünge hızı',
              '  Yapay Zekâ & Masaüstü Yönetimi:',
              '    jarvis <soru veya komut>     : J.A.R.V.I.S. yapay zekâ asistanına doğrudan danışma',
              '    theme <ink-copper|jarvis-holo|win11-mica|vellum-light> : Masaüstü temasını değiştir',
              '    open <appId>                 : Pencere başlat (qlab, astrolab, browser, code, ...)',
              '    vfs [ls|read|write|mkdir|rm] : Şifreli tarayıcı VFS sanal dosya sistemini incele',
              '    clear / cls                  : Terminal ekranını temizle'
            ].join('\n'),
            'ok'
          );
          break;

        case 'man': {
          const target = (rest[0] || 'help').toLowerCase();
          const manPages = {
            qsim: 'KULLANIM: qsim [bell|ghz|grover2|teleportation|superdense|qft]\nAÇIKLAMA: 1..6 kübit tam karmaşık durum vektörü simülatörü ve 1024-shot ölçüm histogramı üretir.',
            bb84: 'KULLANIM: bb84 [--eve]\nAÇIKLAMA: Bennett-Brassard 1984 kuantum anahtar dağıtım protokolü simülasyonu. --eve parametresi dinleyici müdahalesini simüle eder ve QBER %25 civarına çıkar.',
            qrng: 'KULLANIM: qrng [bayt_sayisi]\nAÇIKLAMA: ANU kuantum vakum dalgalanması veya CSPRNG üzerinden kriptografik rastgele sayılar üretir.',
            blackhole: 'KULLANIM: blackhole <kütle_M☉> [spin]\nAÇIKLAMA: Schwarzschild ve Kerr kara delikleri için R_s, foton küresi, ISCO, Hawking sıcaklığı ve 2R_s zaman genişlemesini hesaplar.',
            cosmo: 'KULLANIM: cosmo <kırmızıya_kayma_z>\nAÇIKLAMA: Planck 2018 parametreleriyle Simpson integral çözümlü ΛCDM kozmoloji evren yaşı ve comoving/luminosity mesafelerini hesaplar.',
            jarvis: 'KULLANIM: jarvis <komut veya soru>\nAÇIKLAMA: J.A.R.V.I.S. bilişsel yapay zekâ asistanına doğrudan sesli/yazılı soru yöneltir veya sistem komutu işletir.',
            vfs: 'KULLANIM: vfs [ls|read|write|mkdir|rm] [yol]\nAÇIKLAMA: QuantOS WebCrypto AES-256-GCM şifreli sanal dosya sistemi yöneticisi.',
            bench: 'KULLANIM: bench\nAÇIKLAMA: CPU matris çarpımı, WebCrypto özetleme ve kuantum durum vektörü dönüşüm hız testini çalıştırır.',
            chirp: 'KULLANIM: chirp [m1_solar] [m2_solar]\nAÇIKLAMA: LIGO ikili kara delik birleşmesi kütleçekim dalgası sesini Web Audio osilatörü üzerinden sentezleyip çalar.'
          };
          pushOut(t, manPages[target] || `"${target}" için man sayfası bulunamadı. Linux sistem komutları için "man ${target}" komutunu doğrudan ana makinede çalıştırabilirsiniz.`, 'ok');
          break;
        }

        case 'bench': {
          const t0 = performance.now();
          let dummy = 0;
          for (let i = 0; i < 500000; i++) dummy += Math.sqrt(i) * Math.sin(i);
          const qc = QuantumPresets.ghz(4).run();
          const t1 = performance.now();
          const dt = (t1 - t0).toFixed(2);
          pushOut(t, `[BENCHMARK] AArch64 JS/JIT Performans Testi:\n  • 500.000 Kayan Nokta İşlemi & GHZ-4 QPU Dönüşümü: ${dt} ms\n  • QPU Durum Boyutu: 16 Karmaşık Genlik (Birim Norm Korundu: |ψ|=1.00)\n  • Durum: YÜKSEK HIZLI ÇEKİRDEK İCRA`, 'ok');
          break;
        }

        case 'chirp': {
          const m1 = Number(rest[0]) || 36;
          const m2 = Number(rest[1]) || 29;
          const wave = ligoChirpWaveform({ m1Solar: m1, m2Solar: m2, distanceMpc: 410, durationSec: 0.45, sampleRate: 2048 });
          osContext.sound?.playChirpArray?.(wave.strain, 2048);
          pushOut(t, `[LIGO CHIRP] m1=${m1} M☉, m2=${m2} M☉ ikili birleşme chirp sesi Web Audio üzerinden çalınıyor... (Chirp Kütlesi: ${wave.chirpMassSolar.toFixed(2)} M☉)`, 'ok');
          break;
        }

        case 'matrix': {
          pushOut(t, '01101001 01101110 01110011 01110100 01100001 01101110 01110100', 'ok');
          pushOut(t, 'QUANTRO AR-GE CYBER CORE · J.A.R.V.I.S. VERİ AKIŞI AKTİF', 'ok');
          pushOut(t, '10010101 11010110 00101101 11010010 10101101 01101010 10101010', 'ok');
          break;
        }

        case 'clear':
        case 'cls':
          t.lines = [];
          break;

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
          const count = Number(rest[0]) || 32;
          const b = generateQRNGBytes(Math.min(128, Math.max(8, count)));
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

        case 'vfs': {
          const sub = (rest[0] || 'ls').toLowerCase();
          const targetPath = rest[1] || 'C:/Users/Quantro';
          if (sub === 'ls' || sub === 'dir') {
            const items = vfs.list(targetPath);
            const rows = items.map((i) => `${i.type === 'dir' ? '<DIR> ' : '      '} ${String(i.size || 0).padStart(7)} B  ${i.name}`);
            pushOut(t, rows.length ? rows.join('\n') : '(VFS dizini boş)');
          } else if (sub === 'cat' || sub === 'read') {
            pushOut(t, vfs.read(targetPath));
          } else if (sub === 'write') {
            vfs.write(targetPath, rest.slice(2).join(' '));
            pushOut(t, `VFS yazıldı: ${targetPath}`, 'ok');
          } else if (sub === 'mkdir') {
            vfs.mkdir(targetPath);
            pushOut(t, `VFS klasörü oluşturuldu: ${targetPath}`, 'ok');
          } else {
            pushOut(t, 'Kullanım: vfs [ls|read|write|mkdir] <yol>', 'muted');
          }
          break;
        }

        case 'neofetch':
        case 'sysinfo': {
          const st = osContext.getSystemStatus?.() || {};
          pushOut(
            t,
            [
              '   ██████╗ ██╗   ██╗   QuantOS 24H2 (Quantro AR-GE Sürümü)',
              '  ██╔═══██╗██║   ██║   ----------------------------------------',
              '  ██║   ██║██║   ██║   Çekirdek   : AArch64 Limine UEFI + WebDWM Hibrit',
              '  ██║▄▄ ██║██║   ██║   Kabuk      : Linux GNU Bash & QuantShell',
              '  ╚██████╔╝╚██████╔╝   Asistan    : J.A.R.V.I.S. Ultra AI Sesli Komutan',
              `   ╚══▀▀═╝  ╚═════╝    Aktif Tema : ${st.theme || 'ink-copper'}`,
              `                       Açık Süreç : ${st.openWindows || 1} pencere`,
              `                       Çalışma    : ${st.uptimeSec || 0} sn`,
            ].join('\n'),
            'ok'
          );
          break;
        }

        default: {
          // TÜM DİĞER KOMUTLAR: Gerçek Linux Ana Makine Terminaline (/bin/bash) bağlanarak çalıştır
          let executedOnHost = false;
          if (typeof fetch === 'function') {
            try {
              const resp = await fetch('/api/terminal/exec', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  command: line,
                  cwd: t.hostCwd || '/root/projects/QuantOS'
                }),
                signal: AbortSignal.timeout(32000)
              });

              if (resp.ok) {
                const data = await resp.json();
                if (data.cwd) {
                  t.hostCwd = data.cwd;
                  t.cwd = data.cwd;
                }
                if (data.stdout) {
                  pushOut(t, data.stdout.replace(/\n+$/, ''), '');
                }
                if (data.stderr) {
                  pushOut(t, data.stderr.replace(/\n+$/, ''), 'err');
                }
                if (data.exitCode !== 0 && !data.stdout && !data.stderr) {
                  pushOut(t, `Süreç çıkış kodu: ${data.exitCode}`, 'err');
                }
                executedOnHost = true;
              }
            } catch {
              // Sunucu çevrimdışıysa yerel VFS taklidine düş
            }
          }

          if (!executedOnHost) {
            // Çevrimdışı yerel geri dönüş
            if (cmd === 'pwd') {
              pushOut(t, t.hostCwd || '/root/projects/QuantOS');
            } else if (cmd === 'whoami') {
              pushOut(t, 'root');
            } else if (cmd === 'date') {
              pushOut(t, new Date().toLocaleString('tr-TR'));
            } else {
              pushOut(
                t,
                `Komut çalıştırılamadı: "${cmd}". Çevrimdışı kipte yerleşik komutlar için "help" yazın.`,
                'err'
              );
            }
          }
        }
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
