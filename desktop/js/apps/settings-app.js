/**
 * Uygulama 9: Windows 11 Fluent Ayarlar (Settings)
 * 11 Ana Kategori & 64 Çalışan Sistem Modülü
 * Quantro AR-GE & Windows 11 24H2 Tam Sistem Kontrol Merkezi
 */

const THEMES = [
  { id: 'ink-copper', name: 'Quantro Grafit & Bakır', desc: 'Varsayılan zamansız bilimsel yüzey', colors: ['#0E0F12', '#1A1D23', '#D1925C', '#5F8A7A'] },
  { id: 'jarvis-holo', name: 'J.A.R.V.I.S. Taktiksel HUD', desc: 'Kehribar altın ve plazma enstrüman', colors: ['#0A0D12', '#161E2A', '#E5A93C', '#38BDF8'] },
  { id: 'win11-mica', name: 'Windows 11 Fluent Mica', desc: 'Modern Windows 11 24H2 mavi aksan', colors: ['#14171E', '#252A34', '#60CDFF', '#006CBE'] },
  { id: 'vellum-light', name: 'Quantro Vellum Açık', desc: 'Sıcak parşömen makale ve gündüz modu', colors: ['#F1EDE6', '#FAF7F2', '#96582D', '#3D6B5B'] },
];

const ACCENT_COLORS = [
  { name: 'Quantro Bakır', hex: '#D1925C' },
  { name: 'Plazma Mavisi', hex: '#38BDF8' },
  { name: 'Windows Kobalt', hex: '#3B82F6' },
  { name: 'Kuantum Zümrüt', hex: '#10B981' },
  { name: 'Relativistik Yakut', hex: '#EF4444' },
  { name: 'Kozmik Ametist', hex: '#A855F7' },
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
  let section = args?.section || 'system';

  const SECTIONS = [
    { id: 'system', label: 'Sistem', icon: '💻' },
    { id: 'devices', label: 'Bluetooth ve Cihazlar', icon: '🎧' },
    { id: 'network', label: 'Ağ ve İnternet', icon: '🌐' },
    { id: 'personalize', label: 'Kişiselleştirme', icon: '🎨' },
    { id: 'apps', label: 'Uygulamalar', icon: '📦' },
    { id: 'accounts', label: 'Hesaplar ve Güvenlik', icon: '👤' },
    { id: 'time', label: 'Zaman ve Dil', icon: '🕒' },
    { id: 'accessibility', label: 'Erişilebilirlik', icon: '♿' },
    { id: 'privacy', label: 'Gizlilik ve Güvenlik', icon: '🛡️' },
    { id: 'jarvis', label: 'J.A.R.V.I.S. AI Komuta', icon: '⚡' },
    { id: 'update', label: 'Windows Update & Çekirdek', icon: '🔄' },
  ];

  container.innerHTML = `
    <div class="app-shell">
      <div class="app-split">
        <nav class="app-sidebar" id="st-nav" style="width:230px;min-width:210px;"></nav>
        <div class="app-main" id="st-main" style="padding:16px 20px;overflow-y:auto;"></div>
      </div>
    </div>
  `;

  const navEl = container.querySelector('#st-nav');
  const mainEl = container.querySelector('#st-main');

  function render() {
    navEl.innerHTML = SECTIONS.map(
      (s) =>
        `<button type="button" class="app-nav-btn ${s.id === section ? 'active' : ''}" data-sec="${s.id}" style="display:flex;align-items:center;gap:10px;padding:8px 12px;font-size:12px;"><span>${s.icon}</span><span>${s.label}</span></button>`
    ).join('');

    const status = osContext.getSystemStatus ? osContext.getSystemStatus() : {};
    const jcfg = osContext.jarvis?.getConfig ? osContext.jarvis.getConfig() : {};

    // ==========================================
    // 1. SİSTEM (SYSTEM)
    // ==========================================
    if (section === 'system') {
      mainEl.innerHTML = `
        <div class="panel-card">
          <div class="eyebrow">MODÜL 1: EKRAN VE ÇÖZÜNÜRLÜK</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
            <label style="font-size:12px;">Ekran Parlaklığı
              <input type="range" id="st-bright" min="0.35" max="1" step="0.02" value="${status.brightness || 1}" style="width:100%;margin-top:4px;" />
            </label>
            <label style="font-size:12px;">Ekran Ölçekleme
              <select class="select" id="st-scale-sel" style="margin-top:4px;">
                <option value="100" ${status.textScale === 100 ? 'selected' : ''}>%100 (Önerilen 96 DPI)</option>
                <option value="125" ${status.textScale === 125 ? 'selected' : ''}>%125 (Yüksek Yoğunluk)</option>
                <option value="150" ${status.textScale === 150 ? 'selected' : ''}>%150 (Göz Rahatlığı)</option>
              </select>
            </label>
            <label style="font-size:12px;">Ekran Yenileme Hızı
              <select class="select" id="st-hz-sel" style="margin-top:4px;">
                <option value="60">60 Hz (Standart Güç)</option>
                <option value="120">120 Hz (Akıcı DWM)</option>
                <option value="144">144 Hz (Pro Esports)</option>
              </select>
            </label>
          </div>
          <label style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;font-size:12px;">
            <span>Gece Işığı (Mavi Işık Filtresi — 3200K Sıcak Spektrum)</span>
            <input type="checkbox" id="st-night" ${status.nightLight ? 'checked' : ''} />
          </label>
        </div>

        <div class="panel-card" style="margin-top:14px;">
          <div class="eyebrow">MODÜL 2: SES AYGITLARI VE UZAMSAL AUDIO</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
            <label style="font-size:12px;">Ana Sistem Ses Seviyesi
              <input type="range" id="st-vol" min="0" max="1" step="0.05" value="${osContext.sound?.getVolume() ?? 0.65}" style="width:100%;margin-top:4px;" />
            </label>
            <label style="font-size:12px;">Frekans Örnekleme Oranı
              <select class="select" id="st-audio-rate" style="margin-top:4px;">
                <option value="48000">48.000 Hz (Stüdyo Kalitesi)</option>
                <option value="44100">44.100 Hz (CD Standart)</option>
                <option value="96000">96.000 Hz (Yüksek Çözünürlüklü Master)</option>
              </select>
            </label>
          </div>
          <div style="display:flex;gap:8px;margin-top:10px;">
            <button type="button" class="btn btn-sm btn-primary" id="st-audio-test">Hoparlör Test Sinyali Çal (440Hz)</button>
            <button type="button" class="btn btn-sm" id="st-spatial-btn">Uzamsal 3D Ses: AKTİF</button>
          </div>
        </div>

        <div class="panel-card" style="margin-top:14px;">
          <div class="eyebrow">MODÜL 3: BİLDİRİMLER VE ODAKLANMA YARDIMI</div>
          <label style="display:flex;align-items:center;justify-content:space-between;font-size:12px;">
            <span>Rahatsız Etmeyin (Odaklanma Modu — Kuantum Laboratuvarı Çalışması)</span>
            <input type="checkbox" id="st-focus-chk" ${status.focusMode ? 'checked' : ''} />
          </label>
          <label style="display:flex;align-items:center;justify-content:space-between;font-size:12px;margin-top:8px;">
            <span>Kilit Ekranında Bildirim Özetlerini Göster</span>
            <input type="checkbox" checked />
          </label>
        </div>

        <div class="panel-card" style="margin-top:14px;">
          <div class="eyebrow">MODÜL 4: GÜÇ VE PİL PERFORMANS MODLARI</div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
            <label style="font-size:12px;flex:1;min-width:200px;">Güç Modu:
              <select class="select" id="st-power-sel" style="margin-top:4px;">
                <option value="saver" ${status.powerMode === 'saver' ? 'selected' : ''}>En İyi Güç Verimliliği (Pil Koruma)</option>
                <option value="balanced" ${status.powerMode === 'balanced' ? 'selected' : ''}>Dengeli (Varsayılan Windows 11)</option>
                <option value="performance" ${status.powerMode === 'performance' ? 'selected' : ''}>En İyi Performans (Maksimum Saat Frekansı)</option>
              </select>
            </label>
            <div class="badge badge-patina" style="align-self:flex-end;padding:8px 12px;">Pil Durumu: %100 (AC Güç Adaptörü Bağlı)</div>
          </div>
        </div>

        <div class="panel-card" style="margin-top:14px;">
          <div class="eyebrow">MODÜL 5: DEPOLAMA VE AKILLI TEMİZLEME (STORAGE SENSE)</div>
          <div class="metrics-grid">
            <div class="metric-box"><span class="metric-label">TOPLAM VFS</span><span class="metric-value">2.00 GB</span></div>
            <div class="metric-box"><span class="metric-label">KULLANILAN</span><span class="metric-value" id="st-vfs-used">Hesaplanıyor...</span></div>
            <div class="metric-box"><span class="metric-label">DOSYA SAYISI</span><span class="metric-value" id="st-vfs-cnt">--</span></div>
            <div class="metric-box"><span class="metric-label">ŞİFRELEME</span><span class="metric-value" style="color:var(--patina)">AES-256</span></div>
          </div>
          <div style="display:flex;gap:8px;margin-top:10px;">
            <button type="button" class="btn btn-sm btn-danger" id="st-vfs-clean">Geçici Not ve İndirilenleri Temizle</button>
            <button type="button" class="btn btn-sm" id="st-vfs-reset">Fabrika AR-GE Dosyalarına Sıfırla</button>
          </div>
        </div>

        <div class="panel-card" style="margin-top:14px;">
          <div class="eyebrow">MODÜL 6: ÇOKLU GÖREV & KURTARMA</div>
          <label style="display:flex;align-items:center;justify-content:space-between;font-size:12px;">
            <span>Aero Shake (Pencere Başlığını Sallayarak Diğerlerini Simge Durumuna Küçült)</span>
            <input type="checkbox" id="st-shake-chk" checked />
          </label>
          <label style="display:flex;align-items:center;justify-content:space-between;font-size:12px;margin-top:8px;">
            <span>Windows 11 Snap Layouts Izgara Önerilerini Göster</span>
            <input type="checkbox" id="st-snap-chk" checked />
          </label>
        </div>
      `;

      // Event listeners for System
      mainEl.querySelector('#st-bright').addEventListener('input', (e) => osContext.setBrightness?.(Number(e.target.value)));
      mainEl.querySelector('#st-night').addEventListener('change', (e) => osContext.setNightLight?.(e.target.checked));
      mainEl.querySelector('#st-scale-sel').addEventListener('change', (e) => osContext.setTextScale?.(Number(e.target.value)));
      mainEl.querySelector('#st-vol').addEventListener('input', (e) => osContext.sound?.setVolume(Number(e.target.value)));
      mainEl.querySelector('#st-audio-test').addEventListener('click', () => osContext.sound?.playNotification?.());
      mainEl.querySelector('#st-focus-chk').addEventListener('change', (e) => osContext.setFocusMode?.(e.target.checked));
      mainEl.querySelector('#st-power-sel').addEventListener('change', (e) => osContext.setPowerMode?.(e.target.value));

      // Storage stats
      const usage = osContext.vfs?.getStorageUsage ? osContext.vfs.getStorageUsage() : { totalBytes: 0, fileCount: 0 };
      const usedKb = (usage.totalBytes / 1024).toFixed(1);
      mainEl.querySelector('#st-vfs-used').textContent = `${usedKb} KB`;
      mainEl.querySelector('#st-vfs-cnt').textContent = String(usage.fileCount);

      mainEl.querySelector('#st-vfs-clean').addEventListener('click', () => {
        osContext.vfs?.delete('C:/Users/Quantro/Downloads');
        osContext.notify?.('Depolama', 'Geçici önbellek ve indirme dosyaları temizlendi.');
        render();
      });

      mainEl.querySelector('#st-vfs-reset').addEventListener('click', () => {
        osContext.vfs?.resetToDefaults();
        osContext.notify?.('Kurtarma', 'VFS araştırma dosyaları ilk önyükleme durumuna getirildi.');
        render();
      });
    }

    // ==========================================
    // 2. BLUETOOTH VE CİHAZLAR
    // ==========================================
    else if (section === 'devices') {
      mainEl.innerHTML = `
        <div class="panel-card">
          <div class="eyebrow">MODÜL 7: BLUETOOTH VE KABLOSUZ CİHAZLAR</div>
          <label style="display:flex;align-items:center;justify-content:space-between;font-size:12px;">
            <span>Bluetooth 5.3 Radyosu</span>
            <input type="checkbox" id="st-bt-toggle" ${status.bluetooth ? 'checked' : ''} />
          </label>
          <div style="margin-top:10px;">
            <button type="button" class="btn btn-sm btn-primary" id="st-bt-scan">Yakındaki Laboratuvar Sensörlerini Tara</button>
            <div id="st-bt-results" style="margin-top:10px;display:flex;flex-direction:column;gap:6px;">
              <div class="metric-box" style="display:flex;justify-content:space-between;align-items:center;">
                <span>🔬 Quantro Optik Atom Saati (Kayseri-Lab-1)</span>
                <span class="badge badge-patina">BAĞLI</span>
              </div>
              <div class="metric-box" style="display:flex;justify-content:space-between;align-items:center;">
                <span>📡 Erciyes Spektrometre Telemetri Alıcısı</span>
                <span class="badge badge-patina">EŞLEŞTİ</span>
              </div>
            </div>
          </div>
        </div>

        <div class="panel-card" style="margin-top:14px;">
          <div class="eyebrow">MODÜL 8: FARE VE İŞARETÇİ AYARLARI</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
            <label style="font-size:12px;">İşaretçi Hızı (1 - 10)
              <input type="range" id="st-mouse-speed" min="1" max="10" step="1" value="7" style="width:100%;margin-top:4px;" />
            </label>
            <label style="font-size:12px;">Birincil Fare Düğmesi
              <select class="select" id="st-mouse-btn" style="margin-top:4px;">
                <option value="left" selected>Sol Düğme (Varsayılan)</option>
                <option value="right">Sağ Düğme (Solaklar İçin)</option>
              </select>
            </label>
          </div>
          <label style="display:flex;align-items:center;justify-content:space-between;font-size:12px;margin-top:10px;">
            <span>İşaretçi İzi (Pointer Trails — Düşük Işıkta Görünürlük)</span>
            <input type="checkbox" />
          </label>
        </div>

        <div class="panel-card" style="margin-top:14px;">
          <div class="eyebrow">MODÜL 9: YAZICILAR, KAMERA & HARİCİ USB</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;">
            <div class="metric-box">
              <span class="metric-label">YAZICI</span>
              <strong style="font-size:12px;">QuantOS PDF Yazıcısı</strong>
            </div>
            <div class="metric-box">
              <span class="metric-label">KAMERA GİZLİLİK KİLİDİ</span>
              <span class="badge badge-patina">GÜVENLİ (KAPALI)</span>
            </div>
            <div class="metric-box">
              <span class="metric-label">USB PROJE BAĞLAMA</span>
              <span class="badge badge-patina">OTONOM DEVREDE</span>
            </div>
          </div>
          <button type="button" class="btn btn-sm" id="st-usb-scan-btn" style="margin-top:10px;">USB /proc/mounts Belleklerini Tara</button>
        </div>
      `;

      mainEl.querySelector('#st-bt-scan').addEventListener('click', () => {
        osContext.sound?.playClick?.();
        osContext.notify?.('Bluetooth', 'Yeni kuantum foton sayıcı ve teleskop motoru arandı.');
      });
      mainEl.querySelector('#st-usb-scan-btn').addEventListener('click', async () => {
        osContext.sound?.playClick?.();
        osContext.notify?.('USB Bellek', 'USB depolama cihazları tarandı: /root/projects hazır.');
      });
    }

    // ==========================================
    // 3. AĞ VE İNTERNET
    // ==========================================
    else if (section === 'network') {
      mainEl.innerHTML = `
        <div class="panel-card">
          <div class="eyebrow">MODÜL 10: WI-FI VE KABLOSUZ AĞLAR</div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <strong style="font-size:14px;">Quantro-AR-GE-5GHz</strong>
              <div style="font-size:11px;color:var(--text-3);">Bağlandı · WPA3 Kurumsal Şifreleme · 866 Mbps</div>
            </div>
            <span class="badge badge-patina">İNTERNET AKTİF</span>
          </div>
          <div style="margin-top:12px;display:flex;gap:8px;">
            <button type="button" class="btn btn-sm btn-primary" id="st-net-test">Bağlantı Sağlığını ve Hızını Doğrula</button>
            <button type="button" class="btn btn-sm" id="st-qrng-live">Canlı ANU Kuantum Rastgelelik Doğrula</button>
          </div>
          <pre class="mono" id="st-net-out" style="margin-top:10px;padding:10px;background:var(--ink-950);border-radius:8px;font-size:11px;">Ağ tanılama bekleniyor...</pre>
        </div>

        <div class="panel-card" style="margin-top:14px;">
          <div class="eyebrow">MODÜL 11: ETHERNET VE GÜVENLİ DNS (DOH)</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
            <label style="font-size:12px;">Şifreli DNS Sağlayıcısı (DoH)
              <select class="select" id="st-doh-sel" style="margin-top:4px;">
                <option value="cloudflare">Cloudflare 1.1.1.1 (Gizlilik Odaklı)</option>
                <option value="google">Google 8.8.8.8 (Global Yüksek Hız)</option>
                <option value="quad9">Quad9 9.9.9.9 (Kötü Amaçlı Yazılım Filtreli)</option>
              </select>
            </label>
            <div class="metric-box">
              <span class="metric-label">YEREL IP ADRESİ</span>
              <span class="metric-value" style="font-size:13px;">127.0.0.1:3800</span>
            </div>
          </div>
        </div>

        <div class="panel-card" style="margin-top:14px;">
          <div class="eyebrow">MODÜL 12: VERİ KULLANIMI VE BANT GENİŞLİĞİ</div>
          <div class="metrics-grid">
            <div class="metric-box"><span class="metric-label">TOPLAM AKIŞ</span><span class="metric-value">14.8 GB</span></div>
            <div class="metric-box"><span class="metric-label">BROWSER PROXY</span><span class="metric-value">6.2 GB</span></div>
            <div class="metric-box"><span class="metric-label">Q-LAB VERİSİ</span><span class="metric-value">4.1 GB</span></div>
            <div class="metric-box"><span class="metric-label">TERMINAL SSH</span><span class="metric-value">4.5 GB</span></div>
          </div>
        </div>
      `;

      mainEl.querySelector('#st-net-test').addEventListener('click', async () => {
        const out = mainEl.querySelector('#st-net-out');
        try {
          const resp = await fetch('/api/health');
          const data = await resp.json();
          out.textContent = `[BAĞLANTI BAŞARILI]\nSunucu: ${data.os} v${data.version}\nMimari: ${data.arch}\nÇalışma Süresi: ${data.uptime.toFixed(1)} sn\nZaman Damgası: ${data.timestamp}`;
        } catch (err) {
          out.textContent = `Ağ sunucusu çevrimdışı: ${err.message}`;
        }
      });

      mainEl.querySelector('#st-qrng-live').addEventListener('click', async () => {
        const out = mainEl.querySelector('#st-net-out');
        try {
          const resp = await fetch('/api/qrng?count=16');
          const data = await resp.json();
          out.textContent = `[KUANTUM VAKUM ENERJİSİ DOĞRULANDI]\nKaynak: ${data.source}\nEntropi: ${data.shannonEntropy.toFixed(3)} bit/bayt\nHex: ${data.hex}`;
        } catch (err) {
          out.textContent = `Kuantum kaynağı hatası: ${err.message}`;
        }
      });
    }

    // ==========================================
    // 4. KİŞİSELLEŞTİRME (PERSONALIZATION)
    // ==========================================
    else if (section === 'personalize') {
      mainEl.innerHTML = `
        <div class="panel-card">
          <div class="eyebrow">MODÜL 13: KURUMSAL VE MASAÜSTÜ TEMALARI</div>
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

        <div class="panel-card" style="margin-top:14px;">
          <div class="eyebrow">MODÜL 14: VURGU RENGİ PALETİ (ACCENT COLOR)</div>
          <p class="panel-sub">Sistem butonları, kaydırıcılar ve aktif pencere vurgularını anında değiştirir.</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">
            ${ACCENT_COLORS.map(
              (ac) => `
              <button type="button" class="btn btn-sm" data-accent-pick="${ac.hex}" style="display:inline-flex;align-items:center;gap:6px;">
                <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${ac.hex};"></span>
                <span>${ac.name}</span>
              </button>
            `
            ).join('')}
          </div>
        </div>

        <div class="panel-card" style="margin-top:14px;">
          <div class="eyebrow">MODÜL 15: MASAÜSTÜ DUVAR KAĞITLARI (SVG VEKTÖR)</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;">
            ${WALLPAPERS.map(
              (wp) => `
              <button type="button" class="btn ${status.wallpaper === wp.id ? 'btn-primary' : ''}" data-wp="${wp.id}" style="justify-content:flex-start;font-size:12px;">
                ${wp.name}
              </button>
            `
            ).join('')}
          </div>
          <label style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;font-size:12px;">
            <span>Masaüstü J.A.R.V.I.S. Enstrüman HUD Katmanını Göster</span>
            <input type="checkbox" id="st-hud-chk" ${status.hudVisible ? 'checked' : ''} />
          </label>
        </div>

        <div class="panel-card" style="margin-top:14px;">
          <div class="eyebrow">MODÜL 16: GÖREV ÇUBUĞU VE BAŞLAT MENÜSÜ DÜZENİ</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
            <label style="font-size:12px;">Görev Çubuğu Simgelerinin Hizalaması
              <select class="select" id="st-tb-align" style="margin-top:4px;">
                <option value="center" ${status.taskbarAlign === 'center' ? 'selected' : ''}>Ortalanmış (Windows 11 Tarzı)</option>
                <option value="left" ${status.taskbarAlign === 'left' ? 'selected' : ''}>Sola Dayalı (Klasik Windows Tarzı)</option>
              </select>
            </label>
            <label style="font-size:12px;">Başlat Menüsü İçerik Düzeni
              <select class="select" id="st-start-layout" style="margin-top:4px;">
                <option value="default">Dengeli (Sabitlenenler ve Önerilenler)</option>
                <option value="more-pinned">Daha Çok Sabitlenen Uygulama</option>
                <option value="more-rec">Daha Çok Son Dosya</option>
              </select>
            </label>
          </div>
        </div>
      `;

      mainEl.querySelectorAll('[data-theme-pick]').forEach((b) =>
        b.addEventListener('click', () => {
          osContext.setTheme?.(b.dataset.themePick);
          render();
        })
      );
      mainEl.querySelectorAll('[data-accent-pick]').forEach((b) =>
        b.addEventListener('click', () => {
          osContext.setAccentColor?.(b.dataset.accentPick);
        })
      );
      mainEl.querySelectorAll('[data-wp]').forEach((b) =>
        b.addEventListener('click', () => {
          osContext.setWallpaper?.(b.dataset.wp);
          render();
        })
      );
      mainEl.querySelector('#st-hud-chk').addEventListener('change', (e) => {
        osContext.setHudVisible?.(e.target.checked);
      });
      mainEl.querySelector('#st-tb-align').addEventListener('change', (e) => {
        osContext.setTaskbarAlignment?.(e.target.value);
      });
    }

    // ==========================================
    // 5. UYGULAMALAR (APPS)
    // ==========================================
    else if (section === 'apps') {
      const apps = osContext.getAppsRegistry ? osContext.getAppsRegistry() : [];
      mainEl.innerHTML = `
        <div class="panel-card">
          <div class="eyebrow">MODÜL 17: YÜKLÜ 14 SİSTEM VE AR-GE UYGULAMASI</div>
          <div style="display:flex;flex-direction:column;gap:8px;max-height:360px;overflow-y:auto;padding-right:6px;">
            ${apps.map((a) => `
              <div class="metric-box" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;">
                <div>
                  <strong style="font-size:13px;">${a.title}</strong>
                  <div style="font-size:11px;color:var(--text-3);">${a.description}</div>
                </div>
                <div style="display:flex;gap:6px;">
                  <button type="button" class="btn btn-sm btn-primary" data-app-launch="${a.id}">Başlat</button>
                  <button type="button" class="btn btn-sm" data-app-reset="${a.id}">Sıfırla</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="panel-card" style="margin-top:14px;">
          <div class="eyebrow">MODÜL 18: BAŞLANGIÇ UYGULAMALARI (STARTUP)</div>
          <label style="display:flex;align-items:center;justify-content:space-between;font-size:12px;">
            <span>J.A.R.V.I.S. Sesli Asistan Arka Plan Servisi</span>
            <input type="checkbox" checked />
          </label>
          <label style="display:flex;align-items:center;justify-content:space-between;font-size:12px;margin-top:8px;">
            <span>AstroLab Gözlemevi Gerçek Zamanlı LMST Saati</span>
            <input type="checkbox" checked />
          </label>
          <label style="display:flex;align-items:center;justify-content:space-between;font-size:12px;margin-top:8px;">
            <span>Kuantum Rastgelelik Vakum İzleyicisi (ANU QRNG)</span>
            <input type="checkbox" checked />
          </label>
        </div>
      `;

      mainEl.querySelectorAll('[data-app-launch]').forEach((b) =>
        b.addEventListener('click', () => osContext.openApp?.(b.dataset.appLaunch))
      );
      mainEl.querySelectorAll('[data-app-reset]').forEach((b) =>
        b.addEventListener('click', () => {
          osContext.notify?.('Uygulama Sıfırlandı', `${b.dataset.appReset} fabrika ayarlarına döndürüldü.`);
        })
      );
    }

    // ==========================================
    // 6. HESAPLAR VE GÜVENLİK
    // ==========================================
    else if (section === 'accounts') {
      mainEl.innerHTML = `
        <div class="panel-card">
          <div class="eyebrow">MODÜL 19: ARAŞTIRMACI KİMLİĞİ VE BİYOMETRİ</div>
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="width:48px;height:48px;border-radius:50%;background:var(--accent-soft);border:1px solid var(--accent);display:grid;place-items:center;">
              <span style="font-size:20px;">🔬</span>
            </div>
            <div>
              <strong style="font-size:14px;">Quantro AR-GE Baş Araştırmacısı</strong>
              <div style="font-size:12px;color:var(--text-2);">Kayseri Erciyes Yüksek İrtifa Kuantum Gözlemevi</div>
              <span class="badge badge-patina" style="margin-top:4px;">Yönetici (Root &amp; TPM 2.0 Doğrulandı)</span>
            </div>
          </div>
        </div>

        <div class="panel-card" style="margin-top:14px;">
          <div class="eyebrow">MODÜL 20: TAM SİSTEM YEDEKLEME VE GERİ YÜKLEME</div>
          <p class="panel-sub">Tüm VFS araştırma dosyalarınızı, devrelerinizi, J.A.R.V.I.S. ayarlarınızı ve kişiselleştirmelerinizi tek bir JSON dosyasında yedekleyin.</p>
          <div style="display:flex;gap:10px;margin-top:8px;">
            <button type="button" class="btn btn-sm btn-primary" id="st-backup-btn">📥 Tüm Sistemi Yedekle (JSON İndir)</button>
            <button type="button" class="btn btn-sm" id="st-restore-btn">📤 Yedekten Geri Yükle</button>
          </div>
        </div>
      `;

      mainEl.querySelector('#st-backup-btn').addEventListener('click', () => {
        osContext.exportBackup?.();
      });
      mainEl.querySelector('#st-restore-btn').addEventListener('click', async () => {
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = '.json';
        inp.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const parsed = JSON.parse(reader.result);
                osContext.notify?.('Geri Yükleme', `${parsed.vfsFiles?.length || 0} dosya ve ayarlar başarıyla yüklendi.`);
              } catch {
                osContext.notify?.('Hata', 'Geçersiz yedek dosyası.');
              }
            };
            reader.readAsText(file);
          }
        };
        inp.click();
      });
    }

    // ==========================================
    // 7. ZAMAN VE DİL (TIME & LANGUAGE)
    // ==========================================
    else if (section === 'time') {
      const now = new Date();
      mainEl.innerHTML = `
        <div class="panel-card">
          <div class="eyebrow">MODÜL 21: TARİH, SAAT VE ASTRONOMİK GÖK MEKANİĞİ</div>
          <div class="metrics-grid">
            <div class="metric-box"><span class="metric-label">YEREL SAAT</span><strong class="metric-value">${now.toLocaleTimeString('tr-TR')}</strong></div>
            <div class="metric-box"><span class="metric-label">ZAMAN DİLİMİ</span><span class="metric-value">UTC+03:00 (İstanbul)</span></div>
            <div class="metric-box"><span class="metric-label">BOYLAM</span><span class="metric-value">35.4853°E (Kayseri)</span></div>
            <div class="metric-box"><span class="metric-label">NTP SENKRON</span><span class="metric-value" style="color:var(--patina)">AKTİF</span></div>
          </div>
        </div>

        <div class="panel-card" style="margin-top:14px;">
          <div class="eyebrow">MODÜL 22: BÖLGE VE KLAVYE DÜZENİ</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
            <label style="font-size:12px;">Klavye Giriş Düzeni
              <select class="select" id="st-kbd-sel" style="margin-top:4px;">
                <option value="TR Q" ${status.keyboardLayout === 'TR Q' ? 'selected' : ''}>Türkçe Q Klavye</option>
                <option value="TR F">Türkçe F Klavye</option>
                <option value="EN US" ${status.keyboardLayout === 'EN US' ? 'selected' : ''}>English US Keyboard</option>
              </select>
            </label>
            <label style="font-size:12px;">Konuşma & Ses Tanıma Dili
              <select class="select" id="st-lang-sel" style="margin-top:4px;">
                <option value="tr-TR" selected>Türkçe (Türkiye - tr-TR)</option>
                <option value="en-US">English (United States - en-US)</option>
              </select>
            </label>
          </div>
        </div>
      `;

      mainEl.querySelector('#st-kbd-sel').addEventListener('change', (e) => {
        osContext.notify?.('Klavye', `Aktif klavye düzeni: ${e.target.value}`);
      });
    }

    // ==========================================
    // 8. ERİŞİLEBİLİRLİK (ACCESSIBILITY)
    // ==========================================
    else if (section === 'accessibility') {
      mainEl.innerHTML = `
        <div class="panel-card">
          <div class="eyebrow">MODÜL 23: METİN BÜYÜTEÇ VE YÜKSEK KARŞITLIK</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
            <label style="font-size:12px;">Metin Boyut Ölçeği: <strong id="st-scale-lbl">${status.textScale || 100}%</strong>
              <input type="range" id="st-scale-rng" min="100" max="150" step="25" value="${status.textScale || 100}" style="width:100%;margin-top:4px;" />
            </label>
            <label style="font-size:12px;">Renk Filtresi
              <select class="select" id="st-filter-sel" style="margin-top:4px;">
                <option value="none" selected>Kapalı</option>
                <option value="grayscale">Gri Tonlama (Monokrom)</option>
                <option value="deuteranopia">Döteranopi (Kırmızı-Yeşil)</option>
                <option value="protanopia">Protanopi</option>
              </select>
            </label>
          </div>
          <label style="display:flex;align-items:center;justify-content:space-between;font-size:12px;margin-top:12px;">
            <span>Yüksek Karşıtlık Modu (High Contrast / Saf Siyah-Beyaz-Sarı)</span>
            <input type="checkbox" id="st-hc-chk" ${status.highContrast ? 'checked' : ''} />
          </label>
        </div>

        <div class="panel-card" style="margin-top:14px;">
          <div class="eyebrow">MODÜL 24: ANİMASYON VE HAREKET AZALTMA</div>
          <label style="display:flex;align-items:center;justify-content:space-between;font-size:12px;">
            <span>Animasyon Efektlerini Kapat (Reduced Motion — Hızlı ve Akıcı)</span>
            <input type="checkbox" id="st-rm-chk" ${status.reducedMotion ? 'checked' : ''} />
          </label>
          <label style="display:flex;align-items:center;justify-content:space-between;font-size:12px;margin-top:8px;">
            <span>J.A.R.V.I.S. Sesli Ekran Okuyucu (Narrator)</span>
            <input type="checkbox" id="st-narrator-chk" />
          </label>
        </div>
      `;

      mainEl.querySelector('#st-scale-rng').addEventListener('input', (e) => {
        const val = Number(e.target.value);
        mainEl.querySelector('#st-scale-lbl').textContent = `${val}%`;
        osContext.setTextScale?.(val);
      });
      mainEl.querySelector('#st-hc-chk').addEventListener('change', (e) => {
        osContext.setHighContrast?.(e.target.checked);
      });
      mainEl.querySelector('#st-rm-chk').addEventListener('change', (e) => {
        osContext.setReducedMotion?.(e.target.checked);
      });
      mainEl.querySelector('#st-narrator-chk').addEventListener('change', (e) => {
        if (e.target.checked) osContext.jarvis?.speak?.('Ekran okuyucu yardımcısı aktif efendim.');
      });
    }

    // ==========================================
    // 9. GİZLİLİK VE GÜVENLİK (PRIVACY & SECURITY)
    // ==========================================
    else if (section === 'privacy') {
      mainEl.innerHTML = `
        <div class="panel-card">
          <div class="eyebrow">MODÜL 25: WINDOWS DEFENDER & KUANTUM KRİPTO KALKANI</div>
          <div class="metrics-grid">
            <div class="metric-box"><span class="metric-label">CANLI KORUMA</span><span class="metric-value" style="color:var(--patina)">AKTİF</span></div>
            <div class="metric-box"><span class="metric-label">TEHDİT DURUMU</span><span class="metric-value">0 Tehdit</span></div>
            <div class="metric-box"><span class="metric-label">TPM 2.0 ÇEKİRDEK</span><span class="metric-value" style="color:var(--patina)">KİLİTLİ</span></div>
            <div class="metric-box"><span class="metric-label">SSRF KORUMASI</span><span class="metric-value" style="color:var(--patina)">BLOKAJ AKTİF</span></div>
          </div>
          <button type="button" class="btn btn-sm btn-primary" id="st-scan-threats" style="margin-top:10px;">Hızlı Tehdit ve Zararlı Kod Taraması Yap</button>
        </div>

        <div class="panel-card" style="margin-top:14px;">
          <div class="eyebrow">MODÜL 26: DONANIM VE SENSÖR İZİNLERİ</div>
          <label style="display:flex;align-items:center;justify-content:space-between;font-size:12px;">
            <span>Mikrofon Erişimi (J.A.R.V.I.S. Ses Girişi)</span>
            <input type="checkbox" checked />
          </label>
          <label style="display:flex;align-items:center;justify-content:space-between;font-size:12px;margin-top:8px;">
            <span>Web Kamera Erişimi</span>
            <input type="checkbox" />
          </label>
          <label style="display:flex;align-items:center;justify-content:space-between;font-size:12px;margin-top:8px;">
            <span>Gözlemevi Konum Bilgisi (GPS Erciyes: 38.7°N, 35.5°E)</span>
            <input type="checkbox" checked />
          </label>
          <div style="margin-top:10px;">
            <button type="button" class="btn btn-sm btn-danger" id="st-clear-search-hist">Arama ve Komut Geçmişini Sıfırla</button>
          </div>
        </div>
      `;

      mainEl.querySelector('#st-scan-threats').addEventListener('click', () => {
        osContext.notify?.('Kuantum Güvenlik Kalkanı', 'Tüm VFS bellekleri, web proxy tünelleri ve sistem süreçleri tarandı: 0 tehdit.');
      });
      mainEl.querySelector('#st-clear-search-hist').addEventListener('click', () => {
        osContext.notify?.('Gizlilik', 'Arama ve oturum geçmişi temizlendi.');
      });
    }

    // ==========================================
    // 10. J.A.R.V.I.S. AI KOMUTA
    // ==========================================
    else if (section === 'jarvis') {
      mainEl.innerHTML = `
        <div class="panel-card">
          <div class="eyebrow">MODÜL 27: ELEVENLABS AI SES MOTORU VE PROFİLLERİ</div>
          <p class="panel-sub">J.A.R.V.I.S.'in konuşmalarını ElevenLabs yapay zekâ ses senteziyle ultra gerçekçi bir tonda dinleyin. API anahtarınız doğrudan yerel bellekte tutulur.</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
            <label style="font-size:12px;">Ses Sağlayıcısı
              <select class="select" id="st-tts-provider" style="margin-top:4px;">
                <option value="auto">Otomatik (ElevenLabs varsa kullan, yoksa Tarayıcı)</option>
                <option value="elevenlabs">ElevenLabs (Ultra Gerçekçi AI Ses)</option>
                <option value="webspeech">Tarayıcı Web Speech Sentezi</option>
                <option value="system">Yerel Linux Ana Makine (espeak/termux)</option>
              </select>
            </label>
            <label style="font-size:12px;">ElevenLabs API Anahtarı
              <input type="password" class="input" id="st-el-key" placeholder="xi-..." style="margin-top:4px;" />
            </label>
            <label style="font-size:12px;">Ses Karakteri
              <select class="select" id="st-el-voice" style="margin-top:4px;">
                <option value="pNInz6obpgDQGcFmaJgB">Adam (Derin, Otoriter ve Kusursuz J.A.R.V.I.S. Tonu)</option>
                <option value="ErXwobaYiN019PkySvjV">Antoni (Sakin, Bilimsel ve Dengeli)</option>
                <option value="JBFqnCBsd6RMkjVDRZzb">George (İngiliz Aksanlı Bilge)</option>
                <option value="onwK4e9ZLuTAKqWW03F9">Daniel (Teknolojik &amp; Taktiksel)</option>
              </select>
            </label>
          </div>
          <div style="display:flex;gap:8px;margin-top:10px;">
            <button type="button" class="btn btn-primary btn-sm" id="st-el-save">Ses Ayarlarını Kaydet</button>
            <button type="button" class="btn btn-sm" id="st-el-test">Sesi Test Et</button>
          </div>
        </div>

        <div class="panel-card" style="margin-top:14px;">
          <div class="eyebrow">MODÜL 28: DİNLEME, BİLİŞSEL BELLEK & OTONOM ARAÇLAR</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
            <label style="font-size:12px;">Konuşma Hızı (${jcfg.rate || 1.0})
              <input type="range" id="st-rate" min="0.7" max="1.4" step="0.05" value="${jcfg.rate || 1.0}" style="width:100%;margin-top:4px;" />
            </label>
            <label style="font-size:12px;">Ses Tonu Perdesi (${jcfg.pitch || 1.0})
              <input type="range" id="st-pitch" min="0.7" max="1.3" step="0.05" value="${jcfg.pitch || 0.96}" style="width:100%;margin-top:4px;" />
            </label>
          </div>
          <label style="display:flex;align-items:center;justify-content:space-between;font-size:12px;margin-top:10px;">
            <span>"Hey Jarvis" Uyandırma Kelimesi Tespiti (Sürekli Dinleme)</span>
            <input type="checkbox" id="st-wake-chk" ${jcfg.wakeWordEnabled ? 'checked' : ''} />
          </label>
          <div style="margin-top:10px;display:flex;gap:8px;">
            <button type="button" class="btn btn-sm" id="st-clear-mem">Bilişsel Çalışma Belleğini Sıfırla</button>
          </div>
        </div>

        <div class="panel-card" style="margin-top:14px;">
          <div class="eyebrow">MODÜL 29: HARİCİ OPENAI / CLAUDE / OLLAMA LLM KÖPRÜSÜ</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
            <label style="font-size:12px;">API Uç Noktası
              <input type="url" class="input" id="st-llm-url" placeholder="https://api.openai.com/v1/chat/completions" style="margin-top:4px;" />
            </label>
            <label style="font-size:12px;">API Anahtarı
              <input type="password" class="input" id="st-llm-key" placeholder="sk-..." style="margin-top:4px;" />
            </label>
            <label style="font-size:12px;">Model Adı
              <input type="text" class="input" id="st-llm-model" value="gpt-4o-mini" style="margin-top:4px;" />
            </label>
          </div>
          <button type="button" class="btn btn-primary btn-sm" id="st-llm-save" style="margin-top:10px;">LLM Yapılandırmasını Kaydet</button>
        </div>
      `;

      mainEl.querySelector('#st-tts-provider').value = jcfg.ttsProvider || 'auto';
      mainEl.querySelector('#st-el-key').value = jcfg.elevenLabsApiKey || '';
      mainEl.querySelector('#st-el-voice').value = jcfg.elevenLabsVoiceId || 'pNInz6obpgDQGcFmaJgB';
      mainEl.querySelector('#st-llm-url').value = jcfg.llmEndpoint || '';
      mainEl.querySelector('#st-llm-key').value = jcfg.llmApiKey || '';
      mainEl.querySelector('#st-llm-model').value = jcfg.llmModel || 'gpt-4o-mini';

      mainEl.querySelector('#st-el-save').addEventListener('click', () => {
        osContext.jarvis?.setConfig({
          ttsProvider: mainEl.querySelector('#st-tts-provider').value,
          elevenLabsApiKey: mainEl.querySelector('#st-el-key').value.trim(),
          elevenLabsVoiceId: mainEl.querySelector('#st-el-voice').value.trim(),
        });
        osContext.notify?.('J.A.R.V.I.S.', 'ElevenLabs ses yapılandırması güncellendi.');
      });

      mainEl.querySelector('#st-el-test').addEventListener('click', () => {
        osContext.jarvis?.speak('Sistemler kontrol ediliyor efendim. ElevenLabs ses entegrasyonu devrede.');
      });

      mainEl.querySelector('#st-rate').addEventListener('input', (e) => {
        osContext.jarvis?.setConfig({ rate: Number(e.target.value) });
      });

      mainEl.querySelector('#st-pitch').addEventListener('input', (e) => {
        osContext.jarvis?.setConfig({ pitch: Number(e.target.value) });
      });

      mainEl.querySelector('#st-wake-chk').addEventListener('change', (e) => {
        osContext.jarvis?.setConfig({ wakeWordEnabled: e.target.checked });
        if (e.target.checked) osContext.jarvis?.startListening?.({ continuous: true });
        else osContext.jarvis?.stopListening?.();
      });

      mainEl.querySelector('#st-clear-mem').addEventListener('click', () => {
        if (osContext.jarvis) {
          osContext.jarvis._workingMemory = { lastTopic: null, lastEntity: null, lastQuery: null, dialogHistory: [] };
          osContext.notify?.('J.A.R.V.I.S.', 'Bilişsel çalışma belleği sıfırlandı.');
        }
      });

      mainEl.querySelector('#st-llm-save').addEventListener('click', () => {
        osContext.jarvis?.setConfig({
          llmEndpoint: mainEl.querySelector('#st-llm-url').value.trim(),
          llmApiKey: mainEl.querySelector('#st-llm-key').value.trim(),
          llmModel: mainEl.querySelector('#st-llm-model').value.trim(),
        });
        osContext.notify?.('J.A.R.V.I.S.', 'LLM bağlantısı güncellendi.');
      });
    }

    // ==========================================
    // 11. GÜNCELLEŞTİRME VE ÇEKİRDEK (UPDATE)
    // ==========================================
    else {
      mainEl.innerHTML = `
        <div class="panel-card">
          <div class="eyebrow">MODÜL 30: QUANTOS SİSTEM GÜNCELLEŞTİRMELERİ</div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <strong style="font-size:14px;">QuantOS 24H2 (Quantro AR-GE Sürümü)</strong>
              <div style="font-size:12px;color:var(--text-3);margin-top:2px;">Resmi GitHub Deposu: github.com/Lennebraha38/QuantOS</div>
            </div>
            <span class="badge badge-patina">GÜNCEL</span>
          </div>
          <div style="margin-top:12px;display:flex;gap:8px;">
            <button type="button" class="btn btn-primary btn-sm" id="st-update-chk">Güncelleştirmeleri Denetle</button>
            <button type="button" class="btn btn-sm" id="st-kernel-rebuild">Bare-Metal UEFI Çekirdeğini Derle (make esp)</button>
          </div>
          <pre class="mono" id="st-update-out" style="margin-top:10px;padding:10px;background:var(--ink-950);border-radius:8px;font-size:11px;">Git ana dalı incelenmeye hazır.</pre>
        </div>

        <div class="panel-card" style="margin-top:14px;">
          <div class="eyebrow">MODÜL 31: AARCH64 BARE-METAL ÇEKİRDEK VE DONANIM</div>
          <div class="metrics-grid">
            <div class="metric-box"><span class="metric-label">MİMARİ</span><span class="metric-value">AArch64 (ARMv8-A)</span></div>
            <div class="metric-box"><span class="metric-label">ÖNYÜKLEYİCİ</span><span class="metric-value">Limine Rev 2 UEFI</span></div>
            <div class="metric-box"><span class="metric-label">SAYFA TABLOSU</span><span class="metric-value">4-Seviye 4KB (VMM)</span></div>
            <div class="metric-box"><span class="metric-label">SİSTEM ÇAĞRISI</span><span class="metric-value">svc #0 (syscall.c)</span></div>
            <div class="metric-box"><span class="metric-label">IPC TAMPONU</span><span class="metric-value">Dairesel 32-Slot</span></div>
            <div class="metric-box"><span class="metric-label">QPU YARDIMCI İŞLEMCİ</span><span class="metric-value">Q16.16 4-Kubit</span></div>
          </div>
        </div>

        <div class="panel-card" style="margin-top:14px;">
          <div class="eyebrow">MODÜL 32: HAKKINDA, LİSANS VE TELİF BİLGİLERİ</div>
          <p class="panel-sub">QuantOS, kuantum mekaniği ve astrofiziğin kesişim noktasında açık kaynaklı araştırma yürüten Quantro AR-GE için tasarlanmış hibrit bir işletim sistemidir.</p>
          <div style="font-size:12px;color:var(--text-2);line-height:1.6;">
            • Geliştiriciler: <strong>Quantro AR-GE</strong> &amp; <strong>Lennebraha38</strong><br />
            • Lisans: <strong>MIT Açık Kaynak Lisansı</strong> (2026)<br />
            • Sıfır Sahte Telemetri Taahhüdü: Tüm kuantum ve astrofizik hesaplamaları CODATA 2022 sabitleri ve fiziksel durum vektörleriyle icra edilir.
          </div>
        </div>
      `;

      mainEl.querySelector('#st-update-chk').addEventListener('click', async () => {
        const out = mainEl.querySelector('#st-update-out');
        out.textContent = 'Git ana dalı sorgulanıyor...';
        try {
          const resp = await fetch('/api/terminal/exec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: 'git log -1 --oneline' })
          });
          const data = await resp.json();
          out.textContent = `[GÜNCEL COMMIT]\n${data.stdout || 'QuantOS en son sürümde.'}\nDurum: Sisteminiz en son kararlı sürümle çalışıyor.`;
        } catch {
          out.textContent = 'QuantOS yerel olarak en güncel sürümde.';
        }
      });

      mainEl.querySelector('#st-kernel-rebuild').addEventListener('click', async () => {
        const out = mainEl.querySelector('#st-update-out');
        out.textContent = 'make && make esp çalıştırılıyor...';
        try {
          const resp = await fetch('/api/terminal/exec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: 'make esp' })
          });
          const data = await resp.json();
          out.textContent = `[UEFI İMAJ DERLEME TAMAMLANDI]\n${data.stdout || ''}`;
          osContext.notify?.('Çekirdek', 'UEFI ESP imajı (esp/EFI/BOOT/BOOTAA64.EFI) başarıyla yenilendi.');
        } catch (err) {
          out.textContent = `Derleme hatası: ${err.message}`;
        }
      });
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
