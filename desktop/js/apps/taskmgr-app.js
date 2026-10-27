import { QuantumPresets } from '../engines/quantum-engine.js';
import { blackHoleMetrics, NBodySystem } from '../engines/astro-engine.js';
import { generateQRNGBytes, computeByteStats } from '../engines/bb84-engine.js';
/**
 * Uygulama 8: Windows 11 Görev Yöneticisi (Task Manager)
 * Açık süreç tablosu, Görevi Sonlandır ve gerçek zamanlı FPS / Host Çekirdek / VFS Canvas grafikleri
 */

export function mountTaskMgrApp(container, osContext, args = {}) {
  let activeTab = args?.tab === 'bench' ? 'bench' : 'processes';
  let benchResult = null;
  let benchRunning = false;
  const fpsHist = Array(40).fill(60);
  const memHist = Array(40).fill(35);
  let timerId = 0;

  container.innerHTML = `
    <div class="app-shell">
      <div class="app-tabs" id="tmgr-tabs">
        <button type="button" class="app-tab active" data-tab="processes">Süreçler (DWM Pencereleri)</button>
        <button type="button" class="app-tab" data-tab="perf">Performans &amp; Host Telemetrisi</button>
        <button type="button" class="app-tab ${activeTab === 'bench' ? 'active' : ''}" data-tab="bench">QuantMark Benchmark</button>
      </div>
      <div class="app-main" id="tmgr-body"></div>
      <div class="app-statusbar">
        <span>Veri Kaynağı: DWM + /api/system (Linux procfs)</span>
        <span id="tmgr-foot">Yenileniyor...</span>
      </div>
    </div>
  `;

  const bodyEl = container.querySelector('#tmgr-body');
  const footEl = container.querySelector('#tmgr-foot');

  async function sampleTelemetry() {
    const fps = osContext.getCurrentFps?.() || 60;
    fpsHist.push(fps);
    fpsHist.shift();

    let sys = null;
    try {
      const r = await fetch('/api/system');
      if (r.ok) sys = await r.json();
    } catch {
      // offline standalone mode
    }
    if (sys?.memoryUsagePercent) {
      memHist.push(sys.memoryUsagePercent);
      memHist.shift();
    }
    footEl.textContent = `Açık pencere: ${osContext.wm.getAllWindows().length} · DWM: ${fps} FPS`;
    return sys;
  }

  function drawChart(canvas, values, maxVal, color) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#0C0E12';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(234,231,225,0.07)';
    for (let y = 1; y < 4; y++) {
      ctx.beginPath();
      ctx.moveTo(0, (h * y) / 4);
      ctx.lineTo(w, (h * y) / 4);
      ctx.stroke();
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    values.forEach((v, i) => {
      const px = (i / (values.length - 1)) * w;
      const py = h - Math.min(1, Math.max(0, v / maxVal)) * (h - 14) - 7;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }

  async function render() {
    const escapeHtml = (s) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    const sys = await sampleTelemetry();
    if (activeTab === 'processes') {
      const wins = osContext.wm.getAllWindows();
      bodyEl.innerHTML = `
        <div class="panel-card">
          <div class="panel-head">
            <span class="eyebrow">AKTİF UYGULAMA SÜREÇLERİ</span>
            <span class="badge badge-patina num">${wins.length} Süreç</span>
          </div>
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr><th>PID / Pencere</th><th>Uygulama</th><th>Masaüstü</th><th>Durum</th><th>İşlem</th></tr>
              </thead>
              <tbody>
                ${wins
                  .map(
                    (w) => `
                  <tr>
                    <td class="mono">${escapeHtml(w.id)}</td>
                    <td>${escapeHtml(w.title)}</td>
                    <td class="mono">#${w.desktop + 1}</td>
                    <td>${w.minimized ? 'Küçültüldü' : 'Çalışıyor'}</td>
                    <td>
                      <button type="button" class="btn btn-sm" data-focus="${escapeHtml(w.id)}">Odakla</button>
                      <button type="button" class="btn btn-sm btn-danger" data-kill="${escapeHtml(w.id)}">Sonlandır</button>
                    </td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      bodyEl.querySelectorAll('[data-focus]').forEach((b) =>
        b.addEventListener('click', () => osContext.wm.focusWindow(b.dataset.focus))
      );
      bodyEl.querySelectorAll('[data-kill]').forEach((b) =>
        b.addEventListener('click', () => {
          osContext.closeApp(b.dataset.kill);
          render();
        })
      );
    } else if (activeTab === 'bench') {
      bodyEl.innerHTML = `
        <div class="panel-card">
          <div class="panel-head">
            <div>
              <span class="eyebrow">QUANTMARK — SÜPER BİLGİSAYAR &amp; KUANTUM HESAPLAMA LABORATUVARI</span>
              <p style="margin:4px 0 0;font-size:12px;color:var(--text-2);">
                Çok boyutlu Hilbert uzayı kuantum durum vektörü rotasyonları, Boyer-Lindquist Kerr tensörleri, Velocity-Verlet N-cisim integrasyonu ve Shannon entropi debisini gerçek zamanlı ölçer.
              </p>
            </div>
            <button type="button" class="btn btn-primary" id="tmgr-run-bench" ${benchRunning ? 'disabled' : ''}>
              ${benchRunning ? '⏳ Test Yürütülüyor...' : '🚀 QuantMark Benchmark Testini Başlat'}
            </button>
          </div>

          <div id="tmgr-bench-out" style="margin-top:14px;">
            ${benchResult ? `
              <div style="background:var(--accent-subtle);border:1px solid var(--accent);border-radius:var(--radius-m);padding:16px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                <div>
                  <div style="font-size:11px;font-family:var(--font-mono);color:var(--accent);letter-spacing:1px;">TOPLAM QUANTMARK BİLEŞİK SKORU</div>
                  <div style="font-size:28px;font-weight:700;font-family:var(--font-mono);color:var(--text-1);">${benchResult.score.toLocaleString('tr-TR')} <span style="font-size:14px;color:var(--accent);">Q-MARKS</span></div>
                  <div style="font-size:12px;color:var(--patina);font-weight:500;">SEVİYE: ${benchResult.level}</div>
                </div>
                <button type="button" class="btn btn-sm" id="tmgr-copy-bench">📋 Sonuç Raporunu Kopyala</button>
              </div>

              <div class="metrics-grid">
                <div class="metric-box">
                  <span class="metric-label">⚛️ QPU HİLBERT DÖNÜŞÜMÜ</span>
                  <span class="metric-value">${benchResult.dtQuantum.toFixed(1)} <span class="metric-unit">ms</span></span>
                  <span style="font-size:11px;color:var(--text-3);">500x GHZ(4) + Unitary Rotasyonlar</span>
                </div>
                <div class="metric-box">
                  <span class="metric-label">🕳️ KERR &amp; SCHWARZSCHILD</span>
                  <span class="metric-value">${benchResult.dtAstro.toFixed(1)} <span class="metric-unit">ms</span></span>
                  <span style="font-size:11px;color:var(--text-3);">10.000x Relativistik Olay Ufku</span>
                </div>
                <div class="metric-box">
                  <span class="metric-label">🪐 N-CİSİM YÖRÜNGE HIZI</span>
                  <span class="metric-value">${benchResult.dtNbody.toFixed(1)} <span class="metric-unit">ms</span></span>
                  <span style="font-size:11px;color:var(--text-3);">2.000 Adım Velocity-Verlet</span>
                </div>
                <div class="metric-box">
                  <span class="metric-label">🔐 SHANNON ENTROPİ HIZI</span>
                  <span class="metric-value">${benchResult.entropy.toFixed(2)} <span class="metric-unit">bit/B</span></span>
                  <span style="font-size:11px;color:var(--text-3);">32 KB CSPRNG Kripto Analizi</span>
                </div>
              </div>
            ` : `
              <div style="text-align:center;padding:36px;color:var(--text-3);">
                <div style="font-size:32px;margin-bottom:8px;">⚛️</div>
                <div style="font-size:14px;font-weight:500;color:var(--text-2);">Test Henüz Çalıştırılmadı</div>
                <div style="font-size:12px;margin-top:4px;">Yukarıdaki başlat düğmesine basarak sisteminizin bilimsel hesaplama kapasitesini ölçebilirsiniz.</div>
              </div>
            `}
          </div>
        </div>
      `;

      const runBtn = bodyEl.querySelector('#tmgr-run-bench');
      if (runBtn) {
        runBtn.addEventListener('click', () => {
          benchRunning = true;
          render();
          setTimeout(() => {
            // 1. Quantum Bench
            const t0 = performance.now();
            for (let i = 0; i < 500; i++) {
              const qc = QuantumPresets.ghz(4);
              qc.run();
            }
            const dtQuantum = performance.now() - t0;

            // 2. Astro Bench
            const t1 = performance.now();
            for (let i = 0; i < 10000; i++) {
              blackHoleMetrics(10 + (i % 50), 0.5);
            }
            const dtAstro = performance.now() - t1;

            // 3. N-Body Bench
            const t2 = performance.now();
            const nb = new NBodySystem([{ mass: 100, x: 0, y: 0 }, { mass: 1, x: 100, y: 0, vy: 1 }]);
            for (let i = 0; i < 2000; i++) nb.step(0.01);
            const dtNbody = performance.now() - t2;

            // 4. Crypto Bench
            const t3 = performance.now();
            const bytes = generateQRNGBytes(32768);
            const stats = computeByteStats(bytes);
            const dtCrypto = performance.now() - t3;

            const totalDt = dtQuantum + dtAstro + dtNbody + dtCrypto;
            const score = Math.round(1500000 / (totalDt + 15));
            let level = 'SÜPER BİLGİSAYAR / ARAŞTIRMA İSTASYONU';
            if (score < 8000) level = 'GİRİŞ SEVİYESİ MOBİL İŞLEM';
            else if (score < 14000) level = 'GELİŞMİŞ İŞ İSTASYONU';

            benchResult = { dtQuantum, dtAstro, dtNbody, dtCrypto, totalDt, score, level, entropy: stats.shannonEntropy };
            benchRunning = false;
            render();
            osContext.notify?.('QuantMark Benchmark', `Test tamamlandı! Skor: ${score.toLocaleString('tr-TR')} Q-Marks`);
          }, 30);
        });
      }

      const copyBtn = bodyEl.querySelector('#tmgr-copy-bench');
      if (copyBtn && benchResult) {
        copyBtn.addEventListener('click', () => {
          const report = `--- QUANTMARK BİLİMSEL BENCHMARK RAPORU ---
Skor: ${benchResult.score.toLocaleString('tr-TR')} Q-Marks (${benchResult.level})
- QPU Durum Vektörü: ${benchResult.dtQuantum.toFixed(2)} ms
- Kerr Kara Delik Tensörleri: ${benchResult.dtAstro.toFixed(2)} ms
- N-Cisim Yörünge Simülasyonu: ${benchResult.dtNbody.toFixed(2)} ms
- Shannon Entropi Oranı: ${benchResult.entropy.toFixed(3)} bit/B
Tarih: ${new Date().toLocaleString('tr-TR')}
Platform: QuantOS 24H2`;
          if (osContext.copyToClipboard) osContext.copyToClipboard(report);
          else navigator.clipboard?.writeText?.(report).catch(() => {});
          osContext.notify?.('QuantMark', 'Benchmark raporu panoya kopyalandı.');
        });
      }
    } else {
      const usage = osContext.vfs.getStorageUsage();
      bodyEl.innerHTML = `
        <div class="metrics-grid">
          <div class="metric-box"><span class="metric-label">MİMARİ</span><span class="metric-value">${escapeHtml(sys?.arch || 'aarch64/web')}</span></div>
          <div class="metric-box"><span class="metric-label">CPU ÇEKİRDEĞİ</span><span class="metric-value">${sys?.cpuCount || navigator.hardwareConcurrency || 4}</span></div>
          <div class="metric-box"><span class="metric-label">HOST BELLEK KULLANIMI</span><span class="metric-value">${sys ? `${sys.memoryUsagePercent}%` : 'Tarayıcı İzole'}</span></div>
          <div class="metric-box"><span class="metric-label">VFS DEPOLAMA</span><span class="metric-value">${(usage.usedBytes / 1024).toFixed(1)} <span class="metric-unit">KB</span></span></div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;">
          <figure class="figure-frame">
            <canvas id="tmgr-fps-c" width="320" height="140"></canvas>
            <figcaption class="figure-caption"><span>DWM KARE HIZI (FPS)</span><span>0–75 FPS</span></figcaption>
          </figure>
          <figure class="figure-frame">
            <canvas id="tmgr-mem-c" width="320" height="140"></canvas>
            <figcaption class="figure-caption"><span>HOST RAM YÜKÜ (%)</span><span>/api/system</span></figcaption>
          </figure>
        </div>
      `;
      drawChart(bodyEl.querySelector('#tmgr-fps-c'), fpsHist, 75, '#D1925C');
      drawChart(bodyEl.querySelector('#tmgr-mem-c'), memHist, 100, '#5F8A7A');
    }
  }

  container.querySelector('#tmgr-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    activeTab = b.dataset.tab;
    container.querySelectorAll('.app-tab').forEach((el) => el.classList.toggle('active', el === b));
    render();
  });

  render();
  timerId = setInterval(render, 2000);

  return {
    onArgs(next) {
      if (next?.tab) {
        activeTab = next.tab;
        render();
      }
    },
    destroy() {
      clearInterval(timerId);
    },
  };
}
