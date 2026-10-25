import test from 'node:test';
import assert from 'node:assert/strict';
import { QuantumCircuit, QuantumPresets } from '../desktop/js/engines/quantum-engine.js';
import { simulateBB84, generateQRNGBytes, computeByteStats } from '../desktop/js/engines/bb84-engine.js';

test('QuantumCircuit: Bell state |Phi+> has 50/50 |00> and |11> and maximally mixed Bloch vector', () => {
  const qc = QuantumPresets.bell();
  qc.run();
  const probs = qc.probabilities();
  assert.equal(probs.length, 4);
  assert.ok(Math.abs(probs[0] - 0.5) < 1e-9, `Expected P(00)=0.5, got ${probs[0]}`);
  assert.ok(Math.abs(probs[1] - 0.0) < 1e-9);
  assert.ok(Math.abs(probs[2] - 0.0) < 1e-9);
  assert.ok(Math.abs(probs[3] - 0.5) < 1e-9, `Expected P(11)=0.5, got ${probs[3]}`);

  const bloch = qc.blochVector(0);
  assert.ok(Math.abs(bloch.x) < 1e-9);
  assert.ok(Math.abs(bloch.y) < 1e-9);
  assert.ok(Math.abs(bloch.z) < 1e-9);
  assert.ok(Math.abs(bloch.purity - 0.5) < 1e-6, `Expected purity 0.5 for entangled qubit, got ${bloch.purity}`);
});

test('QuantumCircuit: 3-qubit GHZ state concentrates on |000> and |111>', () => {
  const ghz = QuantumPresets.ghz(3).run();
  const probs = ghz.probabilities();
  assert.equal(probs.length, 8);
  assert.ok(Math.abs(probs[0] - 0.5) < 1e-9);
  assert.ok(Math.abs(probs[7] - 0.5) < 1e-9);
  const sum = probs.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1.0) < 1e-9);
});

test('QuantumCircuit: 2-qubit Grover search amplifies target state to ~100%', () => {
  const grover = QuantumPresets.grover2().run();
  const probs = grover.probabilities();
  const maxProb = Math.max(...probs);
  assert.ok(maxProb > 0.99, `Expected Grover amplified probability > 0.99, got ${maxProb}`);
});

test('QuantumCircuit: QASM export and deterministic sampling', () => {
  const qc = new QuantumCircuit(2).h(0).cx(0, 1).run();
  const qasm = qc.toQASM();
  assert.match(qasm, /OPENQASM 2\.0/);
  assert.match(qasm, /qreg/);

  const s1 = qc.sample(512, 42);
  const s2 = qc.sample(512, 42);
  assert.deepEqual(s1.counts, s2.counts);
  assert.equal((s1.counts['00'] || 0) + (s1.counts['11'] || 0), 512);
});

test('BB84 Protocol: zero QBER without eavesdropper, ~25% QBER with Eve', () => {
  const clean = simulateBB84({ length: 256, eavesdrop: false, seed: 101 });
  assert.equal(clean.qber, 0);
  assert.equal(clean.secure, true);
  assert.ok(clean.siftedAlice.length > 80);

  const attacked = simulateBB84({ length: 512, eavesdrop: true, interceptRate: 1.0, seed: 202 });
  assert.ok(attacked.qber > 0.15 && attacked.qber < 0.38, `Expected QBER ~0.25, got ${attacked.qber}`);
  assert.equal(attacked.secure, false);
});

test('QRNG CSPRNG byte statistics have high Shannon entropy', () => {
  const bytes = generateQRNGBytes(256);
  assert.equal(bytes.length, 256);
  const stats = computeByteStats(bytes);
  assert.ok(stats.shannonEntropy > 6.5, `Expected high entropy > 6.5 bits/byte, got ${stats.shannonEntropy}`);
});
