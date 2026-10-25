/**
 * Uygulama 9: Windows 11 Fluent Ayarlar (Settings)
 * 7 Kategori: Sistem, Kişiselleştirme (4 Tema + 6 Duvar Kağıdı + HUD), Ses/TTS, Ağ/QRNG, Güvenlik, J.A.R.V.I.S. AI, Hakkında
 */

const THEMES = [
  { id: 'ink-copper', name: 'Quantro Grafit & Bakır', desc: 'Varsayılan zamansız bilimsel yüzey', colors: ['#0E0F12', '#1A1D23', '#D1925C', '#5F8A7A'] },
  { id: 'jarvis-holo', name: 'J.A.R.V.I.S. Taktiksel HUD', desc: 'Kehribar altın ve plazma enstrüman', colors: ['#0A0D12', '#161E2A', '#E5A93C', '#38BDF8'] },
  { id: 'win11-mica', name: 'Windows 11 Fluent Mica', desc: 'Modern Windows 11 24H2 mavi aksan', colors: ['#14171E', '#252A34', '#60CDFF', '#006CBE'] },
  { id: 'vellum-light', name: 'Quantro Vellum Açık', desc: 'Sıcak parşömen makale ve gündüz modu', colors: ['#F1EDE6', '#FAF7F2', '#96582D', '#3D6B5B'] },
];

const WALLPAPERS = [
  { id: 'double-slit', name: 'Çift Yarık Kuantum Girişim', file: './assets/wallpapers/double-slit.svg' },
  { id: 'kayseri-sky', name: 'Kayseri Gece Gökyüzü Gözlemi', file: './assets/wallpapers/kayseri-sky.svg' },
  { id: 'kerr-geodesic', name: 'Kerr Kara Delik Jeodezikleri', file: './assets/wallpapers/kerr-geodesic.svg' },
  { id: 'jarvis-blueprint', name: 'J.A.R.V.I.S. Enstrüman Şeması', file: './assets/wallpapers/jarvis-blueprint.svg' },
  { id: 'win11-bloom-copper', name: 'QuantOS Bakır Katmanlar', file: './assets/wallpapers/win11-bloom-copper.svg' },
  { id: 'vellum-grid', name: 'Vellum Milimetrik Defter', file: './assets/wallpapers/vellum-grid.svg' },
];

export function mountSettingsApp(container, osContext, args = {}) {
  let section = args?.section || 'personalize';

  const SECTIONS = [
    { id: 'system', label: 'Sistem ve Ekran' },
    { id: 'personalize', label: 'Kişiselleştirme' },
    { id: 'audio', label: 'Ses ve J.A.R.V.I.S. TTS' },
    { id: 'network', label: 'Ağ ve Kuantum API' },
    { id: 'security', label: 'Güvenlik (TPM & BB84)' },
    { id: 'jarvis', label: 'J.A.R.V.I.S. Zekâ & LLM' },
    { id: 'about', label: 'Hakkında' },
  ];

  container.innerHTML = `
    <div class="app-shell">
      <div class="app-split">
        <nav class="app-sidebar" id="st-nav"></nav>
        <div class="app-main" id="st-main"></div>
      </div>
    </div>
  `;

  const navEl = container.querySelector('#st-nav');
  const mainEl = container.querySelector('#st-main');

  function render() {
    navEl.innerHTML = SECTIONS.map(
      (s) =>
        `<button type="button" class="app-nav-btn ${s.id === section ? 'active' : ''}" data-sec="${s.id}">${s.label}</button>`
    ).join('');

    const status = osContext.getSystemStatus();
    const jcfg = osContext.jarvis.getConfig();

    if (section === 'personalize') {
      mainEl.innerHTML = `
        <div class="panel-card">
          <div class="eyebrow">KURUMSAL VE MASAÜSTÜ TEMALARI</div>
          <div class="theme-cards-grid">
            ${THEMES.map(
              (th) => `
              <button type="button" class="theme-preview-card ${status.theme === th.id ? 'active' : ''}" data-theme-pick="${th.id}">
                <div class="theme-swatches">
                  ${th.colors.map((c) => `<span class="theme-swatch" style="background:${c}"></span>`).join('')}
                </div>
                <strong style="font-size:13px;">${th.name}</strong>
                <span style="font-size:12px;color:var(--text-2);">${th.desc}</span>
              </button>
            `
            ).join('')}
          </div>
        </div>

        <div class="panel-card">
          <div class="eyebrow">MASAÜSTÜ ARKA PLANI (SVG VEKTÖR)</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:10px;">
            ${WALLPAPERS.map(
              (wp) => `
              <button type="button" class="btn" data-wp="${wp.id}" style="justify-content:flex-start;">
                ${wp.name}
              </button>
            `
            ).join('')}
          </div>
          <label style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
            <span>Masaüstü J.A.R.V.I.S. Enstrüman HUD Panelini Göster</span>
            <input type="checkbox" id="st-hud-chk" ${status.hudVisible ? 'checked' : ''} />
          </label>
        </div>
      `;

      mainEl.querySelectorAll('[data-theme-pick]').forEach((b) =>
        b.addEventListener('click', () => {
          osContext.setTheme(b.dataset.themePick);
          render();
        })
      );
      mainEl.querySelectorAll('[data-wp]').forEach((b) =>
        b.addEventListener('click', () => osContext.setWallpaper(b.dataset.wp))
      );
      mainEl.querySelector('#st-hud-chk').addEventListener('change', (e) => {
        osContext.setHudVisible?.(e.target.checked);
      });
    } else if (section === 'system') {
      mainEl.innerHTML = `
        <div class="panel-card">
          <div class="eyebrow">EKRAN PARLAKLIĞI VE GECE IŞIĞI</div>
          <label style="font-size:13px;">Ekran Parlaklığı
            <input type="range" id="st-bright" min="0.4" max="1" step="0.02" value="${status.brightness || 1}" style="width:100%;margin-top:6px;" />
          </label>
          <label style="display:flex;align-items:center;justify-content:space-between;">
            <span>Gece Işığı (Mavi Işık Azaltma Filtresi)</span>
            <input type="checkbox" id="st-night" ${status.nightLight ? 'checked' : ''} />
          </label>
          <div style="margin-top:8px;">
            <button type="button" class="btn btn-danger btn-sm" id="st-reset-vfs">Sanal Dosya Sistemini Varsayılanlara Sıfırla</button>
          </div>
        </div>
      `;
      mainEl.querySelector('#st-bright').addEventListener('input', (e) => osContext.setBrightness?.(Number(e.target.value)));
      mainEl.querySelector('#st-night').addEventListener('change', (e) => osContext.setNightLight?.(e.target.checked));
      mainEl.querySelector('#st-reset-vfs').addEventListener('click', () => {
        osContext.vfs.resetToDefaults();
        osContext.notify?.('Ayarlar', 'VFS fabrika araştırma dosyalarına sıfırlandı.');
      });
    } else if (section === 'audio') {
      mainEl.innerHTML = `
        <div class="panel-card">
          <div class="eyebrow">SENTEZLENMİŞ HUD SESLERİ VE J.A.R.V.I.S. KONUŞMA SENTEZİ</div>
          <label style="font-size:13px;">Ana Sistem Ses Seviyesi
            <input type="range" id="st-vol" min="0" max="1" step="0.05" value="${osContext.sound.getVolume()}" style="width:100%;margin-top:6px;" />
          </label>
          <label style="font-size:13px;">J.A.R.V.I.S. Konuşma Hızı (${jcfg.rate || 1.0})
            <input type="range" id="st-rate" min="0.7" max="1.4" step="0.05" value="${jcfg.rate || 1.0}" style="width:100%;margin-top:6px;" />
          </label>
          <div>
            <button type="button" class="btn btn-primary btn-sm" id="st-tts-test">J.A.R.V.I.S. Ses Testi Çalıştır</button>
          </div>
        </div>
      `;
      mainEl.querySelector('#st-vol').addEventListener('input', (e) => osContext.sound.setVolume(Number(e.target.value)));
      mainEl.querySelector('#st-rate').addEventListener('input', (e) => osContext.jarvis.setConfig({ rate: Number(e.target.value) }));
      mainEl.querySelector('#st-tts-test').addEventListener('click', () =>
        osContext.jarvis.speak('Merhaba efendim. QuantOS ses ve kuantum telemetri alt sistemleri tam kapasiteyle çalışıyor.')
      );
    } else if (section === 'network') {
      mainEl.innerHTML = `
        <div class="panel-card">
          <div class="eyebrow">AĞ VE KUANTUM RASTGELELİK UÇ NOKTASI TANILAMA</div>
          <p class="panel-sub">Yerel Node.js arka ucu (/api/health, /api/qrng) ve ANU kuantum vakum bağlantısını doğrular.</p>
          <button type="button" class="btn btn-primary btn-sm" id="st-net-test" style="align-self:flex-start;">Bağlantıyı Test Et</button>
          <pre class="mono" id="st-net-out" style="margin:0;padding:10px;background:var(--ink-950);border-radius:8px;font-size:12px;">Test bekleniyor...</pre>
        </div>
      `;
      mainEl.querySelector('#st-net-test').addEventListener('click', async () => {
        const out = mainEl.querySelector('#st-net-out');
        try {
          const [h, q] = await Promise.all([
            fetch('/api/health').then((r) => r.json()),
            fetch('/api/qrng?count=8').then((r) => r.json()),
          ]);
          out.textContent = JSON.stringify({ health: h, qrng: q }, null, 2);
        } catch (err) {
          out.textContent = `Çevrimdışı / Statik Mod aktif (${err.message})`;
        }
      });
    } else if (section === 'security') {
      mainEl.innerHTML = `
        <div class="panel-card">
          <div class="eyebrow">QUANTOS GÜVENLİK MİMARİSİ</div>
          <div class="metrics-grid">
            <div class="metric-box"><span class="metric-label">UEFI / LIMINE</span><span class="metric-value" style="color:var(--patina)">DOĞRULANDI</span></div>
            <div class="metric-box"><span class="metric-label">TPM 2.0 PCR0–7</span><span class="metric-value" style="color:var(--patina)">AKTİF</span></div>
            <div class="metric-box"><span class="metric-label">VFS ŞİFRELEME</span><span class="metric-value">AES-256-GCM</span></div>
            <div class="metric-box"><span class="metric-label">KUANTUM ANAHTAR</span><span class="metric-value">BB84 QKD</span></div>
          </div>
          <button type="button" class="btn btn-sm" id="st-open-vault" style="align-self:flex-start;">Q-Vault Kriptografi Kasasını Aç</button>
        </div>
      `;
      mainEl.querySelector('#st-open-vault').addEventListener('click', () => osContext.openApp('qvault'));
    } else if (section === 'jarvis') {
      mainEl.innerHTML = `
        <div class="panel-card">
          <div class="eyebrow">OPSİYONEL HARİCİ OPENAI-UYUMLU LLM KÖPRÜSÜ</div>
          <p class="panel-sub">Yerleşik deterministik kuantum/astrofizik NLU her zaman çevrimdışı çalışır. Ek olarak açık uçlu sohbet için OpenAI/Ollama uyumlu bir uç nokta tanımlayabilirsiniz.</p>
          <label style="font-size:12px;">API Uç Noktası (Chat Completions URL)
            <input type="url" class="input" id="st-llm-url" placeholder="https://api.openai.com/v1/chat/completions" />
          </label>
          <label style="font-size:12px;">API Anahtarı (Yalnızca tarayıcı yerel belleğinde tutulur)
            <input type="password" class="input" id="st-llm-key" placeholder="sk-..." />
          </label>
          <label style="font-size:12px;">Model Adı
            <input type="text" class="input" id="st-llm-model" />
          </label>
          <button type="button" class="btn btn-primary btn-sm" id="st-llm-save" style="align-self:flex-start;">Kaydet</button>
        </div>
      `;
      mainEl.querySelector('#st-llm-url').value = jcfg.llmEndpoint || '';
      mainEl.querySelector('#st-llm-key').value = jcfg.llmApiKey || '';
      mainEl.querySelector('#st-llm-model').value = jcfg.llmModel || 'gpt-4o-mini';
      mainEl.querySelector('#st-llm-save').addEventListener('click', () => {
        osContext.jarvis.setConfig({
          llmEndpoint: mainEl.querySelector('#st-llm-url').value.trim(),
          llmApiKey: mainEl.querySelector('#st-llm-key').value.trim(),
          llmModel: mainEl.querySelector('#st-llm-model').value.trim(),
        });
        osContext.notify?.('J.A.R.V.I.S. Ayarları', 'LLM bağlantı yapılandırması güncellendi.');
      });
    } else {
      mainEl.innerHTML = `
        <div class="panel-card">
          <h3 class="panel-title">QuantOS 1.0 (24H2 · Quantro AR-GE Sürümü)</h3>
          <p class="panel-sub">Kuantum mekaniği ve astrofiziğin kesişim kümesinde bağımsız araştırmalar yürüten Quantro AR-GE için geliştirilmiş; Windows 11 masaüstü kompozitörü, sesli J.A.R.V.I.S. komuta çekirdeği ve AArch64 UEFI/Limine bare-metal çekirdeğini birleştiren açık kaynak işletim sistemi.</p>
          <div class="metrics-grid">
            <div class="metric-box"><span class="metric-label">GELİŞTİRİCİ</span><span class="metric-value" style="font-size:13px;">Quantro AR-GE / Lennebraha38</span></div>
            <div class="metric-label metric-box"><span class="metric-label">LİSANS</span><span class="metric-value" style="font-size:13px;">MIT Açık Kaynak</span></div>
            <div class="metric-box"><span class="metric-label">ÇEKİRDEK KATMANI</span><span class="metric-value" style="font-size:13px;">AArch64 C17 + Limine</span></div>
            <div class="metric-box"><span class="metric-label">HARİCİ BAĞIMLILIK</span><span class="metric-value" style="font-size:13px;">0 Paket</span></div>
          </div>
        </div>
      `;
    }
  }

  navEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sec]');
    if (!b) return;
    section = b.dataset.sec;
    render();
  });

  render();

  return {
    onArgs(next) {
      if (next?.section) {
        section = next.section;
        render();
      }
    },
  };
}
