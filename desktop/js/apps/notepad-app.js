/**
 * Uygulama 12: Not Defteri & AR-GE Günlüğü (Çok Sekmeli Notepad + Vellum Okuma Yüzeyi)
 */

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function mountNotepadApp(container, osContext, args = {}) {
  const vfs = osContext.vfs;
  const defaultPath = args?.path || 'C:/Users/Quantro/Documents/Quantro-ARGE-Raporu.md';
  if (!vfs.exists(defaultPath)) {
    vfs.write(defaultPath, '# Quantro AR-GE Günlüğü\n\nKuantum ve astrofizik deney notları.\n');
  }

  let seq = 2;
  let tabs = [
    {
      id: 1,
      path: defaultPath,
      content: vfs.read(defaultPath),
      dirty: false,
    },
  ];
  let activeId = 1;
  let vellumMode = false;

  container.innerHTML = `
    <div class="app-shell">
      <div class="app-tabs" id="np-tabs"></div>
      <div class="app-toolbar">
        <button type="button" class="btn btn-sm btn-primary" id="np-save">Kaydet (Ctrl+S)</button>
        <button type="button" class="btn btn-sm" id="np-saveas">Farklı Kaydet</button>
        <button type="button" class="btn btn-sm" id="np-vellum">Vellum Kağıt Okuma Modu</button>
        <span class="mono" style="margin-left:auto;font-size:11px;color:var(--text-3);" id="np-path"></span>
      </div>
      <div class="app-main" id="np-wrap" style="padding:0;">
        <textarea class="code-textarea" id="np-area" style="font-family:var(--font-sans);white-space:pre-wrap;padding:18px 22px;" aria-label="Not Defteri Metin Alanı"></textarea>
        <div class="vellum-surface" id="np-preview" hidden style="margin:16px;flex:1;overflow-y:auto;"></div>
      </div>
      <div class="app-statusbar">
        <span id="np-stats">0 kelime · 0 karakter</span>
        <span>UTF-8 · Çok Sekmeli VFS Belge</span>
      </div>
    </div>
  `;

  const tabsEl = container.querySelector('#np-tabs');
  const areaEl = container.querySelector('#np-area');
  const prevEl = container.querySelector('#np-preview');
  const pathEl = container.querySelector('#np-path');
  const statsEl = container.querySelector('#np-stats');

  const cur = () => tabs.find((t) => t.id === activeId) || tabs[0];

  function renderTabs() {
    tabsEl.innerHTML =
      tabs
        .map((t) => {
          const name = t.path.split('/').pop() || t.path;
          return `<button type="button" class="app-tab ${t.id === activeId ? 'active' : ''}" data-tid="${t.id}">${escapeHtml(name)}${t.dirty ? ' •' : ''}</button>`;
        })
        .join('') + `<button type="button" class="btn btn-sm btn-ghost" id="np-new">+ Sekme</button>`;
  }

  function updateStats() {
    const t = cur();
    const txt = t.content || '';
    const words = txt.trim() ? txt.trim().split(/\s+/).length : 0;
    statsEl.textContent = `${words} kelime · ${txt.length} karakter`;
    pathEl.textContent = t.path;
  }

  function renderVellum() {
    const html = escapeHtml(cur().content)
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '</p><p>');
    prevEl.innerHTML = `<p>${html}</p>`;
  }

  function syncEditor() {
    const t = cur();
    areaEl.value = t.content;
    renderTabs();
    updateStats();
    if (vellumMode) renderVellum();
  }

  function save() {
    const t = cur();
    t.content = areaEl.value;
    vfs.write(t.path, t.content);
    t.dirty = false;
    osContext.notify?.('Not Defteri', `Kaydedildi: ${t.path}`);
    renderTabs();
    updateStats();
  }

  tabsEl.addEventListener('click', (e) => {
    if (e.target.closest('#np-new')) {
      const id = seq++;
      const p = `C:/Users/Quantro/Documents/Not-${id}.md`;
      if (!vfs.exists(p)) {
        vfs.write(p, `# Araştırma Notu ${id}\n\n`);
      }
      tabs.push({ id, path: p, content: vfs.read(p), dirty: false });
      activeId = id;
      syncEditor();
      return;
    }
    const btn = e.target.closest('[data-tid]');
    if (btn) {
      activeId = Number(btn.dataset.tid);
      syncEditor();
    }
  });

  areaEl.addEventListener('input', () => {
    const t = cur();
    t.content = areaEl.value;
    t.dirty = true;
    renderTabs();
    updateStats();
  });

  areaEl.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      save();
    }
  });

  container.querySelector('#np-save').addEventListener('click', save);

  container.querySelector('#np-saveas').addEventListener('click', async () => {
    const t = cur();
    const next = await osContext.promptModal?.('Farklı Kaydet', 'Tam VFS yolu:', t.path);
    if (!next) return;
    t.path = vfs.normalizePath(next);
    save();
  });

  container.querySelector('#np-vellum').addEventListener('click', () => {
    vellumMode = !vellumMode;
    areaEl.hidden = vellumMode;
    prevEl.hidden = !vellumMode;
    if (vellumMode) renderVellum();
  });

  syncEditor();

  return {
    onArgs(next) {
      if (next?.path && vfs.exists(next.path)) {
        const existing = tabs.find((t) => t.path === next.path);
        if (existing) {
          activeId = existing.id;
        } else {
          const id = seq++;
          tabs.push({ id, path: next.path, content: vfs.read(next.path), dirty: false });
          activeId = id;
        }
        syncEditor();
      }
    },
  };
}
