import test from 'node:test';
import assert from 'node:assert/strict';
import { trapezoid, clamp, calculateSuitabilityScore } from './scoring.ts';
import { Parcel, Crop } from './types.ts';
import parcels from './data/parcels.json' with { type: 'json' };
import crops from './data/crops.json' with { type: 'json' };
import testVectors from '../docs/score-test-vectors.json' with { type: 'json' };

const mockCrop: Crop = {
  key: 'UZUM',
  name: 'Üzüm',
  activity: 'BAGCHILIQ',
  ph: [5.5, 6.0, 7.5, 8.2],
  temp: [14, 17, 24, 30],
  precip: [300, 450, 800, 1100],
  slope: [0, 0, 15, 25],
  elevation: [0, 100, 900, 1300],
  irrigated: 'partly'
};

const optimalParcel: Parcel = {
  id: 'pcl-test-opt',
  code: 'TST-001',
  name: 'Optimal Test Sahəsi',
  regionId: 'fuzuli',
  village: 'Dədəli',
  areaHa: 50,
  geometry: '{"type":"Polygon","coordinates":[]}',
  centroidLat: 39.5,
  centroidLon: 47.1,
  allowedUses: ['UZUMLUK', 'MEYVE_BAGI'],
  pricePerHaYearAzn: 60,
  deminingStatus: 'TEMIZLENIB',
  status: 'ACIQ',
  createdAt: '2026-09-01T00:00:00Z',
  data: {
    soil: {
      ph: 6.8,
      socGperKg: 20.0,
      nGperKg: 2.0,
      clayPct: 25,
      sandPct: 40,
      siltPct: 35,
      cecCmolPerKg: 25,
      salinityEc: 0.5,
      source: 'Test',
      badge: 'Nümunə məlumat'
    },
    climate: {
      growSeasonMeanTempC: 21,
      annualPrecipMm: 600,
      solarMjM2Day: 18,
      soilMoistureIndex: 0.9,
      source: 'Test',
      badge: 'Həqiqi'
    },
    relief: {
      elevationM: 300,
      slopeDeg: 3,
      source: 'Test',
      badge: 'Nümunə məlumat'
    },
    distances: {
      nearestRoadKm: 1.0,
      nearestWaterKm: 1.5,
      nearestWaterName: 'Köndələnçay',
      source: 'Test',
      badge: 'Nümunə məlumat'
    },
    ndvi: [{ year: 2025, value: 0.40 }]
  }
};

test('trapezoid function handles flat top, slopes, and out of bounds', () => {
  assert.equal(trapezoid(6.8, [5.5, 6.0, 7.5, 8.2]), 1);
  assert.equal(trapezoid(5.0, [5.5, 6.0, 7.5, 8.2]), 0);
  assert.equal(trapezoid(9.0, [5.5, 6.0, 7.5, 8.2]), 0);
  assert.equal(trapezoid(5.75, [5.5, 6.0, 7.5, 8.2]), 0.5);
});

test('clamp restricts within boundaries', () => {
  assert.equal(clamp(-0.5), 0);
  assert.equal(clamp(1.5), 1);
  assert.equal(clamp(0.7), 0.7);
});

test('optimal parcel scores >= 95 and traffic light is YASIL', () => {
  const res = calculateSuitabilityScore(optimalParcel, mockCrop);
  assert.equal(res.excluded, false);
  assert.ok(res.score !== null && res.score >= 95, `Expected score >= 95, got ${res.score}`);
  assert.equal(res.trafficLight, 'YASIL');
  assert.ok(res.breakdown.length === 6);
});

test('hard exclusion: uncleared minefield triggers exclusion', () => {
  const parcel: Parcel = {
    ...optimalParcel,
    deminingStatus: 'GOZLEYIR'
  };
  const res = calculateSuitabilityScore(parcel, mockCrop);
  assert.equal(res.excluded, true);
  assert.equal(res.score, null);
  assert.equal(res.exclusionReason, 'Ərazi minalardan təmizlənməyib (simulyasiya)');
});

test('hard exclusion: slope > 25 degrees triggers exclusion', () => {
  const parcel: Parcel = {
    ...optimalParcel,
    data: {
      ...optimalParcel.data,
      relief: { ...optimalParcel.data.relief, slopeDeg: 28 }
    }
  };
  const res = calculateSuitabilityScore(parcel, mockCrop);
  assert.equal(res.excluded, true);
  assert.equal(res.score, null);
  assert.equal(res.exclusionReason, 'Yamac çox dikdir');
});

test('hard exclusion: extreme pH (< 4.5) triggers exclusion', () => {
  const parcel: Parcel = {
    ...optimalParcel,
    data: {
      ...optimalParcel.data,
      soil: { ...optimalParcel.data.soil, ph: 4.1 }
    }
  };
  const res = calculateSuitabilityScore(parcel, mockCrop);
  assert.equal(res.excluded, true);
  assert.equal(res.score, null);
  assert.equal(res.exclusionReason, 'Torpaq həddən artıq turş/qələvidir');
});

test('verify score test vectors match within +-1 point', () => {
  for (const vec of testVectors) {
    const p = (parcels as unknown as Parcel[]).find(x => x.code === vec.parcelCode);
    assert.ok(p, `Parcel ${vec.parcelCode} must exist`);
    const c = (crops as unknown as Crop[]).find(x => x.key === vec.cropKey) || mockCrop;

    const res = calculateSuitabilityScore(p, c, vec.weights);
    if (vec.excluded) {
      assert.equal(res.excluded, true);
      assert.equal(res.score, null);
    } else {
      assert.equal(res.excluded, false);
      const diff = Math.abs((res.score ?? 0) - (vec.expectedScore ?? 0));
      assert.ok(diff <= 1, `Score for ${vec.parcelCode} was ${res.score}, expected ${vec.expectedScore}`);
    }
  }
});
