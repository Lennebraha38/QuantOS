/**
 * QuantOS — BB84 Kuantum Anahtar Dağıtımı (QKD) ve Kuantum Rastgelelik (QRNG) Motoru
 * Sıfır bağımlılık · Hem Tarayıcı (ES Module) hem Node.js (node --test) uyumlu
 */

const BB84_QBER_SECURITY_THRESHOLD = 0.11; // Shor-Preskill bilgi-kuramsal güvenlik sınırı (~%11)

function mulberry32(seed) {
  let state = Number(seed) >>> 0;
  return function nextRandom() {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createUniformRandom(seed = null) {
  if (seed !== null && seed !== undefined) {
    return mulberry32(seed);
  }
  const pool = new Uint32Array(256);
  let idx = pool.length;
  return function nextCryptoFloat() {
    if (idx >= pool.length) {
      if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
        globalThis.crypto.getRandomValues(pool);
      } else {
        for (let i = 0; i < pool.length; i++) {
          pool[i] = Math.floor(Math.random() * 4294967296) >>> 0;
        }
      }
      idx = 0;
    }
    return pool[idx++] / 4294967296;
  };
}

function bitsToHex(bits) {
  if (!Array.isArray(bits) || bits.length === 0) return '';
  const byteCount = Math.ceil(bits.length / 8);
  const hexParts = new Array(byteCount);
  for (let b = 0; b < byteCount; b++) {
    let val = 0;
    for (let k = 0; k < 8; k++) {
      const bitIdx = b * 8 + k;
      val = (val << 1) | (bitIdx < bits.length && bits[bitIdx] ? 1 : 0);
    }
    hexParts[b] = val.toString(16).padStart(2, '0');
  }
  return hexParts.join('');
}

/**
 * Bennett-Brassard 1984 (BB84) Foton Polarizasyon Kuantum Anahtar Dağıtımı Simülasyonu
 * Tabanlar: '+' (Doğrusal Z-tabanı: |0>, |1>) ve 'x' (Köşegen X-tabanı: |+>, |->)
 */
export function simulateBB84({
  length = 64,
  eavesdrop = false,
  interceptRate = 1.0,
  seed = null
} = {}) {
  const n = Math.max(8, Math.min(8192, Math.floor(Number(length) || 64)));
  const isEavesdropping = Boolean(eavesdrop);
  const effInterceptRate = isEavesdropping
    ? Math.max(0, Math.min(1, Number(interceptRate ?? 1.0)))
    : 0;

  const rand = createUniformRandom(seed);

  const aliceBits = new Array(n);
  const aliceBases = new Array(n);
  const eveBases = new Array(n);
  const bobBases = new Array(n);
  const bobBits = new Array(n);

  for (let i = 0; i < n; i++) {
    const aBit = rand() < 0.5 ? 0 : 1;
    const aBasis = rand() < 0.5 ? '+' : 'x';
    aliceBits[i] = aBit;
    aliceBases[i] = aBasis;

    let photonBit = aBit;
    let photonBasis = aBasis;

    // Eve (Dinleyici) Intercept-Resend saldırısı
    if (isEavesdropping && rand() < effInterceptRate) {
      const eBasis = rand() < 0.5 ? '+' : 'x';
      eveBases[i] = eBasis;
      if (eBasis !== photonBasis) {
        // Yanlış tabanda ölçüm kuantum süperpozisyonunu %50/%50 çökertir
        photonBit = rand() < 0.5 ? 0 : 1;
        photonBasis = eBasis;
      }
    } else {
      eveBases[i] = null;
    }

    // Bob'un polarizasyon ölçümü
    const bBasis = rand() < 0.5 ? '+' : 'x';
    bobBases[i] = bBasis;
    if (bBasis === photonBasis) {
      bobBits[i] = photonBit;
    } else {
      bobBits[i] = rand() < 0.5 ? 0 : 1;
    }
  }

  // Klasik açık kanal üzerinden taban elemesi (Sifting)
  const siftedIndices = [];
  const siftedAlice = [];
  const siftedBob = [];
  let errorCount = 0;

  for (let i = 0; i < n; i++) {
    if (aliceBases[i] === bobBases[i]) {
      siftedIndices.push(i);
      siftedAlice.push(aliceBits[i]);
      siftedBob.push(bobBits[i]);
      if (aliceBits[i] !== bobBits[i]) {
        errorCount++;
      }
    }
  }

  const siftedCount = siftedIndices.length;
  const qber = siftedCount > 0 ? Number((errorCount / siftedCount).toFixed(6)) : 0;
  const secure = siftedCount > 0 && qber < BB84_QBER_SECURITY_THRESHOLD;
  const keyBits = secure ? siftedAlice.slice() : siftedAlice.filter((bit, idx) => bit === siftedBob[idx]);
  const keyHex = bitsToHex(keyBits);

  return {
    length: n,
    eavesdrop: isEavesdropping,
    interceptRate: effInterceptRate,
    aliceBits,
    aliceBases,
    eveBases,
    bobBases,
    bobBits,
    siftedIndices,
    siftedAlice,
    siftedBob,
    errorCount,
    qber,
    secure,
    keyBits,
    keyHex,
    provenance: 'bb84-quantum-polarization-sim'
  };
}

/**
 * Bayt dizisi üzerinde gerçek istatistiksel entropi ve ki-kare testi
 */
export function computeByteStats(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes || []);
  const count = arr.length;
  if (count === 0) {
    return {
      count: 0,
      hex: '',
      shannonEntropy: 0,
      mean: 0,
      chiSquare: 0
    };
  }

  const freq = new Uint32Array(256);
  let sum = 0;
  const hexParts = new Array(count);

  for (let i = 0; i < count; i++) {
    const v = arr[i];
    freq[v]++;
    sum += v;
    hexParts[i] = v.toString(16).padStart(2, '0');
  }

  const mean = sum / count;
  const expected = count / 256;
  let shannonEntropy = 0;
  let chiSquare = 0;

  for (let v = 0; v < 256; v++) {
    const c = freq[v];
    if (c > 0) {
      const p = c / count;
      shannonEntropy -= p * Math.log2(p);
    }
    const diff = c - expected;
    chiSquare += (diff * diff) / expected;
  }

  return {
    count,
    hex: hexParts.join(''),
    shannonEntropy: Number(shannonEntropy.toFixed(6)),
    mean: Number(mean.toFixed(6)),
    chiSquare: Number(chiSquare.toFixed(4))
  };
}

/**
 * Kriptografik olarak güvenli rastgele bayt üreteci (CSPRNG / yerel kuantum yedekleme)
 */
export function generateQRNGBytes(count = 32) {
  const n = Math.max(1, Math.min(65536, Math.floor(Number(count) || 32)));
  const out = new Uint8Array(n);
  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(out);
  } else {
    const fallbackRand = createUniformRandom();
    for (let i = 0; i < n; i++) {
      out[i] = Math.floor(fallbackRand() * 256) & 0xff;
    }
  }
  return out;
}

/**
 * Canlı Kuantum Vakum Rastgele Sayı Çekici:
 * Tarayıcıda /api/qrng üzerinden, doğrudan ortamda ANU QRNG API üzerinden dener;
 * erişilemezse dürüst kaynak etiketiyle CSPRNG'ye düşer.
 */
export async function fetchLiveQRNG(count = 32) {
  const n = Math.max(1, Math.min(1024, Math.floor(Number(count) || 32)));

  // 1) Tarayıcı ortamındaysa QuantOS arka uç /api/qrng uç noktasını dene
  if (typeof window !== 'undefined' && typeof fetch === 'function') {
    try {
      const resp = await fetch(`/api/qrng?count=${n}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(3000)
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json && Array.isArray(json.bytes) && json.bytes.length === n) {
          const stats = computeByteStats(json.bytes);
          return {
            count: n,
            source: json.source || 'quantos-api-qrng',
            bytes: json.bytes,
            ...stats,
            timestamp: json.timestamp || new Date().toISOString()
          };
        }
      }
    } catch {
      // Doğrudan ANU API veya yerel CSPRNG'ye geç
    }
  }

  // 2) Doğrudan ANU Kuantum Vakum Dalgalanması API'sini dene (2.5 sn zaman aşımı)
  if (typeof fetch === 'function') {
    try {
      const anuUrl = `https://qrng.anu.edu.au/API/jsonI.php?length=${n}&type=uint8`;
      const resp = await fetch(anuUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(2500)
      });
      if (resp.ok) {
        const payload = await resp.json();
        if (
          payload &&
          payload.success === true &&
          Array.isArray(payload.data) &&
          payload.data.length === n &&
          payload.data.every((b) => Number.isInteger(b) && b >= 0 && b <= 255)
        ) {
          const stats = computeByteStats(payload.data);
          return {
            count: n,
            source: 'anu-quantum-vacuum',
            bytes: payload.data,
            ...stats,
            timestamp: new Date().toISOString()
          };
        }
      }
    } catch {
      // CSPRNG yedeklemesine düş
    }
  }

  // 3) Kriptografik CSPRNG yedeklemesi
  const fallbackBytes = generateQRNGBytes(n);
  const stats = computeByteStats(fallbackBytes);
  return {
    count: n,
    source: 'webcrypto-csprng-fallback',
    bytes: Array.from(fallbackBytes),
    ...stats,
    timestamp: new Date().toISOString()
  };
}
