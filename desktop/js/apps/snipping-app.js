/**
 * Uygulama 15: Windows 11 Ekran Alıntısı Aracı (Snipping & Capture Tool)
 * Tam ekran yakalama, çizim/vurgulama araçları, VFS kaydı ve yerel cihaza PNG indirme
 */
import { ICONS } from './icons.js';

export function mountSnippingApp(container, osContext, args = {}) {
  let activeTool = 'pen';
  let penColor = '#D1925C';
  let penSize = 3;
  let currentImage = null;

  container.innerHTML = `
    <div class="app-shell">
      <div class="app-toolbar" style="gap:8px;flex-wrap:wrap;">
        <button type="button" class="btn btn-sm btn-primary" id="snip-capture">📸 Yeni Alıntı (Ekranı Yakala)</button>
        <div style="display:inline-flex;gap:4px;align-items:center;margin-left:6px;">
          <button type="button" class="btn btn-sm ${activeTool === 'pen' ? 'active' : ''}" id="snip-pen" title="Kalem">✏️ Kalem</button>
          <button type="button" class="btn btn-sm ${activeTool === 'highlighter' ? 'active' : ''}" id="snip-high" title="Vurgulayıcı">🖍️ Vurgulayıcı</button>
          <input type="color" id="snip-color" value="${penColor}" title="Çizim Rengi" style="width:28px;height:26px;border:none;background:transparent;cursor:pointer;" />
          <button type="button" class="btn btn-sm" id="snip-clear" title="Çizimleri Temizle">🧹 Temizle</button>
        </div>
        <div style="margin-left:auto;display:inline-flex;gap:6px;">
          <button type="button" class="btn btn-sm" id="snip-copy">📋 Kopyala</button>
          <button type="button" class="btn btn-sm" id="snip-save-vfs">💾 VFS'ye Kaydet</button>
          <button type="button" class="btn btn-sm btn-primary" id="snip-download">📥 PNG İndir</button>
        </div>
      </div>

      <div class="app-main" style="padding:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:auto;background:#0A0B0E;">
        <div id="snip-empty" style="text-align:center;color:var(--text-3);padding:40px;">
          <div style="font-size:36px;margin-bottom:10px;">📸</div>
          <div style="font-size:15px;font-weight:500;color:var(--text-1);">Ekran Alıntısı Alınmadı</div>
          <div style="font-size:12px;margin-top:4px;">"Yeni Alıntı" butonuna tıklayarak veya Alt+S tuşlarına basarak ekranınızı yakalayabilirsiniz.</div>
        </div>
        <canvas id="snip-canvas" style="display:none;max-width:100%;border:1px solid var(--control-border);box-shadow:var(--window-shadow);cursor:crosshair;"></canvas>
      </div>

      <div class="app-statusbar">
        <span id="snip-status">Hazır · PNG 32-bit RGBA</span>
        <span>Windows 11 Snipping &amp; Quantro AR-GE Motoru</span>
      </div>
    </div>
  `;

  const canvas = container.querySelector('#snip-canvas');
  const emptyEl = container.querySelector('#snip-empty');
  const statusEl = container.querySelector('#snip-status');
  const ctx = canvas.getContext('2d');

  let drawing = false;

  function captureScreen() {
    const w = window.innerWidth || 1280;
    const h = window.innerHeight || 720;
    canvas.width = Math.min(1280, w);
    canvas.height = Math.min(720, h);

    // Arka plan
    ctx.fillStyle = '#0E0F12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Izgara çizgileri
    ctx.strokeStyle = 'rgba(234, 231, 225, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Pencereler katmanı
    const wins = osContext.wm ? osContext.wm.getDesktopWindows().filter((win) => !win.minimized) : [];
    wins.forEach((win) => {
      const r = win.rect;
      const rx = (r.x / w) * canvas.width;
      const ry = (r.y / h) * canvas.height;
      const rw = (r.w / w) * canvas.width;
      const rh = (r.h / h) * canvas.height;

      ctx.fillStyle = '#16191E';
      ctx.strokeStyle = '#D1925C';
      ctx.lineWidth = 1.5;
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);

      ctx.fillStyle = '#1C1F26';
      ctx.fillRect(rx, ry, rw, 24);
      ctx.fillStyle = '#EAE7E1';
      ctx.font = '11px "IBM Plex Sans", sans-serif';
      ctx.fillText(win.title, rx + 8, ry + 16);
    });

    // Alt görev çubuğu
    const tbh = 38;
    ctx.fillStyle = 'rgba(19, 21, 25, 0.96)';
    ctx.fillRect(0, canvas.height - tbh, canvas.width, tbh);
    ctx.fillStyle = '#D1925C';
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillText(`QuantOS 24H2 · ${new Date().toLocaleTimeString('tr-TR')} · Kayseri LMST`, canvas.width / 2 - 120, canvas.height - 14);

    currentImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
    emptyEl.style.display = 'none';
    canvas.style.display = 'block';
    statusEl.textContent = `Yakalama Boyutu: ${canvas.width}×${canvas.height} px · PNG`;
    osContext.sound?.playSnap?.();
    osContext.notify?.('Ekran Alıntısı', 'Masaüstü ekran görüntüsü başarıyla yakalandı.');
  }

  container.querySelector('#snip-capture').addEventListener('click', captureScreen);

  // Çizim olayları
  const getPos = (e) => {
    const r = canvas.getBoundingClientRect();
    return [
      ((e.clientX - r.left) / r.width) * canvas.width,
      ((e.clientY - r.top) / r.height) * canvas.height
    ];
  };

  canvas.addEventListener('pointerdown', (e) => {
    drawing = true;
    const [x, y] = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const [x, y] = getPos(e);
    if (activeTool === 'highlighter') {
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.35)';
      ctx.lineWidth = 14;
      ctx.lineCap = 'square';
    } else {
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penSize;
      ctx.lineCap = 'round';
    }
    ctx.lineTo(x, y);
    ctx.stroke();
  });

  canvas.addEventListener('pointerup', () => { drawing = false; });
  canvas.addEventListener('pointerleave', () => { drawing = false; });

  container.querySelector('#snip-pen').addEventListener('click', () => {
    activeTool = 'pen';
    container.querySelector('#snip-pen').classList.add('active');
    container.querySelector('#snip-high').classList.remove('active');
  });

  container.querySelector('#snip-high').addEventListener('click', () => {
    activeTool = 'highlighter';
    container.querySelector('#snip-high').classList.add('active');
    container.querySelector('#snip-pen').classList.remove('active');
  });

  container.querySelector('#snip-color').addEventListener('input', (e) => {
    penColor = e.target.value;
  });

  container.querySelector('#snip-clear').addEventListener('click', () => {
    if (currentImage) ctx.putImageData(currentImage, 0, 0);
  });

  container.querySelector('#snip-download').addEventListener('click', () => {
    if (!currentImage) {
      osContext.notify?.('Ekran Alıntısı', 'Lütfen önce bir ekran alıntısı yakalayın.');
      return;
    }
    const a = document.createElement('a');
    a.download = `QuantOS-Alinti-${Date.now().toString().slice(-4)}.png`;
    a.href = canvas.toDataURL('image/png');
    document.body.appendChild(a);
    a.click();
    a.remove();
    osContext.notify?.('Ekran Alıntısı', `Dosya indirildi: ${a.download}`);
  });

  container.querySelector('#snip-save-vfs').addEventListener('click', () => {
    if (!currentImage) {
      osContext.notify?.('Ekran Alıntısı', 'Lütfen önce bir ekran alıntısı yakalayın.');
      return;
    }
    const filename = `Ekran-Alintisi-${Date.now().toString().slice(-4)}.png`;
    const vfsPath = `C:/Users/Quantro/Pictures/${filename}`;
    if (!osContext.vfs.exists('C:/Users/Quantro/Pictures')) {
      osContext.vfs.mkdir('C:/Users/Quantro/Pictures');
    }
    osContext.vfs.write(vfsPath, canvas.toDataURL('image/png'));
    osContext.notify?.('Ekran Alıntısı', `VFS konumuna kaydedildi: ${vfsPath}`);
  });

  container.querySelector('#snip-copy').addEventListener('click', async () => {
    if (!currentImage) {
      osContext.notify?.('Ekran Alıntısı', 'Lütfen önce bir ekran alıntısı yakalayın.');
      return;
    }
    try {
      canvas.toBlob((blob) => {
        if (blob && navigator.clipboard?.write) {
          navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).catch(() => {});
        }
      });
      osContext.notify?.('Ekran Alıntısı', 'Görüntü panoya kopyalandı.');
    } catch {
      osContext.notify?.('Ekran Alıntısı', 'Panoya kopyalama tarayıcı tarafından kısıtlandı.');
    }
  });

  // Başlangıçta yakalama istenmişse
  if (args?.autoCapture) {
    setTimeout(captureScreen, 120);
  }

  return {
    onArgs(next) {
      if (next?.autoCapture) captureScreen();
    },
    destroy() {}
  };
}
