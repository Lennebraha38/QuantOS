/**
 * Uygulama 7: QuantCode Studio (IDE)
 * Sol VFS ağacı, çok sekmeli satır numaralı düzenleyici, JS çalıştırıcı, QASM simüle edici ve Vellum önizleme
 */
import { ICONS } from './icons.js';
import { QuantumCircuit, QuantumPresets } from '../engines/quantum-engine.js';
import { simulateBB84, generateQRNGBytes } from '../engines/bb84-engine.js';
import * as Astro from '../engines/astro-engine.js';

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function mountCodeApp(container, osContext, args = {}) {
  const vfs = osContext.vfs;
  const initialPath = args?.path || 'C:/Users/Quantro/Scripts/kuantum-deney.js';
  const fallbackFiles = vfs.search('', 'C:/Users/Quantro').filter((f) => f.type === 'file');
  const startFile = vfs.exists(initialPath) ? initialPath : (fallbackFiles[0]?.path || 'C:/Users/Quantro/Not.js');
  if (!vfs.exists(startFile)) {
    vfs.write(
      startFile,
      `// QuantCode Studio — Bilimsel Deney Betiği\nconst qc = QuantumPresets.bell();\nconsole.log('Bell olasılıkları:', qc.probabilities());\n`
    );
  }

  let openTabs = [{ path: startFile, content: vfs.read(startFile), dirty: false }];
  let activePath = startFile;
  let showPreview = false;

  container.innerHTML = `
    <div class="app-shell">
      <div class="app-toolbar">
        <button type="button" class="btn btn-sm btn-primary" id="cd-run">${ICONS.play} Çalıştır / Simüle Et</button>
        <button type="button" class="btn btn-sm" id="cd-save">Kaydet (Ctrl+S)</button>
        <button type="button" class="btn btn-sm" id="cd-new">+ Yeni Betik</button>
        <button type="button" class="btn btn-sm" id="cd-preview">Markdown / Vellum Önizleme</button>
      </div>

      <div class="ide-workspace">
        <aside class="app-sidebar" id="cd-tree"></aside>
        <div class="ide-editor-col">
          <div class="app-tabs" id="cd-tabs"></div>
          <div class="code-editor-pane" id="cd-pane">
            <div class="line-gutter" id="cd-gutter">1</div>
            <textarea class="code-textarea" id="cd-area" spellcheck="false" aria-label="Kod Düzenleyici"></textarea>
          </div>
          <div class="app-main vellum-surface" id="cd-md-preview" hidden></div>
          <div class="ide-console" id="cd-console">// Konsol hazır. JS betiklerini veya .qasm kuantum devrelerini doğrudan çalıştırabilirsiniz.</div>
        </div>
      </div>

      <div class="app-statusbar">
        <span id="cd-file-lbl"></span>
        <span>UTF-8 · ES Module Bilimsel Çalışma Zamanı</span>
      </div>
    </div>
  `;

  const treeEl = container.querySelector('#cd-tree');
  const tabsEl = container.querySelector('#cd-tabs');
  const gutterEl = container.querySelector('#cd-gutter');
  const areaEl = container.querySelector('#cd-area');
  const paneEl = container.querySelector('#cd-pane');
  const mdEl = container.querySelector('#cd-md-preview');
  const consoleEl = container.querySelector('#cd-console');
  const fileLbl = container.querySelector('#cd-file-lbl');

  const curTab = () => openTabs.find((t) => t.path === activePath) || openTabs[0];

  function updateGutter() {
    const lines = (areaEl.value || '').split('\n').length;
    gutterEl.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join('<br>');
  }

  function renderMarkdownLite(md) {
    return escapeHtml(md)
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>');
  }

  function render() {
    const allFiles = vfs.search('', 'C:/Users/Quantro').filter((f) => f.type === 'file');
    treeEl.innerHTML =
      `<div class="eyebrow" style="margin:4px 6px 8px;">VFS ÇALIŞMA ALANI</div>` +
      allFiles
        .map(
          (f) =>
            `<button type="button" class="app-nav-btn ${f.path === activePath ? 'active' : ''}" data-fpath="${escapeHtml(f.path)}">${ICONS.file}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(f.name)}</span></button>`
        )
        .join('');

    tabsEl.innerHTML = openTabs
      .map(
        (t) =>
          `<button type="button" class="app-tab ${t.path === activePath ? 'active' : ''}" data-tpath="${escapeHtml(t.path)}">${escapeHtml(t.path.split('/').pop())}${t.dirty ? ' •' : ''}</button>`
      )
      .join('');

    const cur = curTab();
    if (cur) {
      areaEl.value = cur.content;
      fileLbl.textContent = `${cur.path}${cur.dirty ? ' (değiştirildi)' : ''}`;
      updateGutter();
      if (showPreview) {
        paneEl.hidden = true;
        mdEl.hidden = false;
        mdEl.innerHTML = `<p>${renderMarkdownLite(cur.content)}</p>`;
      } else {
        paneEl.hidden = false;
        mdEl.hidden = true;
      }
    }
  }

  function openFile(fpath) {
    if (!vfs.exists(fpath)) return;
    let found = openTabs.find((t) => t.path === fpath);
    if (!found) {
      found = { path: fpath, content: vfs.read(fpath), dirty: false };
      openTabs.push(found);
    }
    activePath = fpath;
    render();
  }

  function saveCurrent() {
    const cur = curTab();
    if (!cur) return;
    vfs.write(cur.path, cur.content);
    cur.dirty = false;
    osContext.notify?.('QuantCode Studio', `Kaydedildi: ${cur.path}`);
    render();
  }

  areaEl.addEventListener('input', () => {
    const cur = curTab();
    if (!cur) return;
    cur.content = areaEl.value;
    cur.dirty = true;
    updateGutter();
  });

  areaEl.addEventListener('scroll', () => {
    gutterEl.scrollTop = areaEl.scrollTop;
  });

  areaEl.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveCurrent();
    }
  });

  treeEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-fpath]');
    if (btn) openFile(btn.dataset.fpath);
  });

  tabsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tpath]');
    if (btn) {
      activePath = btn.dataset.tpath;
      render();
    }
  });

  container.querySelector('#cd-save').addEventListener('click', saveCurrent);

  container.querySelector('#cd-new').addEventListener('click', async () => {
    const name = await osContext.promptModal?.('Yeni Betik / Devre', 'Dosya adı:', 'deney-2.js');
    if (!name) return;
    const p = `C:/Users/Quantro/Scripts/${name.trim()}`;
    vfs.write(p, `// ${name.trim()}\nconsole.log('QuantOS Bilimsel Çalışma Zamanı hazır');\n`);
    openFile(p);
  });

  container.querySelector('#cd-preview').addEventListener('click', () => {
    showPreview = !showPreview;
    render();
  });

  container.querySelector('#cd-run').addEventListener('click', () => {
    const cur = curTab();
    if (!cur) return;
    if (cur.path.endsWith('.qasm')) {
      osContext.openApp('qlab', { qasm: cur.content });
      consoleEl.textContent = `[QASM -> Q-Lab] ${cur.path} devresi Q-Lab simülatörüne aktarıldı.`;
      return;
    }

    const logs = [];
    const customConsole = {
      log: (...a) => logs.push(a.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(' ')),
      error: (...a) => logs.push('[HATA] ' + a.map(String).join(' ')),
    };
    try {
      // Statik ES module import satırları varsa yerleşik bağlama devretmek üzere dönüştür
      const executableSrc = cur.content.replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"]\s*;?\s*$/gm, '// [yerleşik motor bağlandı]');
      const fn = new Function(
        'console',
        'QuantumCircuit',
        'QuantumPresets',
        'simulateBB84',
        'generateQRNGBytes',
        'blackHoleMetrics',
        'cosmologyMetrics',
        'ASTRO_CONSTANTS',
        'Astro',
        'vfs',
        executableSrc
      );
      const ret = fn(
        customConsole,
        QuantumCircuit,
        QuantumPresets,
        simulateBB84,
        generateQRNGBytes,
        Astro.blackHoleMetrics,
        Astro.cosmologyMetrics,
        Astro.ASTRO_CONSTANTS,
        Astro,
        vfs
      );
      if (ret !== undefined) logs.push(`=> ${JSON.stringify(ret)}`);
      consoleEl.textContent = logs.join('\n') || '✓ Kod hatasız tamamlandı.';
    } catch (err) {
      consoleEl.textContent = `Çalışma Zamanı Hatası: ${err.message}`;
    }
  });

  render();

  return {
    onArgs(next) {
      if (next?.path) openFile(next.path);
    },
  };
}
