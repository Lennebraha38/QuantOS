/**
 * QuantOS — 16 Yerleşik Uygulama Kayıt Defteri (App Registry)
 */
import { mountJarvisApp } from './jarvis-app.js';
import { mountQLabApp } from './qlab-app.js';
import { mountAstroLabApp } from './astrolab-app.js';
import { mountQVaultApp } from './qvault-app.js';
import { mountExplorerApp } from './explorer-app.js';
import { mountTerminalApp } from './terminal-app.js';
import { mountCodeApp } from './code-app.js';
import { mountTaskMgrApp } from './taskmgr-app.js';
import { mountSettingsApp } from './settings-app.js';
import { mountBrowserApp } from './browser-app.js';
import { mountCalculatorApp } from './calculator-app.js';
import { mountNotepadApp } from './notepad-app.js';
import { mountSpectrumApp } from './spectrum-app.js';
import { mountStoreApp } from './store-app.js';
import { mountSnippingApp } from './snipping-app.js';
import { mountQuantMarkApp } from './quantmark-app.js';

export const APP_REGISTRY = [
  {
    id: 'jarvis',
    title: 'J.A.R.V.I.S. Komuta Merkezi',
    shortTitle: 'J.A.R.V.I.S.',
    category: 'science',
    singleton: true,
    defaultWidth: 920,
    defaultHeight: 600,
    description: 'Sesli yapay zekâ asistanı, Arc-Reactor frekans görselleştiricisi ve sistem/bilim otomasyonu.',
    mount: mountJarvisApp,
  },
  {
    id: 'qlab',
    title: 'Quantro Kuantum Laboratuvarı (Q-Lab)',
    shortTitle: 'Kuantum Lab',
    category: 'science',
    singleton: false,
    defaultWidth: 980,
    defaultHeight: 650,
    description: '1–6 kübit durum vektörü simülatörü, kısmi iz Bloch küresi, 1024 ölçüm histogramı ve OpenQASM 2.0.',
    mount: mountQLabApp,
  },
  {
    id: 'astrolab',
    title: 'Quantro Astrofizik Gözlemevi (AstroLab)',
    shortTitle: 'AstroLab',
    category: 'science',
    singleton: false,
    defaultWidth: 960,
    defaultHeight: 640,
    description: 'Kerr kara delik mercekleme, Velocity-Verlet N-cisim yörünge, ΛCDM kozmoloji ve LIGO kütleçekim dalgası.',
    mount: mountAstroLabApp,
  },
  {
    id: 'qvault',
    title: 'Q-Vault (BB84 & Kuantum QRNG)',
    shortTitle: 'Q-Vault',
    category: 'science',
    singleton: true,
    defaultWidth: 900,
    defaultHeight: 590,
    description: 'BB84 kuantum anahtar dağıtımı, canlı ANU vakum QRNG ve WebCrypto AES-256-GCM dosya kasası.',
    mount: mountQVaultApp,
  },
  {
    id: 'explorer',
    title: 'Dosya Gezgini',
    shortTitle: 'Dosyalar',
    category: 'system',
    singleton: false,
    defaultWidth: 880,
    defaultHeight: 560,
    description: 'Kalıcı sanal dosya sistemi (C:\\QuantOS), klasör ağacı, arama ve belge yönetimi.',
    mount: mountExplorerApp,
  },
  {
    id: 'terminal',
    title: 'QuantShell Terminal',
    shortTitle: 'Terminal',
    category: 'system',
    singleton: false,
    defaultWidth: 840,
    defaultHeight: 520,
    description: 'Çok sekmeli PowerShell / QuantShell komut satırı; kuantum, astrofizik ve VFS komut seti.',
    mount: mountTerminalApp,
  },
  {
    id: 'code',
    title: 'QuantCode Studio',
    shortTitle: 'QuantCode',
    category: 'system',
    singleton: true,
    defaultWidth: 960,
    defaultHeight: 620,
    description: 'VFS entegreli kod düzenleyici, JS deney çalıştırıcı, QASM aktarıcı ve Vellum önizleme.',
    mount: mountCodeApp,
  },
  {
    id: 'taskmgr',
    title: 'Görev Yöneticisi',
    shortTitle: 'Görev Yön.',
    category: 'system',
    singleton: true,
    defaultWidth: 780,
    defaultHeight: 520,
    description: 'Açık süreç kontrolü ve canlı DWM FPS / Host Linux çekirdek telemetri grafikleri.',
    mount: mountTaskMgrApp,
  },
  {
    id: 'settings',
    title: 'Ayarlar',
    shortTitle: 'Ayarlar',
    category: 'system',
    singleton: true,
    defaultWidth: 880,
    defaultHeight: 580,
    description: '4 kurumsal tema, duvar kağıtları, ekran parlaklığı/gece ışığı, ses ve J.A.R.V.I.S. yapılandırması.',
    mount: mountSettingsApp,
  },
  {
    id: 'browser',
    title: 'Quantro Edge Tarayıcı',
    shortTitle: 'Tarayıcı',
    category: 'science',
    singleton: false,
    defaultWidth: 920,
    defaultHeight: 600,
    description: 'Quantro AR-GE kurumsal bilgi portalı, fizik sözlüğü, literatür seçkisi ve web gezintisi.',
    mount: mountBrowserApp,
  },
  {
    id: 'calculator',
    title: 'Bilimsel & CODATA Hesap Makinesi',
    shortTitle: 'Hesap Mak.',
    category: 'science',
    singleton: true,
    defaultWidth: 460,
    defaultHeight: 560,
    description: 'CODATA 2022 fizik sabitleri (c, h, ħ, G, k_B, M☉) ve astro/kuantum birim dönüştürücü.',
    mount: mountCalculatorApp,
  },
  {
    id: 'notepad',
    title: 'Not Defteri & AR-GE Günlüğü',
    shortTitle: 'Not Defteri',
    category: 'system',
    singleton: false,
    defaultWidth: 760,
    defaultHeight: 520,
    description: 'Markdown destekli bilimsel not defteri ve Vellum parşömen okuma yüzeyi.',
    mount: mountNotepadApp,
  },
  {
    id: 'spectrum',
    title: 'Spektrum & Çizim Stüdyosu',
    shortTitle: 'Spektrum',
    category: 'science',
    singleton: true,
    defaultWidth: 880,
    defaultHeight: 590,
    description: 'Atomik emisyon/soğurma tayf çizgileri, göreli Doppler kırmızıya kayma ve diyagram tuvali.',
    mount: mountSpectrumApp,
  },
  {
    id: 'store',
    title: 'Quantro Uygulama Merkezi',
    shortTitle: 'Mağaza',
    category: 'system',
    singleton: true,
    defaultWidth: 880,
    defaultHeight: 560,
    description: 'QuantOS yerleşik sistem ve AR-GE modüllerini keşfetme ve görev çubuğuna sabitleme merkezi.',
    mount: mountStoreApp,
  },
  {
    id: 'snipping',
    title: 'Quantro Ekran Alıntısı Aracı',
    shortTitle: 'Ekran Alıntısı',
    category: 'system',
    singleton: true,
    defaultWidth: 860,
    defaultHeight: 560,
    description: 'Windows 11 tarzı tam ekran ve pencere yakalama, çizim/vurgulama araçları ve PNG kaydı.',
    mount: mountSnippingApp,
  },
  {
    id: 'quantmark',
    title: 'QuantMark Benchmark Stüdyosu',
    shortTitle: 'QuantMark',
    category: 'science',
    singleton: true,
    defaultWidth: 920,
    defaultHeight: 620,
    description: 'QPU Hilbert uzayı, Kerr kara delik tensörleri ve N-Cisim mekaniği süper bilgisayar kıyaslama laboratuvarı.',
    mount: mountQuantMarkApp,
  },
];

export const APP_MAP = new Map(APP_REGISTRY.map((a) => [a.id, a]));
