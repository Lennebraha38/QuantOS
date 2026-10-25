/**
 * Uygulama 3: Quantro Astrofizik Gözlemevi (AstroLab)
 * 4 Sekmeli Gözlemevi: Kerr/Schwarzschild Kara Delik, N-Cisim Yörünge, ΛCDM Kozmoloji, LIGO Chirp
 */
import {
  blackHoleMetrics,
  NBodySystem,
  cosmologyMetrics,
  ligoChirpWaveform,
} from '../engines/astro-engine.js';

export function mountAstroLabApp(container, osContext, args = {}) {
  let activeTab = args?.tab || 'blackhole';
  let bhMass = Number(args?.massSolar) || 10;
  let bhSpin = 0.7;

  let nbody = NBodySystem.Presets.solarSystem();
  let nbodyRunning = true;
  let rafId = 0;

  container.innerHTML = `
    <div class="app-shell">
      <div class="app-tabs" id="al-tabs">
        <button type="button" class="app-tab active" data-tab="blackhole">Kara Delik &amp; Mercekleme</button>
        <button type="button" class="app-tab" data-tab="nbody">N-Cisim Yörünge (Verlet)</button>
        <button type="button" class="app-tab" data-tab="cosmo">ΛCDM Kozmoloji</button>
        <button type="button" class="app-tab" data-tab="ligo">Kütleçekim Dalgaları (LIGO)</button>
      </div>
      <div class="app-main" id="al-body"></div>
      <div class="app-statusbar">
        <span>Sabitler: CODATA 2022 &amp; Planck 2018 (H₀ = 67.4 km/s/Mpc)</span>
        <span id="al-status">Genel Görelilik Çözücü Hazır</span>
      </div>
    </div>
  `;

  const bodyEl = container.querySelector('#al-body');
  const statusEl = container.querySelector('#al-status');

  function stopLoop() {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function renderBlackHole() {
    stopLoop();
    bodyEl.innerHTML = `
      <div class="panel-card">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;">
          <label style="font-size:12px;color:var(--text-2);">
            Kütle (M / M☉): <strong class="mono" id="bh-m-lbl">${bhMass}</strong> M☉
            <input type="range" id="bh-m-rng" min="1" max="1000" step="1" value="${bhMass}" style="width:100%;margin-top:6px;" />
          </label>
          <label style="font-size:12px;color:var(--text-2);">
            Boyutsuz Kerr Dönüşü (a*): <strong class="mono" id="bh-s-lbl">${bhSpin.toFixed(2)}</strong>
            <input type="range" id="bh-s-rng" min="0" max="0.998" step="0.01" value="${bhSpin}" style="width:100%;margin-top:6px;" />
          </label>
        </div>
        <div class="metrics-grid" id="bh-metrics"></div>
      </div>

      <figure class="figure-frame">
        <canvas id="bh-canvas" width="680" height="270"></canvas>
        <figcaption class="figure-caption">
          <span>GÖRELİ AKRESYON DİSKİ, FOTON KÜRESİ (1.5 R_s) VE OLAY UFKU (r₊)</span>
          <span>Bardeen–Press–Teukolsky Kerr Metriği</span>
        </figcaption>
      </figure>
    `;

    const metricsEl = bodyEl.querySelector('#bh-metrics');
    const canvas = bodyEl.querySelector('#bh-canvas');
    const ctx = canvas.getContext('2d');
    let angle = 0;

    function updateMetrics() {
      const m = blackHoleMetrics(bhMass, bhSpin);
      metricsEl.innerHTML = `
        <div class="metric-box"><span class="metric-label">SCHWARZSCHILD R_s</span><span class="metric-value">${m.schwarzschildRadiusKm.toFixed(2)} <span class="metric-unit">km</span></span></div>
        <div class="metric-box"><span class="metric-label">KERR OLAY UFKU r₊</span><span class="metric-value">${m.eventHorizonRadiusKm.toFixed(2)} <span class="metric-unit">km</span></span></div>
        <div class="metric-box"><span class="metric-label">PROGRADE ISCO</span><span class="metric-value">${m.iscoProgradeKm.toFixed(2)} <span class="metric-unit">km</span></span></div>
        <div class="metric-box"><span class="metric-label">FOTON KÜRESİ</span><span class="metric-value">${m.photonSphereKm.toFixed(2)} <span class="metric-unit">km</span></span></div>
        <div class="metric-box"><span class="metric-label">HAWKING T_H</span><span class="metric-value">${m.hawkingTempK.toExponential(2)} <span class="metric-unit">K</span></span></div>
        <div class="metric-box"><span class="metric-label">ZAMAN GENİŞLEMESİ (2R_s)</span><span class="metric-value">${m.timeDilationFactorAt2Rs.toFixed(4)} <span class="metric-unit">dt/dτ</span></span></div>
      `;
      statusEl.textContent = `Kara Delik: ${bhMass} M☉ · a*=${bhSpin.toFixed(2)} · R_s=${m.schwarzschildRadiusKm.toFixed(2)} km`;
    }

    function animateBH() {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      ctx.fillStyle = '#0B0C0F';
      ctx.fillRect(0, 0, w, h);

      angle += 0.015 + bhSpin * 0.035;
      const rShadow = 34 * (1 - bhSpin * 0.14);

      // Gravitational lensed upper/lower halo arcs
      for (let i = 0; i < 28; i++) {
        const rad = rShadow * 1.45 + i * 2.4;
        const alpha = Math.max(0.02, 0.24 - i * 0.008);
        ctx.strokeStyle = `rgba(209, 146, 92, ${alpha})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, Math.PI * 1.06, Math.PI * 1.94);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, rad * 0.92, Math.PI * 0.1, Math.PI * 0.9);
        ctx.stroke();
      }

      // Relativistic Doppler-beamed equatorial accretion disk
      for (let k = 0; k < 90; k++) {
        const a = (k / 90) * Math.PI * 2 + angle;
        const orbitR = rShadow * 1.7 + (k % 9) * 11;
        const px = cx + Math.cos(a) * orbitR;
        const py = cy + Math.sin(a) * orbitR * 0.25;
        // Approaching side (left) brighter due to relativistic beaming
        const doppler = 0.55 - 0.4 * Math.cos(a);
        ctx.fillStyle = `rgba(227, 177, 135, ${Math.max(0.12, doppler)})`;
        ctx.beginPath();
        ctx.arc(px, py, 2.1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Event horizon shadow & photon ring
      ctx.fillStyle = '#050608';
      ctx.beginPath();
      ctx.arc(cx, cy, rShadow, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#E3B187';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      rafId = requestAnimationFrame(animateBH);
    }

    bodyEl.querySelector('#bh-m-rng').addEventListener('input', (e) => {
      bhMass = Number(e.target.value);
      bodyEl.querySelector('#bh-m-lbl').textContent = String(bhMass);
      updateMetrics();
    });
    bodyEl.querySelector('#bh-s-rng').addEventListener('input', (e) => {
      bhSpin = Number(e.target.value);
      bodyEl.querySelector('#bh-s-lbl').textContent = bhSpin.toFixed(2);
      updateMetrics();
    });

    updateMetrics();
    animateBH();
  }

  function renderNBody() {
    stopLoop();
    bodyEl.innerHTML = `
      <div class="panel-card">
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <select class="select" id="nb-preset" style="width:210px;">
            <option value="solarSystem">İç Güneş Sistemi</option>
            <option value="binaryPulsar">Çift Nötron Yıldızı / Pulsar</option>
            <option value="figureEight">8-Figürü Üç Cisim Çözümü</option>
            <option value="keplerianDisk">Kepler Kütle Diski</option>
            <option value="trappist1">TRAPPIST-1 Yedi Ötegezegen Rezonansı</option>
            <option value="lagrangeTrojan">Jüpiter &amp; L4/L5 Truvalı Lagrange Noktaları</option>
          </select>
          <button type="button" class="btn btn-sm btn-primary" id="nb-toggle">${nbodyRunning ? 'Duraklat' : 'Devam Et'}</button>
          <button type="button" class="btn btn-sm" id="nb-reset">Sıfırla</button>
          <span class="mono" style="margin-left:auto;font-size:12px;color:var(--text-2);" id="nb-energy">Enerji: --</span>
        </div>
      </div>
      <figure class="figure-frame">
        <canvas id="nb-canvas" width="680" height="310" style="cursor:crosshair;"></canvas>
        <figcaption class="figure-caption">
          <span>SİMPLEKTİK VELOCITY-VERLET ENTEGRATÖRÜ (Yeni gök cismi eklemek için tuvale tıklayın)</span>
          <span id="nb-count"></span>
        </figcaption>
      </figure>
    `;

    const canvas = bodyEl.querySelector('#nb-canvas');
    const ctx = canvas.getContext('2d');
    const energyEl = bodyEl.querySelector('#nb-energy');
    const countEl = bodyEl.querySelector('#nb-count');
    let currentPreset = 'solarSystem';
    const trails = new Map();

    canvas.addEventListener('click', (e) => {
      const r = canvas.getBoundingClientRect();
      const sx = ((e.clientX - r.left) / r.width - 0.5) * 6;
      const sy = ((e.clientY - r.top) / r.height - 0.5) * 3.2;
      const dist = Math.hypot(sx, sy) || 0.5;
      const vCirc = Math.sqrt((nbody.G_sim || 1) / dist) * 0.75;
      nbody.addBody({
        name: `Ast-${nbody.bodies.length + 1}`,
        mass: 0.015,
        x: sx,
        y: sy,
        z: 0,
        vx: (-sy / dist) * vCirc,
        vy: (sx / dist) * vCirc,
        vz: 0,
        color: '#5F8A7A',
      });
    });

    bodyEl.querySelector('#nb-preset').addEventListener('change', (e) => {
      currentPreset = e.target.value;
      if (NBodySystem.Presets[currentPreset]) {
        nbody = NBodySystem.Presets[currentPreset]();
        trails.clear();
      }
    });

    bodyEl.querySelector('#nb-toggle').addEventListener('click', (e) => {
      nbodyRunning = !nbodyRunning;
      e.currentTarget.textContent = nbodyRunning ? 'Duraklat' : 'Devam Et';
    });

    bodyEl.querySelector('#nb-reset').addEventListener('click', () => {
      nbody = NBodySystem.Presets[currentPreset]();
      trails.clear();
    });

    function loop() {
      if (nbodyRunning) nbody.step(0.008, 4);
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#0C0E12';
      ctx.fillRect(0, 0, w, h);

      const scale = 88;
      nbody.bodies.forEach((b, idx) => {
        const px = w / 2 + b.x * scale;
        const py = h / 2 + b.y * scale;
        if (!trails.has(idx)) trails.set(idx, []);
        const tr = trails.get(idx);
        tr.push([px, py]);
        if (tr.length > 55) tr.shift();

        ctx.strokeStyle = b.color || '#D1925C';
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        tr.forEach(([tx, ty], i) => (i === 0 ? ctx.moveTo(tx, ty) : ctx.lineTo(tx, ty)));
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.fillStyle = b.color || '#EAE7E1';
        const rad = Math.max(3.2, Math.min(11, 3 + Math.cbrt(b.mass || 0.1) * 4));
        ctx.beginPath();
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fill();
      });

      const en = nbody.totalEnergy();
      energyEl.textContent = `Toplam E = ${en.total.toFixed(4)} (K=${en.kinetic.toFixed(3)}, U=${en.potential.toFixed(3)})`;
      countEl.textContent = `Cisim sayısı: ${nbody.bodies.length}`;
      rafId = requestAnimationFrame(loop);
    }

    loop();
  }

  function renderCosmo() {
    stopLoop();
    bodyEl.innerHTML = `
      <div class="panel-card">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;">
          <label style="font-size:12px;">Kırmızıya Kayma (z)<input type="number" class="input" id="cs-z" value="1.5" min="0" max="20" step="0.1" /></label>
          <label style="font-size:12px;">H₀ (km/s/Mpc)<input type="number" class="input" id="cs-h0" value="67.4" min="40" max="100" step="0.2" /></label>
          <label style="font-size:12px;">Ω_m (Madde)<input type="number" class="input" id="cs-om" value="0.315" min="0.01" max="1" step="0.005" /></label>
          <label style="font-size:12px;">Ω_Λ (Karanlık Enerji)<input type="number" class="input" id="cs-ol" value="0.685" min="0" max="1" step="0.005" /></label>
        </div>
        <div class="metrics-grid" id="cs-metrics"></div>
      </div>
      <figure class="figure-frame">
        <canvas id="cs-canvas" width="680" height="220"></canvas>
        <figcaption class="figure-caption">
          <span>COMOVING &amp; PARLAKLIK MESAFESİ EĞRİSİ d(z) [Mpc]</span>
          <span>Sayısal Simpson İntegrali (Friedmann Denklemi)</span>
        </figcaption>
      </figure>
    `;

    const calc = () => {
      const z = Math.max(0, Number(bodyEl.querySelector('#cs-z').value) || 0);
      const H0 = Number(bodyEl.querySelector('#cs-h0').value) || 67.4;
      const OmegaM = Number(bodyEl.querySelector('#cs-om').value) || 0.315;
      const OmegaL = Number(bodyEl.querySelector('#cs-ol').value) || 0.685;
      const m = cosmologyMetrics({ z, H0, OmegaM, OmegaL });

      bodyEl.querySelector('#cs-metrics').innerHTML = `
        <div class="metric-box"><span class="metric-label">EVRENİN BUGÜNKÜ YAŞI</span><span class="metric-value">${m.universeAgeNowGyr.toFixed(2)} <span class="metric-unit">Gyr</span></span></div>
        <div class="metric-box"><span class="metric-label">GERİYE BAKIŞ SÜRESİ</span><span class="metric-value">${m.lookbackTimeGyr.toFixed(2)} <span class="metric-unit">Gyr</span></span></div>
        <div class="metric-box"><span class="metric-label">COMOVING MESAFE d_C</span><span class="metric-value">${m.comovingDistanceMpc.toFixed(1)} <span class="metric-unit">Mpc</span></span></div>
        <div class="metric-box"><span class="metric-label">PARLAKLIK MESAFESİ d_L</span><span class="metric-value">${m.luminosityDistanceMpc.toFixed(1)} <span class="metric-unit">Mpc</span></span></div>
        <div class="metric-box"><span class="metric-label">AÇISAL ÇAP d_A</span><span class="metric-value">${m.angularDiameterDistanceMpc.toFixed(1)} <span class="metric-unit">Mpc</span></span></div>
        <div class="metric-box"><span class="metric-label">HUBBLE H(z)</span><span class="metric-value">${m.Hz.toFixed(1)} <span class="metric-unit">km/s/Mpc</span></span></div>
      `;

      const canvas = bodyEl.querySelector('#cs-canvas');
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0C0E12';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const maxZ = Math.max(4, z * 1.2);
      const pts = 40;
      const maxDL = cosmologyMetrics({ z: maxZ, H0, OmegaM, OmegaL }).luminosityDistanceMpc || 1;

      const drawCurve = (key, color) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i <= pts; i++) {
          const zi = (i / pts) * maxZ;
          const val = cosmologyMetrics({ z: zi, H0, OmegaM, OmegaL })[key];
          const px = 44 + (i / pts) * (canvas.width - 64);
          const py = canvas.height - 26 - (val / maxDL) * (canvas.height - 46);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      };

      drawCurve('luminosityDistanceMpc', '#D1925C');
      drawCurve('comovingDistanceMpc', '#5F8A7A');
    };

    ['#cs-z', '#cs-h0', '#cs-om', '#cs-ol'].forEach((sel) =>
      bodyEl.querySelector(sel).addEventListener('input', calc)
    );
    calc();
  }

  function renderLigo() {
    stopLoop();
    bodyEl.innerHTML = `
      <div class="panel-card">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;align-items:end;">
          <label style="font-size:12px;">Birincil Kütle m₁ (M☉)<input type="number" class="input" id="gw-m1" value="36" min="2" max="150" /></label>
          <label style="font-size:12px;">İkincil Kütle m₂ (M☉)<input type="number" class="input" id="gw-m2" value="29" min="2" max="150" /></label>
          <label style="font-size:12px;">Mesafe (Mpc)<input type="number" class="input" id="gw-dist" value="410" min="10" max="5000" /></label>
          <button type="button" class="btn btn-primary" id="gw-play-btn">Chirp Sesini Dinle</button>
        </div>
        <div class="metrics-grid" id="gw-metrics"></div>
      </div>
      <figure class="figure-frame">
        <canvas id="gw-canvas" width="680" height="220"></canvas>
        <figcaption class="figure-caption">
          <span>İKİLİ KARA DELİK BİRLEŞME GERİNİM DALGA FORMU h₊(t) (GW150914 Kalibrasyonu)</span>
          <span>Post-Newtonian Quadrupole Yaklaşımı</span>
        </figcaption>
      </figure>
    `;

    let latestWave = null;
    const updateGW = () => {
      const m1Solar = Math.max(1.4, Number(bodyEl.querySelector('#gw-m1').value) || 36);
      const m2Solar = Math.max(1.4, Number(bodyEl.querySelector('#gw-m2').value) || 29);
      const distanceMpc = Math.max(1, Number(bodyEl.querySelector('#gw-dist').value) || 410);
      latestWave = ligoChirpWaveform({ m1Solar, m2Solar, distanceMpc, durationSec: 0.45, sampleRate: 2048 });

      bodyEl.querySelector('#gw-metrics').innerHTML = `
        <div class="metric-box"><span class="metric-label">CHIRP KÜTLESİ 𝓜_c</span><span class="metric-value">${latestWave.chirpMassSolar.toFixed(2)} <span class="metric-unit">M☉</span></span></div>
        <div class="metric-box"><span class="metric-label">SON KARA DELİK</span><span class="metric-value">${latestWave.finalMassSolar.toFixed(2)} <span class="metric-unit">M☉</span></span></div>
        <div class="metric-box"><span class="metric-label">YAYILAN ENERJİ</span><span class="metric-value">${latestWave.radiatedEnergySolar.toFixed(2)} <span class="metric-unit">M☉·c²</span></span></div>
        <div class="metric-box"><span class="metric-label">TEPE FREKANS</span><span class="metric-value">${latestWave.peakFrequencyHz.toFixed(0)} <span class="metric-unit">Hz</span></span></div>
      `;

      const canvas = bodyEl.querySelector('#gw-canvas');
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0C0E12';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const arr = latestWave.strain;
      let peak = 0;
      for (let i = 0; i < arr.length; i++) peak = Math.max(peak, Math.abs(arr[i]));
      peak = peak || 1;

      ctx.strokeStyle = '#D1925C';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i < arr.length; i++) {
        const px = 16 + (i / (arr.length - 1)) * (canvas.width - 32);
        const py = canvas.height / 2 - (arr[i] / peak) * (canvas.height * 0.4);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    };

    ['#gw-m1', '#gw-m2', '#gw-dist'].forEach((s) =>
      bodyEl.querySelector(s).addEventListener('input', updateGW)
    );
    bodyEl.querySelector('#gw-play-btn').addEventListener('click', () => {
      if (latestWave) osContext.sound?.playChirpArray?.(latestWave.strain, 2048);
    });
    updateGW();
  }

  function switchTab(tab) {
    activeTab = tab;
    container.querySelectorAll('.app-tab').forEach((b) =>
      b.classList.toggle('active', b.dataset.tab === tab)
    );
    if (tab === 'blackhole') renderBlackHole();
    else if (tab === 'nbody') renderNBody();
    else if (tab === 'cosmo') renderCosmo();
    else renderLigo();
  }

  container.querySelector('#al-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (btn) switchTab(btn.dataset.tab);
  });

  switchTab(activeTab);

  return {
    onArgs(nextArgs) {
      if (nextArgs?.massSolar) bhMass = Number(nextArgs.massSolar) || bhMass;
      if (nextArgs?.tab) switchTab(nextArgs.tab);
      else if (activeTab === 'blackhole') renderBlackHole();
    },
    destroy() {
      stopLoop();
    },
  };
}
