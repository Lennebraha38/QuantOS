/**
 * QuantOS — Relativistik Astrofizik, Kerr Kara Delik, Simplektik N-Cisim,
 * Lambda-CDM Kozmoloji, LIGO Kütleçekim Dalgası ve Gök Mekaniği Motoru
 * CODATA 2022 & IAU 2015 Sabitleri · Sıfır Bağımlılık
 */

const JULIAN_YEAR_SEC = 365.25 * 86400;
const GYR_SEC = 1e9 * JULIAN_YEAR_SEC;

export const ASTRO_CONSTANTS = Object.freeze({
  c: 299792458,                     // Işık hızı (m/s, tam)
  G: 6.67430e-11,                   // Evrensel kütleçekim sabiti (m^3 kg^-1 s^-2, CODATA 2022)
  h: 6.62607015e-34,                // Planck sabiti (J s, tam)
  hbar: 1.0545718176461565e-34,     // İndirgenmiş Planck sabiti h / (2*pi) (J s)
  kB: 1.380649e-23,                 // Boltzmann sabiti (J/K, tam)
  eV: 1.602176634e-19,              // Elektronvolt (J, tam)
  sigmaSB: 5.6703744191844294e-8,   // Stefan-Boltzmann sabiti (W m^-2 K^-4)
  M_sun: 1.98847e30,                // Güneş kütlesi (kg)
  R_sun: 6.957e8,                  // Nominal Güneş yarıçapı (m, IAU 2015)
  L_sun: 3.828e26,                  // Nominal Güneş ışıma gücü (W, IAU 2015)
  AU: 1.495978707e11,               // Astronomik Birim (m, IAU 2012 tam)
  ly: 9.4607304725808e15,           // Jülyen ışık yılı (m)
  pc: 3.0856775814913673e16,        // Parsek (m)
  H0_default: 67.4                  // Varsayılan Hubble sabiti (km s^-1 Mpc^-1, Planck 2018)
});

function simpsonIntegrate(fn, a, b, intervals = 1000) {
  if (a === b) return 0;
  const n = intervals % 2 === 0 ? intervals : intervals + 1;
  const h = (b - a) / n;
  let sum = fn(a) + fn(b);
  for (let i = 1; i < n; i++) {
    const x = a + i * h;
    sum += (i % 2 === 1 ? 4 : 2) * fn(x);
  }
  return (h / 3) * sum;
}

export function blackHoleMetrics(massSolar = 10, spin = 0) {
  const mSolar = Math.max(1e-18, Number(massSolar) || 10);
  const aStar = Math.max(0, Math.min(0.999999, Math.abs(Number(spin) || 0)));

  const { G, c, hbar, kB, M_sun } = ASTRO_CONSTANTS;
  const massKg = mSolar * M_sun;

  const rgM = (G * massKg) / (c * c);
  const rsM = 2 * rgM;

  const rootSpin = Math.sqrt(Math.max(0, 1 - aStar * aStar));
  const rPlusM = rgM * (1 + rootSpin);
  const rMinusM = rgM * (1 - rootSpin);

  const rPhotonProM = 2 * rgM * (1 + Math.cos((2 / 3) * Math.acos(-aStar)));
  const rPhotonRetroM = 2 * rgM * (1 + Math.cos((2 / 3) * Math.acos(aStar)));

  const oneMinusA2Cbrt = Math.cbrt(Math.max(0, 1 - aStar * aStar));
  const Z1 = 1 + oneMinusA2Cbrt * (Math.cbrt(1 + aStar) + Math.cbrt(Math.max(0, 1 - aStar)));
  const Z2 = Math.sqrt(3 * aStar * aStar + Z1 * Z1);
  const iscoRadTerm = Math.sqrt(Math.max(0, (3 - Z1) * (3 + Z1 + 2 * Z2)));

  const rIscoProOverRg = 3 + Z2 - iscoRadTerm;
  const rIscoRetroOverRg = 3 + Z2 + iscoRadTerm;
  const rIscoProM = rgM * rIscoProOverRg;
  const rIscoRetroM = rgM * rIscoRetroOverRg;

  const rSqrt = Math.sqrt(rIscoProOverRg);
  const eIscoNum = rIscoProOverRg * rSqrt - 2 * rSqrt + aStar;
  const eIscoDen =
    Math.pow(rIscoProOverRg, 0.75) *
    Math.sqrt(Math.max(1e-12, rIscoProOverRg * rSqrt - 3 * rSqrt + 2 * aStar));
  const radiativeEfficiency = Math.max(0, Math.min(0.45, 1 - eIscoNum / eIscoDen));

  const hawkingTemperatureK = (hbar * Math.pow(c, 3)) / (8 * Math.PI * G * massKg * kB);
  const kerrHawkingTemperatureK = hawkingTemperatureK * ((2 * rootSpin) / (1 + rootSpin));

  const hawkingPowerW =
    (hbar * Math.pow(c, 6)) / (15360 * Math.PI * G * G * massKg * massKg);

  const evaporationTimeSec =
    (5120 * Math.PI * G * G * Math.pow(massKg, 3)) / (hbar * Math.pow(c, 4));
  const evaporationTimeYears = evaporationTimeSec / JULIAN_YEAR_SEC;

  const schwarzschildSurfaceGravityMS2 = Math.pow(c, 4) / (4 * G * massKg);
  const surfaceGravityMS2 =
    aStar === 0
      ? schwarzschildSurfaceGravityMS2
      : (Math.pow(c, 4) * rootSpin) / (2 * G * massKg * (1 + rootSpin));

  const timeDilationAt2Rs = Math.sqrt(1 - rsM / (2 * rsM));
  const clockStretchAt2Rs = 1 / timeDilationAt2Rs;
  const gravitationalRedshiftAt2Rs = clockStretchAt2Rs - 1;

  return {
    massSolar: mSolar,
    massKg,
    spin: aStar,
    gravitationalRadiusM: rgM,
    gravitationalRadiusKm: rgM / 1000,
    schwarzschildRadiusM: rsM,
    schwarzschildRadiusKm: rsM / 1000,
    eventHorizonRadiusKm: rPlusM / 1000,
    kerrOuterHorizonM: rPlusM,
    kerrOuterHorizonKm: rPlusM / 1000,
    kerrInnerHorizonM: rMinusM,
    kerrInnerHorizonKm: rMinusM / 1000,
    photonSphereProgradeKm: rPhotonProM / 1000,
    photonSphereRetrogradeKm: rPhotonRetroM / 1000,
    photonSphereKm: rPhotonProM / 1000,
    iscoProgradeKm: rIscoProM / 1000,
    iscoRetrogradeKm: rIscoRetroM / 1000,
    iscoKm: rIscoProM / 1000,
    radiativeEfficiency,
    hawkingTempK: kerrHawkingTemperatureK,
    hawkingTemperatureK,
    kerrHawkingTemperatureK,
    luminosityWatts: hawkingPowerW,
    hawkingPowerW,
    evaporationYears: evaporationTimeYears,
    evaporationTimeSec,
    evaporationTimeYears,
    surfaceGravity: surfaceGravityMS2,
    surfaceGravityMS2,
    schwarzschildSurfaceGravityMS2,
    timeDilationFactorAt2Rs: clockStretchAt2Rs,
    timeDilationAt2Rs,
    clockStretchAt2Rs,
    gravitationalRedshiftAt2Rs
  };
}

/**
 * Kütleçekimsel Merceklenme (Gravitational Lensing):
 * Einstein halkası açısal yarıçapı, ışık sapma açısı ve mercek büyütmesi.
 */
export function gravitationalLensing({
  massSolar = 1e11,
  dLensMpc = 1000,
  dSourceMpc = 2000,
  impactParamRg = 10
} = {}) {
  const { G, c, M_sun, pc } = ASTRO_CONSTANTS;
  const M = Math.max(1, Number(massSolar) || 1e11) * M_sun;
  const DL_m = Math.max(0.1, Number(dLensMpc) || 1000) * 1e6 * pc;
  const DS_m = Math.max(DL_m * 1.01, Number(dSourceMpc) || 2000) * 1e6 * pc;
  const DLS_m = DS_m - DL_m;

  const rg = (G * M) / (c * c);
  const thetaE_rad = Math.sqrt((4 * rg * DLS_m) / (DL_m * DS_m));
  const arcsecPerRad = (180 * 3600) / Math.PI;
  const thetaE_arcsec = thetaE_rad * arcsecPerRad;

  const b_m = Math.max(3 * rg, Number(impactParamRg) * rg);
  const deflectionRad = (4 * rg) / b_m;
  const deflectionArcsec = deflectionRad * arcsecPerRad;

  const u = 0.5;
  const magPlus = (u * u + 2) / (2 * u * Math.sqrt(u * u + 4)) + 0.5;
  const magMinus = (u * u + 2) / (2 * u * Math.sqrt(u * u + 4)) - 0.5;
  const totalMag = magPlus + Math.abs(magMinus);

  return {
    massSolar: Number(massSolar) || 1e11,
    thetaE_rad,
    thetaE_arcsec,
    deflectionRad,
    deflectionArcsec,
    einsteinRadiusPhysicalKpc: (thetaE_rad * DL_m) / (1e3 * pc),
    magnification: {
      u,
      plus: magPlus,
      minus: magMinus,
      total: totalMag
    }
  };
}

export class NBodySystem {
  constructor(bodiesOrConfig = [], G_sim = 1.0, options = {}) {
    let rawBodies = [];
    let gVal = G_sim;
    let softening = Number(options?.softening ?? 0);
    let maxTrail = Number(options?.maxTrail ?? 160);

    if (
      bodiesOrConfig &&
      typeof bodiesOrConfig === 'object' &&
      !Array.isArray(bodiesOrConfig)
    ) {
      rawBodies = Array.isArray(bodiesOrConfig.bodies) ? bodiesOrConfig.bodies : [];
      gVal = Number(bodiesOrConfig.G_sim ?? 1.0);
      softening = Number(bodiesOrConfig.softening ?? softening);
      maxTrail = Number(bodiesOrConfig.maxTrail ?? maxTrail);
    } else if (Array.isArray(bodiesOrConfig)) {
      rawBodies = bodiesOrConfig;
    }

    this.G_sim = Number.isFinite(gVal) ? gVal : 1.0;
    this.softening = Number.isFinite(softening) && softening >= 0 ? softening : 0;
    this.maxTrail = maxTrail;
    this.time = 0;

    this.bodies = rawBodies.map((b, idx) => ({
      name: b.name || `Cisim-${idx + 1}`,
      mass: Number(b.mass ?? 1),
      x: Number(b.x ?? 0),
      y: Number(b.y ?? 0),
      z: Number(b.z ?? 0),
      vx: Number(b.vx ?? 0),
      vy: Number(b.vy ?? 0),
      vz: Number(b.vz ?? 0),
      ax: 0,
      ay: 0,
      az: 0,
      color: b.color || '#d97736',
      radius: Number(b.radius ?? 4),
      trail: Array.isArray(b.trail) ? b.trail.slice() : [{ x: Number(b.x ?? 0), y: Number(b.y ?? 0) }]
    }));

    this._computeAccelerations();
  }

  addBody(b = {}) {
    const x = Number(b.x ?? 0);
    const y = Number(b.y ?? 0);
    const body = {
      name: b.name || `Cisim-${this.bodies.length + 1}`,
      mass: Number.isFinite(Number(b.mass)) ? Number(b.mass) : 0.01,
      x: Number.isFinite(x) ? x : 0,
      y: Number.isFinite(y) ? y : 0,
      z: Number.isFinite(Number(b.z)) ? Number(b.z) : 0,
      vx: Number.isFinite(Number(b.vx)) ? Number(b.vx) : 0,
      vy: Number.isFinite(Number(b.vy)) ? Number(b.vy) : 0,
      vz: Number.isFinite(Number(b.vz)) ? Number(b.vz) : 0,
      ax: 0,
      ay: 0,
      az: 0,
      color: b.color || '#5F8A7A',
      radius: Number(b.radius ?? 4),
      trail: Array.isArray(b.trail) ? b.trail.slice() : [{ x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 }]
    };
    this.bodies.push(body);
    this._computeAccelerations();
    return body;
  }

  _computeAccelerations() {
    const bodies = this.bodies;
    const n = bodies.length;
    const G = this.G_sim;
    const eps2 = this.softening * this.softening;

    for (let i = 0; i < n; i++) {
      bodies[i].ax = 0;
      bodies[i].ay = 0;
      bodies[i].az = 0;
    }

    for (let i = 0; i < n; i++) {
      const bi = bodies[i];
      for (let j = i + 1; j < n; j++) {
        const bj = bodies[j];
        const dx = bj.x - bi.x;
        const dy = bj.y - bi.y;
        const dz = bj.z - bi.z;
        const dist2 = dx * dx + dy * dy + dz * dz + eps2;
        if (dist2 === 0) continue;
        const invDist = 1 / Math.sqrt(dist2);
        const invDist3 = invDist * invDist * invDist;
        const fScalar = G * invDist3;

        const fx = fScalar * dx;
        const fy = fScalar * dy;
        const fz = fScalar * dz;

        bi.ax += fx * bj.mass;
        bi.ay += fy * bj.mass;
        bi.az += fz * bj.mass;

        bj.ax -= fx * bi.mass;
        bj.ay -= fy * bi.mass;
        bj.az -= fz * bi.mass;
      }
    }
  }

  step(dt = 0.01, substeps = 4) {
    const steps = Math.max(1, Math.min(1000, Math.floor(Number(substeps) || 1)));
    const h = Number(dt) / steps;
    const halfH = 0.5 * h;
    const halfH2 = 0.5 * h * h;
    const bodies = this.bodies;
    const n = bodies.length;

    const oldAx = new Float64Array(n);
    const oldAy = new Float64Array(n);
    const oldAz = new Float64Array(n);

    for (let s = 0; s < steps; s++) {
      for (let i = 0; i < n; i++) {
        const b = bodies[i];
        oldAx[i] = b.ax;
        oldAy[i] = b.ay;
        oldAz[i] = b.az;

        b.x += b.vx * h + b.ax * halfH2;
        b.y += b.vy * h + b.ay * halfH2;
        b.z += b.vz * h + b.az * halfH2;
      }

      this._computeAccelerations();

      for (let i = 0; i < n; i++) {
        const b = bodies[i];
        b.vx += halfH * (oldAx[i] + b.ax);
        b.vy += halfH * (oldAy[i] + b.ay);
        b.vz += halfH * (oldAz[i] + b.az);
      }

      this.time += h;
    }

    for (let i = 0; i < n; i++) {
      const b = bodies[i];
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > this.maxTrail) {
        b.trail.shift();
      }
    }

    return this;
  }

  energyBreakdown() {
    const bodies = this.bodies;
    const n = bodies.length;
    const G = this.G_sim;
    const eps2 = this.softening * this.softening;

    let kinetic = 0;
    let potential = 0;

    for (let i = 0; i < n; i++) {
      const bi = bodies[i];
      const v2 = bi.vx * bi.vx + bi.vy * bi.vy + bi.vz * bi.vz;
      kinetic += 0.5 * bi.mass * v2;

      for (let j = i + 1; j < n; j++) {
        const bj = bodies[j];
        const dx = bj.x - bi.x;
        const dy = bj.y - bi.y;
        const dz = bj.z - bi.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz + eps2);
        if (dist > 0) {
          potential -= (G * bi.mass * bj.mass) / dist;
        }
      }
    }

    return {
      kinetic,
      potential,
      total: kinetic + potential
    };
  }

  totalEnergy() {
    const eb = this.energyBreakdown();
    return Object.assign(eb, { valueOf: () => eb.total });
  }

  static Presets = Object.freeze({
    solarSystem() {
      const G_au = 4 * Math.PI * Math.PI;
      const bodies = [
        { name: 'Güneş', mass: 1.0, x: 0, y: 0, vx: 0, vy: 0, color: '#f59e0b', radius: 9 },
        { name: 'Merkür', mass: 1.6601e-7, x: 0.3871, y: 0, vx: 0, vy: Math.sqrt(G_au / 0.3871), color: '#a8a29e', radius: 3 },
        { name: 'Venüs', mass: 2.4478e-6, x: 0.7233, y: 0, vx: 0, vy: Math.sqrt(G_au / 0.7233), color: '#fbbf24', radius: 4 },
        { name: 'Dünya', mass: 3.0035e-6, x: 1.0, y: 0, vx: 0, vy: Math.sqrt(G_au / 1.0), color: '#38bdf8', radius: 4.5 },
        { name: 'Mars', mass: 3.2272e-7, x: 1.5237, y: 0, vx: 0, vy: Math.sqrt(G_au / 1.5237), color: '#ef4444', radius: 3.5 },
        { name: 'Jüpiter', mass: 9.5479e-4, x: 5.2026, y: 0, vx: 0, vy: Math.sqrt(G_au / 5.2026), color: '#d97736', radius: 6.5 }
      ];
      let px = 0;
      let py = 0;
      for (const b of bodies) {
        px += b.mass * b.vx;
        py += b.mass * b.vy;
      }
      bodies[0].vx = -px / bodies[0].mass;
      bodies[0].vy = -py / bodies[0].mass;
      return new NBodySystem(bodies, G_au, { softening: 0 });
    },

    binaryPulsar() {
      const G = 1.0;
      const m1 = 1.441;
      const m2 = 1.387;
      const M = m1 + m2;
      const a = 2.0;
      const e = 0.45;
      const rp = a * (1 - e);
      const vp = Math.sqrt((G * M * (1 + e)) / rp);

      const bodies = [
        {
          name: 'Pulsar A',
          mass: m1,
          x: -(m2 / M) * rp,
          y: 0,
          vx: 0,
          vy: -(m2 / M) * vp,
          color: '#38bdf8',
          radius: 5.5
        },
        {
          name: 'Nötron B',
          mass: m2,
          x: (m1 / M) * rp,
          y: 0,
          vx: 0,
          vy: (m1 / M) * vp,
          color: '#f97316',
          radius: 5.5
        }
      ];
      return new NBodySystem(bodies, G, { softening: 0 });
    },

    figureEight() {
      const vx3 = -0.93240737;
      const vy3 = -0.86473146;
      const bodies = [
        {
          name: 'Alfa',
          mass: 1.0,
          x: 0.97000436,
          y: -0.24308753,
          vx: -vx3 / 2,
          vy: -vy3 / 2,
          color: '#38bdf8',
          radius: 5
        },
        {
          name: 'Beta',
          mass: 1.0,
          x: -0.97000436,
          y: 0.24308753,
          vx: -vx3 / 2,
          vy: -vy3 / 2,
          color: '#f59e0b',
          radius: 5
        },
        {
          name: 'Gama',
          mass: 1.0,
          x: 0,
          y: 0,
          vx: vx3,
          vy: vy3,
          color: '#10b981',
          radius: 5
        }
      ];
      return new NBodySystem(bodies, 1.0, { softening: 0 });
    },

    keplerianDisk(ringCount = 18) {
      const G = 1.0;
      const centralMass = 12.0;
      const bodies = [
        {
          name: 'Merkez Çekirdek',
          mass: centralMass,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          color: '#f59e0b',
          radius: 8
        }
      ];

      let px = 0;
      let py = 0;
      const palette = ['#38bdf8', '#d97736', '#34d399', '#a78bfa', '#fb7185'];
      for (let i = 0; i < ringCount; i++) {
        const r = 0.9 + (i / Math.max(1, ringCount - 1)) * 2.6;
        const theta = i * 2.399963229728653;
        const v = Math.sqrt((G * centralMass) / r);
        const m = 0.002;
        const vx = -v * Math.sin(theta);
        const vy = v * Math.cos(theta);
        px += m * vx;
        py += m * vy;
        bodies.push({
          name: `Disk-${i + 1}`,
          mass: m,
          x: r * Math.cos(theta),
          y: r * Math.sin(theta),
          vx,
          vy,
          color: palette[i % palette.length],
          radius: 2.8
        });
      }
      bodies[0].vx = -px / centralMass;
      bodies[0].vy = -py / centralMass;
      return new NBodySystem(bodies, G, { softening: 0.025 });
    },

    trappist1() {
      const G = 1.0;
      const mStar = 1.0;
      const planets = [
        { name: 'TRAPPIST-1', mass: mStar, x: 0, y: 0, vx: 0, vy: 0, color: '#ef4444', radius: 8 },
        { name: 'b', mass: 1.02e-5, r: 0.35, color: '#38bdf8', radius: 2.8 },
        { name: 'c', mass: 1.16e-5, r: 0.48, color: '#a78bfa', radius: 2.9 },
        { name: 'd', mass: 0.30e-5, r: 0.65, color: '#34d399', radius: 2.3 },
        { name: 'e', mass: 0.77e-5, r: 0.85, color: '#fbbf24', radius: 2.7 },
        { name: 'f', mass: 0.93e-5, r: 1.10, color: '#f97316', radius: 2.8 },
        { name: 'g', mass: 1.15e-5, r: 1.40, color: '#ec4899', radius: 2.9 },
        { name: 'h', mass: 0.33e-5, r: 1.80, color: '#94a3b8', radius: 2.4 }
      ];
      const bodies = [planets[0]];
      let px = 0, py = 0;
      for (let i = 1; i < planets.length; i++) {
        const p = planets[i];
        const v = Math.sqrt((G * mStar) / p.r);
        bodies.push({
          name: `TRAPPIST-1${p.name}`,
          mass: p.mass,
          x: p.r,
          y: 0,
          vx: 0,
          vy: v,
          color: p.color,
          radius: p.radius
        });
        py += p.mass * v;
      }
      bodies[0].vy = -py / mStar;
      return new NBodySystem(bodies, G, { softening: 0.001 });
    },

    lagrangeTrojan() {
      const G = 1.0;
      const mSun = 1.0;
      const mJup = 0.04;
      const rJup = 2.0;
      const vJup = Math.sqrt((G * (mSun + mJup)) / rJup);
      const cos60 = 0.5;
      const sin60 = Math.sqrt(3) / 2;

      const bodies = [
        { name: 'Güneş', mass: mSun, x: 0, y: 0, vx: 0, vy: -(mJup / (mSun + mJup)) * vJup, color: '#f59e0b', radius: 8 },
        { name: 'Jüpiter', mass: mJup, x: rJup, y: 0, vx: 0, vy: (mSun / (mSun + mJup)) * vJup, color: '#d97736', radius: 5.5 },
        {
          name: 'Truvalı (L4)',
          mass: 1e-6,
          x: rJup * cos60,
          y: rJup * sin60,
          vx: -vJup * sin60,
          vy: vJup * cos60,
          color: '#38bdf8',
          radius: 3
        },
        {
          name: 'Truvalı (L5)',
          mass: 1e-6,
          x: rJup * cos60,
          y: -rJup * sin60,
          vx: vJup * sin60,
          vy: vJup * cos60,
          color: '#34d399',
          radius: 3
        }
      ];
      return new NBodySystem(bodies, G, { softening: 0.002 });
    }
  });
}

function cleanSmall(v) {
  return Math.abs(v) < 1e-14 ? 0 : v;
}

export function cosmologyMetrics({
  z = 1.0,
  H0 = 67.4,
  OmegaM = 0.315,
  OmegaL = 0.685
} = {}) {
  const redshift = Math.max(0, Number(z ?? 1.0));
  const h0 = Math.max(1, Number(H0 || ASTRO_CONSTANTS.H0_default));
  const omM = Math.max(0.001, Number(OmegaM ?? 0.315));
  const omL = Number(OmegaL ?? 0.685);
  const omK = 1 - omM - omL;

  const E = (zp) => {
    const zp1 = 1 + zp;
    const rad = omM * zp1 * zp1 * zp1 + omK * zp1 * zp1 + omL;
    return Math.sqrt(Math.max(1e-15, rad));
  };

  const scaleFactor = 1 / (1 + redshift);
  const Hz = h0 * E(redshift);

  const cKmS = ASTRO_CONSTANTS.c / 1000;
  const hubbleDistanceMpc = cKmS / h0;

  const comovingDistanceMpc =
    redshift === 0 ? 0 : hubbleDistanceMpc * simpsonIntegrate((zp) => 1 / E(zp), 0, redshift, 1000);

  let transverseComovingMpc = comovingDistanceMpc;
  if (Math.abs(omK) >= 1e-8 && redshift > 0) {
    const rootOk = Math.sqrt(Math.abs(omK));
    const ratio = (rootOk * comovingDistanceMpc) / hubbleDistanceMpc;
    transverseComovingMpc =
      omK > 0
        ? (hubbleDistanceMpc / rootOk) * Math.sinh(ratio)
        : (hubbleDistanceMpc / rootOk) * Math.sin(ratio);
  }

  const luminosityDistanceMpc = (1 + redshift) * transverseComovingMpc;
  const angularDiameterDistanceMpc = transverseComovingMpc / (1 + redshift);
  const distanceModulus =
    luminosityDistanceMpc > 0 ? 5 * Math.log10(luminosityDistanceMpc) + 25 : 0;

  const mpcInKm = ASTRO_CONSTANTS.pc * 1e3;
  const hubbleTimeGyr = mpcInKm / (h0 * GYR_SEC);

  const ageIntegrand = (u) => {
    const u2 = u * u;
    const denom = Math.sqrt(Math.max(1e-15, omM + omK * u2 + omL * u2 * u2 * u2));
    return (2 * u2) / denom;
  };

  const universeAgeNowGyr = hubbleTimeGyr * simpsonIntegrate(ageIntegrand, 0, 1, 1000);
  const universeAgeAtZGyr =
    hubbleTimeGyr * simpsonIntegrate(ageIntegrand, 0, Math.sqrt(scaleFactor), 1000);
  const lookbackTimeGyr = Math.max(0, universeAgeNowGyr - universeAgeAtZGyr);

  return {
    z: redshift,
    H0: h0,
    OmegaM: omM,
    OmegaL: omL,
    OmegaK: cleanSmall(omK),
    Hz,
    scaleFactor,
    comovingDistanceMpc,
    luminosityDistanceMpc,
    angularDiameterDistanceMpc,
    lookbackTimeGyr,
    universeAgeAtZGyr,
    universeAgeNowGyr,
    distanceModulus
  };
}

export function ligoChirpWaveform({
  m1Solar = 36,
  m2Solar = 29,
  distanceMpc = 410,
  durationSec = 0.6,
  sampleRate = 2048
} = {}) {
  const m1 = Math.max(0.5, Number(m1Solar) || 36);
  const m2 = Math.max(0.5, Number(m2Solar) || 29);
  const distMpc = Math.max(0.001, Number(distanceMpc) || 410);
  const dur = Math.max(0.05, Math.min(10, Number(durationSec) || 0.6));
  const sr = Math.max(128, Math.min(16384, Math.floor(Number(sampleRate) || 2048)));

  const { G, c, M_sun, pc } = ASTRO_CONSTANTS;

  const totalMassSolar = m1 + m2;
  const eta = (m1 * m2) / (totalMassSolar * totalMassSolar);
  const chirpMassSolar = Math.pow(m1 * m2, 0.6) / Math.pow(totalMassSolar, 0.2);

  const fourEta = 4 * eta;
  const radiatedEnergySolar = totalMassSolar * 0.0484 * fourEta * fourEta;
  const finalMassSolar = totalMassSolar - radiatedEnergySolar;

  const schwarzschildMergerKm = (2 * G * finalMassSolar * M_sun) / (c * c * 1000);

  const totalMassSec = (G * totalMassSolar * M_sun) / Math.pow(c, 3);
  const peakFrequencyHz = 1 / (Math.PI * Math.pow(3, 1.5) * totalMassSec);

  const chirpMassSec = (G * chirpMassSolar * M_sun) / Math.pow(c, 3);
  const chirpMassLengthM = (G * chirpMassSolar * M_sun) / (c * c);
  const distanceMeters = distMpc * 1e6 * pc;

  const tauMin = (5 / 256) * Math.pow(Math.PI * peakFrequencyHz, -8 / 3) * Math.pow(chirpMassSec, -5 / 3);

  const numSamples = Math.max(16, Math.floor(dur * sr));
  const dt = 1 / sr;
  const tMerger = dur * 0.85;
  const tauRingdown = Math.max(0.002, 12 * totalMassSec);

  const times = new Array(numSamples);
  const strain = new Array(numSamples);
  const frequencies = new Array(numSamples);

  let phase = 0;
  let peakStrainAmp = 0;

  for (let i = 0; i < numSamples; i++) {
    const t = i * dt;
    times[i] = Number(t.toFixed(6));

    if (t <= tMerger) {
      const tau = Math.max(tauMin, (tMerger - t) + tauMin);
      const freq =
        (1 / Math.PI) *
        Math.pow(5 / (256 * tau), 3 / 8) *
        Math.pow(chirpMassSec, -5 / 8);

      const clampedFreq = Math.min(peakFrequencyHz, freq);
      frequencies[i] = clampedFreq;

      const amp =
        (4 / distanceMeters) *
        Math.pow(chirpMassLengthM, 5 / 3) *
        Math.pow((Math.PI * clampedFreq) / c, 2 / 3);

      if (amp > peakStrainAmp) peakStrainAmp = amp;
      phase += 2 * Math.PI * clampedFreq * dt;
      strain[i] = amp * Math.cos(phase);
    } else {
      const dtPost = t - tMerger;
      const ringFreq = peakFrequencyHz * 1.15;
      frequencies[i] = ringFreq;
      phase += 2 * Math.PI * ringFreq * dt;
      const env = peakStrainAmp * Math.exp(-dtPost / tauRingdown);
      strain[i] = env * Math.cos(phase);
    }
  }

  return {
    chirpMassSolar,
    totalMassSolar,
    finalMassSolar,
    radiatedEnergySolar,
    peakFrequencyHz,
    schwarzschildMergerKm,
    times,
    strain,
    frequencies
  };
}

export function siderealAndJulian(date = new Date(), lonDeg = 35.4853) {
  const d = date instanceof Date ? date : new Date(date);
  const unixMs = Number.isFinite(d.getTime()) ? d.getTime() : Date.now();
  const lon = Number.isFinite(Number(lonDeg)) ? Number(lonDeg) : 35.4853;

  const jd = unixMs / 86400000 + 2440587.5;
  const mjd = jd - 2400000.5;

  const dJ2000 = jd - 2451545.0;
  const T = dJ2000 / 36525.0;

  let gmstDeg =
    280.46061837 +
    360.98564736629 * dJ2000 +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  gmstDeg = ((gmstDeg % 360) + 360) % 360;
  const gmstHours = gmstDeg / 15;

  const lmstDeg = (((gmstDeg + lon) % 360) + 360) % 360;
  const lmstHours = lmstDeg / 15;

  const totalLmstSec = Math.round(lmstHours * 3600) % 86400;
  const hh = String(Math.floor(totalLmstSec / 3600)).padStart(2, '0');
  const mm = String(Math.floor((totalLmstSec % 3600) / 60)).padStart(2, '0');
  const ss = String(totalLmstSec % 60).padStart(2, '0');
  const lmstFormatted = `${hh}:${mm}:${ss}`;

  const L0 = (((280.46646 + 36000.76983 * T + 0.0003032 * T * T) % 360) + 360) % 360;
  const Mdeg = (((357.52911 + 35999.05029 * T - 0.0001537 * T * T) % 360) + 360) % 360;
  const Mrad = (Mdeg * Math.PI) / 180;
  const ecc = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;

  let E = Mrad + ecc * Math.sin(Mrad);
  for (let iter = 0; iter < 6; iter++) {
    const f = E - ecc * Math.sin(E) - Mrad;
    const fp = 1 - ecc * Math.cos(E);
    E -= f / fp;
  }

  const semiMajorAU = 1.000001018;
  const rAU = semiMajorAU * (1 - ecc * Math.cos(E));

  const trueAnomaly =
    2 * Math.atan2(Math.sqrt(1 + ecc) * Math.sin(E / 2), Math.sqrt(1 - ecc) * Math.cos(E / 2));
  const equationOfCenterDeg = ((trueAnomaly - Mrad) * 180) / Math.PI;
  const solarLongitudeDeg = (((L0 + equationOfCenterDeg) % 360) + 360) % 360;

  const muSun = ASTRO_CONSTANTS.G * ASTRO_CONSTANTS.M_sun * 1.000003003;
  const rMeters = rAU * ASTRO_CONSTANTS.AU;
  const aMeters = semiMajorAU * ASTRO_CONSTANTS.AU;
  const earthOrbitalSpeedKmS = Math.sqrt(muSun * (2 / rMeters - 1 / aMeters)) / 1000;

  return {
    jd,
    julianDate: jd,
    mjd,
    gmstHours,
    lmstHours,
    lmstFormatted,
    earthOrbitalSpeedKmS,
    earthSunDistanceAU: rAU,
    solarLongitudeDeg
  };
}

export function shiftWavelength(lambdaNm, z = 0) {
  const wl = Number(lambdaNm);
  const factor = Math.max(1e-6, 1 + Number(z || 0));
  return wl * factor;
}

export function wavelengthToHex(lambdaNm) {
  const wl = Number(lambdaNm);
  let r = 0;
  let g = 0;
  let b = 0;

  if (wl >= 380 && wl < 440) {
    r = -(wl - 440) / (440 - 380);
    b = 1.0;
  } else if (wl >= 440 && wl < 490) {
    g = (wl - 440) / (490 - 440);
    b = 1.0;
  } else if (wl >= 490 && wl < 510) {
    g = 1.0;
    b = -(wl - 510) / (510 - 490);
  } else if (wl >= 510 && wl < 580) {
    r = (wl - 510) / (580 - 510);
    g = 1.0;
  } else if (wl >= 580 && wl < 645) {
    r = 1.0;
    g = -(wl - 645) / (645 - 580);
  } else if (wl >= 645 && wl <= 750) {
    r = 1.0;
  } else if (wl < 380) {
    return '#6d28d9';
  } else {
    return '#7f1d1d';
  }

  let intensity = 1.0;
  if (wl >= 380 && wl < 420) {
    intensity = 0.3 + (0.7 * (wl - 380)) / (420 - 380);
  } else if (wl > 700 && wl <= 750) {
    intensity = 0.3 + (0.7 * (750 - wl)) / (750 - 700);
  }

  const toHex = (c) =>
    Math.round(255 * Math.pow(Math.max(0, c * intensity), 0.8))
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const ELEMENT_LIST = [
  {
    symbol: 'H',
    name: 'Hidrojen (Balmer Serisi)',
    atomicNumber: 1,
    linesNm: [410.174, 434.047, 486.135, 656.281],
    lines: [
      { nm: 410.174, label: 'H-δ', intensity: 0.45 },
      { nm: 434.047, label: 'H-γ', intensity: 0.60 },
      { nm: 486.135, label: 'H-β', intensity: 0.80 },
      { nm: 656.281, label: 'H-α', intensity: 1.00 }
    ]
  },
  {
    symbol: 'He',
    name: 'Helyum (Nötr He I)',
    atomicNumber: 2,
    linesNm: [447.148, 501.568, 587.562, 667.815],
    lines: [
      { nm: 447.148, label: 'He I 447', intensity: 0.65 },
      { nm: 501.568, label: 'He I 502', intensity: 0.55 },
      { nm: 587.562, label: 'He D3', intensity: 1.00 },
      { nm: 667.815, label: 'He I 668', intensity: 0.70 }
    ]
  },
  {
    symbol: 'OIII',
    name: 'Oksijen ([O III] Bulutsu Çizgileri)',
    atomicNumber: 8,
    linesNm: [436.321, 495.891, 500.684],
    lines: [
      { nm: 436.321, label: '[O III] 436', intensity: 0.35 },
      { nm: 495.891, label: '[O III] 496', intensity: 0.75 },
      { nm: 500.684, label: '[O III] 501', intensity: 1.00 }
    ]
  },
  {
    symbol: 'Na',
    name: 'Sodyum (Fraunhofer D İkilisi)',
    atomicNumber: 11,
    linesNm: [588.995, 589.592],
    lines: [
      { nm: 588.995, label: 'Na D2', intensity: 1.00 },
      { nm: 589.592, label: 'Na D1', intensity: 0.85 }
    ]
  },
  {
    symbol: 'CaII',
    name: 'Kalsiyum İyonu (Ca II H & K)',
    atomicNumber: 20,
    linesNm: [393.366, 396.847],
    lines: [
      { nm: 393.366, label: 'Ca II K', intensity: 1.00 },
      { nm: 396.847, label: 'Ca II H', intensity: 0.85 }
    ]
  },
  {
    symbol: 'Fe',
    name: 'Demir (Fe I Yıldız Soğurma)',
    atomicNumber: 26,
    linesNm: [438.355, 466.814, 495.760, 516.749, 526.954],
    lines: [
      { nm: 438.355, label: 'Fe d', intensity: 0.85 },
      { nm: 466.814, label: 'Fe c', intensity: 0.60 },
      { nm: 495.760, label: 'Fe I 496', intensity: 0.70 },
      { nm: 516.749, label: 'Fe b4', intensity: 0.75 },
      { nm: 526.954, label: 'Fe E', intensity: 1.00 }
    ]
  },
  {
    symbol: 'Ne',
    name: 'Neon (Kalibrasyon Tayfı)',
    atomicNumber: 10,
    linesNm: [540.056, 585.249, 614.306, 640.225, 703.241],
    lines: [
      { nm: 540.056, label: 'Ne 540', intensity: 0.50 },
      { nm: 585.249, label: 'Ne 585', intensity: 0.90 },
      { nm: 614.306, label: 'Ne 614', intensity: 0.80 },
      { nm: 640.225, label: 'Ne 640', intensity: 1.00 },
      { nm: 703.241, label: 'Ne 703', intensity: 0.75 }
    ]
  },
  {
    symbol: 'Hg',
    name: 'Cıva (Atomik Emisyon)',
    atomicNumber: 80,
    linesNm: [404.656, 435.833, 546.074, 576.960, 579.066],
    lines: [
      { nm: 404.656, label: 'Hg h', intensity: 0.65 },
      { nm: 435.833, label: 'Hg g', intensity: 0.90 },
      { nm: 546.074, label: 'Hg e', intensity: 1.00 },
      { nm: 576.960, label: 'Hg 577', intensity: 0.70 },
      { nm: 579.066, label: 'Hg 579', intensity: 0.72 }
    ]
  }
];

for (const el of ELEMENT_LIST) {
  Object.defineProperty(ELEMENT_LIST, el.symbol, {
    value: el,
    enumerable: false,
    configurable: false,
    writable: false
  });
}

export const SPECTRAL_ELEMENTS = Object.freeze(ELEMENT_LIST);
