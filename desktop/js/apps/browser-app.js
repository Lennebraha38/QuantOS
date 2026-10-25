/**
 * Uygulama 10: Quantro Edge Araştırma Tarayıcısı (Browser)
 * Çok sekmeli bilimsel portal, kuantum/astrofizik sözlüğü, ArXiv makale özetleri ve harici URL desteği
 */

const BUILTIN_PAGES = {
  'quantro://portal': {
    title: 'Quantro AR-GE Ana Portal',
    html: `
      <div class="vellum-surface">
        <div class="eyebrow" style="color:#96582D;">BAĞIMSIZ BİLİMSEL ARAŞTIRMA MERKEZİ · KAYSERİ</div>
        <h1>Quantro — Kuantum Mekaniği ve Astrofizik AR-GE</h1>
        <p>Quantro, kuantum hesaplama devreleri, BB84 kuantum anahtar dağıtımı, göreli kara delik merceklemesi ve gözlemsel kozmoloji kesişiminde açık kaynaklı (MIT) bilimsel araçlar geliştiren bağımsız bir araştırma merkezidir.</p>
        <h3>Doğrulanabilir Açık Kaynak Katkıları</h3>
        <ul>
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
      <div class="panel-card">
        <h3 class="panel-title">Temel Kavramlar ve Denklemler</h3>
        <div class="data-table-wrap">
          <table class="data-table">
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
      <div class="panel-card">
        <div class="eyebrow">REFERANS LİTERATÜR SEÇKİSİ</div>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead><tr><th>Yıl</th><th>Başlık &amp; Yazarlar</th><th>Alan</th></tr></thead>
            <tbody>
              <tr><td class="mono">1972</td><td>Bardeen, Press &amp; Teukolsky — Rotating Black Holes: Locally Nonrotating Frames &amp; ISCO</td><td>Genel Görelilik</td></tr>
              <tr><td class="mono">1984</td><td>Bennett &amp; Brassard — Quantum Cryptography: Public Key Distribution (BB84)</td><td>Kuantum Kriptografi</td></tr>
              <tr><td class="mono">1996</td><td>Lov K. Grover — A Fast Quantum Mechanical Algorithm for Database Search</td><td>Kuantum Algoritmalar</td></tr>
              <tr><td class="mono">2016</td><td>LIGO Scientific Collaboration — Observation of Gravitational Waves from a Binary Black Hole Merger (GW150914)</td><td>Kütleçekim Dalgaları</td></tr>
              <tr><td class="mono">2020</td><td>Planck Collaboration — Planck 2018 Results VI. Cosmological Parameters (H₀=67.4)</td><td>Kozmoloji</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `,
  },
};

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

  container.innerHTML = `
    <div class="app-shell">
      <div class="app-tabs" id="br-tabs"></div>
      <div class="app-toolbar" id="br-nav" style="display:flex;gap:6px;align-items:center;">
        <button type="button" class="btn btn-sm" id="br-btn-back" title="Geri">◀</button>
        <button type="button" class="btn btn-sm" id="br-btn-forward" title="İleri">▶</button>
        <button type="button" class="btn btn-sm" id="br-btn-reload" title="Yenile">🔄</button>
        <button type="button" class="btn btn-sm" id="br-btn-home" title="Google Ana Sayfası">🏠</button>
        <form id="br-form" style="flex:1;display:flex;gap:6px;align-items:center;margin:0;">
          <input type="text" class="input mono" id="br-url" placeholder="Google'da arayın veya web adresi girin (örn: wikipedia.org)..." style="flex:1;padding:5px 12px;font-size:12px;" />
          <button type="submit" class="btn btn-sm btn-primary">Git</button>
        </form>
        <button type="button" class="btn btn-sm" id="br-btn-reader" title="Okuma Modu (Temiz Metin)">📖</button>
        <button type="button" class="btn btn-sm" id="br-btn-download" title="VFS'ye İndir">📥</button>
        <button type="button" class="btn btn-sm" id="br-btn-cfg" title="Arama &amp; API Ayarları">⚙️ API</button>
      </div>
      <div class="app-toolbar" style="padding:4px 8px;gap:6px;background:var(--hair);border-bottom:1px solid var(--hair-strong);display:flex;flex-wrap:wrap;align-items:center;">
        <span style="font-size:11px;color:var(--text-3);font-weight:600;margin-right:4px;">YER İMLERİ:</span>
        <button type="button" class="btn btn-sm btn-ghost" data-goto="quantro://google" style="font-size:11px;">🔍 Google</button>
        <button type="button" class="btn btn-sm btn-ghost" data-goto="quantro://portal" style="font-size:11px;">🌌 Quantro Portal</button>
        <button type="button" class="btn btn-sm btn-ghost" data-goto="quantro://sozluk" style="font-size:11px;">📖 Sözlük</button>
        <button type="button" class="btn btn-sm btn-ghost" data-goto="https://tr.wikipedia.org" style="font-size:11px;">🌐 Vikipedi</button>
        <button type="button" class="btn btn-sm btn-ghost" data-goto="https://arxiv.org" style="font-size:11px;">📄 ArXiv</button>
        <button type="button" class="btn btn-sm btn-ghost" data-goto="https://github.com/Lennebraha38/QuantOS" style="font-size:11px;">🐙 GitHub Repo</button>
        <button type="button" class="btn btn-sm btn-ghost" data-goto="https://ui.adsabs.harvard.edu" style="font-size:11px;">🔭 NASA ADS</button>
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
              <option value="auto">Otomatik (Google API varsa kullan, yoksa Canlı Arama)</option>
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
      <div class="app-statusbar">
        <span id="br-status-security">🔒 Quantro Güvenli Web Proxy Aktif (SSRF Korumalı)</span>
        <span id="br-status-url" class="mono" style="font-size:11px;"></span>
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

  async function renderSearchResults(query) {
    statusSecurity.textContent = '🔍 Google / Web Canlı Arama Sonuçları';
    viewEl.innerHTML = `
      <div style="padding:24px 32px;overflow:auto;flex:1;background:var(--ink-950);">
        <div style="font-size:12px;color:var(--text-3);margin-bottom:12px;">"${escapeHtml(query)}" için web arama sonuçları getiriliyor...</div>
        <div id="br-search-loading" style="display:flex;gap:8px;align-items:center;color:var(--accent);">
          <span>Aranıyor...</span>
        </div>
        <div id="br-search-items" style="display:flex;flex-direction:column;gap:18px;margin-top:16px;"></div>
      </div>
    `;

    try {
      const p = new URLSearchParams({
        q: query,
        provider: searchCfg.provider,
        apiKey: searchCfg.provider === 'serper' ? searchCfg.serperApiKey : searchCfg.googleApiKey,
        cx: searchCfg.googleCx
      });
      const resp = await fetch(`/api/search?${p.toString()}`);
      const data = await resp.json();

      const loadingEl = viewEl.querySelector('#br-search-loading');
      if (loadingEl) loadingEl.style.display = 'none';

      const itemsEl = viewEl.querySelector('#br-search-items');
      if (!data.results || !data.results.length) {
        itemsEl.innerHTML = `<div style="color:var(--text-2);">Sonuç bulunamadı. Lütfen farklı anahtar kelimeler deneyin.</div>`;
        return;
      }

      itemsEl.innerHTML = `
        <div style="font-size:11px;color:var(--text-3);margin-bottom:8px;">
          Kaynak: <strong>${escapeHtml(data.provider || 'Web')}</strong> · Yaklaşık ${data.results.length} sonuç listelendi.
        </div>
        ${data.results.map((r) => `
          <div class="search-card" style="display:flex;flex-direction:column;gap:4px;padding:12px 16px;background:var(--panel-bg);border:1px solid var(--hair);border-radius:10px;">
            <div style="font-size:11px;color:var(--patina);font-family:monospace;word-break:break-all;">
              ${escapeHtml(r.displayUrl || r.link)}
            </div>
            <a href="${escapeHtml(r.link)}" data-result-link="${escapeHtml(r.link)}" style="font-size:16px;color:#38BDF8;text-decoration:none;font-weight:600;">
              ${escapeHtml(r.title)}
            </a>
            <div style="font-size:13px;color:var(--text-1);line-height:1.45;">
              ${escapeHtml(r.snippet)}
            </div>
            <div style="margin-top:4px;">
              <button type="button" class="btn btn-sm btn-ghost" data-open-proxy="${escapeHtml(r.link)}" style="font-size:11px;padding:2px 8px;">
                Quantro Edge ile Aç ↗
              </button>
            </div>
          </div>
        `).join('')}
      `;

      itemsEl.addEventListener('click', (e) => {
        const a = e.target.closest('[data-result-link]');
        const b = e.target.closest('[data-open-proxy]');
        const target = a ? a.dataset.resultLink : b ? b.dataset.openProxy : null;
        if (target) {
          e.preventDefault();
          navigateTo(target);
        }
      });
    } catch (err) {
      const itemsEl = viewEl.querySelector('#br-search-items');
      if (itemsEl) {
        itemsEl.innerHTML = `
          <div style="color:var(--crimson);padding:12px;background:rgba(239,68,68,0.1);border-radius:8px;">
            Arama sonuçları alınırken hata oluştu: ${escapeHtml(err.message)}
          </div>
        `;
      }
    }
  }

  function renderGoogleHome() {
    statusSecurity.textContent = '🔍 Google Arama Portali (QuantOS)';
    viewEl.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;padding:32px;background:var(--ink-950);">
        <div style="margin-bottom:24px;text-align:center;">
          <h1 style="font-size:48px;letter-spacing:-1px;margin:0;font-weight:700;">
            <span style="color:#4285F4;">G</span><span style="color:#EA4335;">o</span><span style="color:#FBBC05;">o</span><span style="color:#4285F4;">g</span><span style="color:#34A853;">l</span><span style="color:#EA4335;">e</span>
          </h1>
          <span style="font-size:12px;color:var(--accent);letter-spacing:1px;font-weight:600;">QUANTRO AR-GE EDİTİON</span>
        </div>
        <form id="br-home-search-form" style="width:100%;max-width:580px;display:flex;flex-direction:column;align-items:center;gap:16px;">
          <div style="width:100%;display:flex;align-items:center;background:var(--panel-bg);border:1px solid var(--hair-strong);border-radius:24px;padding:8px 18px;box-shadow:0 4px 14px rgba(0,0,0,0.25);">
            <span style="color:var(--text-3);margin-right:10px;">🔍</span>
            <input type="text" id="br-home-search-input" placeholder="Google'da arayın veya bir URL yazın..." style="flex:1;background:transparent;border:none;outline:none;color:var(--text-0);font-size:15px;" autofocus />
          </div>
          <div style="display:flex;gap:10px;">
            <button type="submit" class="btn btn-primary" id="br-home-btn-search">Google'da Ara</button>
            <button type="button" class="btn" id="br-home-btn-lucky">Kendimi Şanslı Hissediyorum</button>
          </div>
        </form>
        <div style="margin-top:32px;display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">
          <span style="font-size:12px;color:var(--text-3);">Önerilenler:</span>
          <button type="button" class="btn btn-sm btn-ghost" data-quick="kuantum dolanıklık nedir">Kuantum Dolanıklık</button>
          <button type="button" class="btn btn-sm btn-ghost" data-quick="james webb uzay teleskobu">James Webb Teleskobu</button>
          <button type="button" class="btn btn-sm btn-ghost" data-quick="schwarzschild kara delik">Kara Delik Fiziği</button>
          <button type="button" class="btn btn-sm btn-ghost" data-quick="kayseri erciyes gozlemevi">Erciyes Gözlemevi</button>
        </div>
      </div>
    `;

    const form = viewEl.querySelector('#br-home-search-form');
    const input = viewEl.querySelector('#br-home-search-input');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (q) navigateTo(q);
    });

    viewEl.querySelector('#br-home-btn-lucky').addEventListener('click', () => {
      const q = input.value.trim() || 'kuantum mekanigi';
      navigateTo(`https://tr.wikipedia.org/wiki/Kuantum_mekani%C4%9Fi`);
    });

    viewEl.querySelectorAll('[data-quick]').forEach((b) => {
      b.addEventListener('click', () => navigateTo(b.dataset.quick));
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
              const q = new URL(tb.url).searchParams.get('q') || 'Arama';
              label = `Ara: ${q.slice(0, 14)}`;
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
        renderSearchResults(q);
      } catch {
        renderGoogleHome();
      }
    } else if (BUILTIN_PAGES[t.url]) {
      statusSecurity.textContent = '🏛️ Yerleşik QuantOS Portali';
      viewEl.innerHTML = `<div style="padding:16px;overflow:auto;flex:1;">${BUILTIN_PAGES[t.url].html}</div>`;
    } else {
      statusSecurity.textContent = '🔒 Quantro Güvenli Web Proxy Aktif (SSRF Korumalı)';
      viewEl.innerHTML = '';

      const proxySrc = `/api/proxy?url=${encodeURIComponent(t.url)}`;
      const frame = document.createElement('iframe');
      frame.src = proxySrc;
      frame.title = 'Quantro Web Tarayıcı Görüntüsü';
      frame.style.cssText = 'flex:1;width:100%;height:100%;border:none;background:#ffffff;';
      frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin allow-popups');

      viewEl.appendChild(frame);
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
    const bodyEl = container.querySelector('#br-body');
    if (bodyEl) {
      bodyEl.classList.toggle('reader-mode', readerMode);
      if (readerMode) {
        bodyEl.style.cssText = 'max-width:760px;margin:0 auto;padding:32px 24px;font-family:var(--font-serif);line-height:1.8;font-size:16px;background:var(--vellum-surface);color:var(--vellum-ink);overflow-y:auto;';
      } else {
        bodyEl.style.cssText = '';
      }
    }
  });

  container.querySelector('#br-btn-download')?.addEventListener('click', () => {
    const t = curTab();
    const content = container.querySelector('#br-body')?.innerHTML || '';
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
