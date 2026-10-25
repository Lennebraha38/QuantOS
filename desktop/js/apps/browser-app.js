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

export function mountBrowserApp(container) {
  let tabs = [
    { id: 1, url: 'quantro://portal', history: ['quantro://portal'], histIdx: 0 },
    { id: 2, url: 'quantro://sozluk', history: ['quantro://sozluk'], histIdx: 0 },
    { id: 3, url: 'https://html.duckduckgo.com/html/?q=quantum+physics', history: ['https://html.duckduckgo.com/html/?q=quantum+physics'], histIdx: 0 },
  ];
  let activeId = 1;
  let seq = 4;

  container.innerHTML = `
    <div class="app-shell">
      <div class="app-tabs" id="br-tabs"></div>
      <div class="app-toolbar" id="br-nav" style="display:flex;gap:6px;align-items:center;">
        <button type="button" class="btn btn-sm" id="br-btn-back" title="Geri">◀</button>
        <button type="button" class="btn btn-sm" id="br-btn-forward" title="İleri">▶</button>
        <button type="button" class="btn btn-sm" id="br-btn-reload" title="Yenile">🔄</button>
        <button type="button" class="btn btn-sm" id="br-btn-home" title="Ana Sayfa">🏠</button>
        <form id="br-form" style="flex:1;display:flex;gap:6px;align-items:center;margin:0;">
          <input type="text" class="input mono" id="br-url" placeholder="Web adresi girin veya arama yapın (DuckDuckGo)..." style="flex:1;padding:5px 12px;font-size:12px;" />
          <button type="submit" class="btn btn-sm btn-primary">Git</button>
        </form>
      </div>
      <div class="app-toolbar" style="padding:4px 8px;gap:6px;background:var(--hair);border-bottom:1px solid var(--hair-strong);display:flex;flex-wrap:wrap;align-items:center;">
        <span style="font-size:11px;color:var(--text-3);font-weight:600;margin-right:4px;">YER İMLERİ:</span>
        <button type="button" class="btn btn-sm btn-ghost" data-goto="quantro://portal" style="font-size:11px;">🌌 Quantro</button>
        <button type="button" class="btn btn-sm btn-ghost" data-goto="quantro://sozluk" style="font-size:11px;">📖 Sözlük</button>
        <button type="button" class="btn btn-sm btn-ghost" data-goto="quantro://arxiv" style="font-size:11px;">📄 ArXiv</button>
        <button type="button" class="btn btn-sm btn-ghost" data-goto="https://tr.wikipedia.org" style="font-size:11px;">🌐 Vikipedi</button>
        <button type="button" class="btn btn-sm btn-ghost" data-goto="https://html.duckduckgo.com" style="font-size:11px;">🦆 DuckDuckGo</button>
        <button type="button" class="btn btn-sm btn-ghost" data-goto="https://github.com/Lennebraha38/QuantOS" style="font-size:11px;">🐙 GitHub Repo</button>
        <button type="button" class="btn btn-sm btn-ghost" data-goto="https://ui.adsabs.harvard.edu" style="font-size:11px;">🔭 NASA ADS</button>
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
    if (!raw) return 'quantro://portal';
    if (raw.startsWith('quantro://')) return raw;
    if (/^https?:\/\//i.test(raw)) return raw;

    // Etki alanı adayı (örn: wikipedia.org, github.com)
    if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/.*)?$/i.test(raw)) {
      return `https://${raw}`;
    }

    // Arama sorgusu -> DuckDuckGo HTML
    return `https://html.duckduckgo.com/html/?q=${encodeURIComponent(raw)}`;
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
            try {
              const u = new URL(tb.url);
              label = u.hostname.replace(/^www\./, '');
              if (u.pathname && u.pathname !== '/') label += u.pathname.slice(0, 12);
            } catch {
              label = tb.url.slice(0, 20);
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

    if (BUILTIN_PAGES[t.url]) {
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
    navigateTo('quantro://portal');
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
      tabs.push({ id, url: 'quantro://portal', history: ['quantro://portal'], histIdx: 0 });
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

  render();
  return {};
}
