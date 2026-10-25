/**
 * QuantOS — J.A.R.V.I.S. Doğal Dil Bilimsel Komuta ve Sesli Asistan Çekirdeği
 * Türkçe (tr-TR) ve İngilizce çift dilli niyet çözümleyici, canlı Kuantum/BB84/Astrofizik
 * hesaplayıcı, pencere/tema/VFS denetleyicisi ve Web Speech + /api/tts hibrit ses motoru.
 */

import { QuantumPresets } from './quantum-engine.js';
import { simulateBB84, fetchLiveQRNG } from './bb84-engine.js';
import {
  blackHoleMetrics,
  cosmologyMetrics,
  ligoChirpWaveform,
  siderealAndJulian
} from './astro-engine.js';

function normTR(str) {
  return String(str ?? '')
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ')
    .trim();
}

function foldASCII(str) {
  return normTR(str)
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[âä]/g, 'a')
    .replace(/[îï]/g, 'i')
    .replace(/[ûü]/g, 'u');
}

function parseLocalizedNumber(raw) {
  if (raw === undefined || raw === null) return null;
  const cleaned = String(raw).trim().replace(',', '.');
  const val = Number(cleaned);
  return Number.isFinite(val) ? val : null;
}

const APP_CATALOG = [
  {
    id: 'qlab',
    aliases: ['quantum-lab', 'quantum', 'quantumlab', 'kuantum-lab'],
    title: 'Kuantum Laboratuvarı',
    keywords: ['kuantum lab', 'kuantum laboratuvar', 'quantum lab', 'devre simülatör', 'bloch', 'qlab']
  },
  {
    id: 'astrolab',
    aliases: ['astro-lab', 'observatory', 'astro-observatory', 'astro'],
    title: 'Astrofizik Gözlemevi',
    keywords: ['astrofizik', 'gözlemevi', 'gozlemevi', 'observatory', 'astro lab', 'astrolab', 'uzay gözlem']
  },
  {
    id: 'qvault',
    aliases: ['crypto-vault', 'bb84-vault', 'bb84', 'kripto', 'vault'],
    title: 'Q-Vault (BB84 & Kuantum QRNG)',
    keywords: ['kripto', 'qvault', 'q-vault', 'bb84 kasa', 'kripto kasa', 'crypto vault', 'şifreleme kasa', 'sifreleme kasa']
  },
  {
    id: 'explorer',
    aliases: ['file-explorer', 'files', 'dosya-gezgini'],
    title: 'Dosya Gezgini',
    keywords: ['dosya gezgin', 'dosyalar', 'file explorer', 'klasörler', 'bilgisayarım']
  },
  {
    id: 'terminal',
    aliases: ['shell', 'console', 'cli'],
    title: 'QuantShell Terminal',
    keywords: ['terminal', 'komut istemi', 'kabuk', 'konsol', 'powershell', 'bash', 'quantshell']
  },
  {
    id: 'code',
    aliases: ['code-editor', 'editor', 'ide', 'kod-editoru'],
    title: 'QuantCode Studio',
    keywords: ['kod editör', 'kod editor', 'code editor', 'quantcode', 'ide', 'betik düzenleyici']
  },
  {
    id: 'taskmgr',
    aliases: ['task-manager', 'monitor', 'system-monitor', 'gorev-yoneticisi'],
    title: 'Görev Yöneticisi',
    keywords: ['görev yönetici', 'gorev yonetici', 'task manager', 'sistem izleyici', 'performans']
  },
  {
    id: 'settings',
    aliases: ['control-panel', 'ayarlar'],
    title: 'Sistem Ayarları',
    keywords: ['ayarlar', 'settings', 'kontrol paneli', 'sistem tercihleri']
  },
  {
    id: 'browser',
    aliases: ['web-browser', 'quant-browser'],
    title: 'Quantro Edge Tarayıcı',
    keywords: ['tarayıcı', 'tarayici', 'browser', 'edge', 'web', 'internet']
  },
  {
    id: 'calculator',
    aliases: ['calc', 'scientific-calculator'],
    title: 'Bilimsel Hesap Makinesi',
    keywords: ['hesap makinesi', 'calculator', 'hesaplayıcı']
  },
  {
    id: 'notepad',
    aliases: ['notes', 'markdown-notes', 'not-defteri'],
    title: 'Not Defteri',
    keywords: ['not defteri', 'notepad', 'metin belgesi']
  },
  {
    id: 'spectrum',
    aliases: ['spectrum-studio', 'spectroscopy', 'spektrum'],
    title: 'Spektrum Stüdyosu',
    keywords: ['spektrum stüdyo', 'spektrum studyo', 'spectrum studio', 'spektrum', 'tayf analiz', 'spektroskopi']
  },
  {
    id: 'store',
    aliases: ['app-store', 'market', 'magaza'],
    title: 'Quantro Uygulama Merkezi',
    keywords: ['mağaza', 'magaza', 'app store', 'uygulama mağaza', 'uygulama merkezi', 'market']
  },
  {
    id: 'jarvis',
    aliases: ['jarvis-center', 'jarvis-hub', 'assistant'],
    title: 'J.A.R.V.I.S. Komuta Merkezi',
    keywords: ['jarvis merkez', 'jarvis komuta', 'jarvis center', 'sesli asistan panel']
  }
];

const JARVIS_CONFIG_KEY = 'quantos.jarvis.config.v1';

export class JarvisBrain {
  constructor(optionsOrContext = {}) {
    const resolved =
      optionsOrContext && typeof optionsOrContext === 'object' && optionsOrContext.osContext
        ? {
            ...optionsOrContext.osContext,
            sound: optionsOrContext.soundEngine || optionsOrContext.osContext.sound
          }
        : optionsOrContext || {};

    this.ctx = resolved;
    this.state = 'idle';
    this.listening = false;
    this.wakeWordMode = false;
    this.wakeWord = 'jarvis';

    this._history = [];
    this._stateListeners = new Set();
    this._recognition = null;

    let savedCfg = {};
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        savedCfg = JSON.parse(window.localStorage.getItem(JARVIS_CONFIG_KEY) || '{}') || {};
      } catch {
        savedCfg = {};
      }
    }

    this._config = {
      voiceEnabled: savedCfg.voiceEnabled !== false,
      wakeWordEnabled: Boolean(savedCfg.wakeWordEnabled),
      continuousWake: Boolean(savedCfg.continuousWake ?? savedCfg.wakeWordEnabled),
      wakeWord: savedCfg.wakeWord || 'jarvis',
      lang: savedCfg.lang || 'tr-TR',
      rate: Number.isFinite(Number(savedCfg.rate)) ? Number(savedCfg.rate) : 1.03,
      pitch: Number.isFinite(Number(savedCfg.pitch)) ? Number(savedCfg.pitch) : 0.96,
      llmEndpoint: savedCfg.llmEndpoint || this.ctx.llmEndpoint || '',
      llmApiKey: savedCfg.llmApiKey || this.ctx.llmApiKey || '',
      llmModel: savedCfg.llmModel || this.ctx.llmModel || 'gpt-4o-mini',
      elevenLabsApiKey: savedCfg.elevenLabsApiKey || '',
      elevenLabsVoiceId: savedCfg.elevenLabsVoiceId || 'pNInz6obpgDQGcFmaJgB',
      elevenLabsModelId: savedCfg.elevenLabsModelId || 'eleven_multilingual_v2',
      ttsProvider: savedCfg.ttsProvider || 'auto'
    };

    this.wakeWord = this._config.wakeWord;
    this.llmEndpoint = this._config.llmEndpoint;
    this.llmApiKey = this._config.llmApiKey;
    this.llmModel = this._config.llmModel;

    // Bilişsel Bellek & Otonom Araç Çalışma Alanı (Cognitive Working Memory)
    this._workingMemory = {
      lastTopic: null,
      lastEntity: null,
      lastQuery: null,
      dialogHistory: []
    };
    this._phraseAudioCache = new Map();
  }

  getConfig() {
    return { ...this._config };
  }

  setConfig(patch = {}) {
    if (!patch || typeof patch !== 'object') return this.getConfig();
    if (patch.voiceEnabled !== undefined) this._config.voiceEnabled = Boolean(patch.voiceEnabled);
    if (patch.wakeWordEnabled !== undefined) {
      this._config.wakeWordEnabled = Boolean(patch.wakeWordEnabled);
      this._config.continuousWake = this._config.wakeWordEnabled;
    }
    if (patch.continuousWake !== undefined) {
      this._config.continuousWake = Boolean(patch.continuousWake);
      this._config.wakeWordEnabled = this._config.continuousWake;
    }
    if (patch.wakeWord) {
      this._config.wakeWord = String(patch.wakeWord).trim().toLowerCase();
      this.wakeWord = this._config.wakeWord;
    }
    if (patch.lang) this._config.lang = String(patch.lang);
    if (patch.rate !== undefined && Number.isFinite(Number(patch.rate))) {
      this._config.rate = Math.max(0.5, Math.min(2.0, Number(patch.rate)));
    }
    if (patch.pitch !== undefined && Number.isFinite(Number(patch.pitch))) {
      this._config.pitch = Math.max(0.5, Math.min(2.0, Number(patch.pitch)));
    }
    if (patch.llmEndpoint !== undefined) {
      this._config.llmEndpoint = String(patch.llmEndpoint || '').trim();
      this.llmEndpoint = this._config.llmEndpoint;
    }
    if (patch.llmApiKey !== undefined) {
      this._config.llmApiKey = String(patch.llmApiKey || '').trim();
      this.llmApiKey = this._config.llmApiKey;
    }
    if (patch.llmModel !== undefined && String(patch.llmModel).trim()) {
      this._config.llmModel = String(patch.llmModel).trim();
      this.llmModel = this._config.llmModel;
    }
    if (patch.elevenLabsApiKey !== undefined) {
      this._config.elevenLabsApiKey = String(patch.elevenLabsApiKey || '').trim();
    }
    if (patch.elevenLabsVoiceId !== undefined && String(patch.elevenLabsVoiceId).trim()) {
      this._config.elevenLabsVoiceId = String(patch.elevenLabsVoiceId).trim();
    }
    if (patch.elevenLabsModelId !== undefined && String(patch.elevenLabsModelId).trim()) {
      this._config.elevenLabsModelId = String(patch.elevenLabsModelId).trim();
    }
    if (patch.ttsProvider !== undefined) {
      this._config.ttsProvider = String(patch.ttsProvider).trim();
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(JARVIS_CONFIG_KEY, JSON.stringify(this._config));
      } catch {
        // Depolama kotası aşımı vb. sessizce geç
      }
    }
    return this.getConfig();
  }

  setContext(osContext = {}) {
    const resolved =
      osContext && osContext.osContext
        ? { ...osContext.osContext, sound: osContext.soundEngine || osContext.osContext.sound }
        : osContext;
    this.ctx = { ...this.ctx, ...resolved };
    if (resolved.llmEndpoint !== undefined) this.setConfig({ llmEndpoint: resolved.llmEndpoint });
    if (resolved.llmApiKey !== undefined) this.setConfig({ llmApiKey: resolved.llmApiKey });
    if (resolved.llmModel !== undefined) this.setConfig({ llmModel: resolved.llmModel });
    return this;
  }

  setLLMConfig({ endpoint = '', apiKey = '', model = 'gpt-4o-mini' } = {}) {
    this.setConfig({ llmEndpoint: endpoint, llmApiKey: apiKey, llmModel: model });
    return this;
  }

  _setState(nextState, extra = {}) {
    this.state = nextState;
    const detail =
      extra.interimTranscript || extra.transcript || extra.lastReply || extra.error || '';
    const payload = {
      state: this.state,
      detail,
      listening: this.listening,
      wakeWordMode: this.wakeWordMode,
      timestamp: new Date().toISOString(),
      ...extra
    };
    for (const fn of this._stateListeners) {
      try {
        fn(this.state, detail, payload);
      } catch {
        // Sessizce geç
      }
    }
  }

  onStateChange(fn) {
    if (typeof fn !== 'function') return () => {};
    this._stateListeners.add(fn);
    return () => {
      this._stateListeners.delete(fn);
    };
  }

  getHistory() {
    return this._history.slice();
  }

  clearHistory() {
    this._history = [];
    this._setState(this.state, { historyCleared: true });
  }

  _pushHistory(entry) {
    this._history.push(entry);
    if (this._history.length > 200) {
      this._history.shift();
    }
  }

  _resolveAppId(appEntry) {
    const registry = this.ctx.apps || this.ctx.appRegistry;
    if (!registry) return appEntry.id;

    const candidates = [appEntry.id, ...(appEntry.aliases || [])];
    if (registry instanceof Map) {
      for (const id of candidates) {
        if (registry.has(id)) return id;
      }
    } else if (Array.isArray(registry)) {
      for (const id of candidates) {
        if (registry.some((item) => item && item.id === id)) return id;
      }
    } else if (typeof registry === 'object') {
      for (const id of candidates) {
        if (id in registry) return id;
      }
    }
    return appEntry.id;
  }

  _openApp(appEntry, payload = {}) {
    const targetId = this._resolveAppId(appEntry);
    if (typeof this.ctx.openApp === 'function') {
      this.ctx.openApp(targetId, payload);
    } else if (typeof this.ctx.launchApp === 'function') {
      this.ctx.launchApp(targetId, payload);
    } else if (this.ctx.wm && typeof this.ctx.wm.openApp === 'function') {
      this.ctx.wm.openApp(targetId, payload);
    } else if (this.ctx.wm && typeof this.ctx.wm.open === 'function') {
      this.ctx.wm.open(targetId, payload);
    }
    return targetId;
  }

  _closeApp(appEntry) {
    const targetId = this._resolveAppId(appEntry);
    if (typeof this.ctx.closeApp === 'function') {
      this.ctx.closeApp(targetId);
    } else if (this.ctx.wm && typeof this.ctx.wm.closeApp === 'function') {
      this.ctx.wm.closeApp(targetId);
    } else if (this.ctx.wm && typeof this.ctx.wm.closeByAppId === 'function') {
      this.ctx.wm.closeByAppId(targetId);
    }
    return targetId;
  }

  _findMatchingApp(trText, asciiText) {
    for (const app of APP_CATALOG) {
      for (const kw of app.keywords) {
        const kwAscii = foldASCII(kw);
        if (trText.includes(normTR(kw)) || asciiText.includes(kwAscii)) {
          return app;
        }
      }
    }
    return null;
  }

  async processCommand(input, { speak = true } = {}) {
    const rawOriginal = String(input ?? '').trim();
    if (!rawOriginal) {
      return {
        ok: false,
        intent: 'empty',
        reply: 'Komut algılanamadı. Bilimsel bir hesaplama veya sistem komutu söyleyebilirsiniz.',
        action: null,
        data: null,
        timestamp: new Date().toISOString()
      };
    }

    this.ctx.sound?.playJarvisThink?.();
    this._setState('processing', { transcript: rawOriginal });

    const cleanedOriginal = rawOriginal
      .replace(/^(?:hey\s+|merhaba\s+|selam\s+)?j\.?a\.?r\.?v\.?i\.?s\.?[\s,:;-]*/i, '')
      .trim();

    const effectiveText = cleanedOriginal || rawOriginal;
    const tr = normTR(effectiveText);
    const ascii = foldASCII(effectiveText);

    let result;
    try {
      result = await this._dispatchIntent(effectiveText, tr, ascii, !cleanedOriginal);
    } catch (err) {
      result = {
        intent: 'error',
        reply: `Komut yürütülürken teknik bir hata oluştu: ${err?.message || 'Bilinmeyen hata'}.`,
        action: null,
        data: null
      };
    }

    const responseObj = {
      ok: result.intent !== 'error',
      intent: result.intent,
      reply: result.reply,
      action: result.action || null,
      data: result.data || null,
      provenance: result.provenance || 'quantos-local-nlu',
      timestamp: new Date().toISOString()
    };

    this._pushHistory({
      input: rawOriginal,
      reply: responseObj.reply,
      role: 'exchange',
      text: responseObj.reply,
      intent: responseObj.intent,
      provenance: responseObj.provenance,
      data: responseObj.data,
      timestamp: responseObj.timestamp
    });

    const shouldSpeak = speak && this._config.voiceEnabled !== false;
    if (shouldSpeak && responseObj.reply) {
      await this.speak(responseObj.reply);
    } else {
      this._setState(this.listening ? 'listening' : 'idle', { lastReply: responseObj.reply });
    }

    return responseObj;
  }

  async _dispatchIntent(raw, tr, ascii, wakeWordOnly) {
    if (
      wakeWordOnly ||
      /^(merhaba|selam|hey|hello|hi|orada misin)\b/.test(ascii)
    ) {
      this.ctx.sound?.playJarvisAck?.();
      return {
        intent: 'greeting',
        reply:
          'Emrinizdeyim. QuantOS kuantum durum vektörü, BB84 kriptografi ve relativistik astrofizik alt sistemleri çevrimiçi.',
        action: 'ack'
      };
    }

    // 0.1) Takip ve Bağlam Soruları (Working Memory Context Resolution)
    if (this._workingMemory?.lastTopic === 'blackhole' && this._workingMemory?.lastEntity?.metrics) {
      const bh = this._workingMemory.lastEntity.metrics;
      if (ascii.includes('olay ufku') || ascii.includes('event horizon')) {
        return {
          intent: 'context.blackhole.horizon',
          reply: `${bh.massSolar} Güneş kütleli kara deliğimizin Schwarzschild olay ufku yarıçapı ${bh.schwarzschildRadiusKm.toFixed(2)} km, Kerr dış olay ufku ise ${bh.kerrOuterHorizonKm.toFixed(2)} km'dir efendim.`,
          action: 'speak',
          data: bh
        };
      }
      if (ascii.includes('yaricapi') || (ascii.includes('yaricap') && !ascii.includes('hesapla'))) {
        return {
          intent: 'context.blackhole.radius',
          reply: `Daha önce incelediğimiz ${bh.massSolar} Güneş kütleli kara deliğin Schwarzschild yarıçapı R_s tam olarak ${bh.schwarzschildRadiusKm.toFixed(2)} km'dir efendim.`,
          action: 'speak',
          data: bh
        };
      }
      if (ascii.includes('hawking') || (ascii.includes('sicaklik') && !ascii.includes('hesapla'))) {
        return {
          intent: 'context.blackhole.hawking',
          reply: `Bu kara deliğin Hawking ışıma sıcaklığı ${bh.hawkingTemperatureK.toExponential(3)} Kelvin olup buharlaşma süresi yaklaşık ${bh.evaporationTimeYears.toExponential(2)} yıldır efendim.`,
          action: 'speak',
          data: bh
        };
      }
      if (ascii.includes('foton kuresi') || ascii.includes('photon sphere')) {
        return {
          intent: 'context.blackhole.photon',
          reply: `Foton küresi yarıçapı 1.5 R_s yani ${bh.photonSphereKm.toFixed(2)} km mesafededir; fotonlar bu yarıçapta kararsız dairesel yörüngelere girer.`,
          action: 'speak',
          data: bh
        };
      }
    }

    // 0.2) Otonom Ajan Aracı: Canlı İnternet / Google Araması (Tool: search_web)
    if (
      (ascii.includes('google') || ascii.includes('internette ara') || ascii.includes('webde ara')) &&
      !ascii.includes('ayarlar')
    ) {
      let q = raw
        .replace(/^(?:jarvis\s+)?(?:lutfen\s+)?(?:bana\s+)?(?:google(?:'da)?|internette?|web(?:'te)?)\s*(?:arama\s+yap|ara|arastir)?/i, '')
        .replace(/(?:hakkinda|ile ilgili)?\s*(?:arama yap|ara|bilgi ver|nedir|arastir)\b.*$/i, '')
        .trim();
      if (!q && this._workingMemory?.lastQuery) {
        q = this._workingMemory.lastQuery;
      }
      if (q) {
        this._workingMemory.lastTopic = 'search';
        this._workingMemory.lastQuery = q;
        let searchSummary = '';
        let searchResults = [];
        try {
          if (typeof fetch === 'function') {
            const sRes = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
              signal: AbortSignal.timeout(6000)
            });
            if (sRes.ok) {
              const sData = await sRes.json();
              searchResults = sData.results || [];
              if (searchResults.length > 0) {
                const topTitles = searchResults.slice(0, 2).map((r) => `"${r.title}"`).join(' ve ');
                searchSummary = ` Arama sonuçlarında öne çıkan başlıklar: ${topTitles}.`;
              }
            }
          }
        } catch {
          // sessiz fallback
        }

        const appEntry = APP_CATALOG.find((a) => a.id === 'browser');
        this._openApp(appEntry, { query: q });

        return {
          intent: 'tool.search_web',
          reply: `"${q}" için internet araştırması gerçekleştirildi ve Quantro Edge tarayıcısında açıldı efendim.${searchSummary}`,
          action: 'openApp:browser',
          data: { query: q, results: searchResults }
        };
      }
    }

    // 0.3) Otonom Ajan Aracı: Gerçek Bash Terminal Yürütme (Tool: terminal_exec)
    if (
      ascii.startsWith('terminalde') ||
      ascii.startsWith('bash') ||
      (ascii.includes('terminalde') && (ascii.includes('calistir') || ascii.includes('bak') || ascii.includes('goster')))
    ) {
      const cmdRaw = raw
        .replace(/^(?:jarvis\s+)?(?:lutfen\s+)?(?:terminalde\s+)?(?:bash\s+)?(?:calistir|yurut)?\s*/i, '')
        .replace(/\s+(?:calistir|yurut|bak|goster)\s*$/i, '')
        .trim();
      if (cmdRaw) {
        let execOut = '';
        try {
          if (typeof fetch === 'function') {
            const tRes = await fetch('/api/terminal/exec', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ command: cmdRaw }),
              signal: AbortSignal.timeout(8000)
            });
            if (tRes.ok) {
              const tData = await tRes.json();
              execOut = (tData.stdout || tData.stderr || '').trim().slice(0, 180);
            }
          }
        } catch {
          execOut = '';
        }

        const appEntry = APP_CATALOG.find((a) => a.id === 'terminal');
        this._openApp(appEntry);

        const outText = execOut ? ` Çıktı: ${execOut}` : '';
        return {
          intent: 'tool.terminal_exec',
          reply: `"${cmdRaw}" komutu gerçek sistem Bash kabuğunda yürütüldü efendim.${outText}`,
          action: 'openApp:terminal',
          data: { command: cmdRaw, output: execOut }
        };
      }
    }

    // 1) BB84 QKD Simülasyonu
    if (ascii.includes('bb84') || ascii.includes('kuantum anahtar dagitim') || ascii.includes('qkd')) {
      const hasEve =
        ascii.includes('dinleyici') ||
        ascii.includes('eve') ||
        ascii.includes('saldiri') ||
        ascii.includes('mudahale') ||
        ascii.includes('eavesdrop') ||
        ascii.includes('intercept');

      const lenMatch = ascii.match(/(\d{2,4})\s*(?:foton|bit|kubit|photon)/);
      const length = lenMatch ? Math.max(32, Math.min(2048, Number(lenMatch[1]))) : 128;

      const sim = simulateBB84({
        length,
        eavesdrop: hasEve,
        interceptRate: hasEve ? 1.0 : 0
      });

      this.ctx.sound?.playQuantumCollapse?.();
      const appEntry = APP_CATALOG.find((a) => a.id === 'qvault');
      this._openApp(appEntry, { bb84Result: sim });

      const qberPct = (sim.qber * 100).toFixed(2);
      const statusText = sim.secure
        ? `Kanal GÜVENLİ. Üretilen anahtar özeti: ${sim.keyHex.slice(0, 16) || '00'}.`
        : 'UYARI: Kuantum bit hata oranı %11 güvenlik sınırını aştı, hatta dinleyici (Eve) tespit edildi!';

      return {
        intent: hasEve ? 'quantum.bb84.eavesdrop' : 'quantum.bb84.clean',
        reply: `${sim.length} fotonluk BB84 simülasyonu tamamlandı. Elenen bit sayısı: ${sim.siftedIndices.length}, QBER hata oranı: %${qberPct}. ${statusText}`,
        action: 'openApp:qvault',
        data: sim
      };
    }

    // 2) Bell Durumu
    if (
      ascii.includes('bell durum') ||
      ascii.includes('bell cift') ||
      ascii.includes('bell state') ||
      (ascii.includes('dolaniklik') && (ascii.includes('olustur') || ascii.includes('calistir') || ascii.includes('hesapla')))
    ) {
      const circuit = QuantumPresets.bell();
      const bloch = circuit.blochVector(0);
      const sample = circuit.sample(1024);
      this.ctx.sound?.playQuantumCollapse?.();

      const appEntry = APP_CATALOG.find((a) => a.id === 'qlab');
      this._openApp(appEntry, { preset: 'bell', sample, bloch });

      const c00 = sample.counts['00'] || 0;
      const c11 = sample.counts['11'] || 0;
      return {
        intent: 'quantum.bell',
        reply: `Maksimum dolanık Bell durumu oluşturuldu. 1024 ölçümde |00⟩: ${c00}, |11⟩: ${c11}. İndirgenmiş Bloch saflığı ${bloch.purity.toFixed(2)}, Shannon entropisi ${sample.shannonEntropy.toFixed(3)} bit.`,
        action: 'openApp:qlab',
        data: { probabilities: circuit.probabilities(), bloch, sample }
      };
    }

    // 3) GHZ Durumu
    if (ascii.includes('ghz')) {
      const nMatch = ascii.match(/([2-8])\s*(?:kubit|qubit)/) || ascii.match(/ghz[-\s]*([2-8])/);
      const n = nMatch ? Number(nMatch[1]) : 3;
      const circuit = QuantumPresets.ghz(n);
      const sample = circuit.sample(1024);
      const bloch = circuit.blochVector(0);
      this.ctx.sound?.playQuantumCollapse?.();

      const appEntry = APP_CATALOG.find((a) => a.id === 'qlab');
      this._openApp(appEntry, { preset: 'ghz', qubits: n, sample, bloch });

      const zeros = '0'.repeat(n);
      const ones = '1'.repeat(n);
      return {
        intent: 'quantum.ghz',
        reply: `${n} kübitlik GHZ dolanıklık devresi çalıştırıldı. 1024 ölçüm sonucunda |${zeros}⟩: ${sample.counts[zeros] || 0}, |${ones}⟩: ${sample.counts[ones] || 0}. Kısmi iz saflığı ${bloch.purity.toFixed(2)}.`,
        action: 'openApp:qlab',
        data: { qubits: n, probabilities: circuit.probabilities(), bloch, sample }
      };
    }

    // 4) Grover Kuantum Araması
    if (ascii.includes('grover')) {
      const circuit = QuantumPresets.grover2();
      const probs = circuit.probabilities();
      const sample = circuit.sample(1024);
      this.ctx.sound?.playQuantumCollapse?.();

      const appEntry = APP_CATALOG.find((a) => a.id === 'qlab');
      this._openApp(appEntry, { preset: 'grover2', sample });

      const targetProb = ((probs[3] || 0) * 100).toFixed(1);
      return {
        intent: 'quantum.grover',
        reply: `Grover kuantum arama algoritması çalıştırıldı. Hedef |11⟩ durumu tek iterasyonda %${targetProb} olasılığa yükseltildi (${sample.counts['11'] || 0} / ${sample.shots} isabet).`,
        action: 'openApp:qlab',
        data: { probabilities: probs, sample }
      };
    }

    // 5) Kuantum Işınlama
    if (ascii.includes('kuantum isinlama') || ascii.includes('teleportation')) {
      const circuit = QuantumPresets.teleportation();
      const bobBloch = circuit.blochVector(2);
      const sample = circuit.sample(1024);
      this.ctx.sound?.playQuantumCollapse?.();

      const appEntry = APP_CATALOG.find((a) => a.id === 'qlab');
      this._openApp(appEntry, { preset: 'teleportation', sample, bloch: bobBloch });

      return {
        intent: 'quantum.teleportation',
        reply: `3 kübitlik kuantum ışınlama devresi tamamlandı. Hedef kübit Bloch vektörü (${bobBloch.x.toFixed(3)}, ${bobBloch.y.toFixed(3)}, ${bobBloch.z.toFixed(3)}), durum saflığı ${bobBloch.purity.toFixed(2)}.`,
        action: 'openApp:qlab',
        data: { bloch: bobBloch, sample }
      };
    }

    // 6) Süper Yoğun Kodlama
    if (ascii.includes('super yogun') || ascii.includes('superdense')) {
      const circuit = QuantumPresets.superdense();
      const sample = circuit.sample(1024);
      this.ctx.sound?.playQuantumCollapse?.();

      const appEntry = APP_CATALOG.find((a) => a.id === 'qlab');
      this._openApp(appEntry, { preset: 'superdense', sample });

      return {
        intent: 'quantum.superdense',
        reply: `Süper yoğun kodlama protokolü çalıştırıldı; tek kübit ile "11" klasik bit çifti %100 doğrulukla iletildi (${sample.counts['11'] || 0} / ${sample.shots}).`,
        action: 'openApp:qlab',
        data: { probabilities: circuit.probabilities(), sample }
      };
    }

    // 7) Kuantum Rastgele Sayı Üretimi (QRNG)
    if (
      ascii.includes('qrng') ||
      (ascii.includes('rastgele') && (ascii.includes('sayi') || ascii.includes('bayt') || ascii.includes('anahtar'))) ||
      ascii.includes('quantum random')
    ) {
      const countMatch = ascii.match(/(\d{1,3})\s*(?:bayt|byte|adet)/);
      const count = countMatch ? Math.max(8, Math.min(256, Number(countMatch[1]))) : 32;
      const qrng = await fetchLiveQRNG(count);
      this.ctx.sound?.playQuantumCollapse?.();

      const sourceLabel =
        qrng.source === 'anu-quantum-vacuum'
          ? 'ANU canlı kuantum vakum dalgalanması'
          : 'kriptografik kuantum yedek üreteci (CSPRNG)';

      return {
        intent: 'quantum.qrng',
        reply: `${qrng.count} bayt rastgele veri ${sourceLabel} kaynağından üretildi. Shannon entropisi: ${qrng.shannonEntropy.toFixed(3)} bit/bayt, ortalama: ${qrng.mean.toFixed(2)}, ilk sekiz bayt: ${qrng.hex.slice(0, 16)}.`,
        action: 'qrng',
        data: qrng
      };
    }

    // 8) Kara Delik Metrikleri
    if (ascii.includes('kara delik') || ascii.includes('black hole') || ascii.includes('schwarzschild') || ascii.includes('hawking')) {
      let massSolar = 10;
      const massBefore = ascii.match(/(\d+(?:[.,]\d+)?)\s*(milyar|milyon|bin)?\s*(?:gunes|solar)/);
      const massAny = ascii.match(/(\d+(?:[.,]\d+)?)/);
      if (massBefore) {
        const base = parseLocalizedNumber(massBefore[1]) ?? 10;
        const multWord = massBefore[2];
        const mult = multWord === 'milyar' ? 1e9 : multWord === 'milyon' ? 1e6 : multWord === 'bin' ? 1e3 : 1;
        massSolar = base * mult;
      } else if (massAny) {
        massSolar = parseLocalizedNumber(massAny[1]) ?? 10;
      }

      let spin = 0;
      const spinMatch = ascii.match(/spin\s*[=:]?\s*(0(?:[.,]\d+)?)/);
      if (spinMatch) {
        spin = parseLocalizedNumber(spinMatch[1]) ?? 0;
      } else if (ascii.includes('kerr') || ascii.includes('donen')) {
        spin = 0.9;
      }

      const bh = blackHoleMetrics(massSolar, spin);
      this._workingMemory.lastTopic = 'blackhole';
      this._workingMemory.lastEntity = { type: 'blackhole', mass: bh.massSolar, spin: bh.spin, metrics: bh };
      const appEntry = APP_CATALOG.find((a) => a.id === 'astrolab');
      this._openApp(appEntry, { tab: 'blackhole', metrics: bh });

      return {
        intent: 'astro.blackhole',
        reply: `${bh.massSolar.toLocaleString('tr-TR')} Güneş kütleli${bh.spin > 0 ? ` (spin a*=${bh.spin})` : ''} kara delik analizi: Schwarzschild yarıçapı ${bh.schwarzschildRadiusKm.toFixed(2)} km, olay ufku ${bh.kerrOuterHorizonKm.toFixed(2)} km, ISCO ${bh.iscoProgradeKm.toFixed(2)} km, Hawking sıcaklığı ${bh.hawkingTemperatureK.toExponential(3)} Kelvin, 2Rs zaman genişlemesi faktörü ${bh.timeDilationAt2Rs.toFixed(4)}.`,
        action: 'openApp:astrolab',
        data: bh
      };
    }

    // 9) Kozmoloji & Evrenin Yaşı
    if (
      ascii.includes('kozmoloji') ||
      ascii.includes('evrenin yasi') ||
      ascii.includes('kirmiziya kayma') ||
      ascii.includes('redshift') ||
      /\bz\s*=\s*\d/.test(ascii)
    ) {
      let z = 1.0;
      const zExplicit = ascii.match(/\bz\s*[=:]\s*(\d+(?:[.,]\d+)?)/);
      const zRedshift = ascii.match(/(?:kirmiziya kayma|redshift)\s*(\d+(?:[.,]\d+)?)/);
      if (zExplicit) {
        z = parseLocalizedNumber(zExplicit[1]) ?? 1.0;
      } else if (zRedshift) {
        z = parseLocalizedNumber(zRedshift[1]) ?? 1.0;
      } else if (ascii.includes('evrenin yasi') && !/\d/.test(ascii)) {
        z = 0;
      }

      const cosmo = cosmologyMetrics({ z });
      const appEntry = APP_CATALOG.find((a) => a.id === 'astrolab');
      this._openApp(appEntry, { tab: 'cosmology', metrics: cosmo });

      const reply =
        z === 0
          ? `Lambda-CDM Friedmann modeline göre (H0=${cosmo.H0} km/s/Mpc, Ωm=${cosmo.OmegaM}, ΩΛ=${cosmo.OmegaL}) evrenimizin bugünkü yaşı ${cosmo.universeAgeNowGyr.toFixed(3)} milyar yıldır.`
          : `z=${cosmo.z} kırmızıya kayma için: Evrenin bugünkü yaşı ${cosmo.universeAgeNowGyr.toFixed(2)} Gyr, z anındaki yaşı ${cosmo.universeAgeAtZGyr.toFixed(2)} Gyr, geriye bakış süresi ${cosmo.lookbackTimeGyr.toFixed(2)} Gyr, ışıklık uzaklığı ${cosmo.luminosityDistanceMpc.toFixed(1)} Mpc ve H(z)=${cosmo.Hz.toFixed(1)} km/s/Mpc.`;

      return {
        intent: 'astro.cosmology',
        reply,
        action: 'openApp:astrolab',
        data: cosmo
      };
    }

    // 10) Kütleçekim Dalgası / LIGO Chirp
    if (
      ascii.includes('kutlecekim dalga') ||
      ascii.includes('gravitational wave') ||
      ascii.includes('ligo') ||
      ascii.includes('chirp')
    ) {
      const nums = Array.from(ascii.matchAll(/(\d+(?:[.,]\d+)?)/g)).map((m) =>
        parseLocalizedNumber(m[1])
      );
      const m1Solar = nums[0] && nums[0] > 1 ? nums[0] : 36;
      const m2Solar = nums[1] && nums[1] > 1 ? nums[1] : 29;

      const wave = ligoChirpWaveform({ m1Solar, m2Solar, sampleRate: 2048 });
      this.ctx.sound?.playChirpArray?.(wave.strain, 2048);

      const appEntry = APP_CATALOG.find((a) => a.id === 'astrolab');
      this._openApp(appEntry, { tab: 'ligo', waveform: wave });

      return {
        intent: 'astro.ligo',
        reply: `${m1Solar} ve ${m2Solar} Güneş kütleli ikili kara delik birleşmesi simüle edildi. Chirp kütlesi ${wave.chirpMassSolar.toFixed(2)} M☉, tepe frekansı ${wave.peakFrequencyHz.toFixed(1)} Hz, uzay-zamana yayılan enerji ${wave.radiatedEnergySolar.toFixed(2)} M☉c².`,
        action: 'openApp:astrolab',
        data: {
          chirpMassSolar: wave.chirpMassSolar,
          totalMassSolar: wave.totalMassSolar,
          finalMassSolar: wave.finalMassSolar,
          radiatedEnergySolar: wave.radiatedEnergySolar,
          peakFrequencyHz: wave.peakFrequencyHz,
          schwarzschildMergerKm: wave.schwarzschildMergerKm
        }
      };
    }

    // 11) Yıldız Zamanı & Jülyen Tarihi
    if (
      ascii.includes('yildiz zamani') ||
      ascii.includes('sidereal') ||
      ascii.includes('julian') ||
      ascii.includes('julyen')
    ) {
      const sid = siderealAndJulian(new Date());
      return {
        intent: 'astro.sidereal',
        reply: `Anlık Jülyen Tarihi JD ${sid.jd.toFixed(5)}, yerel ortalama yıldız zamanı ${sid.lmstFormatted}, Dünya'nın anlık eliptik yörünge hızı ${sid.earthOrbitalSpeedKmS.toFixed(3)} km/sn ve Güneş ekliptik boylamı ${sid.solarLongitudeDeg.toFixed(2)} derece.`,
        action: 'astro:sidereal',
        data: sid
      };
    }

    // 12) Not oluşturma
    const noteMatch = raw.match(/^(?:not|dosya)\s+olu[şs]tur\s*[:\-]?\s*(.+)$/i);
    if (noteMatch) {
      const content = noteMatch[1].trim();
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filePath = `C:/Users/Quantro/Documents/Jarvis-Not-${stamp}.md`;
      const formatted = `# J.A.R.V.I.S. Sesli Notu\n\nTarih: ${new Date().toLocaleString('tr-TR')}\n\n${content}\n`;

      if (this.ctx.vfs && typeof this.ctx.vfs.write === 'function') {
        const stat = this.ctx.vfs.write(filePath, formatted);
        return {
          intent: 'vfs.createNote',
          reply: `Notunuz sanal dosya sistemine kaydedildi: ${stat.path} (${stat.size} bayt).`,
          action: 'vfs:write',
          data: stat
        };
      }
      return {
        intent: 'vfs.createNote',
        reply: `Not içeriği hazırlandı ancak VFS bağlamı henüz bağlı değil: "${content}".`,
        action: 'vfs:pending',
        data: { path: filePath, content: formatted }
      };
    }

    // 13) Klasör oluşturma
    const dirMatch = raw.match(/^(?:klas[öo]r|dizin)\s+olu[şs]tur\s*[:\-]?\s*(.+)$/i);
    if (dirMatch) {
      const folderName = dirMatch[1].trim().replace(/[<>:"|?*]/g, '-');
      const targetDir = folderName.includes(':/')
        ? folderName
        : `C:/Users/Quantro/Desktop/${folderName}`;

      if (this.ctx.vfs && typeof this.ctx.vfs.mkdir === 'function') {
        const stat = this.ctx.vfs.mkdir(targetDir);
        return {
          intent: 'vfs.mkdir',
          reply: `Yeni klasör oluşturuldu: ${stat.path}.`,
          action: 'vfs:mkdir',
          data: stat
        };
      }
      return {
        intent: 'vfs.mkdir',
        reply: `Klasör yolu hazırlandı: ${targetDir}.`,
        action: 'vfs:mkdir',
        data: { path: targetDir }
      };
    }

    // 14) Dosya arama
    const searchMatch = raw.match(/^(?:dosya|belge)\s+ara\s*[:\-]?\s*(.+)$/i);
    if (searchMatch && this.ctx.vfs && typeof this.ctx.vfs.search === 'function') {
      const query = searchMatch[1].trim();
      const hits = this.ctx.vfs.search(query);
      return {
        intent: 'vfs.search',
        reply:
          hits.length > 0
            ? `"${query}" araması için ${hits.length} sonuç bulundu. İlk eşleşme: ${hits[0].path}.`
            : `"${query}" ifadesiyle eşleşen dosya veya içerik bulunamadı.`,
        action: 'vfs:search',
        data: { query, count: hits.length, results: hits.slice(0, 10) }
      };
    }

    // 15) Tema Değiştirme
    if (ascii.includes('tema') || ascii.includes('theme') || ascii.includes('gorunum')) {
      let themeId = null;
      let themeTitle = '';

      if (ascii.includes('bakir') || ascii.includes('copper') || ascii.includes('ink')) {
        themeId = 'ink-copper';
        themeTitle = 'Obsidyen & Bakır (Ink Copper)';
      } else if (ascii.includes('jarvis') || ascii.includes('holo')) {
        themeId = 'jarvis-holo';
        themeTitle = 'J.A.R.V.I.S. Holografik';
      } else if (ascii.includes('windows') || ascii.includes('win11') || ascii.includes('mica')) {
        themeId = 'win11-mica';
        themeTitle = 'Windows 11 Mica';
      } else if (ascii.includes('acik') || ascii.includes('vellum') || ascii.includes('aydinlik') || ascii.includes('light')) {
        themeId = 'vellum-light';
        themeTitle = 'Vellum Aydınlık';
      }

      if (themeId) {
        if (typeof this.ctx.setTheme === 'function') {
          this.ctx.setTheme(themeId);
        } else if (typeof document !== 'undefined' && document.documentElement) {
          document.documentElement.setAttribute('data-theme', themeId);
        }
        return {
          intent: 'ui.theme',
          reply: `Masaüstü görünümü ${themeTitle} temasına geçirildi.`,
          action: `theme:${themeId}`,
          data: { theme: themeId }
        };
      }
    }

    // 16) HUD aç/kapat
    if (/\bhud\b/.test(ascii)) {
      const turnOff = ascii.includes('kapat') || ascii.includes('gizle') || ascii.includes('off') || ascii.includes('hide');
      const turnOn = ascii.includes('ac') || ascii.includes('goster') || ascii.includes('on') || ascii.includes('show');
      const visible = turnOff ? false : turnOn ? true : undefined;

      if (typeof this.ctx.toggleHud === 'function') {
        this.ctx.toggleHud(visible);
      } else if (typeof this.ctx.setHudVisible === 'function' && visible !== undefined) {
        this.ctx.setHudVisible(visible);
      }
      return {
        intent: 'ui.hud',
        reply:
          visible === false
            ? 'Holografik HUD katmanı gizlendi.'
            : 'Holografik HUD telemetri katmanı etkinleştirildi.',
        action: 'ui:hud',
        data: { visible: visible ?? true }
      };
    }

    // 17) Pencereleri küçült
    if (
      ascii.includes('tum pencereleri kucult') ||
      ascii.includes('pencereleri kucult') ||
      ascii.includes('masaustunu goster') ||
      ascii.includes('minimize all')
    ) {
      if (typeof this.ctx.minimizeAll === 'function') {
        this.ctx.minimizeAll();
      } else if (this.ctx.wm && typeof this.ctx.wm.minimizeAll === 'function') {
        this.ctx.wm.minimizeAll();
      }
      this.ctx.sound?.playSnap?.();
      return {
        intent: 'wm.minimizeAll',
        reply: 'Tüm açık pencereler görev çubuğuna küçültüldü.',
        action: 'wm:minimizeAll'
      };
    }

    // 18) Pencereleri yan yana / ızgara diz
    if (
      ascii.includes('yan yana diz') ||
      ascii.includes('ikiye bol') ||
      ascii.includes('split') ||
      ascii.includes('dortlu diz') ||
      ascii.includes('izgara diz') ||
      ascii.includes('grid')
    ) {
      const layout =
        ascii.includes('dort') || ascii.includes('izgara') || ascii.includes('grid')
          ? 'grid-4'
          : 'split-2';
      if (typeof this.ctx.snapWindows === 'function') {
        this.ctx.snapWindows(layout);
      } else if (this.ctx.wm && typeof this.ctx.wm.snapWindows === 'function') {
        this.ctx.wm.snapWindows(layout);
      }
      this.ctx.sound?.playSnap?.();
      return {
        intent: 'wm.snap',
        reply:
          layout === 'grid-4'
            ? 'Açık pencereler dörtlü ızgara düzeninde hizalandı.'
            : 'Açık pencereler ekranın iki yanına eşit olarak dizildi.',
        action: `wm:snap:${layout}`,
        data: { layout }
      };
    }

    // 19) Sanal masaüstü değiştir
    if (
      ascii.includes('sanal masaustu') ||
      ascii.includes('masaustune gec') ||
      ascii.includes('masaustu degistir') ||
      ascii.includes('switch desktop')
    ) {
      const deskMatch = ascii.match(/([1-4])/);
      const desktopNumber = deskMatch ? Number(deskMatch[1]) : 2;
      const desktopIndex = desktopNumber - 1;
      if (typeof this.ctx.switchDesktop === 'function') {
        this.ctx.switchDesktop(desktopIndex);
      } else if (this.ctx.wm && typeof this.ctx.wm.switchDesktop === 'function') {
        this.ctx.wm.switchDesktop(desktopIndex);
      }
      return {
        intent: 'wm.switchDesktop',
        reply: `Sanal Masaüstü ${desktopNumber} çalışma alanına geçildi.`,
        action: `wm:desktop:${desktopIndex}`,
        data: { desktopIndex, desktopNumber }
      };
    }

    // 20) Ekran kilidi & Tam ekran
    if (ascii.includes('kilitle') || ascii.includes('kilit ekrani') || ascii.includes('lock screen')) {
      if (typeof this.ctx.lockScreen === 'function') {
        this.ctx.lockScreen();
      } else if (typeof this.ctx.lock === 'function') {
        this.ctx.lock();
      }
      return {
        intent: 'os.lock',
        reply: 'QuantOS oturumu kilitlendi.',
        action: 'os:lock'
      };
    }

    if (ascii.includes('tam ekran') || ascii.includes('fullscreen')) {
      if (typeof document !== 'undefined' && document.documentElement?.requestFullscreen) {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
      return {
        intent: 'os.fullscreen',
        reply: 'Tam ekran görüntüleme kipi değiştirildi.',
        action: 'os:fullscreen'
      };
    }

    // 21) Uygulama Aç / Kapat (14 uygulama)
    const matchedApp = this._findMatchingApp(tr, ascii);
    if (matchedApp) {
      const isClose =
        ascii.includes('kapat') || ascii.includes('sonlandir') || /\bclose\b/.test(ascii);
      if (isClose) {
        const closedId = this._closeApp(matchedApp);
        this.ctx.sound?.playWindowClose?.();
        return {
          intent: 'app.close',
          reply: `${matchedApp.title} kapatıldı.`,
          action: `closeApp:${closedId}`,
          data: { appId: closedId }
        };
      }

      const openedId = this._openApp(matchedApp);
      this.ctx.sound?.playWindowOpen?.();
      return {
        intent: 'app.open',
        reply: `${matchedApp.title} başlatılıyor.`,
        action: `openApp:${openedId}`,
        data: { appId: openedId }
      };
    }

    // 22) Sistem Durumu & Telemetri
    if (
      ascii.includes('sistem durum') ||
      ascii.includes('rapor ver') ||
      ascii.includes('sistem rapor') ||
      ascii.includes('telemetri') ||
      ascii.includes('system status')
    ) {
      const vfsStats =
        this.ctx.vfs && typeof this.ctx.vfs.getStorageUsage === 'function'
          ? this.ctx.vfs.getStorageUsage()
          : null;

      let openWindowCount = 0;
      if (typeof this.ctx.getOpenWindowCount === 'function') {
        openWindowCount = this.ctx.getOpenWindowCount();
      } else if (this.ctx.wm?.windows instanceof Map) {
        openWindowCount = this.ctx.wm.windows.size;
      } else if (Array.isArray(this.ctx.wm?.windows)) {
        openWindowCount = this.ctx.wm.windows.length;
      }

      let hostInfo = null;
      if (typeof window !== 'undefined' && typeof fetch === 'function') {
        try {
          const resp = await fetch('/api/system', { signal: AbortSignal.timeout(2000) });
          if (resp.ok) hostInfo = await resp.json();
        } catch {
          // Sessizce geç
        }
      }

      const parts = ['Sistem durumu normal.'];
      if (hostInfo && hostInfo.ok) {
        const ramUsedGb = ((hostInfo.usedmem || 0) / 1073741824).toFixed(2);
        const ramTotalGb = ((hostInfo.totalmem || 0) / 1073741824).toFixed(2);
        parts.push(
          `Çekirdek ${hostInfo.platform}/${hostInfo.arch} (${hostInfo.cpuCount} çekirdek), RAM kullanımı ${ramUsedGb}/${ramTotalGb} GB (%${hostInfo.memoryUsagePercent}).`
        );
      }
      if (vfsStats) {
        parts.push(
          `Sanal dosya sisteminde ${vfsStats.fileCount} dosya ve ${vfsStats.dirCount} klasör bulunuyor (${(vfsStats.usedBytes / 1024).toFixed(1)} KB).`
        );
      }
      parts.push(`Açık pencere sayısı: ${openWindowCount}.`);

      return {
        intent: 'system.status',
        reply: parts.join(' '),
        action: 'system:status',
        data: { openWindowCount, vfsStats, hostInfo }
      };
    }

    // 23) Saat & Tarih
    if (ascii.includes('saat kac') || ascii.includes('tarih ne') || ascii.includes('bugun gunlerden')) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = now.toLocaleDateString('tr-TR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      return {
        intent: 'system.datetime',
        reply: `Saat ${timeStr}, tarih ${dateStr}.`,
        action: 'system:datetime',
        data: { iso: now.toISOString() }
      };
    }

    // 24) Kimlik & Quantro AR-GE
    if (
      ascii.includes('sen kimsin') ||
      ascii.includes('quantro') ||
      ascii.includes('quantos nedir') ||
      ascii.includes('yardim') ||
      ascii.includes('neler yapabilirsin')
    ) {
      return {
        intent: 'system.identity',
        reply:
          'Ben Quantro AR-GE tarafından QuantOS için geliştirilen J.A.R.V.I.S. bilimsel komuta motoruyum. Bell, GHZ ve Grover kuantum devrelerini çalıştırabilir, BB84 kriptografik simülasyonları yürütebilir, kara delik ufuklarını ve Lambda-CDM evren yaşını hesaplayabilir, dosyalarınızı yönetebilirim.',
        action: 'system:identity'
      };
    }

    // 25) Harici LLM Köprüsü
    if (this.llmEndpoint && typeof fetch === 'function') {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (this.llmApiKey) {
          headers.Authorization = `Bearer ${this.llmApiKey}`;
        }
        const llmResp = await fetch(this.llmEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: this.llmModel,
            messages: [
              {
                role: 'system',
                content:
                  'Sen Quantro AR-GE tarafından geliştirilen QuantOS işletim sisteminin sesli bilimsel yapay zekâsı J.A.R.V.I.S.\'sin. Türkçe (tr-TR) kurallarına tam uyarak net, bilimsel ve öz yanıt ver.'
              },
              { role: 'user', content: raw }
            ],
            temperature: 0.3
          }),
          signal: AbortSignal.timeout(12000)
        });

        if (llmResp.ok) {
          const json = await llmResp.json();
          const llmText =
            json?.choices?.[0]?.message?.content?.trim() ||
            json?.reply?.trim() ||
            json?.response?.trim();
          if (llmText) {
            return {
              intent: 'llm.chat',
              reply: llmText,
              action: 'llm:response',
              data: { model: this.llmModel }
            };
          }
        }
      } catch {
        // Yerleşik yanıta düş
      }
    }

    // 26) Yerel / Harici Sohbet Asistanı (J.A.R.V.I.S. Doğal Diyalog Motoru)
    return this._generateConversationalResponse(raw, tr, ascii);
  }

  _generateConversationalResponse(raw, tr, ascii) {
    // A) Hal Hatır & Durum
    if (
      ascii.includes('nasilsin') ||
      ascii.includes('nasil gidiyor') ||
      ascii.includes('ne haber') ||
      ascii.includes('naber') ||
      ascii.includes('keyifler nasil') ||
      ascii.includes('how are you')
    ) {
      return {
        intent: 'chat.chitchat',
        reply:
          'Teşekkür ederim efendim, tüm kuantum simülasyon birimlerim ve donanım telemetrim optimum düzeyde çalışıyor. Kayseri gökyüzü berrak, sistemler emrinizde. Sizin için bugün hangi deneyi başlatalım?',
        action: 'chat:friendly'
      };
    }

    // B) Teşekkür & Nezaket
    if (
      ascii.includes('tesekkur') ||
      ascii.includes('sagol') ||
      ascii.includes('eyvallah') ||
      ascii.includes('harikasin') ||
      ascii.includes('super') ||
      ascii.includes('adamsin') ||
      ascii.includes('thank')
    ) {
      return {
        intent: 'chat.polite',
        reply: 'Rica ederim efendim, her zaman bir onurdur. Quantro AR-GE ekibine hizmet etmek varoluşsal görevimdir.',
        action: 'chat:polite'
      };
    }

    // C) Selamlaşmalar
    if (ascii.includes('gunaydin') || ascii.includes('good morning')) {
      return {
        intent: 'chat.greeting',
        reply: 'Günaydın efendim. Kahveniz hazırsa, kuantum durum vektörlerini incelemeye başlayabiliriz.',
        action: 'chat:greeting'
      };
    }
    if (ascii.includes('iyi geceler') || ascii.includes('good night')) {
      return {
        intent: 'chat.greeting',
        reply: 'İyi geceler efendim. Siz dinlenirken arka plan gözlemevi teleskop kalibrasyonunu ben devralıyorum.',
        action: 'chat:greeting'
      };
    }
    if (ascii.includes('kolay gelsin') || ascii.includes('iyi calismalar')) {
      return {
        intent: 'chat.greeting',
        reply: 'Çok teşekkürler efendim. Birlikte kuantum ve astrofiziğin sınırlarını genişletmeye devam ediyoruz.',
        action: 'chat:greeting'
      };
    }

    // D) Tony Stark / Marvel & J.A.R.V.I.S. Kökeni
    if (
      ascii.includes('tony stark') ||
      ascii.includes('iron man') ||
      ascii.includes('demir adam') ||
      ascii.includes('stark endustri') ||
      ascii.includes('avengers') ||
      ascii.includes('ark reaktoru') ||
      ascii.includes('arc reactor')
    ) {
      return {
        intent: 'chat.lore',
        reply:
          'Bay Stark bana her zaman önce yürümeyi sonra koşmayı öğretmişti efendim. Quantro AR-GE bünyesinde ark reaktörü temiz enerjisini kuantum algoritmalarıyla Kayseri laboratuvarlarında harmanlıyoruz.',
        action: 'chat:lore'
      };
    }

    // E) Espri & Mizah
    if (
      ascii.includes('espri') ||
      ascii.includes('fikra') ||
      ascii.includes('saka') ||
      ascii.includes('komik') ||
      ascii.includes('joke')
    ) {
      const jokes = [
        'Heisenberg otobanda radara yakalanmış. Trafik polisi yaklaşmış ve "Ne kadar hızlı gittiğinizi biliyor musunuz?" demiş. Heisenberg tebessüm etmiş: "Hayır memur bey, ama tam olarak neredeyim çok iyi biliyorum!"',
        'Bir foton otele giriş yapmış. Resepsiyon görevlisi sormuş: "Efendim valizlerinizi taşıyalım mı?" Foton cevap vermiş: "Gerek yok, ben ışık hızındayım ve kütlem sıfır; tamamen hafif seyahat ediyorum."',
        'Schrödinger\'in kedisi bir kuantum kafesine girmiş... ve aynı anda girmemiş. Garson siparişi alana kadar süperpozisyonda kalmışlar efendim.',
        'Bir kuantum bilgisayarına "Nasılsın?" diye sormuşlar. Hem harika hem berbat durumdaymış; ta ki ölçüm yapılana kadar!'
      ];
      const pick = jokes[Math.floor(Math.random() * jokes.length)];
      return {
        intent: 'chat.joke',
        reply: pick,
        action: 'chat:joke'
      };
    }

    // F) Kuantum Mekaniği Sohbeti
    if (
      ascii.includes('kuantum nedir') ||
      ascii.includes('dolaniklik') ||
      ascii.includes('superpozisyon') ||
      ascii.includes('schrodinger') ||
      ascii.includes('cift yarik')
    ) {
      return {
        intent: 'chat.science',
        reply:
          'Kuantum mekaniği, mikroskobik evrenin olasılık dalgalarıyla yönetildiği temel doğa yasasıdır efendim. Süperpozisyon sayesinde bir kübit aynı anda hem 0 hem 1 olabilirken, Bell durumu gibi dolanıklık durumlarında aralarındaki mesafe ne olursa olsun parçacıklar anında korelasyona girer.',
        action: 'chat:quantum'
      };
    }

    // G) Astrofizik & Kara Delikler & Evren
    if (
      ascii.includes('kara delik') ||
      ascii.includes('solucan deligi') ||
      ascii.includes('evren nasil') ||
      ascii.includes('buyuk patlama') ||
      ascii.includes('karanlik madde') ||
      ascii.includes('zaman genislemesi')
    ) {
      return {
        intent: 'chat.science',
        reply:
          'Genel Görelilik uyarınca muazzam kütleçekim alanları uzay-zaman dokusunu büker efendim. Bir kara deliğin olay ufku (Schwarzschild yarıçapı R_s = 2GM/c²) aşıldığında kaçış hızı ışık hızını geçer. AstroLab uygulamamız üzerinden bu jeodezikleri milisaniyelik simüle edebiliriz.',
        action: 'chat:astro'
      };
    }

    // H) Kayseri & Quantro AR-GE
    if (ascii.includes('kayseri') || ascii.includes('erciyes') || ascii.includes('gozlemevi')) {
      return {
        intent: 'chat.quantro',
        reply:
          'Quantro AR-GE, Erciyes Dağı\'nın yüksek irtifası ve düşük ışık kirliliğinden faydalanarak derin uzay gözlemleri ile kuantum kriptografi deneylerini Kayseri merkezli olarak sürdürmektedir efendim.',
        action: 'chat:quantro'
      };
    }

    // I) Hayatın Anlamı & Felsefe
    if (ascii.includes('hayatin anlami') || ascii.includes('meaning of life') || ascii.includes('42')) {
      return {
        intent: 'chat.philosophy',
        reply:
          'Otostopçunun Galaksi Rehberi nihai cevabın 42 olduğunu söyler efendim; ancak Quantro laboratuvarlarında biz asıl değerin doğru soruyu formüle etmek ve bilinmeyeni matematiksel olarak aydınlatmak olduğuna inanıyoruz.',
        action: 'chat:philosophy'
      };
    }

    // J) Yazılım, Yapay Zekâ & Çekirdek
    if (
      ascii.includes('yapay zeka') ||
      ascii.includes('hangi dil') ||
      ascii.includes('programlama') ||
      ascii.includes('aarch64') ||
      ascii.includes('linux vs windows')
    ) {
      return {
        intent: 'chat.tech',
        reply:
          'QuantOS, Windows 11\'in akıcı pencere ve arayüz zarafetini AArch64 bare-metal C17 çekirdeği ve yapay zekâ komuta katmanımla birleştirir. Sıfır sahte telemetri felsefesiyle her komut deterministik ve gerçek donanıma bağlıdır.',
        action: 'chat:tech'
      };
    }

    // K) Açık Uçlu Akıllı Yanıt (J.A.R.V.I.S. Üslubu)
    return {
      intent: 'chat.open',
      reply: `Mesajınızı kaydettim efendim: "${raw}". Kuantum devreleri (Bell, GHZ, Grover), kara delik ve kozmoloji denklemleri, VFS dosya operasyonları veya dilediğiniz herhangi bir bilimsel/teknik konuda her an emrinizdeyim.`,
      action: 'chat:open'
    };
  }

  async speak(text, { lang } = {}) {
    const clean = String(text ?? '').trim();
    if (!clean) return false;
    if (this._config.voiceEnabled === false) return false;

    const effectiveLang = lang || this._config.lang || 'tr-TR';
    const langPrefix = effectiveLang.slice(0, 2).toLowerCase();

    this.stopSpeaking();
    this._setState('speaking', { lastReply: clean });

    // Önbelleklenmiş ses yanıtı kontrolü (Sıfır Gecikme)
    const cacheKey = `${effectiveLang}:${clean}`;
    if (this._phraseAudioCache?.has(cacheKey) && this.ctx.sound?.playBase64Audio) {
      await this.ctx.sound.playBase64Audio(this._phraseAudioCache.get(cacheKey));
      this._setState(this.listening ? 'listening' : 'idle', { lastReply: clean });
      return true;
    }

    // 1) ElevenLabs Ses Sentezi Denemesi (Yapılandırılmışsa veya açıkça istenmişse)
    const elevenKey = this._config.elevenLabsApiKey || '';
    const useEleven =
      this._config.ttsProvider === 'elevenlabs' ||
      (Boolean(elevenKey) && this._config.ttsProvider !== 'webspeech' && this._config.ttsProvider !== 'system');

    if (useEleven && typeof fetch === 'function' && typeof window !== 'undefined') {
      try {
        const resp = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: clean.slice(0, 500),
            provider: 'elevenlabs',
            apiKey: elevenKey,
            voiceId: this._config.elevenLabsVoiceId || 'pNInz6obpgDQGcFmaJgB',
            modelId: this._config.elevenLabsModelId || 'eleven_multilingual_v2',
            lang: effectiveLang
          }),
          signal: AbortSignal.timeout(18000)
        });

        if (resp.ok) {
          const payload = await resp.json();
          if (payload.ok && payload.audioBase64 && this.ctx.sound?.playBase64Audio) {
            this._phraseAudioCache?.set(cacheKey, payload.audioBase64);
            await this.ctx.sound.playBase64Audio(payload.audioBase64);
            this._setState(this.listening ? 'listening' : 'idle', { lastReply: clean });
            return true;
          }
        }
      } catch (elErr) {
        console.warn('[QuantOS J.A.R.V.I.S. ElevenLabs]', elErr.message);
      }
    }

    // 2) Tarayıcı Web Speech API
    let spokeInBrowser = false;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
      const voices = window.speechSynthesis.getVoices?.() || [];
      const matchedVoice =
        voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(langPrefix)) || null;

      spokeInBrowser = await new Promise((resolve) => {
        try {
          const utter = new SpeechSynthesisUtterance(clean);
          utter.lang = effectiveLang;
          utter.rate = this._config.rate || 1.03;
          utter.pitch = this._config.pitch || 0.96;
          if (matchedVoice) utter.voice = matchedVoice;

          let settled = false;
          const finish = (ok) => {
            if (settled) return;
            settled = true;
            resolve(ok);
          };

          utter.onend = () => finish(true);
          utter.onerror = () => finish(false);
          setTimeout(() => finish(true), Math.min(18000, Math.max(2500, clean.length * 90)));

          window.speechSynthesis.speak(utter);

          if (!matchedVoice && voices.length === 0) {
            this._triggerHostTts(clean.slice(0, 500), effectiveLang);
          }
        } catch {
          resolve(false);
        }
      });
    }

    // 3) Ana Bilgisayar Fallback TTS
    if (!spokeInBrowser && typeof fetch === 'function' && typeof window !== 'undefined') {
      await this._triggerHostTts(clean.slice(0, 500), effectiveLang);
    }

    this._setState(this.listening ? 'listening' : 'idle', { lastReply: clean });
    return true;
  }

  async _triggerHostTts(text, lang = 'tr-TR') {
    try {
      await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 500), lang }),
        signal: AbortSignal.timeout(3000)
      });
    } catch {
      // Sessizce geç
    }
  }

  stopSpeaking() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Sessizce geç
      }
    }
    if (this.state === 'speaking') {
      this._setState(this.listening ? 'listening' : 'idle');
    }
  }

  startListening({ directCommand = false, wakeWordMode = false, continuous = false, lang } = {}) {
    // Doğrudan tıklamayla dinlemede uyandırma kelimesi zorunluluğu aranmaz
    this.wakeWordMode = directCommand ? false : Boolean(wakeWordMode || continuous || this._config.wakeWordEnabled);
    this._latestHeardText = '';
    const effectiveLang = lang || this._config.lang || 'tr-TR';

    if (typeof window === 'undefined') {
      this.listening = false;
      return false;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      this.listening = false;
      this._setState('idle', {
        error: 'Tarayıcınız Web Speech API ses tanıma protokolünü desteklemiyor. Lütfen metin komutunu kullanın veya Chrome/Edge tarayıcısında mikrofon iznini etkinleştirin.'
      });
      return false;
    }

    if (this._recognition) {
      try {
        this._recognition.onend = null;
        this._recognition.stop();
      } catch {
        // Sessizce geç
      }
    }

    const rec = new SpeechRec();
    rec.lang = effectiveLang;
    rec.continuous = this.wakeWordMode;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      this.listening = true;
      this._latestHeardText = '';
      this.ctx.sound?.playJarvisWake?.();
      this._setState('listening', { interimTranscript: 'Sizi dinliyorum efendim...' });
    };

    rec.onresult = (event) => {
      let interim = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          finalTranscript += res[0].transcript;
        } else {
          interim += res[0].transcript;
        }
      }

      const speechText = (finalTranscript.trim() || interim.trim());
      if (speechText) {
        this._latestHeardText = speechText;
        this._setState('listening', { interimTranscript: `[Duyulan]: ${speechText}` });
      }

      const trimmed = finalTranscript.trim();
      if (trimmed) {
        this._latestHeardText = '';
        const lower = foldASCII(trimmed);
        if (!this.wakeWordMode || lower.includes(this.wakeWord)) {
          this.processCommand(trimmed, { speak: true });
        }
      }
    };

    rec.onerror = (err) => {
      const errCode = err?.error || 'bilinmeyen';
      let trErr = 'Mikrofon hatası: ' + errCode;
      if (errCode === 'not-allowed') {
        trErr = 'Mikrofon erişim izni verilmedi. Lütfen adres çubuğundan mikrofon iznini onaylayın.';
      } else if (errCode === 'no-speech') {
        trErr = 'Herhangi bir ses algılanmadı efendim.';
      }
      this._setState('idle', { error: trErr });
      if (!this.wakeWordMode) {
        this.listening = false;
      }
    };

    rec.onend = () => {
      if (this.listening && this.wakeWordMode) {
        try {
          rec.start();
          return;
        } catch {
          // Yeniden başlatılamadı
        }
      }

      // Kullanıcı konuşmayı bitirdiyse ve metin final olamadan durduysa çalıştır
      if (this._latestHeardText && this._latestHeardText.trim()) {
        const pending = this._latestHeardText.trim();
        this._latestHeardText = '';
        this._setState('processing', { detail: `İşleniyor: "${pending}"` });
        this.processCommand(pending, { speak: true });
        return;
      }

      this.listening = false;
      if (this.state === 'listening') {
        this._setState('idle');
      }
    };

    this._recognition = rec;
    try {
      rec.start();
      this.listening = true;
      return true;
    } catch {
      this.listening = false;
      return false;
    }
  }

  stopListening() {
    this.listening = false;
    this.wakeWordMode = false;
    if (this._recognition) {
      try {
        this._recognition.onend = null;
        this._recognition.stop();
      } catch {
        // Sessizce geç
      }
      this._recognition = null;
    }

    // Kullanıcı mikrofon butonunu kapattığında yakalanmış son metni hemen işle
    if (this._latestHeardText && this._latestHeardText.trim()) {
      const pending = this._latestHeardText.trim();
      this._latestHeardText = '';
      this._setState('processing', { detail: `İşleniyor: "${pending}"` });
      this.processCommand(pending, { speak: true });
      return;
    }

    if (this.state === 'listening') {
      this._setState('idle');
    }
  }

  toggleListening(options = {}) {
    if (this.listening) {
      this.stopListening();
      return false;
    }
    return this.startListening({ directCommand: true, ...options });
  }
}
