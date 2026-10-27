/**
 * Uygulama 16: QuantMark Süper Bilgisayar Benchmark Stüdyosu
 * 1-6 Kübit QPU Hilbert dönüşümü, Kerr/Schwarzschild görelilik tensörleri,
 * 3-Cisim N-Body yörünge mekaniği ve Shannon entropi debisi canlı kıyaslama laboratuvarı
 */
import { QuantumPresets } from '../engines/quantum-engine.js';
import { blackHoleMetrics, NBodySystem } from '../engines/astro-engine.js';
import { generateQRNGBytes, computeByteStats } from '../engines/bb84-engine.js';

export function mountQuantMarkApp(container, osContext) {
  let isRunning = false;
  let results = null;

  container.innerHTML = `
    <div class="app-shell">
      <div class="app-toolbar" style="gap:8px;justify-content:space-between;">
        <button type="button" class="btn btn-sm btn-primary" id="qm-run" style="font-weight:600;">🚀 QuantMark Testini Başlat</button>
        <div style="display:inline-flex;gap:6px;">
          <button type="button" class="btn btn-sm" id="qm-copy" disabled>📋 Raporu Kopyala</button>
          <button type="button" class="btn btn-sm" id="qm-save-vfs" disabled>💾 Raporu Kaydet</button>
        </div>
      </div>

      <div class="app-main" style="padding:16px;overflow-y:auto;">
        <div class="panel-card" style="margin-bottom:14px;background:linear-gradient(135deg, rgba(209,146,92,0.12), rgba(19,21,25,0.95));">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;">
            <div>
              <span class="eyebrow" style="color:var(--accent);">SÜPER BİLGİSAYAR &amp; KUANTUM DONANIM KIYASLAMA</span>
              <h2 class="serif" style="margin:4px 0 0;font-size:24px;font-weight:400;">QuantMark Benchmark Studio</h2>
              <p style="margin:4px 0 0;font-size:12px;color:var(--text-2);max-width:560px;">
                Gerçek CODATA 2022 fizik sabitleri ve durum vektörleriyle tarayıcınızın saf bilimsel hesaplama gücünü ölçer.
              </p>
            </div>
            <div id="qm-score-badge" style="text-align:right;min-width:180px;">
              <div style="font-size:11px;font-family:var(--font-mono);color:var(--text-3);">BİLEŞİK QUANTMARK SKORU</div>
              <div class="mono" style="font-size:32px;font-weight:700;color:var(--text-1);" id="qm-score-val">-- <span style="font-size:14px;color:var(--accent);">Q-MARKS</span></div>
              <div style="font-size:12px;color:var(--patina);" id="qm-tier-val">BEKLİYOR</div>
            </div>
          </div>
        </div>

        <!-- 4 Bilimsel Test Kartı -->
        <div class="metrics-grid" style="margin-bottom:16px;">
          <div class="metric-box">
            <span class="metric-label">⚛️ QPU HİLBERT UZAYI DÖNÜŞÜMÜ</span>
            <span class="metric-value" id="qm-qpu-dt">-- <span class="metric-unit">ms</span></span>
            <span style="font-size:11px;color:var(--text-3);" id="qm-qpu-sub">500x GHZ(4) Durum Rotasyonu</span>
          </div>
          <div class="metric-box">
            <span class="metric-label">🕳️ GÖRELİLİK &amp; KERR TENSÖRLERİ</span>
            <span class="metric-value" id="qm-astro-dt">-- <span class="metric-unit">ms</span></span>
            <span style="font-size:11px;color:var(--text-3);" id="qm-astro-sub">10.000x Olay Ufku ve Foton Küresi</span>
          </div>
          <div class="metric-box">
            <span class="metric-label">🪐 N-CİSİM YÖRÜNGE İNTEGRASYONU</span>
            <span class="metric-value" id="qm-nbody-dt">-- <span class="metric-unit">ms</span></span>
            <span style="font-size:11px;color:var(--text-3);" id="qm-nbody-sub">2.000 Adım Velocity-Verlet</span>
          </div>
          <div class="metric-box">
            <span class="metric-label">🔐 SHANNON ENTROPİ DEBİSİ</span>
            <span class="metric-value" id="qm-crypto-dt">-- <span class="metric-unit">bit/B</span></span>
            <span style="font-size:11px;color:var(--text-3);" id="qm-crypto-sub">32 KB CSPRNG Vakum Akışı</span>
          </div>
        </div>

        <!-- Karşılaştırma Referans Tablosu -->
        <div class="panel-card">
          <div class="eyebrow" style="margin-bottom:10px;">DONANIM REFERANS SIRALAMASI (KARŞILAŞTIRMA)</div>
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Sistem / Donanım</th>
                  <th>Mimari</th>
                  <th>Hesaplama Katmanı</th>
                  <th>QuantMark Skoru</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody id="qm-ref-tbody">
                <tr><td>Cray Frontier Node</td><td>AMD EPYC + Instinct MI250X</td><td>Bare-Metal C/HIP</td><td class="mono" style="color:var(--accent);">28,500+</td><td>Exascale Süper Bilgisayar</td></tr>
                <tr><td>Quantro Q-System One</td><td>AArch64 + FPGA QPU Core</td><td>QuantOS Bare-Metal</td><td class="mono" style="color:var(--accent);">22,400</td><td>Referans Kuantum İstasyonu</td></tr>
                <tr id="qm-user-row" style="font-weight:600;background:rgba(209,146,92,0.08);">
                  <td>👉 Bu Bilgisayar (Siz)</td>
                  <td id="qm-user-arch">Ölçülüyor...</td>
                  <td>QuantOS WebAssembly / JIT</td>
                  <td class="mono" id="qm-user-score">--</td>
                  <td id="qm-user-status">Testi Çalıştırın</td>
                </tr>
                <tr><td>Apple M3 Max</td><td>ARMv8.6-A (16-Core CPU)</td><td>V8 JIT / WebKit</td><td class="mono">17,800</td><td>Üst Seviye İş İstasyonu</td></tr>
                <tr><td>Intel Core i9-14900K</td><td>x86_64 Raptor Lake (24 Çekirdek)</td><td>Node.js / Chrome V8</td><td class="mono">16,200</td><td>Masaüstü İş İstasyonu</td></tr>
                <tr><td>Standart Laptop / Mobil</td><td>Mobil 8-Çekirdek</td><td>Tarayıcı İzole</td><td class="mono">8,500</td><td>Standart İstemci</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="app-statusbar">
        <span id="qm-foot">QuantMark v2.4 · Gerçek CODATA 2022 &amp; IAU / Meeus Doğruluk Protokolü</span>
        <span>Çok Çekirdekli Kuantum ve Astrofizik Kıyaslayıcı</span>
      </div>
    </div>
  `;

  const runBtn = container.querySelector('#qm-run');
  const copyBtn = container.querySelector('#qm-copy');
  const saveBtn = container.querySelector('#qm-save-vfs');
  const scoreVal = container.querySelector('#qm-score-val');
  const tierVal = container.querySelector('#qm-tier-val');
  const userRow = container.querySelector('#qm-user-row');
  const userScore = container.querySelector('#qm-user-score');
  const userArch = container.querySelector('#qm-user-arch');
  const userStatus = container.querySelector('#qm-user-status');

  const qpuDt = container.querySelector('#qm-qpu-dt');
  const astroDt = container.querySelector('#qm-astro-dt');
  const nbodyDt = container.querySelector('#qm-nbody-dt');
  const cryptoDt = container.querySelector('#qm-crypto-dt');

  function runBenchmark() {
    if (isRunning) return;
    isRunning = true;
    runBtn.disabled = true;
    runBtn.textContent = '⏳ Benchmark Yürütülüyor...';

    scoreVal.textContent = 'ÖLÇÜLÜYOR...';
    tierVal.textContent = 'HESAPLANIYOR';

    setTimeout(() => {
      // 1. Quantum State Vector Rotation Bench
      const t0 = performance.now();
      for (let i = 0; i < 500; i++) {
        const qc = QuantumPresets.ghz(4);
        qc.run();
      }
      const dtQPU = performance.now() - t0;

      // 2. Kerr Black Hole Relativistic Metric Bench
      const t1 = performance.now();
      for (let i = 0; i < 10000; i++) {
        blackHoleMetrics(10 + (i % 50), 0.5);
      }
      const dtAstro = performance.now() - t1;

      // 3. N-Body Orbital Mechanics Bench (Velocity-Verlet)
      const t2 = performance.now();
      const nb = new NBodySystem([{ mass: 100, x: 0, y: 0 }, { mass: 1, x: 100, y: 0, vy: 1 }]);
      for (let i = 0; i < 2000; i++) nb.step(0.01);
      const dtNbody = performance.now() - t2;

      // 4. Cryptographic Quantum Entropy Bench
      const t3 = performance.now();
      const bytes = generateQRNGBytes(32768);
      const stats = computeByteStats(bytes);
      const dtCrypto = performance.now() - t3;

      const totalTime = dtQPU + dtAstro + dtNbody + dtCrypto;
      const score = Math.round(1600000 / (totalTime + 12));

      let tier = 'SÜPER BİLGİSAYAR / ARAŞTIRMA İSTASYONU';
      if (score < 9000) tier = 'STANDART İSTEMCİ';
      else if (score < 14500) tier = 'GELİŞMİŞ İŞ İSTASYONU';

      results = {
        score,
        tier,
        dtQPU,
        dtAstro,
        dtNbody,
        dtCrypto,
        entropy: stats.shannonEntropy,
        date: new Date().toLocaleString('tr-TR')
      };

      // UI Güncelle
      qpuDt.innerHTML = `${dtQPU.toFixed(1)} <span class="metric-unit">ms</span>`;
      astroDt.innerHTML = `${dtAstro.toFixed(1)} <span class="metric-unit">ms</span>`;
      nbodyDt.innerHTML = `${dtNbody.toFixed(1)} <span class="metric-unit">ms</span>`;
      cryptoDt.innerHTML = `${stats.shannonEntropy.toFixed(2)} <span class="metric-unit">bit/B</span>`;

      scoreVal.innerHTML = `${score.toLocaleString('tr-TR')} <span style="font-size:14px;color:var(--accent);">Q-MARKS</span>`;
      tierVal.textContent = tier;

      userScore.textContent = score.toLocaleString('tr-TR');
      userArch.textContent = `${navigator.hardwareConcurrency || 8} Çekirdek · ${navigator.platform || 'x64'}`;
      userStatus.textContent = `Doğrulandı: ${tier}`;

      copyBtn.disabled = false;
      saveBtn.disabled = false;
      runBtn.disabled = false;
      runBtn.textContent = '🔄 Yeniden Test Et';
      isRunning = false;

      osContext.sound?.playSnap?.();
      osContext.notify?.('QuantMark Benchmark', `Test tamamlandı! Skor: ${score.toLocaleString('tr-TR')} Q-Marks`);
    }, 40);
  }

  runBtn.addEventListener('click', runBenchmark);

  copyBtn.addEventListener('click', () => {
    if (!results) return;
    const txt = `--- QUANTMARK SÜPER BİLGİSAYAR KIYASLAMA RAPORU ---
Skor : ${results.score.toLocaleString('tr-TR')} Q-Marks
Seviye: ${results.tier}
- QPU Hilbert Durum Vektörü Rotasyonu : ${results.dtQPU.toFixed(2)} ms
- Kerr/Schwarzschild Olay Ufku Tensörleri: ${results.dtAstro.toFixed(2)} ms
- N-Cisim Yörünge Entegrasyonu        : ${results.dtNbody.toFixed(2)} ms
- Kriptografik Shannon Entropi Oranı   : ${results.entropy.toFixed(3)} bit/Bayt
Platform: QuantOS 24H2 · Tarih: ${results.date}`;
    if (osContext.copyToClipboard) osContext.copyToClipboard(txt);
    else navigator.clipboard?.writeText?.(txt).catch(() => {});
    osContext.notify?.('QuantMark', 'Rapor işletim sistemi panosuna kopyalandı.');
  });

  saveBtn.addEventListener('click', () => {
    if (!results) return;
    const filename = `QuantMark-Rapor-${Date.now().toString().slice(-4)}.md`;
    const vfsPath = `C:/Users/Quantro/Research/${filename}`;
    const txt = `# QuantMark Kuantum & Astrofizik Benchmark Raporu\n\n- **Bileşik Skor**: ${results.score.toLocaleString('tr-TR')} Q-Marks\n- **Performans Seviyesi**: ${results.tier}\n- **QPU Dönüşüm Süresi**: ${results.dtQPU.toFixed(2)} ms\n- **Kerr Olay Ufku Tensörü**: ${results.dtAstro.toFixed(2)} ms\n- **N-Cisim Velocity-Verlet Hızı**: ${results.dtNbody.toFixed(2)} ms\n- **Shannon Entropisi**: ${results.entropy.toFixed(3)} bit/B\n- **Tarih**: ${results.date}\n`;
    if (!osContext.vfs.exists('C:/Users/Quantro/Research')) {
      osContext.vfs.mkdir('C:/Users/Quantro/Research');
    }
    osContext.vfs.write(vfsPath, txt);
    osContext.notify?.('QuantMark', `Rapor VFS'ye kaydedildi: ${vfsPath}`);
  });

  return {
    destroy() {}
  };
}
