/**
 * Uygulama 10: Quantro Edge Araştırma Tarayıcısı (Browser) & Google Arama Portali
 * Çok sekmeli bilimsel portal, Google arama, ArXiv makaleleri, bilgi grafiği ve sesli arama desteği
 */

const BUILTIN_PAGES = {
  'quantro://portal': {
    title: 'Quantro AR-GE Ana Portal',
    html: `
      <div class="vellum-surface" style="padding:24px;max-width:860px;margin:0 auto;line-height:1.7;">
        <div class="eyebrow" style="color:#96582D;font-weight:700;letter-spacing:1px;font-size:11px;margin-bottom:8px;">BAĞIMSIZ BİLİMSEL ARAŞTIRMA MERKEZİ · KAYSERİ</div>
        <h1 style="margin:0 0 12px 0;font-size:28px;">Quantro — Kuantum Mekaniği ve Astrofizik AR-GE</h1>
        <p style="font-size:15px;color:var(--text-1);">Quantro, kuantum hesaplama devreleri, BB84 kuantum anahtar dağıtımı, göreli kara delik merceklemesi ve gözlemsel kozmoloji kesişiminde açık kaynaklı (MIT) bilimsel araçlar geliştiren bağımsız bir araştırma merkezidir.</p>
        <h3 style="margin-top:20px;border-bottom:1px solid var(--hair);padding-bottom:6px;">Doğrulanabilir Açık Kaynak Katkıları</h3>
        <ul style="padding-left:20px;font-size:14px;color:var(--text-1);">
          <li><strong>Sıfır Sahte Telemetri İlkesi:</strong> Gösterilen her ölçüm ve eğri, CODATA 2022 sabitleri, tam durum vektörü matematiği veya donanım API'lerinden üretilir.</li>
          <li><strong>Canlı Kuantum Rastgelelik:</strong> ANU fiziksel vakum dalgalanması kaynağı ile entegre entropi motoru.</li>
          <li><strong>QuantOS Masaüstü ve Çekirdek:</strong> AArch64 Limine UEFI bare-metal çekirdek + Windows 11 DWM + sesli J.A.R.V.I.S. komuta katmanı.</li>
        </ul>
      </div>
    `,
  },
  'quantro://sozluk': {
    title: 'Kuantum & Astrofizik Sözlüğü',
    html: `
      <div class="panel-card" style="padding:20px;max-width:920px;margin:0 auto;">
        <h3 class="panel-title" style="margin-bottom:12px;">Temel Kavramlar ve Denklemler</h3>
        <div class="data-table-wrap">
          <table class="data-table" style="width:100%;">
            <thead><tr><th>Terim</th><th>Matematiksel İfade</th><th>Fiziksel Anlamı</th></tr></thead>
            <tbody>
              <tr><td><strong>Bell Durumu |Φ⁺⟩</strong></td><td class="mono">(|00⟩ + |11⟩) / √2</td><td>Maksimum iki-kübit kuantum dolanıklığı; kısmi iz saflığı Tr(ρ²)=0.5.</td></tr>
              <tr><td><strong>BB84 QBER Eşiği</strong></td><td class="mono">QBER &lt; %11.0</td><td>Shor–Preskill güvenlik sınırının altında kuantum anahtar üretilebilir.</td></tr>
              <tr><td><strong>Schwarzschild Yarıçapı</strong></td><td class="mono">R_s = 2GM / c²</td><td>Dönmeyen bir kütlenin ışığın kaçamayacağı olay ufku yarıçapı.</td></tr>
              <tr><td><strong>Kerr Dış Ufku</strong></td><td class="mono">r₊ = (GM/c²)(1 + √(1 - a*²))</td><td>Dönen kara deliğin ergosfer içindeki dış olay ufku.</td></tr>
              <tr><td><strong>Hawking Sıcaklığı</strong></td><td class="mono">T_H = ħc³ / (8πGMk_B)</td><td>Olay ufkundaki kuantum alan dalgalanmalarının termal ışıma sıcaklığı.</td></tr>
              <tr><td><strong>Friedmann H(z)</strong></td><td class="mono">H₀ √(Ω_m(1+z)³ + Ω_Λ)</td><td>Düz ΛCDM evreninde kırmızıya kaymaya bağlı genişleme hızı.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `,
  },
  'quantro://arxiv': {
    title: 'Seçilmiş Bilimsel Makaleler',
    html: `
      <div class="panel-card" style="padding:20px;max-width:920px;margin:0 auto;">
        <div class="eyebrow" style="color:var(--accent);font-weight:700;font-size:11px;margin-bottom:8px;">REFERANS LİTERATÜR SEÇKİSİ</div>
        <div class="data-table-wrap">
          <table class="data-table" style="width:100%;">
            <thead><tr><th>Yıl</th><th>Başlık &amp; Yazarlar</th><th>Alan</th></tr></thead>
            <tbody>
              <tr><td class="mono">1972</td><td>Bardeen, Press &amp; Teukolsky — Rotating Black Holes: ISCO &amp; Energy Extraction</td><td>Genel Görelilik</td></tr>
              <tr><td class="mono">1984</td><td>Bennett &amp; Brassard — Quantum Cryptography: Public Key Distribution (BB84)</td><td>Kuantum Kriptografi</td></tr>
              <tr><td class="mono">1996</td><td>Lov K. Grover — A Fast Quantum Mechanical Algorithm for Database Search</td><td>Kuantum Algoritmalar</td></tr>
              <tr><td class="mono">2016</td><td>LIGO Scientific Collaboration — Observation of Gravitational Waves (GW150914)</td><td>Kütleçekim Dalgaları</td></tr>
              <tr><td class="mono">2020</td><td>Planck Collaboration — Planck 2018 Results VI. Cosmological Parameters (H₀=67.4)</td><td>Kozmoloji</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `,
  },
};

const WAFFLE_APPS = [
  { name: 'Google Arama', icon: '🔍', action: 'google' },
  { name: 'ArXiv Makaleler', icon: '📄', action: 'arxiv' },
  { name: 'Quantro Portal', icon: '🌌', action: 'portal' },
  { name: 'Bilim Sözlüğü', icon: '📖', action: 'sozluk' },
  { name: 'NASA ADS', icon: '🔭', action: 'nasa' },
  { name: 'Q-Lab Kuantum', icon: '⚛️', app: 'qlab' },
  { name: 'AstroLab Uzay', icon: '🪐', app: 'astrolab' },
  { name: 'QuantMark', icon: '📊', app: 'quantmark' },
  { name: 'Ekran Alıntısı', icon: '✂️', app: 'snipping' },
  { name: 'Hesap Makinesi', icon: '🧮', app: 'calculator' },
  { name: 'VFS Dosyalar', icon: '💾', app: 'qvault' },
  { name: 'J.A.R.V.I.S.', icon: '💬', app: 'jarvis' }
];

export function mountBrowserApp(container, osContext = {}, args = {}) {
  let searchCfg = {
    provider: 'auto',
    googleApiKey: '',
    googleCx: '',
    serperApiKey: ''
  };

  try {
    const saved = JSON.parse(localStorage.getItem('quantos.browser.cfg') || '{}');
    searchCfg = { ...searchCfg, ...saved };
  } catch {}

  let tabs = [
    { id: 1, url: 'quantro://google', history: ['quantro://google'], histIdx: 0 },
    { id: 2, url: 'quantro://portal', history: ['quantro://portal'], histIdx: 0 },
    { id: 3, url: 'https://tr.wikipedia.org', history: ['https://tr.wikipedia.org'], histIdx: 0 },
  ];
  let activeId = 1;
  let seq = 4;
  let showSettings = false;
  let readerMode = false;
  let speechActive = false;

  container.innerHTML = `
    <div class="app-shell" style="display:flex;flex-direction:column;height:100%;background:var(--ink-950);color:var(--text-0);">
      <div class="app-tabs" id="br-tabs"></div>
      <div class="app-toolbar" id="br-nav" style="display:flex;gap:6px;align-items:center;padding:6px 10px;background:var(--panel-bg);border-bottom:1px solid var(--hair);">
        <button type="button" class="btn btn-sm" id="br-btn-back" title="Geri">◀</button>
        <button type="button" class="btn btn-sm" id="br-btn-forward" title="İleri">▶</button>
        <button type="button" class="btn btn-sm" id="br-btn-reload" title="Yenile">🔄</button>
        <button type="button" class="btn btn-sm" id="br-btn-home" title="Google Ana Sayfası">🏠</button>
        <form id="br-form" style="flex:1;display:flex;gap:6px;align-items:center;margin:0;position:relative;">
          <input type="text" class="input mono" id="br-url" placeholder="Google'da arayın, hesaplama yapın veya URL girin (örn: tr.wikipedia.org)..." style="flex:1;padding:6px 12px;font-size:12px;border-radius:6px;" />
          <button type="submit" class="btn btn-sm btn-primary">Git</button>
        </form>
        <button type="button" class="btn btn-sm" id="br-btn-reader" title="Okuma Modu (Temiz Metin)">📖</button>
        <button type="button" class="btn btn-sm" id="br-btn-download" title="VFS'ye İndir">📥</button>
        <button type="button" class="btn btn-sm" id="br-btn-cfg" title="Arama &amp; API Ayarları">⚙️ API</button>
      </div>
      <div class="app-toolbar" style="padding:4px 10px;gap:6px;background:var(--hair);border-bottom:1px solid var(--hair-strong);display:flex;flex-wrap:wrap;align-items:center;">
        <span style="font-size:11px;color:var(--text-3);font-weight:600;margin-right:4px;">YER İMLERİ:</span>
        <button type="button" class="btn btn-sm btn-ghost" data-goto="quantro://google" style="font-size:11px;padding:2px 8px;">🔍 Google</button>
        <button type="button" class="btn btn-sm btn-ghost" data-goto="quantro://portal" style="font-size:11px;padding:2px 8px;">🌌 Quantro Portal</button>
        <button type="button" class="btn btn-sm btn-ghost" data-goto="quantro://sozluk" style="font-size:11px;padding:2px 8px;">📖 Sözlük</button>
        <button type="button" class="btn btn-sm btn-ghost" data-goto="https://tr.wikipedia.org" style="font-size:11px;padding:2px 8px;">🌐 Vikipedi</button>
        <button type="button" class="btn btn-sm btn-ghost" data-goto="https://arxiv.org" style="font-size:11px;padding:2px 8px;">📄 ArXiv</button>
        <button type="button" class="btn btn-sm btn-ghost" data-goto="https://github.com/Lennebraha38/QuantOS" style="font-size:11px;padding:2px 8px;">🐙 GitHub Repo</button>
        <button type="button" class="btn btn-sm btn-ghost" data-goto="https://ui.adsabs.harvard.edu" style="font-size:11px;padding:2px 8px;">🔭 NASA ADS</button>
      </div>

      <!-- Settings Drawer -->
      <div id="br-settings-drawer" style="display:none;background:var(--ink-900);border-bottom:1px solid var(--hair-strong);padding:14px;font-size:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <strong style="color:var(--accent);">GERÇEK GOOGLE ARAMA &amp; WEB API AYARLARI</strong>
          <button type="button" class="btn btn-sm" id="br-cfg-close">Kapat ✕</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;">
          <label>Arama Sağlayıcısı
            <select class="select" id="br-cfg-provider" style="margin-top:4px;">
              <option value="auto">Otomatik (Google API varsa kullan, yoksa Canlı Arama &amp; Vikipedi)</option>
              <option value="google">Google Custom Search JSON API</option>
              <option value="serper">Serper.dev Google Arama API</option>
              <option value="duckduckgo">DuckDuckGo Canlı Arama</option>
            </select>
          </label>
          <label>Google Custom Search API Key
            <input type="password" class="input" id="br-cfg-gkey" placeholder="AIzaSy..." style="margin-top:4px;" />
          </label>
          <label>Google Arama Motoru Kimliği (CX)
            <input type="text" class="input" id="br-cfg-gcx" placeholder="0123456789:abcdef..." style="margin-top:4px;" />
          </label>
          <label>Serper.dev API Key
            <input type="password" class="input" id="br-cfg-skey" placeholder="serper_..." style="margin-top:4px;" />
          </label>
        </div>
        <div style="margin-top:10px;display:flex;gap:8px;">
          <button type="button" class="btn btn-primary btn-sm" id="br-cfg-save">Ayarları Kaydet</button>
          <span id="br-cfg-msg" style="color:var(--patina);align-self:center;"></span>
        </div>
      </div>

      <div class="app-main" id="br-view" style="position:relative;display:flex;flex-direction:column;flex:1;padding:0;overflow:hidden;"></div>
      <div class="app-statusbar" style="display:flex;justify-content:space-between;align-items:center;padding:4px 10px;background:var(--panel-bg);border-top:1px solid var(--hair);font-size:11px;">
        <span id="br-status-security">🔒 Quantro Güvenli Web Proxy Aktif (SSRF Korumalı)</span>
        <span id="br-status-url" class="mono" style="color:var(--text-2);"></span>
      </div>
    </div>
  `;

  const tabsEl = container.querySelector('#br-tabs');
  const urlEl = container.querySelector('#br-url');
  const viewEl = container.querySelector('#br-view');
  const backBtn = container.querySelector('#br-btn-back');
  const forwardBtn = container.querySelector('#br-btn-forward');
  const reloadBtn = container.querySelector('#br-btn-reload');
  const homeBtn = container.querySelector('#br-btn-home');
  const cfgBtn = container.querySelector('#br-btn-cfg');
  const settingsDrawer = container.querySelector('#br-settings-drawer');
  const statusSecurity = container.querySelector('#br-status-security');
  const statusUrl = container.querySelector('#br-status-url');

  const cur = () => tabs.find((t) => t.id === activeId) || tabs[0];

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function resolveBrowserInput(input) {
    const raw = String(input || '').trim();
    if (!raw) return 'quantro://google';
    if (raw.startsWith('quantro://')) return raw;
    if (/^https?:\/\//i.test(raw)) return raw;

    // Etki alanı adayı (örn: wikipedia.org, github.com)
    if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/.*)?$/i.test(raw)) {
      return `https://${raw}`;
    }

    // Arama sorgusu
    return `quantro://search?q=${encodeURIComponent(raw)}`;
  }

  function navigateTo(url, pushHistory = true) {
    const t = cur();
    const targetUrl = resolveBrowserInput(url);
    t.url = targetUrl;
    if (!t.history) {
      t.history = [targetUrl];
      t.histIdx = 0;
    } else if (pushHistory && t.history[t.histIdx] !== targetUrl) {
      t.history = t.history.slice(0, t.histIdx + 1);
      t.history.push(targetUrl);
      t.histIdx = t.history.length - 1;
    }
    render();
  }

  function doSearch(query, tab = 'all') {
    const q = String(query || '').trim();
    if (!q) return;
    const tabParam = tab && tab !== 'all' ? `&tab=${encodeURIComponent(tab)}` : '';
    navigateTo(`quantro://search?q=${encodeURIComponent(q)}${tabParam}`);
  }

  function triggerVoiceSearch(targetInput, onResult) {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      osContext.notify?.('Sesli Arama', 'Tarayıcınızda konuşma tanıma (SpeechRecognition) desteklenmiyor. Lütfen aramanızı metin olarak yazın.');
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'tr-TR';
      recognition.interimResults = true;
      recognition.continuous = false;

      const voiceBanner = document.createElement('div');
      voiceBanner.id = 'br-voice-modal';
      voiceBanner.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.75); z-index: 99999;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        backdrop-filter: blur(8px);
      `;
      voiceBanner.innerHTML = `
        <div style="background:var(--panel-bg);border:1px solid var(--hair-strong);padding:32px 48px;border-radius:24px;display:flex;flex-direction:column;align-items:center;box-shadow:0 12px 36px rgba(0,0,0,0.5);max-width:440px;text-align:center;">
          <div style="width:72px;height:72px;border-radius:50%;background:rgba(66,133,244,0.15);display:flex;align-items:center;justify-content:center;margin-bottom:16px;animation:pulse-mic 1.4s infinite;">
            <span style="font-size:36px;">🎙️</span>
          </div>
          <h3 style="margin:0 0 8px 0;font-size:20px;color:var(--text-0);">Dinleniyor...</h3>
          <p id="br-voice-text" style="font-size:14px;color:var(--text-2);min-height:24px;margin:0 0 20px 0;">Şimdi konuşun (örn: "Kuantum Dolanıklık")</p>
          <div style="display:flex;gap:6px;margin-bottom:20px;">
            <span style="width:8px;height:8px;border-radius:50%;background:#4285F4;animation:bounce 1.2s infinite 0s;"></span>
            <span style="width:8px;height:8px;border-radius:50%;background:#EA4335;animation:bounce 1.2s infinite 0.2s;"></span>
            <span style="width:8px;height:8px;border-radius:50%;background:#FBBC05;animation:bounce 1.2s infinite 0.4s;"></span>
            <span style="width:8px;height:8px;border-radius:50%;background:#34A853;animation:bounce 1.2s infinite 0.6s;"></span>
          </div>
          <button type="button" class="btn btn-sm btn-ghost" id="br-voice-cancel">İptal</button>
        </div>
      `;

      document.body.appendChild(voiceBanner);

      const textEl = voiceBanner.querySelector('#br-voice-text');
      voiceBanner.querySelector('#br-voice-cancel').onclick = () => {
        try { recognition.abort(); } catch {}
        voiceBanner.remove();
      };

      recognition.onresult = (evt) => {
        let transcript = '';
        for (let i = evt.resultIndex; i < evt.results.length; i++) {
          transcript += evt.results[i][0].transcript;
        }
        if (textEl) textEl.textContent = `"${transcript}"`;
        if (targetInput) targetInput.value = transcript;

        if (evt.results[0].isFinal) {
          setTimeout(() => {
            voiceBanner.remove();
            if (onResult) onResult(transcript.trim());
          }, 400);
        }
      };

      recognition.onerror = (e) => {
        voiceBanner.remove();
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          osContext.notify?.('Sesli Arama', `Mikrofon uyarısı: ${e.error}`);
        }
      };

      recognition.onend = () => {
        if (document.body.contains(voiceBanner)) {
          voiceBanner.remove();
        }
      };

      recognition.start();
    } catch (err) {
      osContext.notify?.('Sesli Arama', `Ses başlatılamadı: ${err.message}`);
    }
  }

  function setupAutocomplete(inputEl, dropdownEl, onSubmit) {
    let timer = null;
    let selectedIdx = -1;
    let currentSuggestions = [];

    function close() {
      dropdownEl.style.display = 'none';
      dropdownEl.innerHTML = '';
      selectedIdx = -1;
      currentSuggestions = [];
    }

    inputEl.addEventListener('input', () => {
      clearTimeout(timer);
      const val = inputEl.value.trim();
      if (!val) {
        close();
        return;
      }

      timer = setTimeout(async () => {
        try {
          const resp = await fetch(`/api/suggest?q=${encodeURIComponent(val)}`);
          if (!resp.ok) return;
          const data = await resp.json();
          currentSuggestions = data.suggestions || [];
          if (!currentSuggestions.length) {
            close();
            return;
          }

          dropdownEl.innerHTML = currentSuggestions.map((s, idx) => `
            <div class="suggest-item" data-idx="${idx}" style="padding:8px 16px;cursor:pointer;display:flex;align-items:center;gap:10px;font-size:14px;color:var(--text-1);transition:background 0.15s;">
              <span style="color:var(--text-3);font-size:12px;">🔍</span>
              <span style="flex:1;">${escapeHtml(s)}</span>
            </div>
          `).join('');

          dropdownEl.style.display = 'block';

          dropdownEl.querySelectorAll('.suggest-item').forEach((item) => {
            item.addEventListener('mouseenter', () => {
              dropdownEl.querySelectorAll('.suggest-item').forEach(el => el.style.background = 'transparent');
              item.style.background = 'rgba(66,133,244,0.15)';
              selectedIdx = Number(item.dataset.idx);
            });
            item.addEventListener('click', () => {
              const text = currentSuggestions[Number(item.dataset.idx)];
              inputEl.value = text;
              close();
              if (onSubmit) onSubmit(text);
            });
          });
        } catch {}
      }, 180);
    });

    inputEl.addEventListener('keydown', (e) => {
      if (dropdownEl.style.display === 'none') return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIdx = (selectedIdx + 1) % currentSuggestions.length;
        updateHighlight();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIdx = (selectedIdx - 1 + currentSuggestions.length) % currentSuggestions.length;
        updateHighlight();
      } else if (e.key === 'Enter') {
        if (selectedIdx >= 0 && currentSuggestions[selectedIdx]) {
          e.preventDefault();
          inputEl.value = currentSuggestions[selectedIdx];
          close();
          if (onSubmit) onSubmit(inputEl.value);
        }
      } else if (e.key === 'Escape') {
        close();
      }
    });

    function updateHighlight() {
      const items = dropdownEl.querySelectorAll('.suggest-item');
      items.forEach((item, idx) => {
        if (idx === selectedIdx) {
          item.style.background = 'rgba(66,133,244,0.2)';
          inputEl.value = currentSuggestions[idx];
        } else {
          item.style.background = 'transparent';
        }
      });
    }

    document.addEventListener('click', (e) => {
      if (!inputEl.contains(e.target) && !dropdownEl.contains(e.target)) {
        close();
      }
    });
  }

  function renderCalculatorCard(calc) {
    if (!calc || !calc.result) return '';
    return `
      <div class="google-calc-card" style="background:var(--panel-bg);border:1px solid var(--hair-strong);border-radius:12px;padding:16px 20px;max-width:540px;margin-bottom:20px;box-shadow:0 4px 14px rgba(0,0,0,0.25);">
        <div style="font-size:12px;color:var(--text-3);margin-bottom:4px;font-family:monospace;">${escapeHtml(calc.expression)} =</div>
        <div style="font-size:32px;font-weight:700;color:var(--accent);font-family:monospace;letter-spacing:-0.5px;margin-bottom:12px;">
          ${escapeHtml(calc.result)}
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          <span style="font-size:11px;color:var(--patina);">✓ QuantOS Bilimsel Hesap Motoru Doğrulandı</span>
          <button type="button" class="btn btn-sm btn-ghost" id="br-calc-copy" style="font-size:11px;margin-left:auto;">Kopyala 📋</button>
        </div>
      </div>
    `;
  }

  function renderKnowledgeCard(card) {
    if (!card) return '';
    return `
      <div class="google-knowledge-card" style="background:var(--panel-bg);border:1px solid var(--hair-strong);border-radius:16px;padding:20px;margin-bottom:24px;box-shadow:0 4px 16px rgba(0,0,0,0.3);position:relative;overflow:hidden;">
        <div style="display:flex;gap:18px;align-items:flex-start;">
          <div style="flex:1;">
            <div style="display:inline-block;padding:2px 8px;border-radius:10px;background:rgba(66,133,244,0.15);color:#8AB4F8;font-size:11px;font-weight:700;letter-spacing:0.5px;margin-bottom:6px;">
              ${escapeHtml(card.badge || 'BİLİMSEL BİLGİ KARTI')}
            </div>
            <h2 style="margin:0 0 4px 0;font-size:24px;color:var(--text-0);font-weight:700;">${escapeHtml(card.title)}</h2>
            <div style="font-size:12px;color:var(--text-3);margin-bottom:12px;">${escapeHtml(card.subtitle || '')}</div>
            <p style="font-size:14px;color:var(--text-1);line-height:1.55;margin:0 0 16px 0;">${escapeHtml(card.description)}</p>

            ${card.facts && card.facts.length ? `
              <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:8px 16px;padding:12px;background:rgba(255,255,255,0.03);border-radius:10px;margin-bottom:14px;">
                ${card.facts.map((f) => `
                  <div style="font-size:12px;">
                    <span style="color:var(--text-3);display:block;font-size:11px;">${escapeHtml(f.label)}:</span>
                    <strong style="color:var(--accent);font-family:monospace;">${escapeHtml(f.value)}</strong>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              ${card.url ? `
                <button type="button" class="btn btn-sm btn-primary" data-open-proxy="${escapeHtml(card.url)}" style="font-size:12px;">
                  Vikipedi'de Oku ↗
                </button>
              ` : ''}
              <button type="button" class="btn btn-sm btn-ghost" data-goto="quantro://sozluk" style="font-size:12px;">
                Bilim Sözlüğü 📖
              </button>
              <button type="button" class="btn btn-sm btn-ghost" data-academic-search="${escapeHtml(card.title)}" style="font-size:12px;">
                ArXiv Makaleleri 📄
              </button>
            </div>
          </div>

          ${card.image ? `
            <div style="width:140px;flex-shrink:0;">
              <img src="${escapeHtml(card.image)}" alt="${escapeHtml(card.title)}" style="width:100%;height:130px;object-fit:cover;border-radius:12px;border:1px solid var(--hair);" />
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  async function renderSearchResults(query, activeTab = 'all') {
    statusSecurity.textContent = `🔍 Google / Canlı Arama: "${query}"`;
    viewEl.innerHTML = `
      <div style="display:flex;flex-direction:column;flex:1;overflow:hidden;background:var(--ink-950);">
        <!-- Top Search Results Header -->
        <div style="display:flex;align-items:center;gap:14px;padding:12px 24px;border-bottom:1px solid var(--hair);background:var(--panel-bg);flex-wrap:wrap;">
          <div id="br-results-logo" style="cursor:pointer;font-size:22px;font-weight:700;display:flex;align-items:center;letter-spacing:-0.5px;">
            <span style="color:#4285F4;">G</span><span style="color:#EA4335;">o</span><span style="color:#FBBC05;">o</span><span style="color:#4285F4;">g</span><span style="color:#34A853;">l</span><span style="color:#EA4335;">e</span>
          </div>
          <form id="br-res-search-form" style="flex:1;max-width:640px;position:relative;margin:0;">
            <div style="display:flex;align-items:center;background:var(--ink-900);border:1px solid var(--hair-strong);border-radius:24px;padding:6px 14px;gap:8px;">
              <input type="text" id="br-res-search-input" value="${escapeHtml(query)}" style="flex:1;background:transparent;border:none;outline:none;color:var(--text-0);font-size:14px;" />
              <button type="button" id="br-res-clear-btn" class="btn btn-sm btn-ghost" style="padding:0 4px;font-size:12px;" title="Temizle">✕</button>
              <button type="button" id="br-res-mic-btn" class="btn btn-sm btn-ghost" style="padding:0 6px;" title="Sesle Ara">🎙️</button>
              <button type="submit" class="btn btn-sm btn-primary" style="padding:4px 10px;border-radius:16px;">Ara</button>
            </div>
            <div id="br-res-suggestions" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--panel-bg);border:1px solid var(--hair-strong);border-radius:12px;margin-top:6px;box-shadow:0 8px 24px rgba(0,0,0,0.4);z-index:1000;overflow:hidden;"></div>
          </form>
          <div style="margin-left:auto;display:flex;gap:6px;align-items:center;">
            <button type="button" class="btn btn-sm btn-ghost" id="br-res-waffle-btn" title="Google &amp; QuantOS Uygulamaları">⠿</button>
          </div>
        </div>

        <!-- Google Filter Tabs -->
        <div style="display:flex;gap:20px;padding:0 24px;border-bottom:1px solid var(--hair);background:var(--panel-bg);font-size:13px;overflow-x:auto;">
          <div class="search-tab ${activeTab === 'all' ? 'active' : ''}" data-tab="all" style="padding:10px 4px;cursor:pointer;font-weight:600;color:${activeTab === 'all' ? '#8AB4F8' : 'var(--text-2)'};border-bottom:3px solid ${activeTab === 'all' ? '#8AB4F8' : 'transparent'};">
            Tümü
          </div>
          <div class="search-tab ${activeTab === 'academic' ? 'active' : ''}" data-tab="academic" style="padding:10px 4px;cursor:pointer;font-weight:600;color:${activeTab === 'academic' ? '#8AB4F8' : 'var(--text-2)'};border-bottom:3px solid ${activeTab === 'academic' ? '#8AB4F8' : 'transparent'};">
            📄 Akademik (ArXiv)
          </div>
          <div class="search-tab ${activeTab === 'wiki' ? 'active' : ''}" data-tab="wiki" style="padding:10px 4px;cursor:pointer;font-weight:600;color:${activeTab === 'wiki' ? '#8AB4F8' : 'var(--text-2)'};border-bottom:3px solid ${activeTab === 'wiki' ? '#8AB4F8' : 'transparent'};">
            🌐 Ansiklopedi (Vikipedi)
          </div>
          <div class="search-tab ${activeTab === 'images' ? 'active' : ''}" data-tab="images" style="padding:10px 4px;cursor:pointer;font-weight:600;color:${activeTab === 'images' ? '#8AB4F8' : 'var(--text-2)'};border-bottom:3px solid ${activeTab === 'images' ? '#8AB4F8' : 'transparent'};">
            🖼️ Görseller
          </div>
        </div>

        <!-- Search Results Main Content -->
        <div style="flex:1;overflow-y:auto;padding:20px 24px;">
          <div style="max-width:840px;">
            <div id="br-search-loading" style="display:flex;gap:10px;align-items:center;color:var(--accent);margin-bottom:16px;">
              <span style="font-size:14px;">Google canlı arama sonuçları getiriliyor...</span>
            </div>
            <div id="br-calc-container"></div>
            <div id="br-knowledge-container"></div>
            <div id="br-search-stats" style="font-size:12px;color:var(--text-3);margin-bottom:16px;"></div>
            <div id="br-search-items" style="display:flex;flex-direction:column;gap:20px;"></div>
            <div id="br-related-container" style="margin-top:36px;padding-top:20px;border-top:1px solid var(--hair);"></div>
            <div id="br-pagination-container" style="margin-top:32px;display:flex;justify-content:center;align-items:center;gap:10px;"></div>
          </div>
        </div>
      </div>
    `;

    const resInput = viewEl.querySelector('#br-res-search-input');
    const resForm = viewEl.querySelector('#br-res-search-form');
    const resClear = viewEl.querySelector('#br-res-clear-btn');
    const resMic = viewEl.querySelector('#br-res-mic-btn');
    const resSug = viewEl.querySelector('#br-res-suggestions');

    viewEl.querySelector('#br-results-logo').onclick = () => navigateTo('quantro://google');

    resClear.onclick = () => {
      resInput.value = '';
      resInput.focus();
    };

    resMic.onclick = () => {
      triggerVoiceSearch(resInput, (text) => {
        if (text) doSearch(text, activeTab);
      });
    };

    setupAutocomplete(resInput, resSug, (selText) => {
      doSearch(selText, activeTab);
    });

    resForm.onsubmit = (e) => {
      e.preventDefault();
      const nextQ = resInput.value.trim();
      if (nextQ) doSearch(nextQ, activeTab);
    };

    // Tab tıklandığında
    viewEl.querySelectorAll('.search-tab').forEach((tabEl) => {
      tabEl.addEventListener('click', () => {
        const nextTab = tabEl.dataset.tab;
        doSearch(query, nextTab);
      });
    });

    // Waffle Menü
    viewEl.querySelector('#br-res-waffle-btn').onclick = (e) => {
      showWaffleMenu(e.currentTarget);
    };

    // Veri çekimi
    try {
      const p = new URLSearchParams({
        q: query,
        tab: activeTab,
        provider: searchCfg.provider,
        apiKey: searchCfg.provider === 'serper' ? searchCfg.serperApiKey : searchCfg.googleApiKey,
        cx: searchCfg.googleCx
      });

      const resp = await fetch(`/api/search?${p.toString()}`);
      const data = await resp.json();

      const loadingEl = viewEl.querySelector('#br-search-loading');
      if (loadingEl) loadingEl.style.display = 'none';

      // 1) Hesap Makinesi Kartı
      const calcContainer = viewEl.querySelector('#br-calc-container');
      if (data.calculatorCard && calcContainer) {
        calcContainer.innerHTML = renderCalculatorCard(data.calculatorCard);
        calcContainer.querySelector('#br-calc-copy')?.addEventListener('click', () => {
          navigator.clipboard?.writeText(data.calculatorCard.result);
          osContext.notify?.('Hesap Makinesi', 'Sonuç panoya kopyalandı.');
        });
      }

      // 2) Bilgi Kartı
      const knowContainer = viewEl.querySelector('#br-knowledge-container');
      if (data.knowledgeCard && knowContainer) {
        knowContainer.innerHTML = renderKnowledgeCard(data.knowledgeCard);
      }

      // 3) İstatistik Satırı
      const statsEl = viewEl.querySelector('#br-search-stats');
      if (statsEl) {
        const count = data.results?.length || 0;
        statsEl.textContent = `Yaklaşık ${count} sonuç bulundu · Kaynak: ${escapeHtml(data.provider || 'Google Canlı')}`;
      }

      const itemsEl = viewEl.querySelector('#br-search-items');
      if (!data.results || !data.results.length) {
        itemsEl.innerHTML = `
          <div style="padding:24px;background:var(--panel-bg);border:1px solid var(--hair);border-radius:12px;">
            <p style="color:var(--text-1);margin:0 0 8px 0;">"${escapeHtml(query)}" ile eşleşen sonuç bulunamadı.</p>
            <ul style="color:var(--text-3);font-size:13px;padding-left:20px;margin:0;">
              <li>Tüm kelimelerin doğru yazıldığından emin olun.</li>
              <li>Daha genel anahtar kelimeler deneyin (örn: "kuantum", "kara delik").</li>
              <li>Akademik veya Vikipedi sekmesini seçerek arama yapın.</li>
            </ul>
          </div>
        `;
        return;
      }

      // Görseller sekmesi seçilmişse özel grid görünümü
      if (activeTab === 'images') {
        itemsEl.innerHTML = `
          <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(180px, 1fr));gap:14px;">
            ${data.results.map((r, i) => `
              <div class="search-img-card" data-open-proxy="${escapeHtml(r.link)}" style="cursor:pointer;background:var(--panel-bg);border:1px solid var(--hair);border-radius:10px;overflow:hidden;transition:transform 0.15s, border-color 0.15s;">
                <div style="height:120px;background:var(--ink-900);display:flex;align-items:center;justify-content:center;font-size:36px;color:var(--text-3);">
                  🖼️
                </div>
                <div style="padding:8px 10px;">
                  <div style="font-size:12px;font-weight:600;color:var(--text-0);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(r.title)}</div>
                  <div style="font-size:11px;color:var(--patina);font-family:monospace;margin-top:2px;">${escapeHtml(r.displayUrl || 'web')}</div>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      } else {
        // Tümü, Akademik veya Vikipedi Listesi
        itemsEl.innerHTML = data.results.map((r) => `
          <div class="search-card" style="display:flex;flex-direction:column;gap:4px;padding:14px 18px;background:var(--panel-bg);border:1px solid var(--hair);border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.15);transition:border-color 0.15s;">
            <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--patina);font-family:monospace;word-break:break-all;">
              <span>🌐</span>
              <span>${escapeHtml(r.displayUrl || r.link)}</span>
              ${r.isAcademic ? `<span style="padding:1px 6px;border-radius:4px;background:rgba(234,67,53,0.15);color:#EA4335;font-size:10px;font-weight:bold;">ArXiv PDF</span>` : ''}
            </div>

            <div style="display:flex;align-items:baseline;gap:8px;">
              <a href="${escapeHtml(r.link)}" data-result-link="${escapeHtml(r.link)}" style="font-size:17px;color:#8AB4F8;text-decoration:none;font-weight:600;line-height:1.35;margin-top:2px;cursor:pointer;">
                ${escapeHtml(r.title)}
              </a>
              <button type="button" class="btn btn-sm btn-ghost" data-open-external="${escapeHtml(r.link)}" title="Harici Tarayıcıda Yeni Sekmede Aç" style="font-size:11px;padding:1px 6px;color:var(--text-3);">
                ↗
              </button>
            </div>

            ${r.authors ? `
              <div style="font-size:11px;color:var(--text-3);margin-top:1px;">
                Yazarlar: <strong style="color:var(--text-2);">${escapeHtml(r.authors)}</strong> ${r.published ? `(${escapeHtml(r.published)})` : ''}
              </div>
            ` : ''}

            <div style="font-size:13px;color:var(--text-1);line-height:1.5;margin-top:2px;">
              ${escapeHtml(r.snippet)}
            </div>

            <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
              <button type="button" class="btn btn-sm btn-primary" data-open-proxy="${escapeHtml(r.link)}" style="font-size:11px;padding:3px 12px;border-radius:6px;">
                Quantro Edge ile Aç ↗
              </button>
              <button type="button" class="btn btn-sm btn-ghost" data-open-external="${escapeHtml(r.link)}" style="font-size:11px;padding:3px 10px;border-radius:6px;">
                Yeni Sekmede Aç 🌐
              </button>
              ${r.pdfLink ? `
                <button type="button" class="btn btn-sm btn-ghost" data-open-external="${escapeHtml(r.pdfLink)}" style="font-size:11px;padding:3px 10px;border-radius:6px;">
                  PDF İndir 📄
                </button>
              ` : ''}
              <button type="button" class="btn btn-sm btn-ghost" data-copy-link="${escapeHtml(r.link)}" style="font-size:11px;padding:3px 8px;border-radius:6px;">
                Bağlantıyı Kopyala 📋
              </button>
            </div>
          </div>
        `).join('');
      }

      // İlgili Aramalar Bölümü
      const relatedContainer = viewEl.querySelector('#br-related-container');
      if (relatedContainer) {
        const relatedQueries = [
          `${query} nedir`,
          `${query} formülü ve denklemleri`,
          `${query} bilimsel makaleler`,
          `${query} tarihçesi ve keşfi`,
          `${query} güncel deneyler 2026`
        ];
        relatedContainer.innerHTML = `
          <div style="font-size:14px;font-weight:600;color:var(--text-0);margin-bottom:12px;">İlgili Aramalar</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${relatedQueries.map((rq) => `
              <button type="button" class="btn btn-sm btn-ghost" data-quick-search="${escapeHtml(rq)}" style="font-size:12px;border-radius:16px;padding:4px 14px;">
                🔍 ${escapeHtml(rq)}
              </button>
            `).join('')}
          </div>
        `;
        relatedContainer.querySelectorAll('[data-quick-search]').forEach((b) => {
          b.addEventListener('click', () => doSearch(b.dataset.quickSearch, activeTab));
        });
      }

      // Sayfalama Bölümü
      const pagContainer = viewEl.querySelector('#br-pagination-container');
      if (pagContainer) {
        pagContainer.innerHTML = `
          <div style="font-size:20px;font-weight:bold;letter-spacing:1px;font-family:sans-serif;margin-bottom:8px;">
            <span style="color:#4285F4;">G</span><span style="color:#EA4335;">o</span><span style="color:#FBBC05;">o</span><span style="color:#4285F4;">g</span><span style="color:#34A853;">l</span><span style="color:#EA4335;">e</span>
          </div>
        `;
      }

      // Arama Sonuçları Tıklama Yönetimi
      itemsEl.addEventListener('click', (e) => {
        const a = e.target.closest('[data-result-link]');
        const b = e.target.closest('[data-open-proxy]');
        const ext = e.target.closest('[data-open-external]');
        const c = e.target.closest('[data-copy-link]');
        const d = e.target.closest('[data-academic-search]');

        if (ext) {
          e.preventDefault();
          window.open(ext.dataset.openExternal, '_blank', 'noopener,noreferrer');
        } else if (a) {
          e.preventDefault();
          navigateTo(a.dataset.resultLink);
        } else if (b) {
          e.preventDefault();
          navigateTo(b.dataset.openProxy);
        } else if (c) {
          e.preventDefault();
          navigator.clipboard?.writeText(c.dataset.copyLink);
          osContext.notify?.('Panoya Kopyalandı', c.dataset.copyLink);
        } else if (d) {
          e.preventDefault();
          doSearch(d.dataset.academicSearch, 'academic');
        }
      });
    } catch (err) {
      const itemsEl = viewEl.querySelector('#br-search-items');
      if (itemsEl) {
        itemsEl.innerHTML = `
          <div style="color:var(--crimson);padding:16px;background:rgba(239,68,68,0.1);border-radius:10px;">
            Arama sonuçları alınırken hata oluştu: ${escapeHtml(err.message)}
          </div>
        `;
      }
    }
  }

  function showWaffleMenu(anchorBtn) {
    const existing = document.getElementById('br-waffle-dropdown');
    if (existing) {
      existing.remove();
      return;
    }

    const rect = anchorBtn.getBoundingClientRect();
    const waffleEl = document.createElement('div');
    waffleEl.id = 'br-waffle-dropdown';
    waffleEl.style.cssText = `
      position: fixed; top: ${rect.bottom + 8}px; right: 24px;
      background: var(--panel-bg); border: 1px solid var(--hair-strong);
      border-radius: 16px; padding: 16px; width: 300px;
      box-shadow: 0 12px 36px rgba(0,0,0,0.45); z-index: 100000;
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
    `;

    waffleEl.innerHTML = WAFFLE_APPS.map((item) => `
      <div class="waffle-item" data-waffle-action="${item.action || ''}" data-waffle-app="${item.app || ''}" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 4px;border-radius:10px;cursor:pointer;transition:background 0.15s;text-align:center;">
        <span style="font-size:24px;margin-bottom:4px;">${item.icon}</span>
        <span style="font-size:11px;color:var(--text-1);font-weight:600;">${escapeHtml(item.name)}</span>
      </div>
    `).join('');

    document.body.appendChild(waffleEl);

    waffleEl.querySelectorAll('.waffle-item').forEach((item) => {
      item.addEventListener('mouseenter', () => item.style.background = 'rgba(255,255,255,0.06)');
      item.addEventListener('mouseleave', () => item.style.background = 'transparent');
      item.addEventListener('click', () => {
        waffleEl.remove();
        const action = item.dataset.waffleAction;
        const app = item.dataset.waffleApp;

        if (action === 'google') navigateTo('quantro://google');
        else if (action === 'portal') navigateTo('quantro://portal');
        else if (action === 'sozluk') navigateTo('quantro://sozluk');
        else if (action === 'arxiv') navigateTo('quantro://arxiv');
        else if (action === 'nasa') navigateTo('https://ui.adsabs.harvard.edu');
        else if (app && osContext.openApp) {
          osContext.openApp(app);
        }
      });
    });

    const closeHandler = (e) => {
      if (!waffleEl.contains(e.target) && e.target !== anchorBtn) {
        waffleEl.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 10);
  }

  function renderGoogleHome() {
    statusSecurity.textContent = '🔍 Google Arama Portali (QuantOS AR-GE)';
    viewEl.innerHTML = `
      <div style="display:flex;flex-direction:column;flex:1;background:var(--ink-950);position:relative;overflow-y:auto;">
        <!-- Top Navigation Bar -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 24px;">
          <div style="display:flex;gap:16px;font-size:13px;align-items:center;">
            <button type="button" class="btn btn-sm btn-ghost" data-goto="quantro://portal">Quantro Portal</button>
            <button type="button" class="btn btn-sm btn-ghost" data-goto="quantro://sozluk">Sözlük</button>
            <button type="button" class="btn btn-sm btn-ghost" data-goto="quantro://arxiv">ArXiv</button>
          </div>
          <div style="display:flex;gap:14px;font-size:13px;align-items:center;">
            <button type="button" class="btn btn-sm btn-ghost" data-goto="https://mail.google.com">Gmail</button>
            <button type="button" class="btn btn-sm btn-ghost" id="br-home-tab-img">Görseller</button>
            <button type="button" class="btn btn-sm btn-ghost" id="br-home-waffle-btn" title="Google &amp; QuantOS Uygulamaları" style="font-size:16px;">⠿</button>
            <div style="width:32px;height:32px;border-radius:50%;background:#4285F4;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;" title="Quantro Bilim Hesabı">
              Q
            </div>
          </div>
        </div>

        <!-- Center Search Area -->
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;padding:24px 20px;">
          <div style="margin-bottom:28px;text-align:center;">
            <h1 style="font-size:56px;letter-spacing:-1.5px;margin:0;font-weight:700;user-select:none;">
              <span style="color:#4285F4;">G</span><span style="color:#EA4335;">o</span><span style="color:#FBBC05;">o</span><span style="color:#4285F4;">g</span><span style="color:#34A853;">l</span><span style="color:#EA4335;">e</span>
            </h1>
            <div style="margin-top:4px;">
              <span style="font-size:11px;color:var(--accent);letter-spacing:1.5px;font-weight:700;padding:2px 8px;border-radius:10px;background:rgba(209,146,92,0.12);">
                QUANTOS EDİTİON · AR-GE ARAMA MOTORU
              </span>
            </div>
          </div>

          <form id="br-home-search-form" style="width:100%;max-width:580px;position:relative;display:flex;flex-direction:column;align-items:center;gap:20px;">
            <div style="width:100%;display:flex;align-items:center;background:var(--panel-bg);border:1px solid var(--hair-strong);border-radius:28px;padding:8px 18px;box-shadow:0 4px 18px rgba(0,0,0,0.3);transition:box-shadow 0.2s, border-color 0.2s;">
              <span style="color:var(--text-3);margin-right:12px;font-size:15px;">🔍</span>
              <input type="text" id="br-home-search-input" placeholder="Google'da arayın, hesaplama yapın veya bir web adresi girin..." style="flex:1;background:transparent;border:none;outline:none;color:var(--text-0);font-size:15px;" autofocus />
              <button type="button" id="br-home-clear-btn" class="btn btn-sm btn-ghost" style="padding:0 4px;font-size:12px;display:none;" title="Temizle">✕</button>
              <button type="button" id="br-home-mic-btn" class="btn btn-sm btn-ghost" style="padding:0 6px;font-size:16px;margin-left:4px;" title="Sesle Arama Yap">🎙️</button>
            </div>

            <!-- Autocomplete suggestions dropdown -->
            <div id="br-home-suggestions" style="display:none;position:absolute;top:54px;left:0;right:0;background:var(--panel-bg);border:1px solid var(--hair-strong);border-radius:16px;box-shadow:0 12px 32px rgba(0,0,0,0.5);z-index:1000;overflow:hidden;"></div>

            <div style="display:flex;gap:12px;">
              <button type="submit" class="btn btn-primary" id="br-home-btn-search" style="padding:8px 20px;border-radius:20px;font-size:13px;font-weight:600;">Google'da Ara</button>
              <button type="button" class="btn" id="br-home-btn-lucky" style="padding:8px 20px;border-radius:20px;font-size:13px;">Kendimi Şanslı Hissediyorum</button>
            </div>
          </form>

          <!-- Quick Discovery Chips -->
          <div style="margin-top:36px;display:flex;gap:10px;flex-wrap:wrap;justify-content:center;max-width:720px;">
            <span style="font-size:12px;color:var(--text-3);align-self:center;margin-right:4px;">Trend Keşifler:</span>
            <button type="button" class="btn btn-sm btn-ghost" data-quick="kuantum dolanıklık nedir" style="border-radius:14px;font-size:12px;">⚛️ Kuantum Dolanıklık</button>
            <button type="button" class="btn btn-sm btn-ghost" data-quick="james webb uzay teleskobu" style="border-radius:14px;font-size:12px;">🔭 James Webb Teleskobu</button>
            <button type="button" class="btn btn-sm btn-ghost" data-quick="kara delik olay ufku" style="border-radius:14px;font-size:12px;">🕳️ Kara Delik Fiziği</button>
            <button type="button" class="btn btn-sm btn-ghost" data-quick="ışık hızı neden aşılamaz" style="border-radius:14px;font-size:12px;">⚡ Işık Hızı (c)</button>
            <button type="button" class="btn btn-sm btn-ghost" data-quick="planck sabiti değeri" style="border-radius:14px;font-size:12px;">📏 Planck Sabiti</button>
            <button type="button" class="btn btn-sm btn-ghost" data-quick="25 * 4" style="border-radius:14px;font-size:12px;">🧮 25 * 4 (Hesapla)</button>
          </div>
        </div>

        <!-- Google Home Footer -->
        <div style="background:var(--panel-bg);border-top:1px solid var(--hair);font-size:12px;color:var(--text-3);">
          <div style="padding:10px 24px;border-bottom:1px solid var(--hair);">
            Türkiye · Kayseri Kuantum Mekaniği ve Astrofizik Merkezi
          </div>
          <div style="display:flex;justify-content:space-between;padding:10px 24px;flex-wrap:wrap;gap:10px;">
            <div style="display:flex;gap:16px;">
              <button type="button" class="btn btn-sm btn-ghost" data-goto="quantro://portal" style="font-size:12px;padding:0;">Hakkında</button>
              <button type="button" class="btn btn-sm btn-ghost" data-goto="quantro://sozluk" style="font-size:12px;padding:0;">Sözlük</button>
              <button type="button" class="btn btn-sm btn-ghost" data-goto="https://github.com/Lennebraha38/QuantOS" style="font-size:12px;padding:0;">Açık Kaynak (MIT)</button>
            </div>
            <div style="display:flex;gap:16px;">
              <button type="button" class="btn btn-sm btn-ghost" id="br-home-footer-cfg" style="font-size:12px;padding:0;">⚙️ Arama &amp; API Ayarları</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const form = viewEl.querySelector('#br-home-search-form');
    const input = viewEl.querySelector('#br-home-search-input');
    const clearBtn = viewEl.querySelector('#br-home-clear-btn');
    const micBtn = viewEl.querySelector('#br-home-mic-btn');
    const sugDropdown = viewEl.querySelector('#br-home-suggestions');

    input.addEventListener('input', () => {
      clearBtn.style.display = input.value.trim() ? 'block' : 'none';
    });

    clearBtn.addEventListener('click', () => {
      input.value = '';
      clearBtn.style.display = 'none';
      input.focus();
    });

    micBtn.addEventListener('click', () => {
      triggerVoiceSearch(input, (text) => {
        if (text) doSearch(text);
      });
    });

    setupAutocomplete(input, sugDropdown, (selText) => {
      doSearch(selText);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (q) doSearch(q);
    });

    viewEl.querySelector('#br-home-btn-lucky').addEventListener('click', () => {
      const luckyTopics = [
        'kuantum dolanıklık nedir',
        'kara delik olay ufku',
        'james webb uzay teleskobu',
        'ışık hızı neden aşılamaz',
        'planck sabiti değeri',
        'erciyes gözlemevi kayseri',
        'albert einstein genel görelilik'
      ];
      const randomTopic = luckyTopics[Math.floor(Math.random() * luckyTopics.length)];
      doSearch(randomTopic);
    });

    viewEl.querySelector('#br-home-tab-img').addEventListener('click', () => {
      doSearch(input.value.trim() || 'kuantum', 'images');
    });

    viewEl.querySelector('#br-home-waffle-btn').addEventListener('click', (e) => {
      showWaffleMenu(e.currentTarget);
    });

    viewEl.querySelector('#br-home-footer-cfg')?.addEventListener('click', () => {
      showSettings = true;
      settingsDrawer.style.display = 'block';
    });

    viewEl.querySelectorAll('[data-quick]').forEach((b) => {
      b.addEventListener('click', () => doSearch(b.dataset.quick));
    });

    viewEl.querySelectorAll('[data-goto]').forEach((b) => {
      b.addEventListener('click', () => navigateTo(b.dataset.goto));
    });
  }

  function render() {
    const t = cur();
    if (!t.history) {
      t.history = [t.url];
      t.histIdx = 0;
    }

    backBtn.disabled = t.histIdx <= 0;
    forwardBtn.disabled = t.histIdx >= t.history.length - 1;

    tabsEl.innerHTML =
      tabs
        .map((tb) => {
          let label = BUILTIN_PAGES[tb.url]?.title;
          if (!label) {
            if (tb.url === 'quantro://google') label = 'Google';
            else if (tb.url.startsWith('quantro://search')) {
              try {
                const u = new URL(tb.url);
                const q = u.searchParams.get('q') || 'Arama';
                label = `Ara: ${q.slice(0, 14)}`;
              } catch {
                label = 'Arama';
              }
            } else {
              try {
                const u = new URL(tb.url);
                label = u.hostname.replace(/^www\./, '');
                if (u.pathname && u.pathname !== '/') label += u.pathname.slice(0, 12);
              } catch {
                label = tb.url.slice(0, 20);
              }
            }
          }
          return `
            <div class="app-tab ${tb.id === t.id ? 'active' : ''}" data-tid="${tb.id}" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
              <span>${escapeHtml(label)}</span>
              ${tabs.length > 1 ? `<span data-close-tid="${tb.id}" style="opacity:0.6;font-weight:bold;margin-left:4px;padding:0 2px;">×</span>` : ''}
            </div>
          `;
        })
        .join('') + `<button type="button" class="btn btn-sm btn-ghost" id="br-new">+ Sekme</button>`;

    urlEl.value = t.url;
    statusUrl.textContent = t.url;

    if (t.url === 'quantro://google') {
      renderGoogleHome();
    } else if (t.url.startsWith('quantro://search')) {
      try {
        const u = new URL(t.url);
        const q = u.searchParams.get('q') || '';
        const tab = u.searchParams.get('tab') || 'all';
        renderSearchResults(q, tab);
      } catch {
        renderGoogleHome();
      }
    } else if (BUILTIN_PAGES[t.url]) {
      statusSecurity.textContent = '🏛️ Yerleşik QuantOS Portali';
      viewEl.innerHTML = `<div style="padding:16px;overflow:auto;flex:1;">${BUILTIN_PAGES[t.url].html}</div>`;
    } else {
      statusSecurity.textContent = '🔒 Quantro Güvenli Web Proxy Aktif (SSRF Korumalı)';
      const targetUrl = t.url;
      const proxySrc = `/api/proxy?url=${encodeURIComponent(targetUrl)}`;

      viewEl.innerHTML = `
        <div style="display:flex;flex-direction:column;flex:1;height:100%;background:var(--ink-950);position:relative;overflow:hidden;">
          <!-- Sayfa Üst Bilgi ve Hızlı Eylem Çubuğu -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 14px;background:var(--panel-bg);border-bottom:1px solid var(--hair);font-size:12px;gap:12px;z-index:5;">
            <div style="display:flex;align-items:center;gap:8px;overflow:hidden;flex:1;">
              <span style="font-size:14px;color:var(--accent);">🔒</span>
              <span style="font-family:monospace;color:var(--text-1);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                ${escapeHtml(targetUrl)}
              </span>
            </div>
            <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
              <button type="button" class="btn btn-sm btn-ghost" id="br-frame-back" title="Google Sonuçlarına Dön">◀ Geri</button>
              <button type="button" class="btn btn-sm btn-ghost" id="br-frame-reload" title="Yeniden Yükle">🔄 Yenile</button>
              <button type="button" class="btn btn-sm btn-ghost" id="br-frame-copy" title="URL'yi Kopyala">📋 Kopyala</button>
              <button type="button" class="btn btn-sm btn-primary" id="br-frame-ext" title="Bu sayfayı tarayıcınızda yeni sekmede doğrudan açar">
                Yeni Sekmede Aç ↗
              </button>
            </div>
          </div>

          <!-- Canlı Yükleme Göstergesi -->
          <div id="br-frame-loader" style="height:3px;background:rgba(66,133,244,0.15);overflow:hidden;position:relative;">
            <div style="width:100%;height:100%;background:linear-gradient(90deg, #4285F4, #34A853);animation:pulse 1.2s infinite ease-in-out;"></div>
          </div>

          <!-- Web Görüntü Çerçevesi -->
          <iframe id="br-page-frame" src="${escapeHtml(proxySrc)}" title="Quantro Web Görüntüsü" style="flex:1;width:100%;height:100%;border:none;background:#ffffff;" sandbox="allow-scripts allow-forms allow-same-origin allow-popups"></iframe>
        </div>
      `;

      const frameEl = viewEl.querySelector('#br-page-frame');
      const loaderEl = viewEl.querySelector('#br-frame-loader');

      frameEl.onload = () => {
        if (loaderEl) loaderEl.style.display = 'none';
      };

      viewEl.querySelector('#br-frame-back')?.addEventListener('click', () => {
        if (t.histIdx > 0) {
          t.histIdx--;
          t.url = t.history[t.histIdx];
          render();
        } else {
          navigateTo('quantro://google');
        }
      });

      viewEl.querySelector('#br-frame-reload')?.addEventListener('click', () => {
        if (loaderEl) loaderEl.style.display = 'block';
        frameEl.src = proxySrc + '&_nocache=' + Date.now();
      });

      viewEl.querySelector('#br-frame-copy')?.addEventListener('click', () => {
        navigator.clipboard?.writeText(targetUrl);
        osContext.notify?.('URL Kopyalandı', targetUrl);
      });

      viewEl.querySelector('#br-frame-ext')?.addEventListener('click', () => {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      });
    }
  }

  container.querySelector('#br-form').addEventListener('submit', (e) => {
    e.preventDefault();
    navigateTo(urlEl.value);
  });

  backBtn.addEventListener('click', () => {
    const t = cur();
    if (t.histIdx > 0) {
      t.histIdx--;
      t.url = t.history[t.histIdx];
      render();
    }
  });

  forwardBtn.addEventListener('click', () => {
    const t = cur();
    if (t.histIdx < t.history.length - 1) {
      t.histIdx++;
      t.url = t.history[t.histIdx];
      render();
    }
  });

  reloadBtn.addEventListener('click', () => {
    render();
  });

  homeBtn.addEventListener('click', () => {
    navigateTo('quantro://google');
  });

  cfgBtn.addEventListener('click', () => {
    showSettings = !showSettings;
    settingsDrawer.style.display = showSettings ? 'block' : 'none';
    if (showSettings) {
      container.querySelector('#br-cfg-provider').value = searchCfg.provider;
      container.querySelector('#br-cfg-gkey').value = searchCfg.googleApiKey;
      container.querySelector('#br-cfg-gcx').value = searchCfg.googleCx;
      container.querySelector('#br-cfg-skey').value = searchCfg.serperApiKey;
    }
  });

  container.querySelector('#br-cfg-close').addEventListener('click', () => {
    showSettings = false;
    settingsDrawer.style.display = 'none';
  });

  container.querySelector('#br-cfg-save').addEventListener('click', () => {
    searchCfg = {
      provider: container.querySelector('#br-cfg-provider').value,
      googleApiKey: container.querySelector('#br-cfg-gkey').value.trim(),
      googleCx: container.querySelector('#br-cfg-gcx').value.trim(),
      serperApiKey: container.querySelector('#br-cfg-skey').value.trim()
    };
    localStorage.setItem('quantos.browser.cfg', JSON.stringify(searchCfg));
    const msg = container.querySelector('#br-cfg-msg');
    msg.textContent = '✓ Ayarlar kaydedildi';
    setTimeout(() => { msg.textContent = ''; }, 2500);
  });

  container.querySelectorAll('[data-goto]').forEach((b) =>
    b.addEventListener('click', () => {
      navigateTo(b.dataset.goto);
    })
  );

  tabsEl.addEventListener('click', (e) => {
    const closeBtn = e.target.closest('[data-close-tid]');
    if (closeBtn) {
      e.stopPropagation();
      const tid = Number(closeBtn.dataset.closeTid);
      if (tabs.length > 1) {
        tabs = tabs.filter((x) => x.id !== tid);
        if (activeId === tid) activeId = tabs[0].id;
        render();
      }
      return;
    }
    if (e.target.closest('#br-new')) {
      const id = seq++;
      tabs.push({ id, url: 'quantro://google', history: ['quantro://google'], histIdx: 0 });
      activeId = id;
      render();
      return;
    }
    const b = e.target.closest('[data-tid]');
    if (b) {
      activeId = Number(b.dataset.tid);
      render();
    }
  });

  container.querySelector('#br-btn-reader')?.addEventListener('click', () => {
    readerMode = !readerMode;
    const bodyEl = container.querySelector('#br-view');
    if (bodyEl) {
      bodyEl.classList.toggle('reader-mode', readerMode);
      if (readerMode) {
        bodyEl.style.cssText = 'max-width:780px;margin:0 auto;padding:32px 24px;font-family:serif;line-height:1.8;font-size:16px;background:var(--vellum-surface, #1e1e24);color:var(--vellum-ink, #f5f5f5);overflow-y:auto;flex:1;';
      } else {
        bodyEl.style.cssText = 'position:relative;display:flex;flex-direction:column;flex:1;padding:0;overflow:hidden;';
      }
    }
  });

  container.querySelector('#br-btn-download')?.addEventListener('click', () => {
    const t = cur();
    const content = container.querySelector('#br-view')?.innerHTML || '';
    const fname = `C:/Users/Quantro/Downloads/Web-${Date.now().toString().slice(-4)}.html`;
    if (osContext.vfs?.write) {
      osContext.vfs.write(fname, `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(t.url)}</title></head><body>${content}</body></html>`);
      osContext.notify?.('İndirme Yöneticisi', `${fname} VFS Downloads klasörüne kaydedildi.`);
    }
  });

  if (args?.query) {
    doSearch(args.query);
  } else if (args?.url) {
    navigateTo(args.url);
  }

  render();
  return {
    onArgs(nextArgs) {
      if (nextArgs?.query) {
        doSearch(nextArgs.query);
      } else if (nextArgs?.url) {
        navigateTo(nextArgs.url);
      }
    }
  };
}
