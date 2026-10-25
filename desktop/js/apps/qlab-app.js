/**
 * Uygulama 2: Quantro Kuantum Devre Laboratuvarı (Q-Lab)
 * 1..6 kübit durum vektörü simülatörü, kısmi iz Bloch küresi, 1024-atış histogram ve OpenQASM 2.0
 */
import { QuantumCircuit, QuantumPresets } from '../engines/quantum-engine.js';

const GATES = ['H', 'X', 'Y', 'Z', 'S', 'T', 'RX', 'RY', 'RZ', 'CX', 'CZ', 'SWAP', 'SİL'];
const STEPS = 10;

export function mountQLabApp(container, osContext, args = {}) {
  let circuit = QuantumPresets.bell();
  let selectedTool = 'H';
  let pendingTwoQubit = null; // { gate, step, firstQubit }
  let selectedBlochQubit = 0;
  let lastSample = circuit.run().sample(1024);

  if (args?.qasm) {
    try {
      circuit = QuantumCircuit.fromQASM(args.qasm);
      lastSample = circuit.run().sample(1024);
    } catch {
      // fallback to preset
    }
  } else if (args?.preset && typeof QuantumPresets[args.preset] === 'function') {
    circuit = QuantumPresets[args.preset]();
    lastSample = circuit.run().sample(1024);
  }

  container.innerHTML = `
    <div class="app-shell">
      <div class="app-toolbar">
        <label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;">
          <span>Kübit:</span>
          <select class="select" id="ql-qubits" style="width:74px;padding:4px 8px;">
            ${[1, 2, 3, 4, 5, 6]
              .map((n) => `<option value="${n}" ${n === circuit.numQubits ? 'selected' : ''}>${n}q</option>`)
              .join('')}
          </select>
        </label>

        <select class="select" id="ql-preset" style="width:186px;padding:4px 8px;">
          <option value="">Hazır Devre Seçin...</option>
          <option value="bell">Bell Dolanıklık |Φ+⟩ (2q)</option>
          <option value="ghz">GHZ Durumu (3q)</option>
          <option value="grover2">Grover Arama Algoritması (2q)</option>
          <option value="teleportation">Kuantum Işınlama (3q)</option>
          <option value="superdense">Süperyoğun Kodlama (2q)</option>
          <option value="qft">Kuantum Fourier Dönüşümü QFT (3q)</option>
          <option value="deutschJozsa">Deutsch-Jozsa Algoritması (3q)</option>
          <option value="interference">Çift Yarık Girişim (1q H-RZ-H)</option>
        </select>

        <button type="button" class="btn btn-sm btn-primary" id="ql-measure-btn">1024 Ölçüm Al</button>
        <label style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-2);" title="RX/RY/RZ dönüş açısı (derece)">
          <span>θ°:</span>
          <input type="number" class="input mono" id="ql-theta-deg" value="90" step="15" min="-360" max="360" style="width:62px;padding:3px 6px;" />
        </label>
        <label style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-2);" title="Dekolerans / Faz Sönümlemesi (T2 dephasing)">
          <span>Gürültü T₂:</span>
          <input type="range" id="ql-noise-t2" min="0" max="1" step="0.05" value="0" style="width:65px;cursor:pointer;" />
          <span id="ql-noise-val" class="mono" style="font-size:10px;min-width:24px;">0%</span>
        </label>
        <button type="button" class="btn btn-sm" id="ql-clear-btn">Sıfırla</button>
        <button type="button" class="btn btn-sm" id="ql-save-qasm-btn">VFS'ye .qasm Kaydet</button>
      </div>

      <div class="app-main">
        <div class="panel-card">
          <div class="panel-head">
            <div>
              <div class="eyebrow">KAPI PALETİ · BİRİMSEL DURUM VEKTÖRÜ</div>
              <p class="panel-sub" id="ql-hint">Bir kapı seçip devre ızgarasındaki kübit hücresine tıklayın.</p>
            </div>
            <div class="qlab-gate-palette" id="ql-palette"></div>
          </div>

          <div class="circuit-board" id="ql-board"></div>
        </div>

        <div class="qlab-bottom-grid">
          <figure class="figure-frame">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span class="eyebrow">KISMİ İZ BLOCH KÜRESİ</span>
              <select class="select" id="ql-bloch-q" style="width:82px;padding:3px 6px;"></select>
            </div>
            <canvas id="ql-bloch-canvas" width="280" height="220"></canvas>
            <figcaption class="figure-caption" id="ql-bloch-meta"></figcaption>
          </figure>

          <div class="panel-card">
            <div class="panel-head">
              <span class="eyebrow">1024-ATIŞ ÖLÇÜM HİSTOGRAMI</span>
              <span class="badge badge-patina num" id="ql-entropy-badge">H = 0.00 bit</span>
            </div>
            <div class="hist-bars" id="ql-hist"></div>
          </div>

          <div class="panel-card">
            <div class="eyebrow">KARMAŞIK DURUM VEKTÖRÜ |ψ⟩</div>
            <div class="data-table-wrap" style="max-height:225px;overflow-y:auto;">
              <table class="data-table">
                <thead>
                  <tr><th>Baz</th><th>Genlik (Re + i·Im)</th><th>Olasılık</th><th>Faz</th></tr>
                </thead>
                <tbody id="ql-amp-tbody"></tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="panel-card">
          <div class="panel-head">
            <span class="eyebrow">OPENQASM 2.0 ÇIKTISI</span>
            <button type="button" class="btn btn-sm" id="ql-copy-qasm">Panoya Kopyala</button>
          </div>
          <pre class="mono" id="ql-qasm-out" style="margin:0;padding:10px;background:var(--ink-950);border-radius:8px;font-size:12px;overflow-x:auto;user-select:text;"></pre>
        </div>
      </div>

      <div class="app-statusbar">
        <span>Matematik: Tam Tensör Çarpımı ℂ^(2^n) + ρ_q = Tr_{≠q}(|ψ⟩⟨ψ|)</span>
        <span id="ql-status-right">Durum boyutu: 4 karmaşık genlik</span>
      </div>
    </div>
  `;

  const paletteEl = container.querySelector('#ql-palette');
  const boardEl = container.querySelector('#ql-board');
  const blochSelect = container.querySelector('#ql-bloch-q');
  const blochCanvas = container.querySelector('#ql-bloch-canvas');
  const blochMeta = container.querySelector('#ql-bloch-meta');
  const histEl = container.querySelector('#ql-hist');
  const ampTbody = container.querySelector('#ql-amp-tbody');
  const qasmOut = container.querySelector('#ql-qasm-out');
  const hintEl = container.querySelector('#ql-hint');
  const entropyBadge = container.querySelector('#ql-entropy-badge');
  const statusRight = container.querySelector('#ql-status-right');
  const thetaDegInput = container.querySelector('#ql-theta-deg');

  function renderPalette() {
    paletteEl.innerHTML = GATES.map(
      (g) =>
        `<button type="button" class="gate-chip ${selectedTool === g ? 'active' : ''}" data-gate="${g}">${g}</button>`
    ).join('');
  }

  function renderBlochSelector() {
    if (selectedBlochQubit >= circuit.numQubits) selectedBlochQubit = 0;
    blochSelect.innerHTML = Array.from({ length: circuit.numQubits }, (_, i) =>
      `<option value="${i}" ${i === selectedBlochQubit ? 'selected' : ''}>q[${i}]</option>`
    ).join('');
  }

  function buildStepGrid() {
    // Map gates into non-colliding visual columns
    const cols = Array.from({ length: STEPS }, () => new Map());
    circuit.gates.forEach((g, idx) => {
      const tList = g.targets || [];
      let colIdx = Math.min(STEPS - 1, Math.max(0, typeof g.step === 'number' ? g.step : 0));
      while (colIdx < STEPS - 1 && tList.some((tq) => cols[colIdx].has(tq))) {
        colIdx++;
      }
      if (tList.length === 1) {
        cols[colIdx].set(tList[0], { label: g.gate.toUpperCase(), gateIndex: idx, role: 'single' });
      } else if (tList.length >= 2) {
        cols[colIdx].set(tList[0], {
          label: g.gate.toUpperCase() === 'SWAP' ? '×' : '●',
          gateIndex: idx,
          role: 'ctrl',
        });
        cols[colIdx].set(tList[1], {
          label: g.gate.toUpperCase() === 'CX' ? '⊕' : g.gate.toUpperCase(),
          gateIndex: idx,
          role: 'target',
        });
      }
    });
    return cols;
  }

  function drawBlochSphere() {
    const ctx = blochCanvas.getContext('2d');
    const w = blochCanvas.width;
    const h = blochCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const R = 76;
    ctx.clearRect(0, 0, w, h);

    const bv = circuit.blochVector(selectedBlochQubit);

    // Sphere outline & equator
    ctx.strokeStyle = 'rgba(169,174,182,0.32)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(cx, cy, R, R * 0.32, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Z and X axes
    ctx.strokeStyle = 'rgba(169,174,182,0.22)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - R - 8);
    ctx.lineTo(cx, cy + R + 8);
    ctx.moveTo(cx - R - 8, cy);
    ctx.lineTo(cx + R + 8, cy);
    ctx.stroke();

    ctx.fillStyle = '#A9AEB6';
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.fillText('|0⟩', cx + 5, cy - R - 4);
    ctx.fillText('|1⟩', cx + 5, cy + R + 12);
    ctx.fillText('|+⟩', cx - R - 24, cy + 14);

    // Project 3D Bloch vector (x, y, z) to 2D isometric
    const px = cx + (bv.y * 0.86 - bv.x * 0.42) * R;
    const py = cy - bv.z * R + bv.x * 0.22 * R;

    ctx.strokeStyle = '#D1925C';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    ctx.stroke();

    ctx.fillStyle = '#D1925C';
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();

    blochMeta.innerHTML = `
      <span>x=${bv.x.toFixed(2)} y=${bv.y.toFixed(2)} z=${bv.z.toFixed(2)}</span>
      <span>Saflık Tr(ρ²)=${bv.purity.toFixed(3)}</span>
    `;
  }

  const noiseSlider = container.querySelector('#ql-noise-t2');
  const noiseValEl = container.querySelector('#ql-noise-val');

  noiseSlider?.addEventListener('input', () => {
    const val = Number(noiseSlider.value) || 0;
    if (noiseValEl) noiseValEl.textContent = `${Math.round(val * 100)}%`;
    renderAll();
  });

  function renderAll() {
    circuit.run();
    renderPalette();
    renderBlochSelector();

    const cols = buildStepGrid();
    boardEl.innerHTML = Array.from({ length: circuit.numQubits }, (_, q) => {
      const cellsHtml = Array.from({ length: STEPS }, (__, s) => {
        const item = cols[s].get(q);
        const cls = item
          ? item.role === 'ctrl'
            ? 'circuit-cell is-ctrl'
            : 'circuit-cell has-gate'
          : 'circuit-cell';
        return `<button type="button" class="${cls}" data-q="${q}" data-s="${s}" data-gidx="${item ? item.gateIndex : -1}">${item ? item.label : '·'}</button>`;
      }).join('');
      return `
        <div class="circuit-row">
          <span class="circuit-qlabel">q[${q}] |0⟩</span>
          <div class="circuit-cells">${cellsHtml}</div>
        </div>
      `;
    }).join('');

    // Amplitudes
    const amps = circuit.amplitudes();
    ampTbody.innerHTML = amps
      .filter((a) => a.probability > 1e-5 || amps.length <= 8)
      .map(
        (a) => `
        <tr>
          <td class="mono">|${a.bitstring}⟩</td>
          <td class="mono">${a.re >= 0 ? '+' : ''}${a.re.toFixed(3)} ${a.im >= 0 ? '+' : ''}${a.im.toFixed(3)}i</td>
          <td class="mono">${(a.probability * 100).toFixed(1)}%</td>
          <td class="mono">${((a.phase * 180) / Math.PI).toFixed(0)}°</td>
        </tr>
      `
      )
      .join('');

    // Histogram & Dekolerans Modeli
    const noiseLevel = Number(noiseSlider?.value) || 0;
    const noiseRes = noiseLevel > 0 ? circuit.simulateNoise({ phaseDamping: noiseLevel }) : null;
    if (noiseRes) {
      entropyBadge.textContent = `H = ${(lastSample.shannonEntropy ?? 0).toFixed(2)}b · Saflık: ${(noiseRes.purity * 100).toFixed(0)}%`;
      entropyBadge.className = noiseRes.isPure ? 'badge badge-patina num' : 'badge badge-warning num';
    } else {
      entropyBadge.textContent = `H = ${(lastSample.shannonEntropy ?? lastSample.entropy ?? 0).toFixed(2)} bit`;
      entropyBadge.className = 'badge badge-patina num';
    }
    const entries = Object.entries(lastSample.counts).sort((a, b) => a[0].localeCompare(b[0]));
    histEl.innerHTML = entries
      .map(([bits, cnt]) => {
        const pct = (cnt / lastSample.shots) * 100;
        return `
          <div class="hist-row">
            <span>|${bits}⟩</span>
            <div class="hist-track"><div class="hist-fill" style="width:${pct.toFixed(1)}%"></div></div>
            <span>${cnt} (${pct.toFixed(0)}%)</span>
          </div>
        `;
      })
      .join('');

    qasmOut.textContent = circuit.toQASM();
    statusRight.textContent = `Durum boyutu: ${1 << circuit.numQubits} karmaşık genlik · Kapı sayısı: ${circuit.gates.length}`;
    drawBlochSphere();
  }

  paletteEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-gate]');
    if (!btn) return;
    selectedTool = btn.dataset.gate;
    pendingTwoQubit = null;
    hintEl.textContent =
      ['CX', 'CZ', 'SWAP'].includes(selectedTool)
        ? `${selectedTool}: Önce kontrol kübitine, ardından hedef kübite tıklayın.`
        : `Seçili kapı: ${selectedTool}`;
    renderPalette();
  });

  boardEl.addEventListener('click', (e) => {
    const cell = e.target.closest('.circuit-cell');
    if (!cell) return;
    const q = Number(cell.dataset.q);
    const s = Number(cell.dataset.s);
    const gidx = Number(cell.dataset.gidx);

    if (selectedTool === 'SİL') {
      if (gidx >= 0) {
        circuit.removeGateAt(gidx);
        lastSample = circuit.run().sample(1024);
        renderAll();
      }
      return;
    }

    if (['CX', 'CZ', 'SWAP'].includes(selectedTool)) {
      if (circuit.numQubits < 2) {
        hintEl.textContent = '2 kübitlik kapı için kübit sayısını en az 2q yapın.';
        return;
      }
      if (!pendingTwoQubit) {
        pendingTwoQubit = { gate: selectedTool.toLowerCase(), step: s, firstQubit: q };
        hintEl.textContent = `Kontrol q[${q}] seçildi — şimdi hedef kübite tıklayın.`;
        return;
      }
      if (pendingTwoQubit.firstQubit === q) {
        pendingTwoQubit = null;
        hintEl.textContent = 'Kontrol ve hedef kübit farklı olmalıdır.';
        return;
      }
      circuit.addGate({
        gate: pendingTwoQubit.gate,
        targets: [pendingTwoQubit.firstQubit, q],
        params: [],
        step: pendingTwoQubit.step,
      });
      pendingTwoQubit = null;
      hintEl.textContent = 'İki kübitlik dolanıklık kapısı eklendi.';
    } else {
      const gName = selectedTool.toLowerCase();
      const deg = Number(thetaDegInput?.value);
      const thetaRad = ((Number.isFinite(deg) ? deg : 90) * Math.PI) / 180;
      const params = ['rx', 'ry', 'rz'].includes(gName) ? [thetaRad] : [];
      circuit.addGate({ gate: gName, targets: [q], params, step: s });
    }

    osContext.sound?.playClick?.();
    lastSample = circuit.run().sample(1024);
    renderAll();
  });

  container.querySelector('#ql-qubits').addEventListener('change', (e) => {
    circuit = new QuantumCircuit(Number(e.target.value));
    lastSample = circuit.run().sample(1024);
    renderAll();
  });

  container.querySelector('#ql-preset').addEventListener('change', (e) => {
    const p = e.target.value;
    if (!p || typeof QuantumPresets[p] !== 'function') return;
    circuit = QuantumPresets[p]();
    container.querySelector('#ql-qubits').value = String(circuit.numQubits);
    osContext.sound?.playQuantumCollapse?.();
    lastSample = circuit.run().sample(1024);
    renderAll();
  });

  container.querySelector('#ql-measure-btn').addEventListener('click', () => {
    osContext.sound?.playQuantumCollapse?.();
    lastSample = circuit.run().sample(1024);
    renderAll();
  });

  container.querySelector('#ql-clear-btn').addEventListener('click', () => {
    circuit.reset();
    circuit.gates = [];
    lastSample = circuit.run().sample(1024);
    renderAll();
  });

  blochSelect.addEventListener('change', (e) => {
    selectedBlochQubit = Number(e.target.value);
    drawBlochSphere();
  });

  container.querySelector('#ql-copy-qasm').addEventListener('click', () => {
    osContext.copyToClipboard?.(circuit.toQASM());
    osContext.notify?.('Q-Lab', 'OpenQASM 2.0 devresi panoya kopyalandı.');
  });

  container.querySelector('#ql-save-qasm-btn').addEventListener('click', () => {
    const fname = `C:/Users/Quantro/Circuits/Devre-${circuit.numQubits}q-${Date.now().toString().slice(-4)}.qasm`;
    osContext.vfs.write(fname, circuit.toQASM());
    osContext.notify?.('Q-Lab VFS Kaydı', `${fname} başarıyla kaydedildi.`);
  });

  renderAll();

  return {
    onArgs(nextArgs) {
      if (nextArgs?.qasm) {
        circuit = QuantumCircuit.fromQASM(nextArgs.qasm);
        container.querySelector('#ql-qubits').value = String(circuit.numQubits);
        lastSample = circuit.run().sample(1024);
        renderAll();
      } else if (nextArgs?.preset && typeof QuantumPresets[nextArgs.preset] === 'function') {
        circuit = QuantumPresets[nextArgs.preset]();
        container.querySelector('#ql-qubits').value = String(circuit.numQubits);
        lastSample = circuit.run().sample(1024);
        renderAll();
      }
    },
  };
}
