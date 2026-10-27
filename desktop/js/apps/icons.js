/**
 * QuantOS — 1.5px Enstrüman Çizgili SVG İkon Sistemi (Feynman / Fluent Hibrit)
 * Emoji kullanılmaz (Tasarım Anayasası Kanun K.08).
 */

const wrap = (inner, cls = 'icon') =>
  `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;

export const ICONS = {
  jarvis: wrap(
    '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/><path d="M12 1.8v2.4M12 19.8v2.4M1.8 12h2.4M19.8 12h2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7"/>'
  ),
  qlab: wrap(
    '<path d="M3 8h18M3 16h18"/><rect x="6.5" y="5.5" width="5" height="5" rx="1"/><circle cx="16.5" cy="8" r="1.8"/><circle cx="16.5" cy="16" r="3"/><path d="M16.5 9.8V19M13.5 16h6"/>'
  ),
  astrolab: wrap(
    '<circle cx="12" cy="12" r="3.2"/><ellipse cx="12" cy="12" rx="9.5" ry="4.2" transform="rotate(-24 12 12)"/><path d="M5 19c3.5-1.5 10.5-1.5 14 0"/>'
  ),
  qvault: wrap(
    '<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15" r="1.5"/>'
  ),
  explorer: wrap(
    '<path d="M3 7.5A2 2 0 0 1 5 5.5h4.2l2 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-10Z"/><path d="M3 10.5h18"/>'
  ),
  terminal: wrap(
    '<rect x="3" y="4" width="18" height="16" rx="2.2"/><path d="m7.5 9.5 3 2.5-3 2.5M12.5 15h4"/>'
  ),
  code: wrap(
    '<path d="m8.5 8-4 4 4 4M15.5 8l4 4-4 4M13.2 6l-2.4 12"/>'
  ),
  taskmgr: wrap(
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M6.5 13h2.5l1.8-4.5 2.4 7 1.8-2.5h2.5"/>'
  ),
  settings: wrap(
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1Z"/>'
  ),
  browser: wrap(
    '<circle cx="12" cy="12" r="9"/><path d="M3.5 12h17M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'
  ),
  calculator: wrap(
    '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8.5 11.5h1M11.5 11.5h1M14.5 11.5h1M8.5 14.5h1M11.5 14.5h1M14.5 14.5v3M8.5 17.5h4"/>'
  ),
  notepad: wrap(
    '<path d="M6 3.5h8.5L19 8v12.5H6a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 6 3.5Z"/><path d="M14 3.5V8h4.5M8.5 12h7M8.5 15.5h5"/>'
  ),
  spectrum: wrap(
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 7v10M10.5 7v10M15.5 7v10M18 7v10"/>'
  ),
  store: wrap(
    '<path d="M5 8h14l-1.2 11.5a1.5 1.5 0 0 1-1.5 1.3H7.7a1.5 1.5 0 0 1-1.5-1.3L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'
  ),
  snipping: wrap(
    '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/>'
  ),
  quantmark: wrap(
    '<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="5"/>'
  ),

  // Shell & Window Controls
  search: wrap('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.2 4.2"/>'),
  taskview: wrap(
    '<rect x="3.5" y="4.5" width="11" height="9" rx="1.5"/><path d="M9.5 18.5h9a2 2 0 0 0 2-2v-7"/>'
  ),
  widgets: wrap(
    '<rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.5"/><rect x="13" y="3.5" width="7.5" height="4.5" rx="1.2"/><rect x="13" y="10" width="7.5" height="10.5" rx="1.5"/><rect x="3.5" y="13" width="7.5" height="7.5" rx="1.5"/>'
  ),
  mic: wrap(
    '<rect x="9" y="3" width="6" height="10.5" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"/>'
  ),
  volume: wrap(
    '<path d="M11 5.5 6.5 9H3.5v6h3L11 18.5v-13Z"/><path d="M15 9.2a4.5 4.5 0 0 1 0 5.6M17.8 6.8a8 8 0 0 1 0 10.4"/>'
  ),
  wifi: wrap(
    '<path d="M2.8 9.2a14.5 14.5 0 0 1 18.4 0M6 12.6a10 10 0 0 1 12 0M9.3 16a5 5 0 0 1 5.4 0"/><circle cx="12" cy="19" r="1"/>'
  ),
  sun: wrap(
    '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"/>'
  ),
  moon: wrap('<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z"/>'),
  minimize: wrap('<path d="M6 12h12"/>'),
  maximize: wrap('<rect x="6" y="6" width="12" height="12" rx="1.5"/>'),
  restore: wrap(
    '<rect x="6" y="8" width="10" height="10" rx="1.2"/><path d="M9 8V6.2A1.2 1.2 0 0 1 10.2 5h7.6A1.2 1.2 0 0 1 19 6.2v7.6a1.2 1.2 0 0 1-1.2 1.2H16"/>'
  ),
  close: wrap('<path d="M7 7l10 10M17 7 7 17"/>'),
  folder: wrap(
    '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>'
  ),
  file: wrap(
    '<path d="M6 3.5h8.5L19 8v12.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5Z"/><path d="M14 3.5V8h4.5"/>'
  ),
  lock: wrap(
    '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/>'
  ),
  external: wrap(
    '<path d="M14 5h5v5M10 14 19 5M19 14v4a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18V6.5A1.5 1.5 0 0 1 6.5 5H10"/>'
  ),
  plus: wrap('<path d="M12 5v14M5 12h14"/>'),
  trash: wrap('<path d="M4.5 7h15M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M6.5 7l1 12.5a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4L17.5 7"/>'),
  refresh: wrap('<path d="M20 11A8 8 0 1 0 18 16.5M20 6v5h-5"/>'),
  play: wrap('<polygon points="7,5 19,12 7,19"/>'),
  pause: wrap('<path d="M8 5v14M16 5v14"/>'),
  clipboard: wrap('<rect x="6" y="5" width="12" height="15" rx="2"/><path d="M9.5 5V3.8h5V5"/>'),
};

export function getAppIcon(appId) {
  return ICONS[appId] || ICONS.file;
}
