/**
 * QuantOS — Windows 11 Desktop Window Manager (DWM)
 * Sürükleme, 8-Yönlü Boyutlandırma, 6 Düzenlik Snap Layouts, Kenar Kenetleme ve Sanal Masaüstleri
 */
import { ICONS, getAppIcon } from './apps/icons.js';

const SNAP_GROUPS = [
  {
    cls: 'snap-g-50-50',
    zones: [
      { label: 'Sol %50', rect: [0, 0, 0.5, 1] },
      { label: 'Sağ %50', rect: [0.5, 0, 0.5, 1] },
    ],
  },
  {
    cls: 'snap-g-70-30',
    zones: [
      { label: 'Sol %68', rect: [0, 0, 0.68, 1] },
      { label: 'Sağ %32', rect: [0.68, 0, 0.32, 1] },
    ],
  },
  {
    cls: 'snap-g-3col',
    zones: [
      { label: 'Sol Sütun', rect: [0, 0, 1 / 3, 1] },
      { label: 'Orta Sütun', rect: [1 / 3, 0, 1 / 3, 1] },
      { label: 'Sağ Sütun', rect: [2 / 3, 0, 1 / 3, 1] },
    ],
  },
  {
    cls: 'snap-g-left-stack',
    zones: [
      { label: 'Sol Ana', rect: [0, 0, 0.55, 1] },
      { label: 'Sağ Üst', rect: [0.55, 0, 0.45, 0.5] },
      { label: 'Sağ Alt', rect: [0.55, 0.5, 0.45, 0.5] },
    ],
  },
  {
    cls: 'snap-g-quad',
    zones: [
      { label: 'Sol Üst', rect: [0, 0, 0.5, 0.5] },
      { label: 'Sağ Üst', rect: [0.5, 0, 0.5, 0.5] },
      { label: 'Sol Alt', rect: [0, 0.5, 0.5, 0.5] },
      { label: 'Sağ Alt', rect: [0.5, 0.5, 0.5, 0.5] },
    ],
  },
  {
    cls: 'snap-g-focus',
    zones: [
      { label: 'Sol Kenar', rect: [0, 0, 0.25, 1] },
      { label: 'Merkez Odak', rect: [0.25, 0, 0.5, 1] },
      { label: 'Sağ Kenar', rect: [0.75, 0, 0.25, 1] },
    ],
  },
];

export class WindowManager {
  constructor({ stageEl, layerEl, ghostEl, sound, onUpdate }) {
    this.stageEl = stageEl;
    this.layerEl = layerEl;
    this.ghostEl = ghostEl;
    this.sound = sound;
    this.onUpdate = onUpdate || (() => {});

    this.windows = new Map();
    this.zCounter = 100;
    this.focusedId = null;
    this.seq = 1;

    this.desktops = [
      { id: 0, name: 'Masaüstü 1: Komuta' },
      { id: 1, name: 'Masaüstü 2: Kuantum AR-GE' },
      { id: 2, name: 'Masaüstü 3: Astrofizik' },
    ];
    this.activeDesktop = 0;

    window.addEventListener('resize', () => this._handleStageResize());
  }

  stageBounds() {
    const r = this.stageEl.getBoundingClientRect();
    return { width: Math.max(480, r.width), height: Math.max(320, r.height) };
  }

  openWindow(appDef, args = {}, osContext = {}) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (this._lastOpenApp === appDef.id && now - (this._lastOpenTime || 0) < 360) {
      for (const [id, w] of this.windows) {
        if (w.appId === appDef.id && w.desktop === this.activeDesktop) {
          if (w.minimized) this.restoreWindow(id);
          this.focusWindow(id);
          return id;
        }
      }
    }
    this._lastOpenApp = appDef.id;
    this._lastOpenTime = now;

    if (appDef.singleton) {
      for (const [id, w] of this.windows) {
        if (w.appId === appDef.id && w.desktop === this.activeDesktop) {
          if (w.minimized) this.restoreWindow(id);
          this.focusWindow(id);
          if (w.instance && typeof w.instance.onArgs === 'function') {
            w.instance.onArgs(args);
          }
          return id;
        }
      }
    }

    const winId = `win-${this.seq++}`;
    const sb = this.stageBounds();
    const w = Math.min(appDef.defaultWidth || 880, sb.width - 28);
    const h = Math.min(appDef.defaultHeight || 580, sb.height - 28);
    const offset = ((this.windows.size % 6) * 26);
    const x = Math.max(12, Math.min(sb.width - w - 12, Math.round((sb.width - w) / 2 - 40 + offset)));
    const y = Math.max(12, Math.min(sb.height - h - 12, Math.round((sb.height - h) / 2 - 20 + offset)));

    const el = document.createElement('section');
    el.className = 'wm-window focused';
    el.dataset.winId = winId;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', appDef.title);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;

    el.innerHTML = `
      <header class="wm-titlebar">
        <div class="wm-title-left">
          <span class="wm-app-icon">${getAppIcon(appDef.id)}</span>
          <span class="wm-title-text">${appDef.title}</span>
        </div>
        <div class="wm-controls">
          <button type="button" class="wm-ctrl-btn" data-act="min" title="Küçült" aria-label="Küçült">${ICONS.minimize}</button>
          <button type="button" class="wm-ctrl-btn" data-act="max" title="Büyüt / Snap Düzenleri" aria-label="Büyüt">${ICONS.maximize}</button>
          <button type="button" class="wm-ctrl-btn wm-ctrl-close" data-act="close" title="Kapat" aria-label="Kapat">${ICONS.close}</button>
          <div class="snap-flyout" hidden></div>
        </div>
      </header>
      <div class="wm-body"></div>
      <div class="wm-resizer wm-r-n" data-dir="n"></div>
      <div class="wm-resizer wm-r-s" data-dir="s"></div>
      <div class="wm-resizer wm-r-e" data-dir="e"></div>
      <div class="wm-resizer wm-r-w" data-dir="w"></div>
      <div class="wm-resizer wm-r-ne" data-dir="ne"></div>
      <div class="wm-resizer wm-r-nw" data-dir="nw"></div>
      <div class="wm-resizer wm-r-se" data-dir="se"></div>
      <div class="wm-resizer wm-r-sw" data-dir="sw"></div>
    `;

    const winRecord = {
      id: winId,
      appId: appDef.id,
      title: appDef.title,
      el,
      bodyEl: el.querySelector('.wm-body'),
      desktop: this.activeDesktop,
      minimized: false,
      maximized: false,
      rect: { x, y, w, h },
      savedRect: { x, y, w, h },
      instance: null,
      createdAt: Date.now(),
    };

    this._buildSnapFlyout(winRecord);
    this._bindWindowEvents(winRecord);

    this.layerEl.appendChild(el);
    this.windows.set(winId, winRecord);
    this.focusWindow(winId);
    this.sound?.playWindowOpen?.();

    try {
      const mounted = appDef.mount(winRecord.bodyEl, osContext, args, winRecord);
      winRecord.instance = mounted || null;
    } catch (err) {
      winRecord.bodyEl.innerHTML = `<div class="app-main"><div class="panel-card"><h3 class="panel-title">Uygulama Başlatma Hatası</h3><pre class="mono">${String(err?.stack || err)}</pre></div></div>`;
    }

    this._notify();
    return winId;
  }

  _buildSnapFlyout(win) {
    const flyout = win.el.querySelector('.snap-flyout');
    flyout.innerHTML = SNAP_GROUPS.map(
      (g, gi) =>
        `<div class="snap-group ${g.cls}">${g.zones
          .map(
            (z, zi) =>
              `<button type="button" class="snap-zone" data-gi="${gi}" data-zi="${zi}" title="${z.label}" aria-label="${z.label}"></button>`
          )
          .join('')}</div>`
    ).join('');

    flyout.addEventListener('click', (e) => {
      const btn = e.target.closest('.snap-zone');
      if (!btn) return;
      e.stopPropagation();
      const g = SNAP_GROUPS[Number(btn.dataset.gi)];
      const z = g?.zones[Number(btn.dataset.zi)];
      if (z) {
        this.snapWindowToNormalizedRect(win.id, z.rect);
        flyout.hidden = true;
      }
    });
  }

  _bindWindowEvents(win) {
    const { el } = win;
    const titlebar = el.querySelector('.wm-titlebar');
    const maxBtn = el.querySelector('[data-act="max"]');
    const flyout = el.querySelector('.snap-flyout');

    el.addEventListener('pointerdown', () => this.focusWindow(win.id));

    el.querySelector('[data-act="min"]').addEventListener('click', (e) => {
      e.stopPropagation();
      this.minimizeWindow(win.id);
    });
    maxBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      flyout.hidden = true;
      this.toggleMaximize(win.id);
    });
    el.querySelector('[data-act="close"]').addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeWindow(win.id);
    });

    // Hover Snap Layouts on Maximize Button
    let hoverTimer = null;
    const showSnap = () => {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => {
        flyout.hidden = false;
      }, 260);
    };
    const hideSnap = () => {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => {
        flyout.hidden = true;
      }, 240);
    };
    maxBtn.addEventListener('pointerenter', showSnap);
    maxBtn.addEventListener('pointerleave', hideSnap);
    flyout.addEventListener('pointerenter', () => clearTimeout(hoverTimer));
    flyout.addEventListener('pointerleave', hideSnap);

    titlebar.addEventListener('dblclick', (e) => {
      if (e.target.closest('.wm-controls')) return;
      this.toggleMaximize(win.id);
    });

    // Dragging + Edge Snap
    titlebar.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('.wm-controls')) return;
      e.preventDefault();
      this.focusWindow(win.id);

      let startX = e.clientX;
      let startY = e.clientY;
      if (win.maximized) {
        const sb = this.stageBounds();
        const ratio = Math.min(0.85, Math.max(0.15, e.clientX / sb.width));
        win.maximized = false;
        el.classList.remove('maximized');
        win.rect.w = win.savedRect.w;
        win.rect.h = win.savedRect.h;
        win.rect.x = Math.round(e.clientX - win.rect.w * ratio);
        win.rect.y = Math.max(0, e.clientY - 20);
        this._applyRect(win);
      }

      const origX = win.rect.x;
      const origY = win.rect.y;
      let pendingSnap = null;
      el.classList.add('dragging');

      const onMove = (ev) => {
        const sb = this.stageBounds();
        const nx = Math.max(-win.rect.w + 90, Math.min(sb.width - 90, origX + (ev.clientX - startX)));
        const ny = Math.max(0, Math.min(sb.height - 38, origY + (ev.clientY - startY)));
        win.rect.x = nx;
        win.rect.y = ny;
        this._applyRect(win);

        // Edge snap detection
        const stageRect = this.stageEl.getBoundingClientRect();
        const rx = ev.clientX - stageRect.left;
        const ry = ev.clientY - stageRect.top;
        pendingSnap = this._detectEdgeSnap(rx, ry, sb);
        this._renderGhost(pendingSnap, sb);
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        el.classList.remove('dragging');
        this._renderGhost(null);
        if (pendingSnap) {
          if (pendingSnap.maximize) this.maximizeWindow(win.id);
          else this.snapWindowToNormalizedRect(win.id, pendingSnap.rect);
        } else {
          win.savedRect = { ...win.rect };
        }
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });

    // 8-Way Resizing
    el.querySelectorAll('.wm-resizer').forEach((handle) => {
      handle.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || win.maximized) return;
        e.preventDefault();
        e.stopPropagation();
        this.focusWindow(win.id);

        const dir = handle.dataset.dir;
        const startX = e.clientX;
        const startY = e.clientY;
        const startRect = { ...win.rect };
        el.classList.add('resizing');

        const onMove = (ev) => {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          let { x, y, w, h } = startRect;
          const minW = 340;
          const minH = 240;

          if (dir.includes('e')) w = Math.max(minW, startRect.w + dx);
          if (dir.includes('s')) h = Math.max(minH, startRect.h + dy);
          if (dir.includes('w')) {
            const nw = Math.max(minW, startRect.w - dx);
            x = startRect.x + (startRect.w - nw);
            w = nw;
          }
          if (dir.includes('n')) {
            const nh = Math.max(minH, startRect.h - dy);
            y = Math.max(0, startRect.y + (startRect.h - nh));
            h = nh;
          }
          win.rect = { x, y, w, h };
          win.savedRect = { ...win.rect };
          this._applyRect(win);
        };

        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          el.classList.remove('resizing');
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      });
    });
  }

  _detectEdgeSnap(rx, ry, sb) {
    const edge = 18;
    const corner = 72;
    if (rx <= edge && ry <= corner) return { rect: [0, 0, 0.5, 0.5] };
    if (rx >= sb.width - edge && ry <= corner) return { rect: [0.5, 0, 0.5, 0.5] };
    if (rx <= edge && ry >= sb.height - corner) return { rect: [0, 0.5, 0.5, 0.5] };
    if (rx >= sb.width - edge && ry >= sb.height - corner) return { rect: [0.5, 0.5, 0.5, 0.5] };
    if (ry <= 10) return { maximize: true, rect: [0, 0, 1, 1] };
    if (rx <= edge) return { rect: [0, 0, 0.5, 1] };
    if (rx >= sb.width - edge) return { rect: [0.5, 0, 0.5, 1] };
    return null;
  }

  _renderGhost(snap, sb) {
    if (!this.ghostEl) return;
    if (!snap) {
      this.ghostEl.hidden = true;
      return;
    }
    const [nx, ny, nw, nh] = snap.rect;
    const pad = 6;
    this.ghostEl.hidden = false;
    this.ghostEl.style.left = `${Math.round(nx * sb.width) + pad}px`;
    this.ghostEl.style.top = `${Math.round(ny * sb.height) + pad}px`;
    this.ghostEl.style.width = `${Math.round(nw * sb.width) - pad * 2}px`;
    this.ghostEl.style.height = `${Math.round(nh * sb.height) - pad * 2}px`;
  }

  snapWindowToNormalizedRect(winId, [nx, ny, nw, nh]) {
    const win = this.windows.get(winId);
    if (!win) return;
    const sb = this.stageBounds();
    const gap = 4;
    win.minimized = false;
    win.maximized = false;
    win.el.classList.remove('minimized', 'maximized');
    win.rect = {
      x: Math.round(nx * sb.width) + gap,
      y: Math.round(ny * sb.height) + gap,
      w: Math.max(320, Math.round(nw * sb.width) - gap * 2),
      h: Math.max(220, Math.round(nh * sb.height) - gap * 2),
    };
    this._applyRect(win);
    this.focusWindow(winId);
    this.sound?.playSnap?.();
    this._notify();
  }


  snapActive(dir) {
    let win = null;
    if (this.focusedId && this.windows.has(this.focusedId)) {
      win = this.windows.get(this.focusedId);
    }
    if (!win || win.minimized) {
      const open = this.getDesktopWindows().filter((w) => !w.minimized);
      if (open.length > 0) {
        win = open[open.length - 1];
        this.focusWindow(win.id);
      }
    }
    if (!win) return;

    if (dir === 'left') {
      this.snapWindowToNormalizedRect(win.id, [0, 0, 0.5, 1]);
    } else if (dir === 'right') {
      this.snapWindowToNormalizedRect(win.id, [0.5, 0, 0.5, 1]);
    } else if (dir === 'up') {
      if (!win.maximized) this.toggleMaximize(win.id);
    } else if (dir === 'down') {
      if (win.maximized) this.toggleMaximize(win.id);
      else this.minimizeWindow(win.id);
    }
  }

  snapWindows(mode = 'split-2') {
    const visible = this.getDesktopWindows().filter((w) => !w.minimized);
    if (!visible.length) return;
    if (mode === 'grid-4' || visible.length >= 3) {
      const slots = [
        [0, 0, 0.5, 0.5],
        [0.5, 0, 0.5, 0.5],
        [0, 0.5, 0.5, 0.5],
        [0.5, 0.5, 0.5, 0.5],
      ];
      visible.slice(0, 4).forEach((w, idx) => this.snapWindowToNormalizedRect(w.id, slots[idx]));
      return;
    }
    if (visible.length === 1) {
      this.snapWindowToNormalizedRect(visible[0].id, [0, 0, 0.5, 1]);
    } else {
      this.snapWindowToNormalizedRect(visible[0].id, [0, 0, 0.5, 1]);
      this.snapWindowToNormalizedRect(visible[1].id, [0.5, 0, 0.5, 1]);
    }
  }

  _applyRect(win) {
    win.el.style.left = `${win.rect.x}px`;
    win.el.style.top = `${win.rect.y}px`;
    win.el.style.width = `${win.rect.w}px`;
    win.el.style.height = `${win.rect.h}px`;
  }

  focusWindow(winId) {
    const target = this.windows.get(winId);
    if (!target) return;
    if (target.desktop !== this.activeDesktop) {
      this.switchDesktop(target.desktop);
    }
    this.focusedId = winId;
    for (const [id, w] of this.windows) {
      w.el.classList.toggle('focused', id === winId);
    }
    target.el.style.zIndex = String(++this.zCounter);
    this._notify();
  }

  minimizeWindow(winId) {
    const w = this.windows.get(winId);
    if (!w) return;
    w.minimized = true;
    w.el.classList.add('minimized');
    if (this.focusedId === winId) this.focusedId = null;
    this._notify();
  }

  restoreWindow(winId) {
    const w = this.windows.get(winId);
    if (!w) return;
    w.minimized = false;
    w.el.classList.remove('minimized');
    this.focusWindow(winId);
  }

  maximizeWindow(winId) {
    const w = this.windows.get(winId);
    if (!w) return;
    if (!w.maximized) w.savedRect = { ...w.rect };
    const sb = this.stageBounds();
    w.maximized = true;
    w.minimized = false;
    w.el.classList.remove('minimized');
    w.el.classList.add('maximized');
    w.rect = { x: 0, y: 0, w: sb.width, h: sb.height };
    this._applyRect(w);
    w.el.querySelector('[data-act="max"]').innerHTML = ICONS.restore;
    this.sound?.playSnap?.();
    this._notify();
  }

  toggleMaximize(winId) {
    const w = this.windows.get(winId);
    if (!w) return;
    if (w.maximized) {
      w.maximized = false;
      w.el.classList.remove('maximized');
      w.rect = { ...w.savedRect };
      this._applyRect(w);
      w.el.querySelector('[data-act="max"]').innerHTML = ICONS.maximize;
      this._notify();
    } else {
      this.maximizeWindow(winId);
    }
  }

  closeWindow(winId) {
    const w = this.windows.get(winId);
    if (!w) return;
    try {
      w.instance?.destroy?.();
    } catch {
      // ignore cleanup error
    }
    w.el.remove();
    this.windows.delete(winId);
    if (this.focusedId === winId) this.focusedId = null;
    this.sound?.playWindowClose?.();
    this._notify();
  }

  minimizeAll() {
    const visible = this.getDesktopWindows().filter((w) => !w.minimized);
    if (visible.length > 0) {
      visible.forEach((w) => {
        w.minimized = true;
        w.el.classList.add('minimized');
      });
      this.focusedId = null;
    } else {
      this.getDesktopWindows().forEach((w) => {
        w.minimized = false;
        w.el.classList.remove('minimized');
      });
    }
    this._notify();
  }

  switchDesktop(idx) {
    if (!this.desktops.some((d) => d.id === idx)) return;
    this.activeDesktop = idx;
    for (const w of this.windows.values()) {
      w.el.hidden = w.desktop !== idx;
    }
    this._notify();
  }

  addDesktop() {
    const id = this.desktops.length ? Math.max(...this.desktops.map((d) => d.id)) + 1 : 0;
    this.desktops.push({ id, name: `Masaüstü ${this.desktops.length + 1}: Çalışma Alanı` });
    this.switchDesktop(id);
  }

  getDesktopWindows(desktopId = this.activeDesktop) {
    return [...this.windows.values()].filter((w) => w.desktop === desktopId);
  }

  getAllWindows() {
    return [...this.windows.values()];
  }

  setWindowTitle(winId, newTitle) {
    const w = this.windows.get(winId);
    if (!w) return;
    w.title = newTitle;
    const tEl = w.el.querySelector('.wm-title-text');
    if (tEl) tEl.textContent = newTitle;
    this._notify();
  }

  _handleStageResize() {
    const sb = this.stageBounds();
    for (const w of this.windows.values()) {
      if (w.maximized) {
        w.rect = { x: 0, y: 0, w: sb.width, h: sb.height };
        this._applyRect(w);
      }
    }
  }

  _notify() {
    this.onUpdate();
  }
}
