/**
 * Uygulama 11: Bilimsel & Fiziksel Hesap Makinesi (CODATA 2022 + Birim Dönüştürücü)
 */
import { ASTRO_CONSTANTS } from '../engines/astro-engine.js';

const CONST_BTNS = [
  { sym: 'c', label: 'Işık Hızı c', val: ASTRO_CONSTANTS.c },
  { sym: 'h', label: 'Planck h', val: ASTRO_CONSTANTS.h },
  { sym: 'ħ', label: 'İndirgenmiş ħ', val: ASTRO_CONSTANTS.hbar },
  { sym: 'G', label: 'Kütleçekim G', val: ASTRO_CONSTANTS.G },
  { sym: 'k_B', label: 'Boltzmann k_B', val: ASTRO_CONSTANTS.kB },
  { sym: 'eV', label: 'Elektronvolt J', val: ASTRO_CONSTANTS.eV },
  { sym: 'M☉', label: 'Güneş Kütlesi kg', val: ASTRO_CONSTANTS.M_sun },
  { sym: 'pc', label: 'Parsek m', val: ASTRO_CONSTANTS.pc },
];

const KEYS = [
  ['sin(', 'cos(', 'tan(', 'sqrt(', 'C'],
  ['ln(', 'log(', '(', ')', '/'],
  ['7', '8', '9', '^', '*'],
  ['4', '5', '6', 'pi', '-'],
  ['1', '2', '3', 'e', '+'],
  ['0', '.', '1e', '⌫', '='],
];

function safeEvalMath(expr) {
  const cleaned = expr
    .replace(/\bpi\b/g, 'Math.PI')
    .replace(/\be\b/g, 'Math.E')
    .replace(/\bsin\(/g, 'Math.sin(')
    .replace(/\bcos\(/g, 'Math.cos(')
    .replace(/\btan\(/g, 'Math.tan(')
    .replace(/\bsqrt\(/g, 'Math.sqrt(')
    .replace(/\bln\(/g, 'Math.log(')
    .replace(/\blog\(/g, 'Math.log10(')
    .replace(/\^/g, '**');

  if (!/^[0-9+\-*/().,\sMathPIEsincoqrtlg*e]+$/.test(cleaned)) {
    throw new Error('Geçersiz ifade');
  }
  const fn = new Function(`"use strict"; return (${cleaned});`);
  const out = fn();
  if (typeof out !== 'number' || !Number.isFinite(out)) throw new Error('Tanımsız / Taşma');
  return out;
}

export function mountCalculatorApp(container) {
  let expr = '';
  let result = '0';
  let tab = 'calc';

  container.innerHTML = `
    <div class="app-shell">
      <div class="app-tabs" id="ca-tabs">
        <button type="button" class="app-tab active" data-tab="calc">Bilimsel &amp; CODATA 2022</button>
        <button type="button" class="app-tab" data-tab="units">Astro / Kuantum Birim Dönüştürücü</button>
      </div>
      <div class="app-main" id="ca-body"></div>
    </div>
  `;

  const bodyEl = container.querySelector('#ca-body');

  function render() {
    if (tab === 'calc') {
      bodyEl.innerHTML = `
        <div class="calc-display">
          <div class="calc-expr" id="ca-expr">${expr || ' '}</div>
          <div class="calc-result" id="ca-res">${result}</div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;" id="ca-consts">
          ${CONST_BTNS.map(
            (c, i) => `<button type="button" class="jarvis-chip mono" data-cidx="${i}" title="${c.label}: ${c.val}">${c.sym}</button>`
          ).join('')}
        </div>
        <div class="calc-keypad" id="ca-pad">
          ${KEYS.flat()
            .map((k) => {
              const cls = k === '=' ? 'calc-key eq' : ['/', '*', '-', '+', 'C', '⌫'].includes(k) ? 'calc-key op' : 'calc-key';
              return `<button type="button" class="${cls}" data-k="${k}">${k}</button>`;
            })
            .join('')}
        </div>
      `;

      bodyEl.querySelector('#ca-consts').addEventListener('click', (e) => {
        const b = e.target.closest('[data-cidx]');
        if (!b) return;
        const c = CONST_BTNS[Number(b.dataset.cidx)];
        expr += String(c.val);
        render();
      });

      bodyEl.querySelector('#ca-pad').addEventListener('click', (e) => {
        const b = e.target.closest('[data-k]');
        if (!b) return;
        const k = b.dataset.k;
        if (k === 'C') {
          expr = '';
          result = '0';
        } else if (k === '⌫') {
          expr = expr.slice(0, -1);
        } else if (k === '=') {
          try {
            const val = safeEvalMath(expr || '0');
            result = Math.abs(val) > 1e7 || (Math.abs(val) > 0 && Math.abs(val) < 1e-4) ? val.toExponential(6) : String(Number(val.toPrecision(10)));
          } catch (err) {
            result = err.message;
          }
        } else {
          expr += k;
        }
        render();
      });
    } else {
      bodyEl.innerHTML = `
        <div class="panel-card">
          <div class="eyebrow">ENERJİ DÖNÜŞÜMÜ (eV ↔ Joule)</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <label style="font-size:12px;">Elektronvolt (eV)<input type="number" class="input" id="u-ev" value="13.6" step="any" /></label>
            <label style="font-size:12px;">Joule (J)<input type="text" class="input mono" id="u-j" readonly /></label>
          </div>
        </div>
        <div class="panel-card">
          <div class="eyebrow">KOZMİK MESAFE (Parsek ↔ Işık Yılı ↔ AU)</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
            <label style="font-size:12px;">Parsek (pc)<input type="number" class="input" id="u-pc" value="1" step="any" /></label>
            <label style="font-size:12px;">Işık Yılı (ly)<input type="text" class="input mono" id="u-ly" readonly /></label>
            <label style="font-size:12px;">Astronomik Birim (AU)<input type="text" class="input mono" id="u-au" readonly /></label>
          </div>
        </div>
      `;

      const updateUnits = () => {
        const ev = Number(bodyEl.querySelector('#u-ev').value) || 0;
        bodyEl.querySelector('#u-j').value = (ev * ASTRO_CONSTANTS.eV).toExponential(5);
        const pc = Number(bodyEl.querySelector('#u-pc').value) || 0;
        const meters = pc * ASTRO_CONSTANTS.pc;
        bodyEl.querySelector('#u-ly').value = (meters / ASTRO_CONSTANTS.ly).toFixed(4);
        bodyEl.querySelector('#u-au').value = (meters / ASTRO_CONSTANTS.AU).toFixed(1);
      };
      bodyEl.querySelector('#u-ev').addEventListener('input', updateUnits);
      bodyEl.querySelector('#u-pc').addEventListener('input', updateUnits);
      updateUnits();
    }
  }

  container.querySelector('#ca-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    tab = b.dataset.tab;
    container.querySelectorAll('.app-tab').forEach((el) => el.classList.toggle('active', el === b));
    render();
  });

  render();
  return {};
}
