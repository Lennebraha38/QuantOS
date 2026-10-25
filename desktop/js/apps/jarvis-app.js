/**
 * Uygulama 1: J.A.R.V.I.S. AI & Sesli Komuta Merkezi
 * Gerçek zamanlı Arc-Reactor ses frekans halkası, Türkçe/İngilizce konuşma tanıma,
 * bilimsel/sistem makroları ve opsiyonel harici LLM yapılandırması.
 */
import { ICONS } from './icons.js';

const MACROS = [
  { label: 'Bell Dolanıklık Durumu', cmd: 'Jarvis Bell durumu oluştur' },
  { label: 'GHZ 3-Kübit Durumu', cmd: 'Jarvis GHZ durumu çalıştır' },
  { label: '10 M☉ Kara Delik Analizi', cmd: 'Jarvis 10 güneş kütleli kara delik hesapla' },
  { label: 'Dinleyicili BB84 Testi', cmd: 'Jarvis dinleyicili BB84 simülasyonu çalıştır' },
  { label: 'z=1.5 Kozmoloji Hesabı', cmd: 'Jarvis z=1.5 kozmoloji hesapla' },
  { label: 'Yıldız Zamanı (Kayseri)', cmd: 'Jarvis yıldız zamanı nedir' },
  { label: 'Pencereleri Yan Yana Diz', cmd: 'Jarvis pencereleri yan yana diz' },
  { label: 'Sistem Durum Raporu', cmd: 'Jarvis sistem durumunu raporla' },
];

export function mountJarvisApp(container, osContext, args = {}) {
  const jarvis = osContext.jarvis;
  const sound = osContext.sound;
  const cfg = jarvis.getConfig();

  container.innerHTML = `
    <div class="app-shell">
      <div class="app-toolbar">
        <span class="eyebrow">J.A.R.V.I.S. SİSTEM KOMUTANI</span>
        <span class="badge badge-patina" id="jv-state-pill">HAZIR</span>
        <div style="margin-left:auto;display:flex;gap:8px;">
          <button type="button" class="btn btn-sm" id="jv-clear-btn">Geçmişi Temizle</button>
          <button type="button" class="btn btn-sm" id="jv-stop-tts-btn">Sesi Durdur</button>
        </div>
      </div>

      <div class="app-main" style="overflow:hidden;">
        <div class="jarvis-app-grid">
          <div class="jarvis-reactor-col">
            <figure class="figure-frame">
              <canvas id="jv-reactor-canvas" width="260" height="200"></canvas>
              <figcaption class="figure-caption">
                <span>ARC-REACTOR SES ZARFI</span>
                <span id="jv-interim-text">Mikrofon hazır</span>
              </figcaption>
            </figure>

            <div class="panel-card">
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button type="button" class="btn btn-primary" style="flex:1;" id="jv-listen-btn">
                  ${ICONS.mic} <span id="jv-listen-lbl">Sesli Dinle</span>
                </button>
                <button type="button" class="btn" id="jv-continuous-btn" aria-pressed="${cfg.wakeWordEnabled ? 'true' : 'false'}">
                  Sürekli Mod
                </button>
              </div>
              <label style="display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--text-2);">
                <span>Sesli Yanıt (TTS)</span>
                <input type="checkbox" id="jv-voice-chk" ${cfg.voiceEnabled !== false ? 'checked' : ''} />
              </label>
              <label style="font-size:12px;color:var(--text-2);">
                Dil Seçimi
                <select class="select" id="jv-lang-sel" style="margin-top:4px;">
                  <option value="tr-TR" ${cfg.lang !== 'en-US' ? 'selected' : ''}>Türkçe (tr-TR)</option>
                  <option value="en-US" ${cfg.lang === 'en-US' ? 'selected' : ''}>English (en-US)</option>
                </select>
              </label>
            </div>

            <div class="panel-card">
              <div class="eyebrow">HIZLI BİLİMSEL MAKROLAR</div>
              <div style="display:flex;flex-wrap:wrap;gap:6px;" id="jv-macros">
                ${MACROS.map(
                  (m, idx) =>
                    `<button type="button" class="jarvis-chip" data-macro="${idx}">${m.label}</button>`
                ).join('')}
              </div>
            </div>
          </div>

          <div class="jarvis-chat-col">
            <div class="jarvis-log" id="jv-chat-log" aria-live="polite"></div>
            <form id="jv-form" style="display:flex;gap:8px;">
              <input type="text" class="input" id="jv-input" placeholder="J.A.R.V.I.S.'e Türkçe veya İngilizce komut yazın (örn. 25 güneş kütleli kara delik hesapla)..." autocomplete="off" />
              <button type="submit" class="btn btn-primary">Çalıştır</button>
            </form>
          </div>
        </div>
      </div>

      <div class="app-statusbar">
        <span>Protokol: Web Speech API + /api/tts Yerel Köprü</span>
        <span id="jv-provenance">Motor: QuantOS Deterministik Bilimsel NLU v1.0</span>
      </div>
    </div>
  `;

  const logEl = container.querySelector('#jv-chat-log');
  const inputEl = container.querySelector('#jv-input');
  const statePill = container.querySelector('#jv-state-pill');
  const listenBtn = container.querySelector('#jv-listen-btn');
  const listenLbl = container.querySelector('#jv-listen-lbl');
  const interimEl = container.querySelector('#jv-interim-text');
  const provEl = container.querySelector('#jv-provenance');
  const canvas = container.querySelector('#jv-reactor-canvas');
  const ctx = canvas.getContext('2d');

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderHistory() {
    const items = jarvis.getHistory();
    if (!items.length) {
      logEl.innerHTML = `
        <div class="jarvis-msg assistant">
          <div class="jarvis-msg-meta">J.A.R.V.I.S. · ÇEVRİMİÇİ</div>
          Emrinizdeyim efendim. Kuantum devrelerini simüle edebilir, Kerr/Schwarzschild kara delik veya ΛCDM kozmoloji denklemlerini çözebilir, BB84 kriptografi testi yürütebilir ve tüm Windows 11 masaüstü pencerelerini sesle yönetebilirim.
        </div>
      `;
      return;
    }
    logEl.innerHTML = items
      .map((it) => {
        if (it.input !== undefined && it.reply !== undefined) {
          return `
          <div class="jarvis-msg user">
            <div class="jarvis-msg-meta">ARAŞTIRMACI · ${new Date(it.timestamp).toLocaleTimeString('tr-TR')}</div>
            ${escapeHtml(it.input)}
          </div>
          <div class="jarvis-msg assistant">
            <div class="jarvis-msg-meta">J.A.R.V.I.S. · ${escapeHtml(it.intent || 'komut')} · ${escapeHtml(it.provenance || 'yerel-motor')}</div>
            ${escapeHtml(it.reply)}
          </div>`;
        }
        const isUser = it.role === 'user';
        return `
          <div class="jarvis-msg ${isUser ? 'user' : 'assistant'}">
            <div class="jarvis-msg-meta">${isUser ? 'ARAŞTIRMACI' : 'J.A.R.V.I.S.'} · ${new Date(it.timestamp).toLocaleTimeString('tr-TR')}</div>
            ${escapeHtml(it.text || '')}
          </div>`;
      })
      .join('');
    logEl.scrollTop = logEl.scrollHeight;
  }

  async function runCmd(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    inputEl.value = '';
    const res = await jarvis.processCommand(trimmed, {
      speak: container.querySelector('#jv-voice-chk').checked,
    });
    if (res?.provenance) provEl.textContent = `Kaynak: ${res.provenance}`;
    renderHistory();
  }

  container.querySelector('#jv-form').addEventListener('submit', (e) => {
    e.preventDefault();
    runCmd(inputEl.value);
  });

  container.querySelector('#jv-macros').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-macro]');
    if (!chip) return;
    const m = MACROS[Number(chip.dataset.macro)];
    if (m) runCmd(m.cmd);
  });

  listenBtn.addEventListener('click', () => {
    jarvis.toggleListening();
  });

  const contBtn = container.querySelector('#jv-continuous-btn');
  contBtn.addEventListener('click', () => {
    const next = contBtn.getAttribute('aria-pressed') !== 'true';
    contBtn.setAttribute('aria-pressed', String(next));
    jarvis.setConfig({ wakeWordEnabled: next });
    if (next) jarvis.startListening({ continuous: true });
    else jarvis.stopListening();
  });

  container.querySelector('#jv-voice-chk').addEventListener('change', (e) => {
    jarvis.setConfig({ voiceEnabled: e.target.checked });
  });

  container.querySelector('#jv-lang-sel').addEventListener('change', (e) => {
    jarvis.setConfig({ lang: e.target.value });
  });

  container.querySelector('#jv-clear-btn').addEventListener('click', () => {
    jarvis.clearHistory();
    renderHistory();
  });

  container.querySelector('#jv-stop-tts-btn').addEventListener('click', () => {
    jarvis.stopSpeaking();
  });

  let currentState = 'idle';
  const unsub = jarvis.onStateChange((st, detail = '') => {
    const state = typeof st === 'object' && st ? st.state : st;
    const msgDetail = typeof st === 'object' && st ? st.detail || detail : detail;
    currentState = state;
    const labels = {
      idle: 'HAZIR',
      listening: 'DİNLİYOR',
      processing: 'ANALİZ EDİLİYOR',
      speaking: 'KONUŞUYOR',
    };
    statePill.textContent = labels[state] || 'HAZIR';
    listenLbl.textContent = state === 'listening' ? 'Dinlemeyi Durdur' : 'Sesli Dinle';
    if (msgDetail) interimEl.textContent = msgDetail;
    renderHistory();
  });

  // Real-time Arc-Reactor FFT Spectrum Envelope Canvas (Web Audio AnalyserNode)
  let rafId = 0;
  let rotAngle = 0;
  function drawReactor() {
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    ctx.clearRect(0, 0, w, h);

    const level = sound?.getActivityLevel?.() || 0;
    const fftBins = sound?.getFrequencyData?.(48) || new Float32Array(48);
    rotAngle += 0.008 + level * 0.04;

    const style = getComputedStyle(document.documentElement);
    const accent = style.getPropertyValue('--accent').trim() || '#D1925C';
    const patina = style.getPropertyValue('--patina').trim() || '#5F8A7A';

    // Outer calibrated ticks
    ctx.save();
    ctx.translate(cx, cy);
    for (let i = 0; i < 36; i++) {
      const ang = (i * Math.PI * 2) / 36 + rotAngle;
      const r1 = 74;
      const r2 = i % 3 === 0 ? 83 : 78;
      ctx.strokeStyle = i % 3 === 0 ? accent : 'rgba(169,174,182,0.28)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
      ctx.lineTo(Math.cos(ang) * r2, Math.sin(ang) * r2);
      ctx.stroke();
    }

    // Real FFT frequency spectrum ring
    ctx.beginPath();
    const pts = fftBins.length;
    for (let i = 0; i <= pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const binAmp = fftBins[i % pts] || 0;
      const r = 48 + binAmp * 22;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner core
    ctx.beginPath();
    ctx.arc(0, 0, 22 + level * 8, 0, Math.PI * 2);
    ctx.fillStyle = currentState === 'idle' ? 'rgba(95,138,122,0.22)' : 'rgba(209,146,92,0.28)';
    ctx.fill();
    ctx.strokeStyle = patina;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();

    rafId = requestAnimationFrame(drawReactor);
  }

  renderHistory();
  drawReactor();
  if (args?.initialCommand) {
    runCmd(args.initialCommand);
  }

  return {
    onArgs(nextArgs) {
      if (nextArgs?.initialCommand) runCmd(nextArgs.initialCommand);
    },
    destroy() {
      cancelAnimationFrame(rafId);
      unsub?.();
    },
  };
}
