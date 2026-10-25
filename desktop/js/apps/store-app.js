/**
 * Uygulama 14: Quantro Uygulama Merkezi (Store)
 * 14 yerleşik modülün kategorilere göre keşfi, görev çubuğuna sabitleme ve başlatma
 */
import { getAppIcon } from './icons.js';

export function mountStoreApp(container, osContext) {
  let category = 'all';

  container.innerHTML = `
    <div class="app-shell">
      <div class="app-tabs" id="str-tabs">
        <button type="button" class="app-tab active" data-cat="all">Tüm Modüller (14)</button>
        <button type="button" class="app-tab" data-cat="science">Kuantum &amp; Astrofizik AR-GE</button>
        <button type="button" class="app-tab" data-cat="system">Windows 11 Sistem &amp; Geliştirme</button>
      </div>
      <div class="app-main">
        <div class="store-grid" id="str-grid"></div>
      </div>
    </div>
  `;

  const gridEl = container.querySelector('#str-grid');

  function render() {
    const apps = osContext.getAppsRegistry();
    const pinned = new Set(osContext.getPinnedApps());
    const filtered = category === 'all' ? apps : apps.filter((a) => a.category === category);

    gridEl.innerHTML = filtered
      .map(
        (app) => `
        <div class="store-card">
          <div style="display:flex;gap:12px;align-items:flex-start;">
            <span class="desktop-icon-glyph" style="flex-shrink:0;">${getAppIcon(app.id)}</span>
            <div>
              <strong style="font-size:14px;">${app.title}</strong>
              <p class="panel-sub">${app.description}</p>
            </div>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button type="button" class="btn btn-sm" data-pin="${app.id}">
              ${pinned.has(app.id) ? 'Görev Çubuğundan Kaldır' : 'Görev Çubuğuna Sabitle'}
            </button>
            <button type="button" class="btn btn-sm btn-primary" data-launch="${app.id}">Aç</button>
          </div>
        </div>
      `
      )
      .join('');
  }

  gridEl.addEventListener('click', (e) => {
    const launchBtn = e.target.closest('[data-launch]');
    if (launchBtn) {
      osContext.openApp(launchBtn.dataset.launch);
      return;
    }
    const pinBtn = e.target.closest('[data-pin]');
    if (pinBtn) {
      osContext.togglePinApp(pinBtn.dataset.pin);
      render();
    }
  });

  container.querySelector('#str-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    category = b.dataset.cat;
    container.querySelectorAll('.app-tab').forEach((el) => el.classList.toggle('active', el === b));
    render();
  });

  render();
  return {};
}
