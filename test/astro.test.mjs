import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASTRO_CONSTANTS,
  blackHoleMetrics,
  NBodySystem,
  cosmologyMetrics,
  ligoChirpWaveform,
  siderealAndJulian,
  shiftWavelength,
} from '../desktop/js/engines/astro-engine.js';

test('Black Hole Physics: 1 and 10 Solar Mass Schwarzschild & Kerr metrics', () => {
  const bh1 = blackHoleMetrics(1, 0);
  // 2 * G * M_sun / c^2 ~= 2.95325 km
  assert.ok(Math.abs(bh1.schwarzschildRadiusKm - 2.95325) < 0.01, `Got Rs=${bh1.schwarzschildRadiusKm}`);
  assert.ok(Math.abs(bh1.photonSphereKm - bh1.schwarzschildRadiusKm * 1.5) < 0.01);
  assert.ok(Math.abs(bh1.iscoProgradeKm - bh1.schwarzschildRadiusKm * 3.0) < 0.02);

  const bh10Spin = blackHoleMetrics(10, 0.9);
  assert.ok(bh10Spin.eventHorizonRadiusKm < bh10Spin.schwarzschildRadiusKm);
  assert.ok(bh10Spin.iscoProgradeKm < bh10Spin.schwarzschildRadiusKm * 3.0);
  assert.ok(bh10Spin.hawkingTempK > 0 && bh10Spin.hawkingTempK < bh1.hawkingTempK);
});

test('NBodySystem: Velocity-Verlet conserves total mechanical energy', () => {
  const sys = NBodySystem.Presets.binaryPulsar();
  const e0 = sys.totalEnergy().total;
  for (let i = 0; i < 100; i++) {
    sys.step(0.005, 4);
  }
  const e1 = sys.totalEnergy().total;
  const relDrift = Math.abs((e1 - e0) / (Math.abs(e0) || 1));
  assert.ok(relDrift < 0.02, `Expected energy drift < 2%, got ${(relDrift * 100).toFixed(3)}%`);
});

test('Lambda-CDM Cosmology: Universe age ~13.8 Gyr and luminosity distance scaling', () => {
  const z0 = cosmologyMetrics({ z: 0, H0: 67.4, OmegaM: 0.315, OmegaL: 0.685 });
  assert.ok(z0.universeAgeNowGyr > 13.5 && z0.universeAgeNowGyr < 14.1, `Got age=${z0.universeAgeNowGyr}`);
  assert.ok(Math.abs(z0.comovingDistanceMpc) < 1e-6);

  const z1 = cosmologyMetrics({ z: 1.0, H0: 67.4, OmegaM: 0.315, OmegaL: 0.685 });
  assert.ok(z1.comovingDistanceMpc > 3000 && z1.comovingDistanceMpc < 3600);
  assert.ok(Math.abs(z1.luminosityDistanceMpc - 2.0 * z1.comovingDistanceMpc) < 1.0);
  assert.ok(z1.lookbackTimeGyr > 7.5 && z1.lookbackTimeGyr < 8.2);
});

test('LIGO Chirp Waveform: GW150914-like binary black hole chirp mass ~28.1 M_sun', () => {
  const gw = ligoChirpWaveform({ m1Solar: 36, m2Solar: 29, distanceMpc: 410, durationSec: 0.25, sampleRate: 1024 });
  assert.ok(Math.abs(gw.chirpMassSolar - 28.1) < 0.3, `Got Mc=${gw.chirpMassSolar}`);
  assert.ok(gw.strain.length > 100);
  assert.ok(ASTRO_CONSTANTS.c === 299792458);
});

test('Sidereal & Julian Date: J2000.0 epoch equals JD 2451545.0', () => {
  const j2000 = new Date('2000-01-01T12:00:00Z');
  const astro = siderealAndJulian(j2000, 35.4853);
  assert.ok(Math.abs(astro.julianDate - 2451545.0) < 1e-5, `Got JD=${astro.julianDate}`);
  assert.ok(astro.earthOrbitalSpeedKmS > 29.0 && astro.earthOrbitalSpeedKmS < 30.6);
  assert.ok(Math.abs(shiftWavelength(656.28, 1.0) - 1312.56) < 1e-4);
});
