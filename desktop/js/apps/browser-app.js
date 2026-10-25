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
    { id: 1, url: 'quantro://portal' },
    { id: 2, url: 'quantro://sozluk' },
    { id: 3, url: 'quantro://arxiv' },
  ];
  let activeId = 1;
  let seq = 4;

  container.innerHTML = `
    <div class="app-shell">
      <div class="app-tabs" id="br-tabs"></div>
      <form class="app-toolbar" id="br-nav">
        <button type="button" class="btn btn-sm" data-goto="quantro://portal">Portal</button>
        <button type="button" class="btn btn-sm" data-goto="quantro://sozluk">Sözlük</button>
        <button type="button" class="btn btn-sm" data-goto="quantro://arxiv">Literatür</button>
        <input type="text" class="input mono" id="br-url" style="flex:1;padding:5px 10px;" />
        <button type="submit" class="btn btn-sm btn-primary">Git</button>
      </form>
      <div class="app-main" id="br-view"></div>
    </div>
  `;

  const tabsEl = container.querySelector('#br-tabs');
  const urlEl = container.querySelector('#br-url');
  const viewEl = container.querySelector('#br-view');

  const cur = () => tabs.find((t) => t.id === activeId) || tabs[0];

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function parseSafeHttpUrl(raw) {
    const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function render() {
    const t = cur();
    tabsEl.innerHTML =
      tabs
        .map((tb) => {
          const label = BUILTIN_PAGES[tb.url]?.title || tb.url.replace(/^https?:\/\//, '').slice(0, 22);
          return `<button type="button" class="app-tab ${tb.id === t.id ? 'active' : ''}" data-tid="${tb.id}">${escapeHtml(label)}</button>`;
        })
        .join('') + `<button type="button" class="btn btn-sm btn-ghost" id="br-new">+ Sekme</button>`;

    urlEl.value = t.url;
    if (BUILTIN_PAGES[t.url]) {
      viewEl.innerHTML = BUILTIN_PAGES[t.url].html;
    } else {
      viewEl.innerHTML = '';
      const parsed = parseSafeHttpUrl(t.url);
      const card = document.createElement('div');
      card.className = 'panel-card';
      card.style.flex = '1';

      if (!parsed) {
        const msg = document.createElement('div');
        msg.style.fontSize = '13px';
        msg.style.color = 'var(--text-2)';
        msg.textContent = `Geçersiz veya engellenen protokol: ${t.url}. Yalnızca http://, https:// ve quantro:// adresleri desteklenir.`;
        card.appendChild(msg);
        viewEl.appendChild(card);
        return;
      }

      const header = document.createElement('div');
      header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:10px;';

      const urlSpan = document.createElement('span');
      urlSpan.className = 'mono';
      urlSpan.style.fontSize = '12px';
      urlSpan.textContent = `Harici Bağlantı: ${parsed.href}`;

      const link = document.createElement('a');
      link.className = 'btn btn-sm btn-primary';
      link.href = parsed.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Yeni Tarayıcı Sekmesinde Aç';

      header.append(urlSpan, link);

      const frame = document.createElement('iframe');
      frame.src = parsed.href;
      frame.title = 'Quantro Tarayıcı Görünümü';
      frame.style.cssText = 'flex:1;min-height:360px;border:1px solid var(--hair-strong);border-radius:10px;background:#fff;';
      frame.setAttribute('sandbox', 'allow-scripts allow-forms');
      frame.setAttribute('referrerpolicy', 'no-referrer');

      card.append(header, frame);
      viewEl.appendChild(card);
    }
  }

  container.querySelector('#br-nav').addEventListener('submit', (e) => {
    e.preventDefault();
    cur().url = urlEl.value.trim() || 'quantro://portal';
    render();
  });

  container.querySelectorAll('[data-goto]').forEach((b) =>
    b.addEventListener('click', () => {
      cur().url = b.dataset.goto;
      render();
    })
  );

  tabsEl.addEventListener('click', (e) => {
    if (e.target.closest('#br-new')) {
      const id = seq++;
      tabs.push({ id, url: 'quantro://portal' });
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
