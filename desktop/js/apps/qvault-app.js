/**
 * Uygulama 4: Kuantum Kriptografi & QRNG Kasası (Q-Vault)
 * BB84 Kuantum Anahtar Dağıtımı, Canlı ANU QRNG Entropi Analizi ve AES-256-GCM VFS Şifreleme
 */
import { simulateBB84, fetchLiveQRNG, generateQRNGBytes, computeByteStats } from '../engines/bb84-engine.js';

export function mountQVaultApp(container, osContext, args = {}) {
  let activeTab = args?.tab || 'bb84';
  let eavesdrop = Boolean(args?.eavesdrop);

  container.innerHTML = `
    <div class="app-shell">
      <div class="app-tabs" id="qv-tabs">
        <button type="button" class="app-tab active" data-tab="bb84">BB84 Kuantum Anahtar Dağıtımı</button>
        <button type="button" class="app-tab" data-tab="qrng">Canlı ANU QRNG &amp; Entropi</button>
        <button type="button" class="app-tab" data-tab="aes">AES-256-GCM VFS Dosya Kasası</button>
      </div>
      <div class="app-main" id="qv-body"></div>
      <div class="app-statusbar">
        <span>Kriptografi: BB84 QBER Eşiği %11 · WebCrypto PBKDF2 + AES-256-GCM</span>
        <span id="qv-status">Güvenlik Modülü Hazır</span>
      </div>
    </div>
  `;

  const bodyEl = container.querySelector('#qv-body');
  const statusEl = container.querySelector('#qv-status');

  function renderBB84() {
    bodyEl.innerHTML = `
      <div class="panel-card">
        <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;">
          <label style="font-size:12px;">Foton Sayısı:
            <select class="select" id="bb-len" style="width:96px;display:inline-block;margin-left:6px;">
              <option value="64">64</option>
              <option value="128" selected>128</option>
              <option value="256">256</option>
            </select>
          </label>
          <label style="display:inline-flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
            <input type="checkbox" id="bb-eve" ${eavesdrop ? 'checked' : ''} />
            <span>Eve Kuantum Dinleyici (Intercept-Resend Saldırısı)</span>
          </label>
          <button type="button" class="btn btn-primary btn-sm" id="bb-run">Protokolü Çalıştır</button>
        </div>
        <div class="metrics-grid" id="bb-metrics"></div>
      </div>

      <div class="panel-card">
        <div class="eyebrow">İLK 28 FOTON POLARİZASYON VE TABAN EŞLEŞME ŞERİDİ (+ Doğrusal, × Çapraz)</div>
        <div class="bb84-strip" id="bb-strip"></div>
        <div style="font-size:12px;color:var(--text-2);">
          Üretilen Elenmiş Anahtar (Hex): <code class="mono" id="bb-hex">--</code>
        </div>
      </div>
    `;

    const run = () => {
      const length = Number(bodyEl.querySelector('#bb-len').value) || 128;
      eavesdrop = bodyEl.querySelector('#bb-eve').checked;
      const res = simulateBB84({ length, eavesdrop });

      bodyEl.querySelector('#bb-metrics').innerHTML = `
        <div class="metric-box"><span class="metric-label">GÖNDERİLEN FOTON</span><span class="metric-value">${res.length}</span></div>
        <div class="metric-box"><span class="metric-label">ELENMİŞ ANAHTAR</span><span class="metric-value">${res.siftedAlice.length} <span class="metric-unit">bit</span></span></div>
        <div class="metric-box"><span class="metric-label">QBER HATA ORANI</span><span class="metric-value">${(res.qber * 100).toFixed(1)}%</span></div>
        <div class="metric-box"><span class="metric-label">KANAL DURUMU</span><span class="metric-value" style="color:${res.secure ? 'var(--patina)' : 'var(--danger)'}">${res.secure ? 'GÜVENLİ' : 'DİNLEME TESPİT!'}</span></div>
      `;

      const siftedSet = new Set(res.siftedIndices);
      const count = Math.min(28, res.length);
      bodyEl.querySelector('#bb-strip').innerHTML = Array.from({ length: count }, (_, i) => {
        const isSifted = siftedSet.has(i);
        const mismatch = isSifted && res.aliceBits[i] !== res.bobBits[i];
        const cls = isSifted ? (mismatch ? 'bb84-col sifted-err' : 'bb84-col sifted-ok') : 'bb84-col';
        return `
          <div class="${cls}" title="Foton #${i}">
            <span>A:${res.aliceBits[i]}${res.aliceBases[i]}</span>
            <span>B:${res.bobBits[i]}${res.bobBases[i]}</span>
            <span>${isSifted ? (mismatch ? '✗' : '✓') : '·'}</span>
          </div>
        `;
      }).join('');

      bodyEl.querySelector('#bb-hex').textContent = res.keyHex || '(boş)';
      statusEl.textContent = `BB84 tamamlandı · QBER=%${(res.qber * 100).toFixed(1)} · ${res.secure ? 'Anahtar onaylandı' : 'Kanal reddedildi'}`;
    };

    bodyEl.querySelector('#bb-run').addEventListener('click', run);
    bodyEl.querySelector('#bb-eve').addEventListener('change', run);
    run();
  }

  function renderQRNG() {
    bodyEl.innerHTML = `
      <div class="panel-card">
        <div class="panel-head">
          <div>
            <div class="eyebrow">CANLI KUANTUM RASTGELELİK MOTORU (ANU VAKUM DALGALANMASI)</div>
            <p class="panel-sub">Avustralya Ulusal Üniversitesi fiziksel kuantum optik kaynağını sorgular; çevrimdışıysa CSPRNG yedeğini kaynak etiketiyle gösterir.</p>
          </div>
          <button type="button" class="btn btn-primary btn-sm" id="qr-fetch-btn">64 Kuantum Bayt Çek</button>
        </div>
        <div class="metrics-grid" id="qr-metrics"></div>
        <pre class="mono" id="qr-hex" style="margin:0;padding:12px;background:var(--ink-950);border-radius:8px;white-space:pre-wrap;word-break:break-all;font-size:12px;user-select:text;"></pre>
      </div>
    `;

    const loadBytes = async () => {
      statusEl.textContent = 'Kuantum entropi kaynağı sorgulanıyor...';
      let payload;
      try {
        payload = await fetchLiveQRNG(64);
      } catch {
        const bytes = Array.from(generateQRNGBytes(64));
        const st = computeByteStats(bytes);
        payload = { ...st, bytes, source: 'browser-webcrypto-csprng' };
      }
      bodyEl.querySelector('#qr-metrics').innerHTML = `
        <div class="metric-box"><span class="metric-label">KAYNAK (PROVENANCE)</span><span class="metric-value" style="font-size:12px;">${payload.source}</span></div>
        <div class="metric-box"><span class="metric-label">SHANNON ENTROPİ</span><span class="metric-value">${Number(payload.shannonEntropy).toFixed(3)} <span class="metric-unit">bit/B</span></span></div>
        <div class="metric-box"><span class="metric-label">ORTALAMA DEĞER</span><span class="metric-value">${Number(payload.mean).toFixed(1)} <span class="metric-unit">/ 127.5</span></span></div>
      `;
      bodyEl.querySelector('#qr-hex').textContent = payload.hex;
      statusEl.textContent = `QRNG güncellendi · Kaynak: ${payload.source}`;
    };

    bodyEl.querySelector('#qr-fetch-btn').addEventListener('click', loadBytes);
    loadBytes();
  }

  function renderAES() {
    const esc = (s) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    const files = osContext.vfs.search('', 'C:/Users/Quantro').filter((f) => f.type === 'file');
    bodyEl.innerHTML = `
      <div class="panel-card">
        <div class="eyebrow">WEBCRYPTO AES-256-GCM DOSYA ŞİFRELEME KASASI</div>
        <label style="font-size:12px;">Hedef VFS Dosyası
          <select class="select" id="aes-file" style="margin-top:4px;">
            ${files.map((f) => `<option value="${esc(f.path)}">${esc(f.path)} ${f.encrypted ? '[ŞİFRELİ]' : ''}</option>`).join('')}
          </select>
        </label>
        <label style="font-size:12px;">Parola (PBKDF2-SHA256 Anahtar Türetme)
          <input type="password" class="input" id="aes-pass" placeholder="Güçlü kasa parolası girin..." style="margin-top:4px;" />
        </label>
        <div style="display:flex;gap:8px;">
          <button type="button" class="btn btn-primary" id="aes-enc-btn">AES-256-GCM ile Şifrele</button>
          <button type="button" class="btn" id="aes-dec-btn">Şifreyi Çöz</button>
        </div>
        <div id="aes-msg" style="font-size:12px;color:var(--text-2);"></div>
      </div>
    `;

    const msgEl = bodyEl.querySelector('#aes-msg');
    bodyEl.querySelector('#aes-enc-btn').addEventListener('click', async () => {
      const fpath = bodyEl.querySelector('#aes-file').value;
      const pass = bodyEl.querySelector('#aes-pass').value;
      if (!pass) {
        msgEl.textContent = 'Lütfen şifreleme parolası girin.';
        return;
      }
      try {
        await osContext.vfs.encryptFile(fpath, pass);
        msgEl.textContent = `✓ ${fpath} gerçek AES-256-GCM ile şifrelendi.`;
        osContext.notify?.('Q-Vault', `${fpath} şifrelendi.`);
        renderAES();
      } catch (err) {
        msgEl.textContent = `Hata: ${err.message}`;
      }
    });

    bodyEl.querySelector('#aes-dec-btn').addEventListener('click', async () => {
      const fpath = bodyEl.querySelector('#aes-file').value;
      const pass = bodyEl.querySelector('#aes-pass').value;
      try {
        await osContext.vfs.decryptFile(fpath, pass);
        msgEl.textContent = `✓ ${fpath} şifresi başarıyla çözüldü.`;
        osContext.notify?.('Q-Vault', `${fpath} şifresi çözüldü.`);
        renderAES();
      } catch (err) {
        msgEl.textContent = `Şifre çözme başarısız: parola hatalı veya dosya şifreli değil (${err.message}).`;
      }
    });
  }

  function switchTab(t) {
    activeTab = t;
    container.querySelectorAll('.app-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === t));
    if (t === 'bb84') renderBB84();
    else if (t === 'qrng') renderQRNG();
    else renderAES();
  }

  container.querySelector('#qv-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (btn) switchTab(btn.dataset.tab);
  });

  switchTab(activeTab);

  return {
    onArgs(next) {
      if (typeof next?.eavesdrop === 'boolean') eavesdrop = next.eavesdrop;
      switchTab(next?.tab || activeTab);
    },
  };
}
