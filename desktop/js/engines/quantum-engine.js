/**
 * QuantOS — Kuantum Durum Vektörü, Kısmi İz (Bloch Küresi) ve OpenQASM 2.0 Motoru
 * Sıfır bağımlılık · Hem Tarayıcı (ES Module) hem Node.js (node --test) uyumlu
 */

const INV_SQRT2 = Math.SQRT1_2;
const EPSILON = 1e-14;

function cleanZero(val) {
  return Math.abs(val) < EPSILON ? 0 : val;
}

function mulberry32(seed) {
  let state = Number(seed) >>> 0;
  return function nextRandom() {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cryptoRandomGenerator() {
  const pool = new Uint32Array(256);
  let idx = pool.length;
  return function nextCryptoRandom() {
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

/**
 * Güvenli aritmetik açı ayrıştırıcı (eval içermez; pi, +, -, *, /, parantez destekler).
 */
function parseAngleExpression(exprText) {
  const src = String(exprText ?? '0').trim().toLowerCase();
  if (!src) return 0;

  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if ('+-*/()'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }
    if (src.startsWith('pi', i) && !/[a-z0-9_]/i.test(src[i + 2] || '')) {
      tokens.push({ type: 'num', value: Math.PI });
      i += 2;
      continue;
    }
    if (src.startsWith('tau', i) && !/[a-z0-9_]/i.test(src[i + 3] || '')) {
      tokens.push({ type: 'num', value: Math.PI * 2 });
      i += 3;
      continue;
    }
    const numMatch = src.slice(i).match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);
    if (numMatch) {
      tokens.push({ type: 'num', value: Number(numMatch[0]) });
      i += numMatch[0].length;
      continue;
    }
    throw new SyntaxError(`Geçersiz QASM açı ifadesi: "${exprText}"`);
  }

  let pos = 0;
  function peek() {
    return tokens[pos] || null;
  }
  function consume() {
    return tokens[pos++] || null;
  }

  function parseAddSub() {
    let left = parseMulDiv();
    while (peek() && peek().type === 'op' && (peek().value === '+' || peek().value === '-')) {
      const op = consume().value;
      const right = parseMulDiv();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseMulDiv() {
    let left = parseUnary();
    while (peek() && peek().type === 'op' && (peek().value === '*' || peek().value === '/')) {
      const op = consume().value;
      const right = parseUnary();
      if (op === '/') {
        if (right === 0) throw new RangeError('QASM açı ifadesinde sıfıra bölme hatası.');
        left /= right;
      } else {
        left *= right;
      }
    }
    return left;
  }

  function parseUnary() {
    const tok = peek();
    if (!tok) throw new SyntaxError(`Eksik QASM açı ifadesi: "${exprText}"`);
    if (tok.type === 'op' && tok.value === '+') {
      consume();
      return parseUnary();
    }
    if (tok.type === 'op' && tok.value === '-') {
      consume();
      return -parseUnary();
    }
    if (tok.type === 'op' && tok.value === '(') {
      consume();
      const val = parseAddSub();
      const close = consume();
      if (!close || close.type !== 'op' || close.value !== ')') {
        throw new SyntaxError(`Eşleşmeyen parantez: "${exprText}"`);
      }
      return val;
    }
    if (tok.type === 'num') {
      consume();
      return tok.value;
    }
    throw new SyntaxError(`Beklenmeyen QASM sembolü: "${tok.value}"`);
  }

  const result = parseAddSub();
  if (pos !== tokens.length || !Number.isFinite(result)) {
    throw new SyntaxError(`Geçersiz QASM açı değeri: "${exprText}"`);
  }
  return result;
}

export class Complex {
  constructor(re = 0, im = 0) {
    this.re = Number(re);
    this.im = Number(im);
  }

  add(other) {
    return new Complex(this.re + other.re, this.im + other.im);
  }

  sub(other) {
    return new Complex(this.re - other.re, this.im - other.im);
  }

  mul(other) {
    return new Complex(
      this.re * other.re - this.im * other.im,
      this.re * other.im + this.im * other.re
    );
  }

  scale(scalar) {
    return new Complex(this.re * scalar, this.im * scalar);
  }

  conj() {
    return new Complex(this.re, -this.im);
  }

  abs2() {
    return this.re * this.re + this.im * this.im;
  }

  abs() {
    return Math.hypot(this.re, this.im);
  }

  phase() {
    if (Math.abs(this.re) < EPSILON && Math.abs(this.im) < EPSILON) return 0;
    return Math.atan2(this.im, this.re);
  }

  clone() {
    return new Complex(this.re, this.im);
  }

  toString(digits = 4) {
    const r = cleanZero(this.re).toFixed(digits);
    const i = cleanZero(this.im);
    const sign = i >= 0 ? '+' : '-';
    return `${r} ${sign} ${Math.abs(i).toFixed(digits)}i`;
  }

  static fromPolar(r, theta) {
    return new Complex(r * Math.cos(theta), r * Math.sin(theta));
  }
}

export class QuantumCircuit {
  constructor(numQubits = 3) {
    const n = Number(numQubits);
    if (!Number.isInteger(n) || n < 1 || n > 8) {
      throw new RangeError('QuantumCircuit kübit sayısı 1 ile 8 arasında bir tam sayı olmalıdır.');
    }
    this.numQubits = n;
    this.dim = 1 << n;
    this.gates = [];
    this.state = this._createZeroState();
    this._dirty = false;
  }

  _createZeroState() {
    const arr = new Array(this.dim);
    arr[0] = new Complex(1, 0);
    for (let i = 1; i < this.dim; i++) {
      arr[i] = new Complex(0, 0);
    }
    return arr;
  }

  _validateQubit(q, label = 'qubit') {
    const idx = Number(q);
    if (!Number.isInteger(idx) || idx < 0 || idx >= this.numQubits) {
      throw new RangeError(`Geçersiz ${label} indeksi: ${q} (0..${this.numQubits - 1} bekleniyor).`);
    }
    return idx;
  }

  reset() {
    this.gates = [];
    this.state = this._createZeroState();
    this._dirty = false;
    return this;
  }

  addGate({ gate, targets = [], params = [], step } = {}) {
    const name = String(gate || '').trim().toLowerCase();
    if (!name) {
      throw new Error('Kapı adı (gate) belirtilmelidir.');
    }
    const cleanTargets = (Array.isArray(targets) ? targets : [targets]).map((q, idx) =>
      this._validateQubit(q, `target[${idx}]`)
    );
    const cleanParams = (Array.isArray(params) ? params : [params])
      .filter((p) => p !== undefined && p !== null)
      .map((p) => Number(p));

    if (cleanParams.some((p) => !Number.isFinite(p))) {
      throw new RangeError(`Geçersiz kapı parametresi: ${gate}`);
    }

    const singleGates = new Set(['h', 'x', 'y', 'z', 's', 'sdg', 't', 'tdg', 'id', 'rx', 'ry', 'rz']);
    const twoGates = new Set(['cx', 'cnot', 'cz', 'swap']);
    const threeGates = new Set(['ccx', 'toffoli']);

    if (singleGates.has(name)) {
      if (cleanTargets.length !== 1) {
        throw new Error(`${name.toUpperCase()} kapısı tam 1 hedef kübit gerektirir.`);
      }
      if (['rx', 'ry', 'rz'].includes(name) && cleanParams.length < 1) {
        throw new Error(`${name.toUpperCase()} kapısı radyan cinsinden açı parametresi gerektirir.`);
      }
    } else if (twoGates.has(name)) {
      if (cleanTargets.length !== 2) {
        throw new Error(`${name.toUpperCase()} kapısı 2 kübit (kontrol/hedef) gerektirir.`);
      }
      if (cleanTargets[0] === cleanTargets[1] && name !== 'swap') {
        throw new Error(`${name.toUpperCase()} kapısında kontrol ve hedef kübit aynı olamaz.`);
      }
    } else if (threeGates.has(name)) {
      if (cleanTargets.length !== 3) {
        throw new Error('CCX (Toffoli) kapısı 3 kübit gerektirir.');
      }
      if (new Set(cleanTargets).size !== 3) {
        throw new Error('CCX kapısındaki tüm kübit indeksleri birbirinden farklı olmalıdır.');
      }
    } else {
      throw new Error(`Desteklenmeyen kuantum kapısı: "${gate}"`);
    }

    const normalizedName = name === 'cnot' ? 'cx' : name === 'toffoli' ? 'ccx' : name;
    const assignedStep =
      step !== undefined && step !== null && Number.isFinite(Number(step))
        ? Number(step)
        : this.gates.length;

    this.gates.push({
      gate: normalizedName,
      targets: cleanTargets,
      params: cleanParams,
      step: assignedStep
    });
    this._dirty = true;
    return this;
  }

  removeGateAt(index) {
    const idx = Number(index);
    if (Number.isInteger(idx) && idx >= 0 && idx < this.gates.length) {
      this.gates.splice(idx, 1);
      this._dirty = true;
    }
    return this;
  }

  h(q) {
    return this.addGate({ gate: 'h', targets: [q] });
  }

  x(q) {
    return this.addGate({ gate: 'x', targets: [q] });
  }

  y(q) {
    return this.addGate({ gate: 'y', targets: [q] });
  }

  z(q) {
    return this.addGate({ gate: 'z', targets: [q] });
  }

  s(q) {
    return this.addGate({ gate: 's', targets: [q] });
  }

  sdg(q) {
    return this.addGate({ gate: 'sdg', targets: [q] });
  }

  t(q) {
    return this.addGate({ gate: 't', targets: [q] });
  }

  tdg(q) {
    return this.addGate({ gate: 'tdg', targets: [q] });
  }

  rx(q, theta) {
    return this.addGate({ gate: 'rx', targets: [q], params: [theta] });
  }

  ry(q, theta) {
    return this.addGate({ gate: 'ry', targets: [q], params: [theta] });
  }

  rz(q, theta) {
    return this.addGate({ gate: 'rz', targets: [q], params: [theta] });
  }

  cx(control, target) {
    return this.addGate({ gate: 'cx', targets: [control, target] });
  }

  cz(control, target) {
    return this.addGate({ gate: 'cz', targets: [control, target] });
  }

  swap(q1, q2) {
    return this.addGate({ gate: 'swap', targets: [q1, q2] });
  }

  ccx(c1, c2, target) {
    return this.addGate({ gate: 'ccx', targets: [c1, c2, target] });
  }

  _applySingleUnitary(qubit, u00, u01, u10, u11) {
    const bit = 1 << qubit;
    const state = this.state;
    const dim = this.dim;

    for (let i = 0; i < dim; i++) {
      if ((i & bit) === 0) {
        const j = i | bit;
        const a0 = state[i];
        const a1 = state[j];

        const next0Re = (u00.re * a0.re - u00.im * a0.im) + (u01.re * a1.re - u01.im * a1.im);
        const next0Im = (u00.re * a0.im + u00.im * a0.re) + (u01.re * a1.im + u01.im * a1.re);

        const next1Re = (u10.re * a0.re - u10.im * a0.im) + (u11.re * a1.re - u11.im * a1.im);
        const next1Im = (u10.re * a0.im + u10.im * a0.re) + (u11.re * a1.im + u11.im * a1.re);

        state[i] = new Complex(next0Re, next0Im);
        state[j] = new Complex(next1Re, next1Im);
      }
    }
  }

  _executeGate(op) {
    const { gate, targets, params } = op;
    const state = this.state;
    const dim = this.dim;

    switch (gate) {
      case 'id':
        return;

      case 'h': {
        const c = new Complex(INV_SQRT2, 0);
        const m = new Complex(-INV_SQRT2, 0);
        this._applySingleUnitary(targets[0], c, c, c, m);
        return;
      }

      case 'x': {
        const bit = 1 << targets[0];
        for (let i = 0; i < dim; i++) {
          if ((i & bit) === 0) {
            const j = i | bit;
            const tmp = state[i];
            state[i] = state[j];
            state[j] = tmp;
          }
        }
        return;
      }

      case 'y': {
        const zero = new Complex(0, 0);
        const minusI = new Complex(0, -1);
        const plusI = new Complex(0, 1);
        this._applySingleUnitary(targets[0], zero, minusI, plusI, zero);
        return;
      }

      case 'z': {
        const bit = 1 << targets[0];
        for (let i = 0; i < dim; i++) {
          if ((i & bit) !== 0) {
            state[i] = new Complex(-state[i].re, -state[i].im);
          }
        }
        return;
      }

      case 's': {
        const bit = 1 << targets[0];
        for (let i = 0; i < dim; i++) {
          if ((i & bit) !== 0) {
            const a = state[i];
            state[i] = new Complex(-a.im, a.re);
          }
        }
        return;
      }

      case 'sdg': {
        const bit = 1 << targets[0];
        for (let i = 0; i < dim; i++) {
          if ((i & bit) !== 0) {
            const a = state[i];
            state[i] = new Complex(a.im, -a.re);
          }
        }
        return;
      }

      case 't': {
        const one = new Complex(1, 0);
        const zero = new Complex(0, 0);
        const phase = new Complex(INV_SQRT2, INV_SQRT2);
        this._applySingleUnitary(targets[0], one, zero, zero, phase);
        return;
      }

      case 'tdg': {
        const one = new Complex(1, 0);
        const zero = new Complex(0, 0);
        const phase = new Complex(INV_SQRT2, -INV_SQRT2);
        this._applySingleUnitary(targets[0], one, zero, zero, phase);
        return;
      }

      case 'rx': {
        const half = (params[0] || 0) / 2;
        const c = new Complex(Math.cos(half), 0);
        const mSinI = new Complex(0, -Math.sin(half));
        this._applySingleUnitary(targets[0], c, mSinI, mSinI, c);
        return;
      }

      case 'ry': {
        const half = (params[0] || 0) / 2;
        const cosH = Math.cos(half);
        const sinH = Math.sin(half);
        this._applySingleUnitary(
          targets[0],
          new Complex(cosH, 0),
          new Complex(-sinH, 0),
          new Complex(sinH, 0),
          new Complex(cosH, 0)
        );
        return;
      }

      case 'rz': {
        const half = (params[0] || 0) / 2;
        const zero = new Complex(0, 0);
        const eMinus = new Complex(Math.cos(half), -Math.sin(half));
        const ePlus = new Complex(Math.cos(half), Math.sin(half));
        this._applySingleUnitary(targets[0], eMinus, zero, zero, ePlus);
        return;
      }

      case 'cx': {
        const cBit = 1 << targets[0];
        const tBit = 1 << targets[1];
        for (let i = 0; i < dim; i++) {
          if ((i & cBit) !== 0 && (i & tBit) === 0) {
            const j = i | tBit;
            const tmp = state[i];
            state[i] = state[j];
            state[j] = tmp;
          }
        }
        return;
      }

      case 'cz': {
        const mask = (1 << targets[0]) | (1 << targets[1]);
        for (let i = 0; i < dim; i++) {
          if ((i & mask) === mask) {
            state[i] = new Complex(-state[i].re, -state[i].im);
          }
        }
        return;
      }

      case 'swap': {
        const q1 = targets[0];
        const q2 = targets[1];
        if (q1 === q2) return;
        const b1 = 1 << q1;
        const b2 = 1 << q2;
        for (let i = 0; i < dim; i++) {
          if ((i & b1) === 0 && (i & b2) !== 0) {
            const j = (i | b1) & ~b2;
            const tmp = state[i];
            state[i] = state[j];
            state[j] = tmp;
          }
        }
        return;
      }

      case 'ccx': {
        const cMask = (1 << targets[0]) | (1 << targets[1]);
        const tBit = 1 << targets[2];
        for (let i = 0; i < dim; i++) {
          if ((i & cMask) === cMask && (i & tBit) === 0) {
            const j = i | tBit;
            const tmp = state[i];
            state[i] = state[j];
            state[j] = tmp;
          }
        }
        return;
      }

      default:
        throw new Error(`Bilinmeyen kapı: ${gate}`);
    }
  }

  run() {
    this.state = this._createZeroState();
    const ordered = this.gates
      .map((op, idx) => ({ op, idx }))
      .sort((a, b) => {
        const ds = (a.op.step ?? a.idx) - (b.op.step ?? b.idx);
        return ds !== 0 ? ds : a.idx - b.idx;
      });

    for (const item of ordered) {
      this._executeGate(item.op);
    }

    // Sayısal birim norm koruma
    let norm2 = 0;
    for (let i = 0; i < this.dim; i++) {
      norm2 += this.state[i].abs2();
    }
    if (norm2 > 0 && Math.abs(norm2 - 1) > 1e-12) {
      const invNorm = 1 / Math.sqrt(norm2);
      for (let i = 0; i < this.dim; i++) {
        this.state[i] = this.state[i].scale(invNorm);
      }
    }

    this._dirty = false;
    return this;
  }

  _ensureExecuted() {
    if (this._dirty) {
      this.run();
    }
  }

  probabilities() {
    this._ensureExecuted();
    const probs = new Array(this.dim);
    let total = 0;
    for (let i = 0; i < this.dim; i++) {
      const p = this.state[i].abs2();
      probs[i] = p < EPSILON ? 0 : p;
      total += probs[i];
    }
    if (total > 0 && Math.abs(total - 1) > 1e-12) {
      for (let i = 0; i < this.dim; i++) {
        probs[i] /= total;
      }
    }
    return probs;
  }

  amplitudes() {
    this._ensureExecuted();
    const probs = this.probabilities();
    const out = new Array(this.dim);
    for (let i = 0; i < this.dim; i++) {
      const amp = this.state[i];
      out[i] = {
        index: i,
        bitstring: i.toString(2).padStart(this.numQubits, '0'),
        re: cleanZero(amp.re),
        im: cleanZero(amp.im),
        magnitude: cleanZero(amp.abs()),
        phase: cleanZero(amp.phase()),
        probability: probs[i]
      };
    }
    return out;
  }

  /**
   * Kısmi iz (partial trace) ile indirgenmiş yoğunluk matrisi:
   * rho_q = Tr_{\neq q}(|psi><psi|) = [[rho00, rho01], [rho10, rho11]]
   * Bloch bileşenleri: x = 2 Re(rho01), y = -2 Im(rho01), z = rho00 - rho11
   * Saflık (purity): Tr(rho_q^2) = rho00^2 + rho11^2 + 2 |rho01|^2
   */
  blochVector(qubit = 0) {
    this._ensureExecuted();
    const q = this._validateQubit(qubit);
    const bit = 1 << q;
    const state = this.state;

    let rho00 = 0;
    let rho11 = 0;
    let rho01Re = 0;
    let rho01Im = 0;

    for (let i = 0; i < this.dim; i++) {
      if ((i & bit) === 0) {
        const a0 = state[i];
        const a1 = state[i | bit];
        rho00 += a0.re * a0.re + a0.im * a0.im;
        rho11 += a1.re * a1.re + a1.im * a1.im;
        // a0 * conj(a1) = (a0.re + i a0.im)(a1.re - i a1.im)
        rho01Re += a0.re * a1.re + a0.im * a1.im;
        rho01Im += a0.im * a1.re - a0.re * a1.im;
      }
    }

    const x = cleanZero(2 * rho01Re);
    const y = cleanZero(-2 * rho01Im);
    const z = cleanZero(rho00 - rho11);
    const purity = cleanZero(
      Math.min(1, Math.max(0.5, rho00 * rho00 + rho11 * rho11 + 2 * (rho01Re * rho01Re + rho01Im * rho01Im)))
    );

    return { x, y, z, purity };
  }

  sample(shots = 1024, seed = null) {
    this._ensureExecuted();
    const totalShots = Math.max(1, Math.min(1_000_000, Math.floor(Number(shots) || 1024)));
    const probs = this.probabilities();

    const cdf = new Float64Array(this.dim);
    let acc = 0;
    for (let i = 0; i < this.dim; i++) {
      acc += probs[i];
      cdf[i] = acc;
    }
    cdf[this.dim - 1] = 1.0;

    const rand =
      seed !== null && seed !== undefined ? mulberry32(seed) : cryptoRandomGenerator();

    const rawCounts = new Uint32Array(this.dim);
    for (let s = 0; s < totalShots; s++) {
      const u = rand();
      let lo = 0;
      let hi = this.dim - 1;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (u < cdf[mid]) {
          hi = mid;
        } else {
          lo = mid + 1;
        }
      }
      rawCounts[lo]++;
    }

    const counts = {};
    let shannonEntropy = 0;
    let mostLikely = '0'.repeat(this.numQubits);
    let maxCount = -1;

    for (let i = 0; i < this.dim; i++) {
      const c = rawCounts[i];
      if (c > 0) {
        const bits = i.toString(2).padStart(this.numQubits, '0');
        counts[bits] = c;
        const p = c / totalShots;
        shannonEntropy -= p * Math.log2(p);
        if (c > maxCount) {
          maxCount = c;
          mostLikely = bits;
        }
      }
    }

    return {
      counts,
      shots: totalShots,
      shannonEntropy: cleanZero(Number(shannonEntropy.toFixed(6))),
      mostLikely
    };
  }

  toQASM() {
    const lines = [
      'OPENQASM 2.0;',
      'include "qelib1.inc";',
      `qreg q[${this.numQubits}];`,
      `creg c[${this.numQubits}];`
    ];

    const ordered = this.gates
      .map((op, idx) => ({ op, idx }))
      .sort((a, b) => {
        const ds = (a.op.step ?? a.idx) - (b.op.step ?? b.idx);
        return ds !== 0 ? ds : a.idx - b.idx;
      });

    for (const { op } of ordered) {
      const { gate, targets, params } = op;
      if (['rx', 'ry', 'rz'].includes(gate)) {
        lines.push(`${gate}(${params[0]}) q[${targets[0]}];`);
      } else if (targets.length === 1) {
        lines.push(`${gate} q[${targets[0]}];`);
      } else if (targets.length === 2) {
        lines.push(`${gate} q[${targets[0]}],q[${targets[1]}];`);
      } else if (targets.length === 3) {
        lines.push(`${gate} q[${targets[0]}],q[${targets[1]}],q[${targets[2]}];`);
      }
    }

    return lines.join('\n') + '\n';
  }

  static fromQASM(qasmText) {
    if (typeof qasmText !== 'string' || !qasmText.trim()) {
      throw new Error('Boş veya geçersiz QASM metni.');
    }

    // Yorum satırlarını temizle
    const cleaned = qasmText
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n\r]*/g, '');

    const statements = cleaned
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);

    const qregOffsets = new Map();
    let totalQubits = 0;
    const parsedOps = [];
    let maxReferencedQubit = -1;

    for (const stmt of statements) {
      if (/^OPENQASM\b/i.test(stmt) || /^include\b/i.test(stmt) || /^creg\b/i.test(stmt)) {
        continue;
      }
      if (/^barrier\b/i.test(stmt) || /^measure\b/i.test(stmt)) {
        continue;
      }

      const qregMatch = stmt.match(/^qreg\s+([a-zA-Z_]\w*)\s*\[\s*(\d+)\s*\]$/i);
      if (qregMatch) {
        const regName = qregMatch[1];
        const size = Number(qregMatch[2]);
        qregOffsets.set(regName, totalQubits);
        totalQubits += size;
        continue;
      }

      const gateMatch = stmt.match(
        /^([a-zA-Z_]\w*)(?:\s*\(\s*([^)]+)\s*\))?\s+(.+)$/
      );
      if (!gateMatch) {
        throw new SyntaxError(`QASM ifadesi çözümlenemedi: "${stmt}"`);
      }

      const gateName = gateMatch[1].toLowerCase();
      const paramStr = gateMatch[2];
      const argsStr = gateMatch[3];

      const params = paramStr !== undefined
        ? paramStr.split(',').map((p) => parseAngleExpression(p))
        : [];

      const targets = argsStr.split(',').map((arg) => {
        const m = arg.trim().match(/^([a-zA-Z_]\w*)\s*\[\s*(\d+)\s*\]$/);
        if (!m) {
          throw new SyntaxError(`Geçersiz QASM kübit argümanı: "${arg.trim()}"`);
        }
        const reg = m[1];
        const idx = Number(m[2]);
        const offset = qregOffsets.has(reg) ? qregOffsets.get(reg) : 0;
        const resolved = offset + idx;
        if (resolved > maxReferencedQubit) maxReferencedQubit = resolved;
        return resolved;
      });

      parsedOps.push({ gate: gateName, targets, params });
    }

    const nQubits = totalQubits > 0 ? totalQubits : Math.max(1, maxReferencedQubit + 1);
    const circuit = new QuantumCircuit(nQubits);
    for (const op of parsedOps) {
      circuit.addGate(op);
    }
    return circuit.run();
  }
}

export const QuantumPresets = Object.freeze({
  /**
   * Maksimum dolanık Bell Çifti |Phi+> = (|00> + |11>) / sqrt(2)
   */
  bell() {
    return new QuantumCircuit(2).h(0).cx(0, 1).run();
  },

  /**
   * n-Kübitlik Greenberger-Horne-Zeilinger durumu (|0...0> + |1...1>) / sqrt(2)
   */
  ghz(n = 3) {
    const count = Math.max(2, Math.min(8, Math.floor(Number(n) || 3)));
    const circuit = new QuantumCircuit(count).h(0);
    for (let i = 0; i < count - 1; i++) {
      circuit.cx(i, i + 1);
    }
    return circuit.run();
  },

  /**
   * 2-Kübitlik Grover Kuantum Arama Algoritması (Hedef durum |11>, P(|11>) = 1.0)
   */
  grover2() {
    return new QuantumCircuit(2)
      .h(0)
      .h(1)
      // Faz Oraklı: |11> durumunun işaretini ters çevir
      .cz(0, 1)
      // Grover Difüzör Operatörü: 2|s><s| - I
      .h(0)
      .h(1)
      .z(0)
      .z(1)
      .cz(0, 1)
      .h(0)
      .h(1)
      .run();
  },

  /**
   * 3-Kübitlik Koherent Kuantum Işınlama (q0 üzerindeki durumu q2'ye aktarır)
   */
  teleportation() {
    return new QuantumCircuit(3)
      // q0 üzerinde taşınacak özel süperpozisyon durumu hazırla
      .ry(0, Math.PI / 3)
      .rz(0, Math.PI / 4)
      // Alice (q1) ve Bob (q2) arasında Bell çifti oluştur
      .h(1)
      .cx(1, 2)
      // Alice Bell tabanı dönüşümü
      .cx(0, 1)
      .h(0)
      // Koherent koşullu düzeltme kapıları (ertelenmiş ölçüm ilkesi)
      .cx(1, 2)
      .cz(0, 2)
      .run();
  },

  /**
   * Süper Yoğun Kodlama (Superdense Coding): 1 kübit ile 2 klasik bit ("11") aktarımı
   */
  superdense() {
    return new QuantumCircuit(2)
      // Paylaşılan Bell çifti
      .h(0)
      .cx(0, 1)
      // Alice "11" mesajını kendi kübitine (q0) kodlar
      .x(0)
      .z(0)
      // Bob Bell ölçüm dönüşümü ile "11" durumunu çözer
      .cx(0, 1)
      .h(0)
      .run();
  },

  /**
   * Mach-Zehnder Kuantum Faz Girişimi (Yıkıcı ve Yapıcı Faz Girişimi)
   */
  interference() {
    return new QuantumCircuit(2)
      // Kübit 0: pi faz kayması -> tam yıkıcı girişim (|1>)
      .h(0)
      .rz(0, Math.PI)
      .h(0)
      // Kübit 1: pi/3 faz kayması -> kısmi kuantum girişim saçakları (cos^2(pi/6)=0.75)
      .h(1)
      .rz(1, Math.PI / 3)
      .h(1)
      .run();
  }
});
