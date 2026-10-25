/**
 * QuantOS — Sanal Dosya Sistemi (VirtualFileSystem)
 * Tarayıcıda IndexedDB + localStorage kalıcılığı, Node.js test ortamında bellek içi çalışma,
 * WebCrypto PBKDF2 (SHA-256, 100.000 iterasyon) + AES-256-GCM gerçek dosya şifreleme desteği.
 */

const STORAGE_KEY = 'quantos.vfs.v1';
const IDB_NAME = 'QuantOS_VFS_DB';
const IDB_STORE = 'snapshots';
const QUOTA_BYTES = 16 * 1024 * 1024;
const ENC_MAGIC = 'QUANTOS-ENC-V1';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bytesToBase64(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(u8).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < u8.length; i++) {
    binary += String.fromCharCode(u8[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64) {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function inferMime(filePath) {
  const lower = String(filePath).toLowerCase();
  if (lower.endsWith('.md')) return 'text/markdown';
  if (lower.endsWith('.json')) return 'application/json';
  if (lower.endsWith('.qasm')) return 'text/x-qasm';
  if (lower.endsWith('.js') || lower.endsWith('.mjs')) return 'text/javascript';
  if (lower.endsWith('.html')) return 'text/html';
  if (lower.endsWith('.css')) return 'text/css';
  if (lower.endsWith('.txt') || lower.endsWith('.log')) return 'text/plain';
  return 'application/octet-stream';
}

function buildDefaultFiles() {
  return {
    'C:/QuantOS/System32/kernel-info.json': JSON.stringify(
      {
        os: 'QuantOS',
        codename: 'Singularity Copper',
        version: '1.0.0',
        architecture: 'aarch64-quantro-baremetal',
        organization: 'Quantro AR-GE',
        subsystems: [
          'QuantumCircuit Statevector Engine (1-8 Qubit)',
          'BB84 Polarization QKD & QRNG Subsystem',
          'Kerr-Newman & Lambda-CDM Relativistic Astro Engine',
          'AES-256-GCM Virtual File System',
          'J.A.R.V.I.S. Bilingual Neural Command Matrix'
        ],
        bootMode: 'UEFI-Limine-rev2 + WebOS Hybrid'
      },
      null,
      2
    ),

    'C:/Users/Quantro/Desktop/Quantro-Manifesto.md': `# QuantOS — Bilimsel İşletim Sistemi Manifestosu

**Quantro AR-GE** tarafından tasarlanan **QuantOS**, kuantum hesaplama, relativistik astrofizik ve kriptografik güvenliği tek bir masaüstü çekirdeğinde birleştirir.

## Temel İlkeler
1. **Gerçek Matematik:** Durum vektörü genlikleri, kısmi iz Bloch vektörleri ve Bardeen-Press-Teukolsky Kerr ufuk denklemleri tam analitik/sayısal doğrulukla çözülür.
2. **Sıfır Sahte Telemetri:** Her rastgelelik ve sistem verisi kaynak etiketiyle (\`provenance\`) doğrulanır.
3. **Sesli Bilimsel Komuta:** J.A.R.V.I.S. doğal dilde kuantum devreleri kurar ve kozmolojik integraller hesaplar.
`,

    'C:/Users/Quantro/Desktop/Bell-Durumu.qasm': `OPENQASM 2.0;
include "qelib1.inc";
qreg q[2];
creg c[2];
// Maksimum dolanık Bell durumu |Phi+> = (|00> + |11>) / sqrt(2)
h q[0];
cx q[0],q[1];
`,

    'C:/Users/Quantro/Documents/Quantro-ARGE-Raporu.md': `# Quantro AR-GE — 2026 Kuantum ve Astrofizik Sistem Raporu

## 1. Kuantum Hesaplama Birimi
- **Durum Uzayı:** $2^n$ karmaşık genlikli birim (unitary) evrim motoru ($1 \\le n \\le 8$).
- **Dolanıklık Analizi:** $\\rho_q = \\text{Tr}_{\\neq q}(|\\psi\\rangle\\langle\\psi|)$ kısmi izi üzerinden saflık ($\\gamma = 0.5$) doğrulaması.

## 2. Kriptografik Güvenlik Katmanı
- **BB84 QKD:** Doğrusal ($+$) ve köşegen ($\\times$) polarizasyon tabanlarında foton iletimi; QBER $\\ge %11$ durumunda dinleyici (Eve) tespiti.
- **VFS Kasa Şifrelemesi:** PBKDF2-HMAC-SHA256 + AES-256-GCM kimlik doğrulamalı şifreleme.

## 3. Gözlemevi Hesaplamaları
- **Kerr Kara Delikleri:** Dönme parametresi $a_*$ için olay ufku, foton küresi ve ISCO yarıçapları.
- **LIGO Kütleçekim Dalgaları:** GW150914 ikili kara delik birleşmesi Post-Newtonian dalga formu üretimi.
`,

    'C:/Users/Quantro/Documents/Gorev-Notlari.txt': `QuantOS Günlük Araştırma Görev Listesi
========================================
[x] 3-kübit GHZ dolanıklık devresini OpenQASM 2.0 olarak dışa aktar
[x] BB84 protokolünde %100 Eve müdahalesinde QBER ~%25 sapmasını doğrula
[x] Sagittarius A* (~4.154e6 Güneş kütlesi) için Schwarzschild yarıçapını kontrol et
[ ] J.A.R.V.I.S. ile z=2.5 kırmızıya kayma değerinde ışıklık uzaklığını sorgula
`,

    'C:/Users/Quantro/Research/Kara-Delik-Mercekleme.md': `# Kerr Uzay-Zamanında Kütleçekimsel Mercekleme ve ISCO

Dönen bir Kerr kara deliğinin dış olay ufku yarıçapı:

$$r_+ = \\frac{GM}{c^2}\\left(1 + \\sqrt{1 - a_*^2}\\right)$$

Burada boyutsuz spin parametresi $a_* = \\frac{Jc}{GM^2} \\in [0, 1)$ aralığındadır.
- Schwarzschild limitinde ($a_* = 0$): $r_+ = R_s = \\frac{2GM}{c^2}$, $r_{\\text{ISCO}} = 3R_s$, ışıma verimi $\\eta \\approx %5.72$.
- Ekstremal Kerr limitinde ($a_* \\to 1$): $r_{\\text{ISCO,pro}} \\to \\frac{GM}{c^2}$, ışıma verimi $\\eta \\approx %42.3$.
`,

    'C:/Users/Quantro/Research/BB84-Protokolu-Analizi.md': `# BB84 Kuantum Anahtar Dağıtımı Hata Oranı (QBER) Analizi

Alice her biti rastgele Z ($+$) veya X ($\\times$) tabanında kodlar.
- **Dinleyici Yokken:** Uyuşan tabanlarda Bob %100 doğrulukla ölçüm yapar ($\\text{QBER} = 0$).
- **Intercept-Resend Saldırısı (Eve):** Eve %50 olasılıkla yanlış taban seçer ve foton durumunu bozar. Uyuşan Alice-Bob tabanlarında bu bozulma %50 olasılıkla bit hatası üretir:

$$E[\\text{QBER}] = \\frac{1}{2} \\times \\frac{1}{2} = 0.25 \\quad (\\%25)$$

Shor-Preskill güvenlik sınırına göre $\\text{QBER} \\ge %11$ olduğunda anahtar oturumu derhal iptal edilir.
`,

    'C:/Users/Quantro/Circuits/Bell-Pair.qasm': `OPENQASM 2.0;
include "qelib1.inc";
qreg q[2];
creg c[2];
h q[0];
cx q[0],q[1];
`,

    'C:/Users/Quantro/Circuits/GHZ-3Qubit.qasm': `OPENQASM 2.0;
include "qelib1.inc";
qreg q[3];
creg c[3];
h q[0];
cx q[0],q[1];
cx q[1],q[2];
`,

    'C:/Users/Quantro/Circuits/Grover-Search.qasm': `OPENQASM 2.0;
include "qelib1.inc";
qreg q[2];
creg c[2];
h q[0];
h q[1];
cz q[0],q[1];
h q[0];
h q[1];
z q[0];
z q[1];
cz q[0],q[1];
h q[0];
h q[1];
`,

    'C:/Users/Quantro/Scripts/kuantum-deney.js': `// QuantOS Bilimsel Betik Örneği — Bell Çifti, BB84 ve Kara Delik Özeti
// QuantCode Studio yerleşik QuantumPresets, QuantumCircuit, simulateBB84 ve blackHoleMetrics motorlarını sağlar.

const bell = QuantumPresets.bell();
const bloch = bell.blochVector(0);
const orneklem = bell.sample(512, 42);
const sgrA = blackHoleMetrics(4.154e6, 0.9);

console.log('Bell Olasılıkları:', bell.probabilities());
console.log('Kübit-0 Bloch Saflığı:', bloch.purity);
console.log('512 Ölçüm Dağılımı:', orneklem.counts);
console.log('Sgr A* Kerr Olay Ufku (km):', sgrA.eventHorizonRadiusKm.toFixed(1));
`
  };
}

const DEFAULT_EXTRA_DIRS = [
  'C:/QuantOS',
  'C:/QuantOS/System32',
  'C:/Users',
  'C:/Users/Quantro',
  'C:/Users/Quantro/Desktop',
  'C:/Users/Quantro/Documents',
  'C:/Users/Quantro/Research',
  'C:/Users/Quantro/Circuits',
  'C:/Users/Quantro/Scripts',
  'C:/Users/Quantro/Downloads',
  'C:/Users/Quantro/Pictures'
];

export class VirtualFileSystem {
  constructor(options = {}) {
    this.storageKey = options.storageKey || STORAGE_KEY;
    this.quotaBytes = Number(options.quotaBytes) || QUOTA_BYTES;
    this.useBrowserStorage =
      options.persist !== false && typeof window !== 'undefined';
    this._nodes = new Map();
    this._listeners = new Set();
    this._idb = null;
    this._initialized = false;

    this._seedDefaults();
    if (this.useBrowserStorage) {
      this._loadFromLocalStorageSync();
    }
  }

  normalizePath(p) {
    if (p === null || p === undefined || String(p).trim() === '') {
      return 'C:/';
    }
    let raw = String(p).trim().replace(/\\/g, '/');

    if (/^[a-zA-Z]:$/.test(raw)) {
      return `${raw[0].toUpperCase()}:/`;
    }
    if (/^[a-zA-Z]:\//.test(raw)) {
      raw = `${raw[0].toUpperCase()}:${raw.slice(2)}`;
    } else if (raw.startsWith('/')) {
      raw = `C:${raw}`;
    } else {
      raw = `C:/Users/Quantro/${raw}`;
    }

    const parts = raw.slice(2).split('/');
    const stack = [];
    for (const seg of parts) {
      if (!seg || seg === '.') continue;
      if (seg === '..') {
        if (stack.length > 0) stack.pop();
      } else {
        stack.push(seg);
      }
    }

    return stack.length === 0 ? 'C:/' : `C:/${stack.join('/')}`;
  }

  _parentPath(normPath) {
    if (normPath === 'C:/') return null;
    const idx = normPath.lastIndexOf('/');
    if (idx <= 2) return 'C:/';
    return normPath.slice(0, idx);
  }

  _baseName(normPath) {
    if (normPath === 'C:/') return 'C:';
    const idx = normPath.lastIndexOf('/');
    return normPath.slice(idx + 1);
  }

  _seedDefaults() {
    this._nodes.clear();
    const now = new Date().toISOString();

    this._nodes.set('C:/', {
      path: 'C:/',
      name: 'C:',
      type: 'dir',
      content: '',
      size: 0,
      createdAt: now,
      modifiedAt: now,
      mime: 'inode/directory',
      encrypted: false,
      meta: { system: true }
    });

    for (const dir of DEFAULT_EXTRA_DIRS) {
      this._ensureDirInternal(this.normalizePath(dir), now);
    }

    const defaultFiles = buildDefaultFiles();
    for (const [rawPath, content] of Object.entries(defaultFiles)) {
      const norm = this.normalizePath(rawPath);
      this._ensureDirInternal(this._parentPath(norm), now);
      const byteSize = textEncoder.encode(content).byteLength;
      this._nodes.set(norm, {
        path: norm,
        name: this._baseName(norm),
        type: 'file',
        content,
        size: byteSize,
        createdAt: now,
        modifiedAt: now,
        mime: inferMime(norm),
        encrypted: false,
        meta: {}
      });
    }
  }

  _ensureDirInternal(normDir, timestamp = new Date().toISOString()) {
    if (!normDir || normDir === 'C:/') return;
    const segments = normDir.slice(3).split('/').filter(Boolean);
    let current = 'C:';
    for (const seg of segments) {
      current = `${current}/${seg}`;
      const existing = this._nodes.get(current);
      if (existing && existing.type === 'file') {
        throw new Error(`Dizin oluşturulamadı; aynı adla dosya mevcut: ${current}`);
      }
      if (!existing) {
        this._nodes.set(current, {
          path: current,
          name: seg,
          type: 'dir',
          content: '',
          size: 0,
          createdAt: timestamp,
          modifiedAt: timestamp,
          mime: 'inode/directory',
          encrypted: false,
          meta: {}
        });
      }
    }
  }

  _serialize() {
    return JSON.stringify({
      version: 1,
      savedAt: new Date().toISOString(),
      entries: Array.from(this._nodes.values())
    });
  }

  _deserialize(serialized) {
    if (!serialized) return false;
    try {
      const parsed = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
      if (!parsed || !Array.isArray(parsed.entries) || parsed.entries.length === 0) {
        return false;
      }
      const nextMap = new Map();
      for (const entry of parsed.entries) {
        if (entry && typeof entry.path === 'string') {
          nextMap.set(entry.path, {
            path: entry.path,
            name: entry.name || this._baseName(entry.path),
            type: entry.type === 'dir' ? 'dir' : 'file',
            content: typeof entry.content === 'string' ? entry.content : '',
            size: Number(entry.size ?? 0),
            createdAt: entry.createdAt || new Date().toISOString(),
            modifiedAt: entry.modifiedAt || new Date().toISOString(),
            mime: entry.mime || (entry.type === 'dir' ? 'inode/directory' : inferMime(entry.path)),
            encrypted: Boolean(entry.encrypted),
            meta: entry.meta && typeof entry.meta === 'object' ? { ...entry.meta } : {}
          });
        }
      }
      if (!nextMap.has('C:/')) return false;
      this._nodes = nextMap;
      return true;
    } catch {
      return false;
    }
  }

  _loadFromLocalStorageSync() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) {
          this._deserialize(raw);
        }
      }
    } catch {
      // Depolama kısıtlı
    }
  }

  _openIndexedDB() {
    return new Promise((resolve) => {
      if (!this.useBrowserStorage || typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      try {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  async init() {
    if (this._initialized) return this;
    this._initialized = true;

    if (this.useBrowserStorage) {
      this._idb = await this._openIndexedDB();
      if (this._idb) {
        const snap = await new Promise((resolve) => {
          try {
            const tx = this._idb.transaction(IDB_STORE, 'readonly');
            const store = tx.objectStore(IDB_STORE);
            const getReq = store.get(this.storageKey);
            getReq.onsuccess = () => resolve(getReq.result || null);
            getReq.onerror = () => resolve(null);
          } catch {
            resolve(null);
          }
        });
        if (snap) {
          this._deserialize(snap);
        } else {
          this._persist();
        }
      }
    }
    return this;
  }

  _persist() {
    if (!this.useBrowserStorage) return;
    const payload = this._serialize();
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, payload);
      }
    } catch {
      // IndexedDB devralır
    }

    if (this._idb) {
      try {
        const tx = this._idb.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(payload, this.storageKey);
      } catch {
        // Sessizce geç
      }
    }
  }

  _emitChange(event) {
    for (const fn of this._listeners) {
      try {
        fn(event);
      } catch {
        // Sessizce geç
      }
    }
  }

  onChange(fn) {
    if (typeof fn !== 'function') {
      return () => {};
    }
    this._listeners.add(fn);
    return () => {
      this._listeners.delete(fn);
    };
  }

  _toStat(node) {
    if (!node) return null;
    const dotIdx = node.name.lastIndexOf('.');
    const ext = node.type === 'file' && dotIdx > 0 ? node.name.slice(dotIdx).toLowerCase() : '';
    return {
      path: node.path,
      name: node.name,
      type: node.type,
      size: node.size,
      createdAt: node.createdAt,
      modifiedAt: node.modifiedAt,
      mime: node.mime,
      ext,
      encrypted: Boolean(node.encrypted),
      meta: { ...(node.meta || {}) }
    };
  }

  exists(p) {
    return this._nodes.has(this.normalizePath(p));
  }

  stat(p) {
    const node = this._nodes.get(this.normalizePath(p));
    return this._toStat(node);
  }

  list(dirPath = 'C:/') {
    const norm = this.normalizePath(dirPath);
    const dirNode = this._nodes.get(norm);
    if (!dirNode || dirNode.type !== 'dir') {
      return [];
    }

    const prefix = norm === 'C:/' ? 'C:/' : `${norm}/`;
    const children = [];

    for (const [entryPath, node] of this._nodes.entries()) {
      if (entryPath === norm) continue;
      if (entryPath.startsWith(prefix)) {
        const remainder = entryPath.slice(prefix.length);
        if (!remainder.includes('/')) {
          children.push(this._toStat(node));
        }
      }
    }

    children.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'dir' ? -1 : 1;
      }
      return a.name.localeCompare(b.name, 'tr-TR');
    });

    return children;
  }

  read(filePath) {
    const norm = this.normalizePath(filePath);
    const node = this._nodes.get(norm);
    if (!node) {
      throw new Error(`Dosya bulunamadı: ${norm}`);
    }
    if (node.type !== 'file') {
      throw new Error(`Belirtilen yol bir dosya değil: ${norm}`);
    }
    return node.content;
  }

  write(filePath, content = '', meta = {}) {
    const norm = this.normalizePath(filePath);
    if (norm === 'C:/') {
      throw new Error('Kök dizin üzerine dosya yazılamaz.');
    }

    const existing = this._nodes.get(norm);
    if (existing && existing.type === 'dir') {
      throw new Error(`Aynı adla klasör mevcut: ${norm}`);
    }

    const now = new Date().toISOString();
    const parent = this._parentPath(norm);
    this._ensureDirInternal(parent, now);

    const strContent = String(content ?? '');
    const byteSize = textEncoder.encode(strContent).byteLength;

    const encryptedFlag =
      meta && typeof meta.encrypted === 'boolean'
        ? meta.encrypted
        : existing
          ? Boolean(existing.encrypted)
          : false;

    const mergedMeta = {
      ...(existing?.meta || {}),
      ...(meta || {})
    };
    delete mergedMeta.encrypted;

    const record = {
      path: norm,
      name: this._baseName(norm),
      type: 'file',
      content: strContent,
      size: byteSize,
      createdAt: existing ? existing.createdAt : now,
      modifiedAt: now,
      mime: meta?.mime || existing?.mime || inferMime(norm),
      encrypted: encryptedFlag,
      meta: mergedMeta
    };

    this._nodes.set(norm, record);
    this._persist();
    this._emitChange({ action: 'write', path: norm });
    return this._toStat(record);
  }

  mkdir(dirPath) {
    const norm = this.normalizePath(dirPath);
    const existing = this._nodes.get(norm);
    if (existing) {
      if (existing.type === 'file') {
        throw new Error(`Aynı adla dosya mevcut: ${norm}`);
      }
      return this._toStat(existing);
    }

    this._ensureDirInternal(norm, new Date().toISOString());
    this._persist();
    this._emitChange({ action: 'mkdir', path: norm });
    return this.stat(norm);
  }

  remove(p) {
    const norm = this.normalizePath(p);
    if (norm === 'C:/') {
      throw new Error('Kök sürücü (C:/) silinemez.');
    }
    const target = this._nodes.get(norm);
    if (!target) return false;

    if (target.type === 'dir') {
      const prefix = `${norm}/`;
      for (const key of Array.from(this._nodes.keys())) {
        if (key === norm || key.startsWith(prefix)) {
          this._nodes.delete(key);
        }
      }
    } else {
      this._nodes.delete(norm);
    }

    this._persist();
    this._emitChange({ action: 'remove', path: norm });
    return true;
  }

  rename(oldPath, newPath) {
    const srcNorm = this.normalizePath(oldPath);
    const dstNorm = this.normalizePath(newPath);
    if (srcNorm === 'C:/') {
      throw new Error('Kök dizin yeniden adlandırılamaz.');
    }
    if (srcNorm === dstNorm) {
      return this.stat(srcNorm);
    }

    const srcNode = this._nodes.get(srcNorm);
    if (!srcNode) {
      throw new Error(`Kaynak bulunamadı: ${srcNorm}`);
    }
    if (srcNode.type === 'dir' && dstNorm.startsWith(`${srcNorm}/`)) {
      throw new Error('Bir klasör kendi alt klasörünün içine taşınamaz.');
    }

    const now = new Date().toISOString();
    this._ensureDirInternal(this._parentPath(dstNorm), now);

    if (srcNode.type === 'file') {
      this._nodes.delete(srcNorm);
      const updated = {
        ...srcNode,
        path: dstNorm,
        name: this._baseName(dstNorm),
        mime: inferMime(dstNorm),
        modifiedAt: now
      };
      this._nodes.set(dstNorm, updated);
    } else {
      const prefix = `${srcNorm}/`;
      const toMove = [];
      for (const [k, node] of this._nodes.entries()) {
        if (k === srcNorm || k.startsWith(prefix)) {
          toMove.push(node);
        }
      }
      for (const node of toMove) {
        this._nodes.delete(node.path);
      }
      for (const node of toMove) {
        const suffix = node.path === srcNorm ? '' : node.path.slice(srcNorm.length);
        const targetPath = `${dstNorm}${suffix}`;
        this._nodes.set(targetPath, {
          ...node,
          path: targetPath,
          name: this._baseName(targetPath),
          modifiedAt: now
        });
      }
    }

    this._persist();
    this._emitChange({ action: 'rename', oldPath: srcNorm, path: dstNorm });
    return this.stat(dstNorm);
  }

  copy(src, dst) {
    const srcNorm = this.normalizePath(src);
    const dstNorm = this.normalizePath(dst);
    const srcNode = this._nodes.get(srcNorm);
    if (!srcNode) {
      throw new Error(`Kopyalanacak kaynak bulunamadı: ${srcNorm}`);
    }
    if (srcNorm === dstNorm) {
      return this.stat(srcNorm);
    }
    if (srcNode.type === 'dir' && dstNorm.startsWith(`${srcNorm}/`)) {
      throw new Error('Klasör kendi alt dizinine kopyalanamaz.');
    }

    const now = new Date().toISOString();
    this._ensureDirInternal(this._parentPath(dstNorm), now);

    if (srcNode.type === 'file') {
      this._nodes.set(dstNorm, {
        ...srcNode,
        path: dstNorm,
        name: this._baseName(dstNorm),
        createdAt: now,
        modifiedAt: now,
        meta: { ...(srcNode.meta || {}) }
      });
    } else {
      const prefix = `${srcNorm}/`;
      for (const [k, node] of Array.from(this._nodes.entries())) {
        if (k === srcNorm || k.startsWith(prefix)) {
          const suffix = k === srcNorm ? '' : k.slice(srcNorm.length);
          const targetPath = `${dstNorm}${suffix}`;
          this._nodes.set(targetPath, {
            ...node,
            path: targetPath,
            name: this._baseName(targetPath),
            createdAt: now,
            modifiedAt: now,
            meta: { ...(node.meta || {}) }
          });
        }
      }
    }

    this._persist();
    this._emitChange({ action: 'copy', srcPath: srcNorm, path: dstNorm });
    return this.stat(dstNorm);
  }

  search(query, rootPath = 'C:/') {
    const q = String(query ?? '').trim().toLocaleLowerCase('tr-TR');

    const rootNorm = this.normalizePath(rootPath);
    const prefix = rootNorm === 'C:/' ? 'C:/' : `${rootNorm}/`;
    const results = [];

    for (const [entryPath, node] of this._nodes.entries()) {
      if (entryPath === 'C:/') continue;
      if (entryPath !== rootNorm && !entryPath.startsWith(prefix)) continue;

      if (!q) {
        results.push({
          ...this._toStat(node),
          matchIn: 'all',
          snippet: ''
        });
        continue;
      }

      const nameMatch = node.name.toLocaleLowerCase('tr-TR').includes(q);
      let contentMatch = false;
      let snippet = '';

      if (node.type === 'file' && !node.encrypted && node.content) {
        const lowerContent = node.content.toLocaleLowerCase('tr-TR');
        const idx = lowerContent.indexOf(q);
        if (idx !== -1) {
          contentMatch = true;
          const start = Math.max(0, idx - 32);
          const end = Math.min(node.content.length, idx + q.length + 48);
          snippet = node.content.slice(start, end).replace(/\s+/g, ' ').trim();
        }
      }

      if (nameMatch || contentMatch) {
        results.push({
          ...this._toStat(node),
          matchIn: nameMatch && contentMatch ? 'both' : nameMatch ? 'name' : 'content',
          snippet
        });
      }
    }

    return results;
  }

  getStorageUsage() {
    let usedBytes = 0;
    let fileCount = 0;
    let dirCount = 0;

    for (const [key, node] of this._nodes.entries()) {
      if (key === 'C:/') continue;
      if (node.type === 'dir') {
        dirCount++;
      } else {
        fileCount++;
        usedBytes += node.size;
      }
    }

    return {
      usedBytes,
      totalBytes: usedBytes,
      quotaBytes: this.quotaBytes,
      fileCount,
      totalFiles: fileCount,
      dirCount,
      usagePercent: Number(((usedBytes / this.quotaBytes) * 100).toFixed(2))
    };
  }

  async _deriveAesGcmKey(passphrase, saltBytes, usages) {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) {
      throw new Error('WebCrypto (crypto.subtle) alt sistemi bu ortamda kullanılamıyor.');
    }
    const keyMaterial = await subtle.importKey(
      'raw',
      textEncoder.encode(String(passphrase)),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      usages
    );
  }

  async encryptFile(filePath, passphrase) {
    if (!passphrase || String(passphrase).length < 1) {
      throw new Error('Şifreleme için geçerli bir parola belirtilmelidir.');
    }
    const norm = this.normalizePath(filePath);
    const node = this._nodes.get(norm);
    if (!node || node.type !== 'file') {
      throw new Error(`Şifrelenecek dosya bulunamadı: ${norm}`);
    }
    if (node.encrypted) {
      throw new Error(`Dosya zaten şifrelenmiş durumda: ${norm}`);
    }

    const salt = new Uint8Array(16);
    const iv = new Uint8Array(12);
    globalThis.crypto.getRandomValues(salt);
    globalThis.crypto.getRandomValues(iv);

    const aesKey = await this._deriveAesGcmKey(passphrase, salt, ['encrypt']);
    const plainBytes = textEncoder.encode(node.content);
    const cipherBuffer = await globalThis.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      plainBytes
    );

    const envelope = JSON.stringify(
      {
        magic: ENC_MAGIC,
        kdf: 'PBKDF2-SHA256',
        iterations: 100000,
        cipher: 'AES-256-GCM',
        salt: bytesToBase64(salt),
        iv: bytesToBase64(iv),
        ciphertext: bytesToBase64(new Uint8Array(cipherBuffer))
      },
      null,
      2
    );

    return this.write(norm, envelope, {
      ...node.meta,
      encrypted: true,
      cipher: 'AES-256-GCM'
    });
  }

  async decryptFile(filePath, passphrase) {
    if (!passphrase || String(passphrase).length < 1) {
      throw new Error('Şifre çözme için parola belirtilmelidir.');
    }
    const norm = this.normalizePath(filePath);
    const node = this._nodes.get(norm);
    if (!node || node.type !== 'file') {
      throw new Error(`Şifresi çözülecek dosya bulunamadı: ${norm}`);
    }

    let envelope;
    try {
      envelope = JSON.parse(node.content);
    } catch {
      throw new Error('Dosya geçerli bir QuantOS şifreleme zarfı içermiyor.');
    }

    if (!envelope || envelope.magic !== ENC_MAGIC) {
      throw new Error('Dosya şifreli değil veya zarf biçimi tanınmıyor.');
    }

    const salt = base64ToBytes(envelope.salt);
    const iv = base64ToBytes(envelope.iv);
    const cipherBytes = base64ToBytes(envelope.ciphertext);

    const aesKey = await this._deriveAesGcmKey(passphrase, salt, ['decrypt']);

    let plainBuffer;
    try {
      plainBuffer = await globalThis.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        cipherBytes
      );
    } catch {
      throw new Error('Şifre çözme başarısız: parola hatalı veya şifreli veri bütünlüğü bozulmuş.');
    }

    const plaintext = textDecoder.decode(plainBuffer);
    const nextMeta = { ...(node.meta || {}) };
    delete nextMeta.cipher;
    this.write(norm, plaintext, { ...nextMeta, encrypted: false });
    return plaintext;
  }

  resetToDefaults() {
    this._seedDefaults();
    if (this.useBrowserStorage) {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(this.storageKey);
        }
      } catch {
        // Sessizce geç
      }
      this._persist();
    }
    this._emitChange({ action: 'reset', path: 'C:/' });
    return this;
  }
}
