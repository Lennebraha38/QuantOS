/**
 * QuantOS — Ana Masaüstü Kabuğu (Windows 11 DWM + J.A.R.V.I.S. Sesli Komutan + Quantro AR-GE)
 * Önyükleme -> Kilit Ekranı -> Windows Hello -> Masaüstü, Görev Çubuğu, Sanal Masaüstleri,
 * Hızlı Ayarlar, Takvim/Bildirimler, Widget Çekmecesi, Pano Geçmişi ve Sağ Tık Bağlam Menüsü
 */
import { VirtualFileSystem } from './engines/vfs.js';
import { SoundEngine } from './engines/sound-engine.js';
import { JarvisBrain } from './engines/jarvis-brain.js';
import { siderealAndJulian } from './engines/astro-engine.js';
import { fetchLiveQRNG, generateQRNGBytes, computeByteStats } from './engines/bb84-engine.js';
import { WindowManager } from './wm.js';
import { APP_REGISTRY, APP_MAP } from './apps/registry.js';
import { ICONS, getAppIcon } from './apps/icons.js';

const WALLPAPER_MAP = {
  'double-slit': './assets/wallpapers/double-slit.svg',
  'kayseri-sky': './assets/wallpapers/kayseri-sky.svg',
  'kerr-geodesic': './assets/wallpapers/kerr-geodesic.svg',
  'jarvis-blueprint': './assets/wallpapers/jarvis-blueprint.svg',
  'win11-bloom-copper': './assets/wallpapers/win11-bloom-copper.svg',
  'vellum-grid': './assets/wallpapers/vellum-grid.svg',
};

const BOOT_STEPS = [
  '[UEFI] Limine rev.2 önyükleme protokolü doğrulandı (AArch64 / Hibrit DWM)',
  '[PMM/VMM] 4 KB sayfa ayırıcı ve 4-seviyeli adres dönüşüm tabloları aktif',
  '[SEC] TPM 2.0 PCR0–PCR7 ölçümleri ve BB84 kuantum kasa hazırlığı tamamlandı',
  '[VFS] C:/QuantOS ve C:/Users/Quantro kalıcı sanal dosya sistemi bağlandı',
  '[QPU] ℂ^(2^n) durum vektörü ve kısmi iz Bloch küresi motoru çevrimiçi',
  '[ASTRO] Kerr/Schwarzschild, Velocity-Verlet ve ΛCDM çözücüleri yüklendi',
  '[J.A.R.V.I.S.] Sesli doğal dil komuta çekirdeği ve TTS köprüsü hazır',
];

const QUICK_JARVIS_CHIPS = [
  'Bell durumu oluştur',
  '10 güneş kütleli kara delik hesapla',
  'Dinleyicili BB84 çalıştır',
  'z=1.5 kozmoloji hesapla',
  'Pencereleri yan yana diz',
  'Sistem durumunu raporla',
];

const DESKTOP_SHORTCUTS = [
  'jarvis',
  'qlab',
  'astrolab',
  'qvault',
  'explorer',
  'terminal',
  'code',
  'browser',
  'spectrum',
  'settings',
];

const bootStartMs = Date.now();
const $ = (sel) => document.querySelector(sel);

async function bootstrapQuantOS() {
  const vfs = new VirtualFileSystem();
  await vfs.init();

  const sound = new SoundEngine();

  const state = {
    theme: localStorage.getItem('quantos.theme') || 'ink-copper',
    wallpaper: localStorage.getItem('quantos.wallpaper') || 'double-slit',
    brightness: Number(localStorage.getItem('quantos.brightness') || 1),
    nightLight: localStorage.getItem('quantos.nightLight') === 'true',
    hudVisible: localStorage.getItem('quantos.hudVisible') !== 'false',
    wifi: true,
    bluetooth: true,
    airplane: false,
    keyboardLayout: 'TR Q',
    pinnedApps: JSON.parse(
      localStorage.getItem('quantos.pinned') ||
        '["qlab","astrolab","qvault","explorer","terminal","code","browser","settings"]'
    ),
    notifications: [
      {
        title: 'QuantOS 24H2 Hazır',
        body: 'Kuantum devre simülatörü, AstroLab gözlemevi ve sesli J.A.R.V.I.S. aktif.',
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      },
    ],
    clipboardHistory: [
      'OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[2];\nh q[0];\ncx q[0],q[1];',
      'Schwarzschild R_s = 2GM / c^2 (CODATA 2022)',
    ],
    calDate: new Date(),
    selectedDesktopIcon: null,
    fps: 60,
  };

  // Apply persisted visual state
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.dataset.nightlight = String(state.nightLight);
  document.documentElement.style.setProperty('--brightness', String(state.brightness));

  const wm = new WindowManager({
    stageEl: $('#desktop-stage'),
    layerEl: $('#windows-layer'),
    ghostEl: $('#snap-preview-ghost'),
    sound,
    onUpdate: () => {
      renderTaskbarApps();
      if (!$('#taskview-overlay').hidden) renderTaskView();
    },
  });

  const osContext = {
    vfs,
    sound,
    wm,
    jarvis: null,
    openApp(appId, args = {}) {
      closeAllFlyouts();
      const def = APP_MAP.get(appId);
      if (!def) {
        notify('Uygulama Bulunamadı', `"${appId}" kayıtlı değil.`);
        return null;
      }
      return wm.openWindow(def, args, osContext);
    },
    closeApp(winIdOrAppId) {
      if (wm.windows.has(winIdOrAppId)) {
        wm.closeWindow(winIdOrAppId);
        return;
      }
      for (const w of wm.getAllWindows()) {
        if (w.appId === winIdOrAppId) wm.closeWindow(w.id);
      }
    },
    minimizeAll() {
      wm.minimizeAll();
    },
    snapWindows(mode = 'split-2') {
      wm.snapWindows(mode);
    },
    setTheme(themeId) {
      const valid = ['ink-copper', 'jarvis-holo', 'win11-mica', 'vellum-light'];
      const next = valid.includes(themeId) ? themeId : 'ink-copper';
      state.theme = next;
      document.documentElement.dataset.theme = next;
      localStorage.setItem('quantos.theme', next);
      notify('Kişiselleştirme', `Aktif tema: ${next}`);
    },
    setWallpaper(wpId) {
      const url = WALLPAPER_MAP[wpId] || WALLPAPER_MAP['double-slit'];
      state.wallpaper = wpId;
      $('#desktop-root').style.backgroundImage = `url('${url}')`;
      localStorage.setItem('quantos.wallpaper', wpId);
    },
    setBrightness(val) {
      state.brightness = Math.min(1, Math.max(0.35, Number(val) || 1));
      document.documentElement.style.setProperty('--brightness', String(state.brightness));
      localStorage.setItem('quantos.brightness', String(state.brightness));
    },
    setNightLight(on) {
      state.nightLight = Boolean(on);
      document.documentElement.dataset.nightlight = String(state.nightLight);
      localStorage.setItem('quantos.nightLight', String(state.nightLight));
    },
    setHudVisible(visible) {
      state.hudVisible = Boolean(visible);
      $('#jarvis-desktop-hud').hidden = !state.hudVisible;
      localStorage.setItem('quantos.hudVisible', String(state.hudVisible));
    },
    switchDesktop(idx) {
      wm.switchDesktop(Number(idx));
      const d = wm.desktops.find((x) => x.id === wm.activeDesktop);
      if (d) $('#tb-desktop-name').textContent = d.name;
    },
    lockScreen() {
      closeAllFlyouts();
      const lock = $('#lock-screen');
      lock.hidden = false;
      lock.classList.remove('unlocked');
    },
    notify,
    copyToClipboard(text) {
      const str = String(text || '');
      if (!str) return;
      state.clipboardHistory = [str, ...state.clipboardHistory.filter((x) => x !== str)].slice(0, 15);
      navigator.clipboard?.writeText?.(str).catch(() => {});
    },
    promptModal,
    getAppsRegistry: () => APP_REGISTRY,
    getPinnedApps: () => state.pinnedApps.slice(),
    togglePinApp(appId) {
      if (state.pinnedApps.includes(appId)) {
        state.pinnedApps = state.pinnedApps.filter((x) => x !== appId);
      } else {
        state.pinnedApps.push(appId);
      }
      localStorage.setItem('quantos.pinned', JSON.stringify(state.pinnedApps));
      renderTaskbarApps();
      renderStartMenu();
    },
    getCurrentFps: () => state.fps,
    apps: APP_REGISTRY,
    getSystemStatus() {
      return {
        openWindows: wm.getAllWindows().length,
        uptimeSec: Math.round((Date.now() - bootStartMs) / 1000),
        theme: state.theme,
        wallpaper: state.wallpaper,
        brightness: state.brightness,
        nightLight: state.nightLight,
        hudVisible: state.hudVisible,
        activeDesktop: wm.activeDesktop,
      };
    },
  };

  const jarvis = new JarvisBrain({ osContext, soundEngine: sound });
  osContext.jarvis = jarvis;

  // Inject static shell icons
  $('#tb-widgets-icon').innerHTML = ICONS.widgets;
  $('#tb-search-btn').innerHTML = ICONS.search;
  $('#tb-taskview-btn').innerHTML = ICONS.taskview;
  $('#tb-jarvis-btn').innerHTML = ICONS.jarvis;
  $('#tb-quicksettings-btn').innerHTML = `${ICONS.wifi}${ICONS.volume}`;
  $('#hud-jarvis-orb').innerHTML = ICONS.jarvis;
  $('#start-search-icon').innerHTML = ICONS.search;
  $('#jarvis-cap-mic').innerHTML = ICONS.mic;

  osContext.setWallpaper(state.wallpaper);
  $('#jarvis-desktop-hud').hidden = !state.hudVisible;

  // Toast & Notification Center helper
  function notify(title, body) {
    sound.playNotification();
    const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    state.notifications.unshift({ title, body, time });
    state.notifications = state.notifications.slice(0, 25);

    const toast = document.createElement('div');
    toast.className = 'toast-card';
    toast.innerHTML = `<div class="toast-title">${escapeHtml(title)}</div><div class="toast-msg">${escapeHtml(body)}</div>`;
    $('#toast-stack').appendChild(toast);
    setTimeout(() => toast.remove(), 4200);
    if (!$('#notif-calendar-flyout').hidden) renderNotifCalendar();
  }

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function promptModal(title, label, defaultVal = '') {
    return new Promise((resolve) => {
      const root = $('#modal-root');
      root.innerHTML = `
        <div class="os-modal-backdrop">
          <form class="os-modal" id="os-modal-form">
            <h3>${escapeHtml(title)}</h3>
            <label style="font-size:12px;color:var(--text-2);">${escapeHtml(label)}
              <input type="text" class="input" id="os-modal-in" value="${escapeHtml(defaultVal)}" style="margin-top:6px;" />
            </label>
            <div class="os-modal-actions">
              <button type="button" class="btn btn-sm" id="os-modal-cancel">İptal</button>
              <button type="submit" class="btn btn-sm btn-primary">Tamam</button>
            </div>
          </form>
        </div>
      `;
      const inp = root.querySelector('#os-modal-in');
      inp.focus();
      inp.select();
      const close = (val) => {
        root.innerHTML = '';
        resolve(val);
      };
      root.querySelector('#os-modal-cancel').addEventListener('click', () => close(null));
      root.querySelector('#os-modal-form').addEventListener('submit', (e) => {
        e.preventDefault();
        close(inp.value.trim() || null);
      });
    });
  }

  // Flyouts Management
  const FLYOUT_IDS = [
    '#start-menu',
    '#search-palette',
    '#taskview-overlay',
    '#widgets-drawer',
    '#quick-settings',
    '#notif-calendar-flyout',
    '#jarvis-capsule',
    '#clipboard-flyout',
    '#context-menu',
  ];

  function closeAllFlyouts(exceptSel = null) {
    for (const sel of FLYOUT_IDS) {
      if (sel !== exceptSel) $(sel).hidden = true;
    }
    $('#power-menu').hidden = true;
  }

  function toggleFlyout(sel, onOpen) {
    const el = $(sel);
    const willOpen = el.hidden;
    closeAllFlyouts(sel);
    el.hidden = !willOpen;
    if (willOpen && onOpen) onOpen();
  }

  // Desktop Shortcuts
  function renderDesktopIcons() {
    const wrap = $('#desktop-icons');
    wrap.innerHTML = DESKTOP_SHORTCUTS.map((id) => {
      const app = APP_MAP.get(id);
      if (!app) return '';
      return `
        <button type="button" class="desktop-icon ${state.selectedDesktopIcon === id ? 'selected' : ''}" data-app="${id}" role="listitem" tabindex="0" title="${escapeHtml(app.title)}">
          <span class="desktop-icon-glyph">${getAppIcon(id)}</span>
          <span class="desktop-icon-label">${escapeHtml(app.shortTitle)}</span>
        </button>
      `;
    }).join('');
  }

  function setDesktopSelection(appId) {
    state.selectedDesktopIcon = appId;
    const icons = $('#desktop-icons').querySelectorAll('.desktop-icon');
    for (const el of icons) {
      el.classList.toggle('selected', el.dataset.app === appId);
    }
  }

  let lastLaunchTime = 0;
  let lastLaunchApp = null;

  function launchDesktopApp(appId) {
    if (!appId) return;
    const now = performance.now();
    // 500ms debounce guard prevents duplicate concurrent triggers
    if (lastLaunchApp === appId && now - lastLaunchTime < 500) {
      return;
    }
    lastLaunchTime = now;
    lastLaunchApp = appId;
    setDesktopSelection(null);
    osContext.openApp(appId);
  }

  $('#desktop-icons').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-app]');
    if (!btn) return;
    e.stopPropagation();
    setDesktopSelection(btn.dataset.app);
  });

  $('#desktop-icons').addEventListener('dblclick', (e) => {
    const btn = e.target.closest('[data-app]');
    if (!btn) return;
    e.stopPropagation();
    launchDesktopApp(btn.dataset.app);
  });

  // Dokunmatik cihazlarda çift dokunma algılayıcı
  let lastTouchTime = 0;
  let lastTouchApp = null;
  $('#desktop-icons').addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'touch') return;
    const btn = e.target.closest('[data-app]');
    if (!btn) return;
    const appId = btn.dataset.app;
    const now = performance.now();
    if (lastTouchApp === appId && now - lastTouchTime < 420) {
      lastTouchTime = 0;
      lastTouchApp = null;
      launchDesktopApp(appId);
    } else {
      lastTouchTime = now;
      lastTouchApp = appId;
    }
  });

  $('#desktop-icons').addEventListener('keydown', (e) => {
    const btn = e.target.closest('[data-app]');
    if (!btn) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      launchDesktopApp(btn.dataset.app);
    }
  });

  $('#desktop-stage').addEventListener('pointerdown', (e) => {
    if (e.target === $('#desktop-stage')) {
      closeAllFlyouts();
      if (state.selectedDesktopIcon) {
        setDesktopSelection(null);
      }
    }
  });

  // Taskbar Apps Strip
  function renderTaskbarApps() {
    const strip = $('#tb-apps-strip');
    const openByApp = new Map();
    for (const w of wm.getDesktopWindows()) {
      if (!openByApp.has(w.appId)) openByApp.set(w.appId, []);
      openByApp.get(w.appId).push(w);
    }

    const ids = [...new Set([...state.pinnedApps, ...openByApp.keys()])];
    strip.innerHTML = ids
      .map((appId) => {
        const app = APP_MAP.get(appId);
        if (!app) return '';
        const wins = openByApp.get(appId) || [];
        const isOpen = wins.length > 0;
        const isFocused = wins.some((w) => w.id === wm.focusedId && !w.minimized);
        return `
          <button type="button" class="tb-icon-btn ${isOpen ? 'is-open' : ''} ${isFocused ? 'is-focused' : ''}" data-tb-app="${appId}" title="${app.title}" aria-label="${app.title}">
            ${getAppIcon(appId)}
          </button>
        `;
      })
      .join('');
  }

  $('#tb-apps-strip').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tb-app]');
    if (!btn) return;
    const appId = btn.dataset.tbApp;
    const wins = wm.getDesktopWindows().filter((w) => w.appId === appId);
    if (!wins.length) {
      osContext.openApp(appId);
      return;
    }
    const top = wins[wins.length - 1];
    if (top.minimized) wm.restoreWindow(top.id);
    else if (wm.focusedId === top.id) wm.minimizeWindow(top.id);
    else wm.focusWindow(top.id);
  });

  // Start Menu
  function renderStartMenu(filter = '') {
    const q = filter.trim().toLocaleLowerCase('tr-TR');
    const apps = q
      ? APP_REGISTRY.filter(
          (a) =>
            a.title.toLocaleLowerCase('tr-TR').includes(q) ||
            a.description.toLocaleLowerCase('tr-TR').includes(q)
        )
      : APP_REGISTRY;

    $('#start-apps-grid').innerHTML = apps
      .map(
        (a) => `
        <button type="button" class="start-app-tile" data-start-app="${a.id}">
          <span class="start-app-glyph">${getAppIcon(a.id)}</span>
          <span class="start-app-label">${a.shortTitle}</span>
        </button>
      `
      )
      .join('');

    const recFiles = vfs
      .search(q, 'C:/Users/Quantro')
      .filter((f) => f.type === 'file')
      .slice(0, 6);
    $('#start-rec-list').innerHTML = recFiles
      .map(
        (f) => `
        <button type="button" class="start-rec-item" data-rec-path="${escapeHtml(f.path)}">
          <span style="color:var(--accent);">${ICONS.file}</span>
          <div class="start-rec-meta">
            <div class="start-rec-name">${escapeHtml(f.name)}</div>
            <div class="start-rec-path">${escapeHtml(f.path)}</div>
          </div>
        </button>
      `
      )
      .join('');
  }

  $('#tb-start-btn').addEventListener('click', () => {
    toggleFlyout('#start-menu', () => {
      $('#start-search-input').value = '';
      renderStartMenu('');
      $('#start-search-input').focus();
    });
  });

  $('#start-search-input').addEventListener('input', (e) => renderStartMenu(e.target.value));
  $('#start-open-store-btn').addEventListener('click', () => osContext.openApp('store'));
  $('#start-open-explorer-btn').addEventListener('click', () => osContext.openApp('explorer'));

  $('#start-apps-grid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-start-app]');
    if (b) osContext.openApp(b.dataset.startApp);
  });

  $('#start-rec-list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-rec-path]');
    if (!b) return;
    const p = b.dataset.recPath;
    if (p.endsWith('.qasm')) osContext.openApp('qlab', { qasm: vfs.read(p) });
    else if (p.endsWith('.js')) osContext.openApp('code', { path: p });
    else osContext.openApp('notepad', { path: p });
  });

  $('#start-power-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    $('#power-menu').hidden = !$('#power-menu').hidden;
  });

  $('#power-menu').addEventListener('click', (e) => {
    const b = e.target.closest('[data-power]');
    if (!b) return;
    const act = b.dataset.power;
    if (act === 'lock' || act === 'sleep') osContext.lockScreen();
    else if (act === 'restart') window.location.reload();
    else if (act === 'shutdown') {
      closeAllFlyouts();
      const screen = document.createElement('div');
      screen.className = 'boot-screen';
      const card = document.createElement('div');
      card.className = 'boot-card';
      card.style.cssText = 'text-align:center;align-items:center;';
      const logo = document.createElement('img');
      logo.src = './assets/quantro-mark.svg';
      logo.alt = '';
      logo.style.cssText = 'width:52px;height:52px;';
      const title = document.createElement('h1');
      title.className = 'serif';
      title.style.fontWeight = '400';
      title.textContent = 'QuantOS Güvenli Şekilde Kapatıldı';
      const rebootBtn = document.createElement('button');
      rebootBtn.type = 'button';
      rebootBtn.className = 'btn btn-primary';
      rebootBtn.textContent = 'Sistemi Yeniden Önyükle';
      rebootBtn.addEventListener('click', () => window.location.reload());
      card.append(logo, title, rebootBtn);
      screen.appendChild(card);
      document.body.replaceChildren(screen);
    }
  });

  // Global Search Palette (Ctrl+K)
  function tryEvalMath(expr) {
    const clean = expr.trim().toLowerCase();
    if (!clean || clean.length < 2) return null;
    if (!/^[0-9+\-*/().,\s^e|pi|tau|sqrt|sin|cos|tan|log|abs|c|g|hbar|m_sun]+$/i.test(clean)) return null;
    if (!/[0-9]/.test(clean)) return null;
    try {
      let replaced = clean
        .replace(/\^/g, '**')
        .replace(/\bpi\b/g, String(Math.PI))
        .replace(/\btau\b/g, String(Math.PI * 2))
        .replace(/\be\b/g, String(Math.E))
        .replace(/\bc\b/g, '299792458')
        .replace(/\bg\b/g, '6.6743e-11')
        .replace(/\bm_sun\b/g, '1.98847e30')
        .replace(/\bsqrt\(/g, 'Math.sqrt(')
        .replace(/\bsin\(/g, 'Math.sin(')
        .replace(/\bcos\(/g, 'Math.cos(')
        .replace(/\btan\(/g, 'Math.tan(')
        .replace(/\blog\(/g, 'Math.log10(')
        .replace(/\babs\(/g, 'Math.abs(');

      if (/^[0-9+\-*/().\s*Math\.sqrt|sin|cos|tan|log10|abs]+$/.test(replaced)) {
        const fn = new Function(`"use strict"; return (${replaced});`);
        const val = fn();
        if (typeof val === 'number' && Number.isFinite(val)) return val;
      }
    } catch {}
    return null;
  }

  function renderGlobalSearch(query = '') {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    const mathVal = q ? tryEvalMath(query) : null;

    const appMatches = APP_REGISTRY.filter(
      (a) => !q || a.title.toLocaleLowerCase('tr-TR').includes(q) || a.id.includes(q)
    ).slice(0, 6);
    const fileMatches = q
      ? vfs
          .search(q, 'C:/Users/Quantro')
          .filter((f) => f.type === 'file')
          .slice(0, 5)
      : [];

    const rows = [];
    if (mathVal !== null) {
      rows.push(
        `<button type="button" class="search-result-row" data-sr-calc="${mathVal}"><span style="display:flex;align-items:center;gap:10px;"><span style="color:var(--accent)">🧮</span><span><strong>${escapeHtml(query)} = ${mathVal.toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</strong></span></span><span class="badge badge-accent">Hesap Makinesi</span></button>`
      );
    }

    rows.push(
      ...appMatches.map(
        (a) =>
          `<button type="button" class="search-result-row" data-sr-app="${a.id}"><span style="display:flex;align-items:center;gap:10px;"><span style="color:var(--accent)">${getAppIcon(a.id)}</span><span>${a.title}</span></span><span class="badge">Uygulama</span></button>`
      ),
      ...fileMatches.map(
        (f) =>
          `<button type="button" class="search-result-row" data-sr-file="${escapeHtml(f.path)}"><span style="display:flex;align-items:center;gap:10px;">${ICONS.file}<span>${escapeHtml(f.name)}</span></span><span class="badge mono">${escapeHtml(f.path)}</span></button>`
      )
    );

    if (q) {
      rows.push(
        `<button type="button" class="search-result-row" data-sr-web="${escapeHtml(query)}"><span style="display:flex;align-items:center;gap:10px;"><span>🌐</span><span>Google'da Ara: "<strong>${escapeHtml(query)}</strong>"</span></span><span class="badge">Web Tarayıcısı</span></button>`,
        `<button type="button" class="search-result-row" data-sr-jarvis="${escapeHtml(query)}"><span>J.A.R.V.I.S.'e Sor: "${escapeHtml(query)}"</span><span class="badge badge-accent">Sesli AI</span></button>`
      );
    }
    $('#global-search-results').innerHTML = rows.join('');
  }

  $('#tb-search-btn').addEventListener('click', () => {
    toggleFlyout('#search-palette', () => {
      $('#global-search-input').value = '';
      renderGlobalSearch('');
      $('#global-search-input').focus();
    });
  });

  $('#global-search-input').addEventListener('input', (e) => renderGlobalSearch(e.target.value));
  $('#global-search-results').addEventListener('click', async (e) => {
    const calcRow = e.target.closest('[data-sr-calc]');
    if (calcRow) {
      closeAllFlyouts();
      osContext.openApp('calculator');
      return;
    }
    const webRow = e.target.closest('[data-sr-web]');
    if (webRow) {
      closeAllFlyouts();
      osContext.openApp('browser', { query: webRow.dataset.srWeb });
      return;
    }
    const appRow = e.target.closest('[data-sr-app]');
    if (appRow) {
      osContext.openApp(appRow.dataset.srApp);
      return;
    }
    const fileRow = e.target.closest('[data-sr-file]');
    if (fileRow) {
      const p = fileRow.dataset.srFile;
      if (p.endsWith('.qasm')) osContext.openApp('qlab', { qasm: vfs.read(p) });
      else osContext.openApp('notepad', { path: p });
      return;
    }
    const jRow = e.target.closest('[data-sr-jarvis]');
    if (jRow) {
      closeAllFlyouts();
      osContext.openApp('jarvis', { initialCommand: jRow.dataset.srJarvis });
    }
  });

  // Task View / Virtual Desktops
  function renderTaskView() {
    const wins = wm.getDesktopWindows();
    $('#taskview-windows-grid').innerHTML = wins.length
      ? wins
          .map(
            (w) => `
          <div class="taskview-win-card" data-tv-win="${w.id}">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="display:flex;align-items:center;gap:8px;font-weight:500;">${getAppIcon(w.appId)} ${escapeHtml(w.title)}</span>
              <button type="button" class="btn btn-sm btn-danger" data-tv-close="${w.id}">×</button>
            </div>
            <span class="mono" style="font-size:11px;color:var(--text-3);">${w.rect.w}×${w.rect.h} px · ${w.minimized ? 'Küçültüldü' : 'Aktif'}</span>
          </div>
        `
          )
          .join('')
      : `<div style="color:var(--text-2);font-size:14px;">Bu sanal masaüstünde açık pencere bulunmuyor.</div>`;

    $('#taskview-desktops-bar').innerHTML =
      wm.desktops
        .map(
          (d) => `
        <button type="button" class="desktop-pill-card ${d.id === wm.activeDesktop ? 'active' : ''}" data-tv-desk="${d.id}">
          <span>${escapeHtml(d.name)}</span>
          <span class="badge num">${wm.getDesktopWindows(d.id).length}</span>
        </button>
      `
        )
        .join('') + `<button type="button" class="btn" id="tv-new-desk">${ICONS.plus} Yeni Masaüstü</button>`;
  }

  $('#tb-taskview-btn').addEventListener('click', () => toggleFlyout('#taskview-overlay', renderTaskView));
  $('#taskview-close-btn').addEventListener('click', () => closeAllFlyouts());
  $('#taskview-windows-grid').addEventListener('click', (e) => {
    const cls = e.target.closest('[data-tv-close]');
    if (cls) {
      e.stopPropagation();
      wm.closeWindow(cls.dataset.tvClose);
      renderTaskView();
      return;
    }
    const card = e.target.closest('[data-tv-win]');
    if (card) {
      closeAllFlyouts();
      wm.restoreWindow(card.dataset.tvWin);
    }
  });
  $('#taskview-desktops-bar').addEventListener('click', (e) => {
    if (e.target.closest('#tv-new-desk')) {
      wm.addDesktop();
      const cur = wm.desktops.find((d) => d.id === wm.activeDesktop);
      if (cur) $('#tb-desktop-name').textContent = cur.name;
      renderTaskView();
      return;
    }
    const b = e.target.closest('[data-tv-desk]');
    if (b) {
      osContext.switchDesktop(Number(b.dataset.tvDesk));
      renderTaskView();
    }
  });

  // Left Sliding Widgets Drawer
  async function renderWidgetsDrawer() {
    const el = $('#widgets-drawer');
    const astro = siderealAndJulian(new Date(), 35.4853);
    const localBytes = generateQRNGBytes(16);
    const st = computeByteStats(localBytes);

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span class="eyebrow">QUANTRO AR-GE WIDGET PANELİ</span>
        <button type="button" class="btn btn-sm btn-ghost" id="wg-close">Kapat</button>
      </div>
      <div class="widget-card">
        <div class="widget-card-head"><span>KAYSERİ GÖZLEMEVİ SAATİ</span><span class="badge badge-patina">CANLI DENKLEM</span></div>
        <div class="mono" style="font-size:20px;color:var(--text-1);">LMST ${astro.lmstFormatted}</div>
        <div class="mono" style="font-size:12px;color:var(--text-2);">JD ${astro.julianDate.toFixed(5)} · v_⊕ = ${astro.earthOrbitalSpeedKmS.toFixed(3)} km/s</div>
      </div>
      <div class="widget-card">
        <div class="widget-card-head"><span>KUANTUM RASTGELELİK AKIŞI</span><button type="button" class="btn btn-sm" id="wg-open-qvault">Q-Vault</button></div>
        <div class="mono" style="font-size:12px;word-break:break-all;color:var(--accent);" id="wg-qrng-hex">${st.hex}</div>
        <div class="mono" style="font-size:11px;color:var(--text-3);" id="wg-qrng-src">Entropi: ${st.shannonEntropy.toFixed(2)} bit/B</div>
      </div>
      <div class="widget-card">
        <div class="widget-card-head"><span>HIZLI LABORATUVAR BAŞLATICI</span></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" class="btn btn-sm btn-primary" data-wg-app="qlab">Q-Lab Devre</button>
          <button type="button" class="btn btn-sm" data-wg-app="astrolab">AstroLab</button>
          <button type="button" class="btn btn-sm" data-wg-app="spectrum">Tayf Analizörü</button>
        </div>
      </div>
    `;

    el.querySelector('#wg-close').addEventListener('click', () => closeAllFlyouts());
    el.querySelector('#wg-open-qvault').addEventListener('click', () => osContext.openApp('qvault', { tab: 'qrng' }));
    el.querySelectorAll('[data-wg-app]').forEach((b) =>
      b.addEventListener('click', () => osContext.openApp(b.dataset.wgApp))
    );

    try {
      const live = await fetchLiveQRNG(16);
      const hexNode = el.querySelector('#wg-qrng-hex');
      const srcNode = el.querySelector('#wg-qrng-src');
      if (hexNode && srcNode) {
        hexNode.textContent = live.hex;
        srcNode.textContent = `Kaynak: ${live.source} · H=${Number(live.shannonEntropy).toFixed(2)} bit/B`;
      }
    } catch {
      // keep local CSPRNG
    }
  }

  $('#tb-widgets-btn').addEventListener('click', () => toggleFlyout('#widgets-drawer', renderWidgetsDrawer));

  // Quick Settings Flyout
  function renderQuickSettings() {
    const el = $('#quick-settings');
    const jcfg = jarvis.getConfig();
    el.innerHTML = `
      <div class="eyebrow">HIZLI SİSTEM AYARLARI</div>
      <div class="qs-grid">
        <button type="button" class="qs-tile" data-qs="wifi" aria-pressed="${state.wifi}">${ICONS.wifi}<span>Wi-Fi</span></button>
        <button type="button" class="qs-tile" data-qs="night" aria-pressed="${state.nightLight}">${ICONS.moon}<span>Gece Işığı</span></button>
        <button type="button" class="qs-tile" data-qs="hud" aria-pressed="${state.hudVisible}">${ICONS.jarvis}<span>Masaüstü HUD</span></button>
        <button type="button" class="qs-tile" data-qs="wake" aria-pressed="${Boolean(jcfg.wakeWordEnabled)}">${ICONS.mic}<span>Jarvis Dinleme</span></button>
        <button type="button" class="qs-tile" data-qs="theme" aria-pressed="${state.theme === 'vellum-light'}">${ICONS.sun}<span>Vellum Modu</span></button>
        <button type="button" class="qs-tile" data-qs="settings" aria-pressed="false">${ICONS.settings}<span>Tüm Ayarlar</span></button>
      </div>
      <div class="qs-slider-row">
        ${ICONS.sun}
        <input type="range" id="qs-bright" min="0.4" max="1" step="0.02" value="${state.brightness}" aria-label="Parlaklık" />
      </div>
      <div class="qs-slider-row">
        ${ICONS.volume}
        <input type="range" id="qs-vol" min="0" max="1" step="0.05" value="${sound.getVolume()}" aria-label="Ses Seviyesi" />
      </div>
    `;

    el.querySelectorAll('[data-qs]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const k = btn.dataset.qs;
        if (k === 'wifi') state.wifi = !state.wifi;
        else if (k === 'night') osContext.setNightLight(!state.nightLight);
        else if (k === 'hud') osContext.setHudVisible(!state.hudVisible);
        else if (k === 'wake') {
          const next = !jarvis.getConfig().wakeWordEnabled;
          jarvis.setConfig({ wakeWordEnabled: next });
          if (next) jarvis.startListening({ continuous: true });
          else jarvis.stopListening();
        } else if (k === 'theme') {
          osContext.setTheme(state.theme === 'vellum-light' ? 'ink-copper' : 'vellum-light');
        } else if (k === 'settings') {
          osContext.openApp('settings');
          return;
        }
        renderQuickSettings();
      })
    );

    el.querySelector('#qs-bright').addEventListener('input', (e) => osContext.setBrightness(e.target.value));
    el.querySelector('#qs-vol').addEventListener('input', (e) => sound.setVolume(Number(e.target.value)));
  }

  $('#tb-quicksettings-btn').addEventListener('click', () => toggleFlyout('#quick-settings', renderQuickSettings));

  $('#tb-lang-btn').addEventListener('click', () => {
    state.keyboardLayout = state.keyboardLayout === 'TR Q' ? 'EN US' : 'TR Q';
    $('#tb-lang-btn').textContent = state.keyboardLayout;
    jarvis.setConfig({ lang: state.keyboardLayout === 'TR Q' ? 'tr-TR' : 'en-US' });
  });

  // Notification Center + Interactive Monthly Calendar
  function renderNotifCalendar() {
    const el = $('#notif-calendar-flyout');
    const d = state.calDate;
    const year = d.getFullYear();
    const month = d.getMonth();
    const today = new Date();
    const monthLabel = d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7; // Monday=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(`<button type="button" class="cal-day muted" disabled></button>`);
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday =
        day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      cells.push(`<button type="button" class="cal-day num ${isToday ? 'today' : ''}">${day}</button>`);
    }

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span class="eyebrow">BİLDİRİMLER (${state.notifications.length})</span>
        <button type="button" class="btn btn-sm btn-ghost" id="nc-clear">Tümünü Temizle</button>
      </div>
      <div class="notif-list">
        ${
          state.notifications.length
            ? state.notifications
                .map(
                  (n) => `
              <div class="notif-item">
                <div class="notif-item-title"><span>${escapeHtml(n.title)}</span><span class="mono" style="color:var(--text-3);font-weight:400;">${n.time}</span></div>
                <div class="notif-item-body">${escapeHtml(n.body)}</div>
              </div>
            `
                )
                .join('')
            : `<div style="color:var(--text-3);font-size:12px;">Yeni bildirim yok.</div>`
        }
      </div>
      <div class="cal-box">
        <div class="cal-header">
          <strong style="font-size:13px;text-transform:capitalize;">${monthLabel}</strong>
          <div style="display:flex;gap:4px;">
            <button type="button" class="btn btn-sm" id="cal-prev">‹</button>
            <button type="button" class="btn btn-sm" id="cal-next">›</button>
          </div>
        </div>
        <div class="cal-weekdays">
          <span>Pt</span><span>Sa</span><span>Ça</span><span>Pe</span><span>Cu</span><span>Ct</span><span>Pz</span>
        </div>
        <div class="cal-days">${cells.join('')}</div>
      </div>
    `;

    el.querySelector('#nc-clear').addEventListener('click', () => {
      state.notifications = [];
      renderNotifCalendar();
    });
    el.querySelector('#cal-prev').addEventListener('click', () => {
      state.calDate = new Date(year, month - 1, 1);
      renderNotifCalendar();
    });
    el.querySelector('#cal-next').addEventListener('click', () => {
      state.calDate = new Date(year, month + 1, 1);
      renderNotifCalendar();
    });
  }

  $('#tb-clock-btn').addEventListener('click', () => toggleFlyout('#notif-calendar-flyout', renderNotifCalendar));
  $('#tb-show-desktop-btn').addEventListener('click', () => wm.minimizeAll());

  // J.A.R.V.I.S. Quick Capsule & Orb Controls
  $('#jarvis-cap-chips').innerHTML = QUICK_JARVIS_CHIPS.map(
    (c) => `<button type="button" class="jarvis-chip" data-jchip="${escapeHtml(c)}">${escapeHtml(c)}</button>`
  ).join('');

  async function submitJarvisCapsule(text) {
    const cmd = text.trim();
    if (!cmd) return;
    $('#jarvis-cap-input').value = '';
    const res = await jarvis.processCommand(cmd, { speak: true });
    const replyEl = $('#jarvis-cap-reply');
    replyEl.hidden = false;
    replyEl.textContent = res.reply;
  }

  $('#tb-jarvis-btn').addEventListener('click', () => {
    toggleFlyout('#jarvis-capsule', () => $('#jarvis-cap-input').focus());
  });
  $('#hud-jarvis-orb').addEventListener('click', () => {
    sound.playJarvisWake();
    jarvis.toggleListening();
  });
  $('#jarvis-cap-mic').addEventListener('click', () => jarvis.toggleListening());
  $('#jarvis-cap-send').addEventListener('click', () => submitJarvisCapsule($('#jarvis-cap-input').value));
  $('#jarvis-cap-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitJarvisCapsule($('#jarvis-cap-input').value);
  });
  $('#jarvis-cap-chips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-jchip]');
    if (b) submitJarvisCapsule(b.dataset.jchip);
  });
  $('#jarvis-cap-open-full').addEventListener('click', () => osContext.openApp('jarvis'));

  jarvis.onStateChange((st, detail = '') => {
    $('#tb-jarvis-btn').dataset.jarvisState = st;
    $('#hud-jarvis-orb').dataset.jarvisState = st;
    $('#jarvis-cap-mic').classList.toggle('listening', st === 'listening');
    const map = { idle: 'HAZIR', listening: 'DİNLİYOR', processing: 'İŞLENİYOR', speaking: 'KONUŞUYOR' };
    $('#hud-jarvis-badge').textContent = map[st] || 'HAZIR';
    $('#jarvis-cap-state').textContent = map[st] || 'HAZIR';
    if (detail) $('#hud-jarvis-sub').textContent = detail;
  });

  // Clipboard History Flyout (Ctrl+Shift+V)
  function renderClipboardFlyout() {
    const el = $('#clipboard-flyout');
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span class="eyebrow">PANO GEÇMİŞİ (CTRL+SHIFT+V)</span>
        <button type="button" class="btn btn-sm btn-ghost" id="cl-clear">Temizle</button>
      </div>
      ${state.clipboardHistory
        .map(
          (item, idx) => `
        <div class="clip-item" data-cidx="${idx}">
          <div class="clip-text">${escapeHtml(item)}</div>
        </div>
      `
        )
        .join('')}
    `;
    el.querySelector('#cl-clear').addEventListener('click', () => {
      state.clipboardHistory = [];
      renderClipboardFlyout();
    });
    el.querySelectorAll('[data-cidx]').forEach((c) =>
      c.addEventListener('click', () => {
        const txt = state.clipboardHistory[Number(c.dataset.cidx)];
        navigator.clipboard?.writeText?.(txt).catch(() => {});
        notify('Pano', 'Seçilen öğe aktif panoya kopyalandı.');
        closeAllFlyouts();
      })
    );
  }

  // Right-Click Desktop Context Menu
  $('#desktop-stage').addEventListener('contextmenu', (e) => {
    if (e.target.closest('.wm-window')) return;
    e.preventDefault();
    const menu = $('#context-menu');
    closeAllFlyouts('#context-menu');
    menu.hidden = false;
    menu.style.left = `${Math.min(window.innerWidth - 250, e.clientX)}px`;
    menu.style.top = `${Math.min(window.innerHeight - 310, e.clientY)}px`;
    menu.innerHTML = `
      <button type="button" class="ctx-item" data-ctx="jarvis"><span class="ctx-item-left">${ICONS.jarvis} J.A.R.V.I.S. Komuta</span><span class="ctx-kbd">Ctrl+Space</span></button>
      <button type="button" class="ctx-item" data-ctx="qlab"><span class="ctx-item-left">${ICONS.qlab} Yeni Kuantum Devresi</span></button>
      <button type="button" class="ctx-item" data-ctx="terminal"><span class="ctx-item-left">${ICONS.terminal} QuantShell Terminalde Aç</span></button>
      <div class="ctx-sep"></div>
      <button type="button" class="ctx-item" data-ctx="new-folder"><span class="ctx-item-left">${ICONS.folder} Yeni Klasör</span></button>
      <button type="button" class="ctx-item" data-ctx="new-note"><span class="ctx-item-left">${ICONS.file} Yeni Araştırma Notu</span></button>
      <div class="ctx-sep"></div>
      <button type="button" class="ctx-item" data-ctx="snap"><span class="ctx-item-left">${ICONS.taskview} Pencereleri Yan Yana Diz</span></button>
      <button type="button" class="ctx-item" data-ctx="theme"><span class="ctx-item-left">${ICONS.settings} Kişiselleştirme ve Temalar</span></button>
    `;
  });

  $('#context-menu').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-ctx]');
    if (!b) return;
    const act = b.dataset.ctx;
    closeAllFlyouts();
    if (act === 'jarvis') toggleFlyout('#jarvis-capsule', () => $('#jarvis-cap-input').focus());
    else if (act === 'qlab') osContext.openApp('qlab');
    else if (act === 'terminal') osContext.openApp('terminal');
    else if (act === 'snap') wm.snapWindows('split-2');
    else if (act === 'theme') osContext.openApp('settings', { section: 'personalize' });
    else if (act === 'new-folder') {
      const name = await promptModal('Masaüstünde Yeni Klasör', 'Klasör adı:', 'Yeni-Deney');
      if (name) {
        vfs.mkdir(`C:/Users/Quantro/Desktop/${name}`);
        osContext.openApp('explorer', { path: 'C:/Users/Quantro/Desktop' });
      }
    } else if (act === 'new-note') {
      const p = `C:/Users/Quantro/Desktop/Not-${Date.now().toString().slice(-4)}.md`;
      vfs.write(p, '# Yeni Quantro AR-GE Notu\n\n');
      osContext.openApp('notepad', { path: p });
    }
  });

  // Windows 11 Alt+Tab 3D Acrylic Task Switcher
  let altTabActive = false;
  let altTabWins = [];
  let altTabIdx = 0;

  function renderAltTabSwitcher() {
    const cont = $('#alt-tab-container');
    if (!cont) return;
    cont.innerHTML = altTabWins.map((w, idx) => `
      <div class="alt-tab-card ${idx === altTabIdx ? 'active' : ''}" data-at-idx="${idx}">
        <div class="alt-tab-card-icon">${getAppIcon(w.appId, 32)}</div>
        <div class="alt-tab-card-title">${escapeHtml(w.title)}</div>
      </div>
    `).join('');
  }

  function commitAltTab() {
    if (!altTabActive) return;
    altTabActive = false;
    $('#alt-tab-switcher').hidden = true;
    const target = altTabWins[altTabIdx];
    if (target) {
      if (target.minimized) wm.restoreWindow(target.id);
      wm.focusWindow(target.id);
    }
  }

  $('#alt-tab-switcher').addEventListener('click', (e) => {
    const card = e.target.closest('[data-at-idx]');
    if (card) {
      altTabIdx = Number(card.dataset.atIdx);
      commitAltTab();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (altTabActive && (e.key === 'Alt' || !e.altKey)) {
      commitAltTab();
    }
  });

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.altKey && e.key === 'Tab') {
      e.preventDefault();
      const all = wm.getAllWindows ? wm.getAllWindows() : [];
      if (!all || all.length === 0) return;
      if (!altTabActive) {
        altTabActive = true;
        altTabWins = all;
        altTabIdx = all.length > 1 ? 1 : 0;
        $('#alt-tab-switcher').hidden = false;
        renderAltTabSwitcher();
      } else {
        if (e.shiftKey) {
          altTabIdx = (altTabIdx - 1 + altTabWins.length) % altTabWins.length;
        } else {
          altTabIdx = (altTabIdx + 1) % altTabWins.length;
        }
        renderAltTabSwitcher();
      }
      return;
    }

    if (altTabActive && e.key === 'Escape') {
      altTabActive = false;
      $('#alt-tab-switcher').hidden = true;
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      toggleFlyout('#search-palette', () => {
        $('#global-search-input').value = '';
        renderGlobalSearch('');
        $('#global-search-input').focus();
      });
    } else if (e.ctrlKey && e.code === 'Space') {
      e.preventDefault();
      toggleFlyout('#jarvis-capsule', () => $('#jarvis-cap-input').focus());
    } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      toggleFlyout('#clipboard-flyout', renderClipboardFlyout);
    } else if (e.key === 'Escape') {
      closeAllFlyouts();
    }
  });

  // Live Real Clocks, Astronomical Sidereal Instrument & Hardware Telemetry
  let frames = 0;
  let lastFpsTick = performance.now();
  function trackFps(now) {
    frames++;
    if (now - lastFpsTick >= 1000) {
      state.fps = Math.round((frames * 1000) / (now - lastFpsTick));
      frames = 0;
      lastFpsTick = now;
      $('#hud-fps').textContent = `${state.fps} FPS`;
    }
    requestAnimationFrame(trackFps);
  }
  requestAnimationFrame(trackFps);

  function updateClocksAndAstronomy() {
    const now = new Date();
    const hm = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const dShort = now.toLocaleDateString('tr-TR');
    const dLong = now.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    $('#tb-clock-time').textContent = hm;
    $('#tb-clock-date').textContent = dShort;
    $('#lock-time').textContent = hm;
    $('#lock-date').textContent = dLong;

    const astro = siderealAndJulian(now, 35.4853);
    $('#lock-lmst').textContent = astro.lmstFormatted;
    $('#lock-jd').textContent = astro.julianDate.toFixed(5);
    $('#lock-vearth').textContent = `${astro.earthOrbitalSpeedKmS.toFixed(3)} km/s`;

    $('#hud-lmst').textContent = astro.lmstFormatted;
    $('#hud-jd').textContent = astro.julianDate.toFixed(5);
    $('#hud-orbital-v').textContent = `${astro.earthOrbitalSpeedKmS.toFixed(3)} km/s`;
    $('#hud-utc-stamp').textContent = `${now.toISOString().slice(11, 16)} UTC`;
    $('#tb-sidereal-mini').textContent = `LMST ${astro.lmstFormatted.slice(0, 5)}`;

    const usage = vfs.getStorageUsage();
    $('#hud-vfs-used').textContent = `VFS: ${(usage.totalBytes / 1024).toFixed(1)} KB`;
  }

  async function refreshHostAndQuantumTelemetry() {
    try {
      const sysRes = await fetch('/api/system');
      if (sysRes.ok) {
        const sys = await sysRes.json();
        const usedGb = (sys.usedmem / 1073741824).toFixed(1);
        const totGb = (sys.totalmem / 1073741824).toFixed(1);
        $('#hud-host-mem').textContent = `${sys.arch} · ${usedGb}/${totGb} GB`;
      }
    } catch {
      $('#hud-host-mem').textContent = 'Web İzole Mod';
    }

    try {
      const q = await fetchLiveQRNG(32);
      $('#hud-qrng-ent').textContent = `${Number(q.shannonEntropy).toFixed(2)} bit/B`;
      $('#hud-qrng-src').textContent = `Kaynak: ${q.source}`;
    } catch {
      const b = generateQRNGBytes(32);
      const s = computeByteStats(b);
      $('#hud-qrng-ent').textContent = `${s.shannonEntropy.toFixed(2)} bit/B`;
      $('#hud-qrng-src').textContent = 'Kaynak: webcrypto-csprng';
    }
  }

  updateClocksAndAstronomy();
  setInterval(updateClocksAndAstronomy, 1000);
  refreshHostAndQuantumTelemetry();
  setInterval(refreshHostAndQuantumTelemetry, 15000);

  renderDesktopIcons();
  renderTaskbarApps();

  // Boot -> Lock -> Login Flow
  const bootEl = $('#boot-screen');
  const lockEl = $('#lock-screen');
  const loginEl = $('#login-screen');
  const desktopEl = $('#desktop-root');
  const bootLogEl = $('#boot-log');
  const bootFill = $('#boot-progress-fill');

  let bootDone = false;
  function finishBoot() {
    if (bootDone) return;
    bootDone = true;
    bootEl.classList.add('fade-out');
    lockEl.hidden = false;
    setTimeout(() => {
      bootEl.hidden = true;
      lockEl.focus();
    }, 320);
  }

  $('#boot-skip-btn').addEventListener('click', finishBoot);

  BOOT_STEPS.forEach((step, idx) => {
    setTimeout(() => {
      if (bootDone) return;
      const line = document.createElement('div');
      line.className = 'boot-log-line';
      line.innerHTML = `<span class="boot-log-ok">[OK]</span><span>${escapeHtml(step)}</span>`;
      bootLogEl.appendChild(line);
      bootLogEl.scrollTop = bootLogEl.scrollHeight;
      bootFill.style.width = `${Math.round(((idx + 1) / BOOT_STEPS.length) * 100)}%`;
      if (idx === BOOT_STEPS.length - 1) {
        setTimeout(finishBoot, 260);
      }
    }, idx * 170);
  });

  function unlockToLogin() {
    lockEl.classList.add('unlocked');
    loginEl.hidden = false;
    setTimeout(() => {
      lockEl.hidden = true;
      $('#login-submit-btn').focus();
    }, 360);
  }

  lockEl.addEventListener('click', unlockToLogin);
  lockEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') unlockToLogin();
  });

  $('#login-back-lock-btn').addEventListener('click', () => {
    loginEl.hidden = true;
    osContext.lockScreen();
  });

  let firstSessionOpened = false;
  $('#login-submit-btn').addEventListener('click', () => {
    sound.playBoot();
    loginEl.hidden = true;
    desktopEl.hidden = false;
    if (!firstSessionOpened) {
      firstSessionOpened = true;
      osContext.openApp('jarvis');
      jarvis.speak(
        'Hoş geldiniz efendim. QuantOS masaüstü ortamı, kuantum simülatörü ve astrofizik gözlemevi emrinizde.'
      );
    }
  });

  // Register Service Worker cleanly when served over HTTP(S)
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

bootstrapQuantOS();
