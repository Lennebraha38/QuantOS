/**
 * Uygulama 6: QuantShell / Windows Terminal
 * Çok sekmeli terminal, komut geçmişi (Up/Down), Tab tamamlama ve 30+ gerçek OS / Bilim komutu
 */
import { QuantumPresets } from '../engines/quantum-engine.js';
import { simulateBB84, generateQRNGBytes, computeByteStats } from '../engines/bb84-engine.js';
import { blackHoleMetrics, cosmologyMetrics, siderealAndJulian } from '../engines/astro-engine.js';

const COMMAND_LIST = [
  'help', 'clear', 'cls', 'qsim', 'bb84', 'qrng', 'blackhole', 'cosmo', 'sidereal', 'jarvis', 'theme', 'open', 'sysinfo', 'neofetch', 'vfs',
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
        const safe = escapeHtml(String(l.text));
        return `<div class="term-line ${l.cls || ''}">${safe}</div>`;
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
