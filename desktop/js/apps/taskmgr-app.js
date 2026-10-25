/**
 * Uygulama 8: Windows 11 Görev Yöneticisi (Task Manager)
 * Açık süreç tablosu, Görevi Sonlandır ve gerçek zamanlı FPS / Host Çekirdek / VFS Canvas grafikleri
 */

export function mountTaskMgrApp(container, osContext) {
  let activeTab = 'processes';
  const fpsHist = Array(40).fill(60);
  const memHist = Array(40).fill(35);
  let timerId = 0;

  container.innerHTML = `
    <div class="app-shell">
      <div class="app-tabs" id="tmgr-tabs">
        <button type="button" class="app-tab active" data-tab="processes">Süreçler (DWM Pencereleri)</button>
        <button type="button" class="app-tab" data-tab="perf">Performans &amp; Host Telemetrisi</button>
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
    destroy() {
      clearInterval(timerId);
    },
  };
}
