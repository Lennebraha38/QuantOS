/**
 * Uygulama 5: Windows 11 Dosya Gezgini (File Explorer)
 * Kalıcı VFS gezintisi, adres yolu, arama, yeni klasör/dosya, yeniden adlandırma, silme, kopyalama ve çift tıkla açma
 */
import { ICONS } from './icons.js';

const SIDEBAR_LOCS = [
  { label: 'Masaüstü', path: 'C:/Users/Quantro/Desktop' },
  { label: 'Belgeler', path: 'C:/Users/Quantro/Documents' },
  { label: 'Araştırmalar', path: 'C:/Users/Quantro/Research' },
  { label: 'Kuantum Devreleri', path: 'C:/Users/Quantro/Circuits' },
  { label: 'Betikler', path: 'C:/Users/Quantro/Scripts' },
  { label: 'C:\\ QuantOS Kök', path: 'C:/' },
];

export function mountExplorerApp(container, osContext, args = {}) {
  const vfs = osContext.vfs;
  let cwd = vfs.normalizePath(args?.path || 'C:/Users/Quantro');
  let selectedPath = null;
  let clipboardEntry = null;
  let searchQuery = '';

  container.innerHTML = `
    <div class="app-shell">
      <div class="app-toolbar">
        <button type="button" class="btn btn-sm" id="ex-up-btn" title="Üst Klasör">↑ Üst</button>
        <div class="breadcrumb-bar" id="ex-crumbs"></div>
        <input type="search" class="input" id="ex-search" placeholder="Bu konumda ara..." style="width:176px;padding:4px 9px;" />
      </div>
      <div class="app-toolbar" style="padding-top:6px;padding-bottom:6px;">
        <button type="button" class="btn btn-sm" id="ex-new-dir">${ICONS.plus} Yeni Klasör</button>
        <button type="button" class="btn btn-sm" id="ex-new-file">${ICONS.file} Yeni Dosya</button>
        <button type="button" class="btn btn-sm" id="ex-rename">Adlandır</button>
        <button type="button" class="btn btn-sm" id="ex-copy">Kopyala</button>
        <button type="button" class="btn btn-sm" id="ex-paste">Yapıştır</button>
        <button type="button" class="btn btn-sm btn-danger" id="ex-del">${ICONS.trash} Sil</button>
      </div>

      <div class="app-split">
        <nav class="app-sidebar" id="ex-sidebar"></nav>
        <div class="app-main">
          <div class="explorer-grid" id="ex-grid"></div>
        </div>
      </div>

      <div class="app-statusbar">
        <span id="ex-count">0 öğe</span>
        <span id="ex-storage">VFS Hazır</span>
      </div>
    </div>
  `;

  const crumbsEl = container.querySelector('#ex-crumbs');
  const sidebarEl = container.querySelector('#ex-sidebar');
  const gridEl = container.querySelector('#ex-grid');
  const countEl = container.querySelector('#ex-count');
  const storageEl = container.querySelector('#ex-storage');

  function openEntry(entry) {
    if (entry.type === 'dir') {
      cwd = entry.path;
      selectedPath = null;
      searchQuery = '';
      container.querySelector('#ex-search').value = '';
      render();
      return;
    }
    const content = vfs.read(entry.path);
    if (entry.name.endsWith('.qasm')) {
      osContext.openApp('qlab', { qasm: content, path: entry.path });
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.json')) {
      osContext.openApp('code', { path: entry.path });
    } else {
      osContext.openApp('notepad', { path: entry.path });
    }
  }

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function render() {
    if (!vfs.exists(cwd)) cwd = 'C:/Users/Quantro';

    sidebarEl.innerHTML = SIDEBAR_LOCS.map(
      (loc) =>
        `<button type="button" class="app-nav-btn ${cwd === vfs.normalizePath(loc.path) ? 'active' : ''}" data-loc="${escapeHtml(loc.path)}">${ICONS.folder}<span>${escapeHtml(loc.label)}</span></button>`
    ).join('');

    const parts = cwd.split('/').filter(Boolean);
    let acc = '';
    crumbsEl.innerHTML = parts
      .map((part, idx) => {
        acc = idx === 0 ? `${part}/` : `${acc.replace(/\/$/, '')}/${part}`;
        return `<button type="button" class="crumb-btn" data-crumb="${escapeHtml(acc)}">${escapeHtml(part)}</button>${idx < parts.length - 1 ? '<span style="color:var(--text-4);">›</span>' : ''}`;
      })
      .join('');

    const entries = searchQuery ? vfs.search(searchQuery, cwd) : vfs.list(cwd);
    if (!entries.length) {
      gridEl.innerHTML = `<div style="grid-column:1/-1;color:var(--text-3);font-size:13px;padding:18px;">Bu klasör boş.</div>`;
    } else {
      gridEl.innerHTML = entries
        .map(
          (en) => `
          <div class="explorer-tile ${selectedPath === en.path ? 'selected' : ''}" data-path="${escapeHtml(en.path)}" tabindex="0">
            <span style="color:${en.type === 'dir' ? 'var(--accent)' : 'var(--patina)'}">${en.type === 'dir' ? ICONS.folder : en.encrypted ? ICONS.lock : ICONS.file}</span>
            <span style="font-size:12px;word-break:break-word;">${escapeHtml(en.name)}${en.encrypted ? ' [AES-GCM]' : ''}</span>
            <span class="mono" style="font-size:10px;color:var(--text-3);">${en.type === 'dir' ? 'Klasör' : `${en.size || 0} B`}</span>
          </div>
        `
        )
        .join('');
    }

    const usage = vfs.getStorageUsage();
    countEl.textContent = `${entries.length} öğe · Konum: ${cwd}`;
    storageEl.textContent = `Toplam: ${usage.fileCount} dosya, ${(usage.usedBytes / 1024).toFixed(1)} KB`;
  }

  sidebarEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-loc]');
    if (!btn) return;
    cwd = vfs.normalizePath(btn.dataset.loc);
    selectedPath = null;
    searchQuery = '';
    render();
  });

  crumbsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-crumb]');
    if (!btn) return;
    cwd = vfs.normalizePath(btn.dataset.crumb);
    selectedPath = null;
    render();
  });

  gridEl.addEventListener('click', (e) => {
    const tile = e.target.closest('[data-path]');
    selectedPath = tile ? tile.dataset.path : null;
    render();
  });

  gridEl.addEventListener('dblclick', (e) => {
    const tile = e.target.closest('[data-path]');
    if (!tile) return;
    const st = vfs.stat(tile.dataset.path);
    if (st) openEntry(st);
  });

  container.querySelector('#ex-up-btn').addEventListener('click', () => {
    const clean = cwd.replace(/\/+$/, '');
    const idx = clean.lastIndexOf('/');
    if (idx > 2) {
      cwd = clean.slice(0, idx);
    } else {
      cwd = 'C:/';
    }
    selectedPath = null;
    render();
  });

  container.querySelector('#ex-search').addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    render();
  });

  container.querySelector('#ex-new-dir').addEventListener('click', async () => {
    const name = await osContext.promptModal?.('Yeni Klasör Oluştur', 'Klasör adı:', 'Yeni-Arastirma');
    if (!name) return;
    vfs.mkdir(`${cwd.replace(/\/$/, '')}/${name.trim()}`);
    render();
  });

  container.querySelector('#ex-new-file').addEventListener('click', async () => {
    const name = await osContext.promptModal?.('Yeni Dosya Oluştur', 'Dosya adı:', 'notlar.md');
    if (!name) return;
    const p = `${cwd.replace(/\/$/, '')}/${name.trim()}`;
    vfs.write(p, `# ${name.trim()}\n\nQuantro AR-GE çalışma notu.\n`);
    render();
  });

  container.querySelector('#ex-rename').addEventListener('click', async () => {
    if (!selectedPath) return;
    const st = vfs.stat(selectedPath);
    if (!st) return;
    const nextName = await osContext.promptModal?.('Yeniden Adlandır', 'Yeni ad:', st.name);
    if (!nextName || nextName === st.name) return;
    const parent = selectedPath.slice(0, selectedPath.lastIndexOf('/')) || 'C:';
    const dst = `${parent}/${nextName.trim()}`;
    vfs.rename(selectedPath, dst);
    selectedPath = dst;
    render();
  });

  container.querySelector('#ex-copy').addEventListener('click', () => {
    if (!selectedPath) return;
    clipboardEntry = selectedPath;
    osContext.notify?.('Dosya Gezgini', `Kopyalandı: ${selectedPath}`);
  });

  container.querySelector('#ex-paste').addEventListener('click', () => {
    if (!clipboardEntry || !vfs.exists(clipboardEntry)) return;
    const baseName = clipboardEntry.split('/').pop();
    const target = `${cwd.replace(/\/$/, '')}/Kopya-${baseName}`;
    vfs.copy(clipboardEntry, target);
    render();
  });

  container.querySelector('#ex-del').addEventListener('click', () => {
    if (!selectedPath) return;
    vfs.remove(selectedPath);
    selectedPath = null;
    render();
  });

  const unsub = vfs.onChange(() => render());
  render();

  return {
    onArgs(next) {
      if (next?.path) {
        cwd = vfs.normalizePath(next.path);
        render();
      }
    },
    destroy() {
      unsub?.();
    },
  };
}
