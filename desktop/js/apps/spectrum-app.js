/**
 * Uygulama 13: Astrofizik Spektrum & Çizim Stüdyosu
 * Sekme 1: Elementel Emisyon/Soğurma Tayfı + Doppler Kırmızıya Kayma (z) Analizörü
 * Sekme 2: Serbest Bilimsel Diyagram ve Çizim Tuvali
 */
import { SPECTRAL_ELEMENTS, shiftWavelength, wavelengthToHex, ASTRO_CONSTANTS } from '../engines/astro-engine.js';

export function mountSpectrumApp(container) {
  let tab = 'spectrum';
  let elemIdx = 0;
  let redshift = 0.0;
  let mode = 'emission';

  container.innerHTML = `
    <div class="app-shell">
      <div class="app-tabs" id="sp-tabs">
        <button type="button" class="app-tab active" data-tab="spectrum">Astrofizik Tayf &amp; Doppler Kayması</button>
        <button type="button" class="app-tab" data-tab="draw">Diyagram &amp; Çizim Tuvali</button>
      </div>
      <div class="app-main" id="sp-body"></div>
      <div class="app-statusbar">
        <span>Tayf Aralığı: 380 nm – 750 nm (Görünür Optik Bant)</span>
        <span id="sp-foot">NIST Atomik Çizgi Verisi</span>
      </div>
    </div>
  `;

  const bodyEl = container.querySelector('#sp-body');
  const footEl = container.querySelector('#sp-foot');

  function renderSpectrum() {
    bodyEl.innerHTML = `
      <div class="panel-card">
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
          <label style="font-size:12px;">Element:
            <select class="select" id="sp-el" style="width:220px;display:inline-block;margin-left:6px;">
              ${SPECTRAL_ELEMENTS.map((el, i) => `<option value="${i}" ${i === elemIdx ? 'selected' : ''}>${el.symbol} — ${el.name}</option>`).join('')}
            </select>
          </label>
          <label style="font-size:12px;">Mod:
            <select class="select" id="sp-mode" style="width:140px;display:inline-block;margin-left:6px;">
              <option value="emission" ${mode === 'emission' ? 'selected' : ''}>Emisyon Çizgisi</option>
              <option value="absorption" ${mode === 'absorption' ? 'selected' : ''}>Soğurma (Fraunhofer)</option>
            </select>
          </label>
          <label style="flex:1;min-width:200px;font-size:12px;">
            Kırmızıya Kayma z = <strong class="mono" id="sp-z-lbl">${redshift.toFixed(3)}</strong>
            <input type="range" id="sp-z" min="-0.15" max="0.60" step="0.005" value="${redshift}" style="width:100%;margin-top:4px;" />
          </label>
        </div>
      </div>

      <figure class="figure-frame">
        <canvas id="sp-canvas" width="680" height="150"></canvas>
        <figcaption class="figure-caption">
          <span>ÜST ŞERİT: LABORATUVAR (z=0) · ALT ŞERİT: GÖZLENEN KAYMIŞ TAYF λ_obs = λ₀(1+z)</span>
          <span id="sp-vel">Radyal Hız: 0 km/s</span>
        </figcaption>
      </figure>

      <div class="panel-card">
        <div class="data-table-wrap">
          <table class="data-table">
            <thead><tr><th>Geçiş</th><th>Durgun λ₀ (nm)</th><th>Gözlenen λ_obs (nm)</th><th>Δλ (nm)</th></tr></thead>
            <tbody id="sp-tbody"></tbody>
          </table>
        </div>
      </div>
    `;

    const canvas = bodyEl.querySelector('#sp-canvas');
    const ctx = canvas.getContext('2d');

    const update = () => {
      const el = SPECTRAL_ELEMENTS[elemIdx] || SPECTRAL_ELEMENTS[0];
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#0A0B0E';
      ctx.fillRect(0, 0, w, h);

      const xForNm = (nm) => ((nm - 380) / (750 - 380)) * w;

      const drawBand = (yTop, bandH, zVal) => {
        if (mode === 'absorption') {
          for (let x = 0; x < w; x++) {
            const nm = 380 + (x / w) * (750 - 380);
            ctx.fillStyle = wavelengthToHex(nm);
            ctx.fillRect(x, yTop, 1.5, bandH);
          }
        } else {
          ctx.fillStyle = '#0D0F14';
          ctx.fillRect(0, yTop, w, bandH);
        }

        for (const line of el.lines) {
          const shifted = shiftWavelength(line.nm, zVal);
          if (shifted < 380 || shifted > 750) continue;
          const x = xForNm(shifted);
          ctx.strokeStyle = mode === 'absorption' ? '#08090C' : wavelengthToHex(shifted);
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(x, yTop);
          ctx.lineTo(x, yTop + bandH);
          ctx.stroke();
        }
      };

      drawBand(10, 56, 0);
      drawBand(82, 56, redshift);

      // Relativistic Doppler velocity beta = ((1+z)^2 - 1)/((1+z)^2 + 1)
      const zp1Sq = (1 + redshift) * (1 + redshift);
      const beta = (zp1Sq - 1) / (zp1Sq + 1);
      const vKmS = (beta * ASTRO_CONSTANTS.c) / 1000;
      bodyEl.querySelector('#sp-vel').textContent = `Göreli Radyal Hız: ${vKmS.toFixed(0)} km/s (${redshift >= 0 ? 'Uzaklaşma' : 'Yaklaşma'})`;
      footEl.textContent = `${el.name} · ${el.lines.length} spektral geçiş`;

      bodyEl.querySelector('#sp-tbody').innerHTML = el.lines
        .map((ln) => {
          const obs = shiftWavelength(ln.nm, redshift);
          return `<tr><td>${ln.label}</td><td class="mono">${ln.nm.toFixed(3)}</td><td class="mono">${obs.toFixed(3)}</td><td class="mono">${(obs - ln.nm).toFixed(3)}</td></tr>`;
        })
        .join('');
    };

    bodyEl.querySelector('#sp-el').addEventListener('change', (e) => {
      elemIdx = Number(e.target.value);
      update();
    });
    bodyEl.querySelector('#sp-mode').addEventListener('change', (e) => {
      mode = e.target.value;
      update();
    });
    bodyEl.querySelector('#sp-z').addEventListener('input', (e) => {
      redshift = Number(e.target.value);
      bodyEl.querySelector('#sp-z-lbl').textContent = redshift.toFixed(3);
      update();
    });
    update();
  }

  function renderDraw() {
    bodyEl.innerHTML = `
      <div class="panel-card">
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <input type="color" id="dr-color" value="#D1925C" />
          <label style="font-size:12px;">Kalınlık <input type="range" id="dr-size" min="1" max="12" value="3" /></label>
          <button type="button" class="btn btn-sm" id="dr-clear">Tuvali Temizle</button>
          <button type="button" class="btn btn-sm btn-primary" id="dr-dl">PNG İndir</button>
        </div>
        <figure class="figure-frame">
          <canvas id="dr-canvas" width="680" height="320" style="cursor:crosshair;"></canvas>
        </figure>
      </div>
    `;

    const canvas = bodyEl.querySelector('#dr-canvas');
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0E0F12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let drawing = false;
    const pos = (ev) => {
      const r = canvas.getBoundingClientRect();
      return [((ev.clientX - r.left) / r.width) * canvas.width, ((ev.clientY - r.top) / r.height) * canvas.height];
    };

    canvas.addEventListener('pointerdown', (e) => {
      drawing = true;
      const [x, y] = pos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drawing) return;
      const [x, y] = pos(e);
      ctx.strokeStyle = bodyEl.querySelector('#dr-color').value;
      ctx.lineWidth = Number(bodyEl.querySelector('#dr-size').value);
      ctx.lineCap = 'round';
      ctx.lineTo(x, y);
      ctx.stroke();
    });
    canvas.addEventListener('pointerup', () => {
      drawing = false;
    });
    canvas.addEventListener('pointerleave', () => {
      drawing = false;
    });

    bodyEl.querySelector('#dr-clear').addEventListener('click', () => {
      ctx.fillStyle = '#0E0F12';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });

    bodyEl.querySelector('#dr-dl').addEventListener('click', () => {
      const a = document.createElement('a');
      a.download = 'quantro-diyagram.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    });
  }

  container.querySelector('#sp-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    tab = b.dataset.tab;
    container.querySelectorAll('.app-tab').forEach((el) => el.classList.toggle('active', el === b));
    if (tab === 'spectrum') renderSpectrum();
    else renderDraw();
  });

  renderSpectrum();
  return {
    destroy() {},
  };
}
