import { Crop, Parcel, SuitabilityResult, CategoryBreakdown, TrafficLight } from './types';
import { formatDecimal } from './labels';

export interface ScoringWeights {
  chemistry: number;
  structure: number;
  climate: number;
  water: number;
  relief: number;
  cover: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  chemistry: 30,
  structure: 15,
  climate: 20,
  water: 15,
  relief: 10,
  cover: 10
};

export function clamp(val: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, val));
}

export function trapezoid(x: number, [min, optLow, optHigh, max]: [number, number, number, number]): number {
  if (x < min || x > max) return 0;
  if (x >= optLow && x <= optHigh) return 1;
  if (x >= min && x < optLow) {
    if (optLow === min) return 1;
    return (x - min) / (optLow - min);
  }
  if (x > optHigh && x <= max) {
    if (max === optHigh) return 1;
    return (max - x) / (max - optHigh);
  }
  return 0;
}

export function getTrafficLight(score: number): TrafficLight {
  if (score >= 75) return 'YASIL';
  if (score >= 50) return 'SARI';
  return 'QIRMIZI';
}

export function getCategoryTrafficLight(val: number): TrafficLight {
  const s = val * 100;
  if (s >= 75) return 'YASIL';
  if (s >= 50) return 'SARI';
  return 'QIRMIZI';
}

const TEMPLATES: Record<string, { good: string; medium: string; bad: string }> = {
  chemistry: {
    good: 'torpaq münbit və aqrokimyəvi cəhətdən balansdadır',
    medium: 'torpaq qida maddələri orta səviyyədədir',
    bad: 'torpağın aqrokimyəvi göstəriciləri zəifdir'
  },
  structure: {
    good: 'torpağın mexaniki quruluşu optimaldır',
    medium: 'torpaq quruluşu qənaətbəxşdir',
    bad: 'torpağın gil və qum balansı əlverişsizdir'
  },
  climate: {
    good: 'iqlim və temperatur şəraiti əlverişlidir',
    medium: 'iqlim şəraiti qəbul ediləndir',
    bad: 'istilik və ya yağıntı balansı qeyri-sabitdir'
  },
  water: {
    good: 'su mənbəyi yaxındır və nəm təminatı yüksəkdir',
    medium: 'su təminatı məqbuldur',
    bad: 'su mənbəyi uzaqdır və rütubət azdır'
  },
  relief: {
    good: 'relyef və meyillilik əlverişlidir',
    medium: 'relyef orta dərəcədə meyillidir',
    bad: 'yamac çox dikdir və relyef mürəkkəbdir'
  },
  cover: {
    good: 'təbii bitki örtüyü yaxşı vəziyyətdədir',
    medium: 'vegetasiya örtüyü normaldır',
    bad: 'ərazinin yaşıllıq indeksi aşağıdır'
  }
};

export function calculateSuitabilityScore(
  parcel: Parcel,
  crop: Crop,
  userWeights?: Partial<ScoringWeights>
): SuitabilityResult {
  // 1. Hard exclusions
  if (parcel.deminingStatus !== 'TEMIZLENIB') {
    return {
      score: null,
      excluded: true,
      exclusionReason: 'Ərazi minalardan təmizlənməyib (simulyasiya)',
      trafficLight: null,
      reasonSentence: 'Ərazi minalardan təmizlənməyib (simulyasiya)',
      breakdown: [],
      cropKey: crop.key,
      cropName: crop.name
    };
  }

  if (parcel.data.relief.slopeDeg > 25) {
    return {
      score: null,
      excluded: true,
      exclusionReason: 'Yamac çox dikdir',
      trafficLight: null,
      reasonSentence: 'Yamac çox dikdir (> 25°).',
      breakdown: [],
      cropKey: crop.key,
      cropName: crop.name
    };
  }

  const ph = parcel.data.soil.ph;
  if (ph < 4.5 || ph > 8.8) {
    return {
      score: null,
      excluded: true,
      exclusionReason: 'Torpaq həddən artıq turş/qələvidir',
      trafficLight: null,
      reasonSentence: 'Torpaq həddən artıq turş və ya qələvidir (pH < 4.5 və ya > 8.8).',
      breakdown: [],
      cropKey: crop.key,
      cropName: crop.name
    };
  }

  if (parcel.data.soil.salinityEc != null && parcel.data.soil.salinityEc > 8) {
    return {
      score: null,
      excluded: true,
      exclusionReason: 'Torpaq həddən artıq şorandır',
      trafficLight: null,
      reasonSentence: 'Torpaq həddən artıq şorandır (EC > 8 dS/m).',
      breakdown: [],
      cropKey: crop.key,
      cropName: crop.name
    };
  }

  // 2. Weights
  const weights: ScoringWeights = {
    chemistry: userWeights?.chemistry ?? DEFAULT_WEIGHTS.chemistry,
    structure: userWeights?.structure ?? DEFAULT_WEIGHTS.structure,
    climate: userWeights?.climate ?? DEFAULT_WEIGHTS.climate,
    water: userWeights?.water ?? DEFAULT_WEIGHTS.water,
    relief: userWeights?.relief ?? DEFAULT_WEIGHTS.relief,
    cover: userWeights?.cover ?? DEFAULT_WEIGHTS.cover
  };

  // 3. Category formulas (0..1)
  // Chemistry: 0.5*pH + 0.3*clamp((SOC-5)/15) + 0.2*clamp((N-0.5)/1.5)
  const phScore = trapezoid(ph, crop.ph);
  const socScore = clamp((parcel.data.soil.socGperKg - 5) / 15);
  const nScore = clamp((parcel.data.soil.nGperKg - 0.5) / 1.5);
  const catChemistry = clamp(0.5 * phScore + 0.3 * socScore + 0.2 * nScore);

  // Structure: 0.6*clay + 0.4*sand
  const clayScore = trapezoid(parcel.data.soil.clayPct, [5, 15, 35, 55]);
  const sandScore = trapezoid(parcel.data.soil.sandPct, [5, 25, 55, 85]);
  const catStructure = clamp(0.6 * clayScore + 0.4 * sandScore);

  // Climate: 0.5*temp + 0.5*precip; if crop irrigated and water <= 5 km: precip = max(precip, 0.5)
  const tempScore = trapezoid(parcel.data.climate.growSeasonMeanTempC, crop.temp);
  let precipScore = trapezoid(parcel.data.climate.annualPrecipMm, crop.precip);
  if (
    crop.irrigated === 'yes' ||
    (crop.irrigated === 'partly' && parcel.data.distances.nearestWaterKm <= 5)
  ) {
    precipScore = Math.max(precipScore, 0.5);
  }
  const catClimate = clamp(0.5 * tempScore + 0.5 * precipScore);

  // Water: 0.5*clamp(moistureIndex) + 0.5*distanceScore
  const moistureScore = clamp(parcel.data.climate.soilMoistureIndex, 0, 1);
  const distKm = parcel.data.distances.nearestWaterKm;
  let distScore = 0.2;
  if (distKm <= 2) {
    distScore = 1.0;
  } else if (distKm <= 15) {
    distScore = 1.0 - ((distKm - 2) / 13) * 0.8;
  } else {
    distScore = 0.2;
  }
  const catWater = clamp(0.5 * moistureScore + 0.5 * distScore);

  // Relief: 0.7*slope + 0.3*elevation
  const slopeScore = trapezoid(parcel.data.relief.slopeDeg, crop.slope);
  const elevScore = trapezoid(parcel.data.relief.elevationM, crop.elevation);
  const catRelief = clamp(0.7 * slopeScore + 0.3 * elevScore);

  // Cover: 0.20 <= NDVI <= 0.60 -> 1; < 0.20 -> 0.6; > 0.60 -> 0.5; missing -> 0.7
  let catCover = 0.7;
  const ndviArr = parcel.data.ndvi;
  if (ndviArr && ndviArr.length > 0) {
    const latestNdvi = ndviArr[ndviArr.length - 1].value;
    if (latestNdvi >= 0.20 && latestNdvi <= 0.60) {
      catCover = 1.0;
    } else if (latestNdvi < 0.20) {
      catCover = 0.6;
    } else {
      catCover = 0.5;
    }
  }

  // Final score
  const totalWeight =
    weights.chemistry +
    weights.structure +
    weights.climate +
    weights.water +
    weights.relief +
    weights.cover;

  const weightedSum =
    catChemistry * weights.chemistry +
    catStructure * weights.structure +
    catClimate * weights.climate +
    catWater * weights.water +
    catRelief * weights.relief +
    catCover * weights.cover;

  const score = Math.round(100 * (weightedSum / (totalWeight || 100)));
  const trafficLight = getTrafficLight(score);

  // Category breakdown
  const breakdown: CategoryBreakdown[] = [
    {
      key: 'chemistry',
      label: 'Torpaq kimyası',
      weight: weights.chemistry,
      value: catChemistry,
      light: getCategoryTrafficLight(catChemistry),
      sentence: getSentenceForCategory('chemistry', catChemistry),
      rawValues: `pH ${formatDecimal(ph, 1)}, Üzvi karbon ${formatDecimal(parcel.data.soil.socGperKg, 1)} q/kq, Azot ${formatDecimal(parcel.data.soil.nGperKg, 1)} q/kq`,
      source: parcel.data.soil.source,
      badge: parcel.data.soil.badge
    },
    {
      key: 'structure',
      label: 'Torpaq quruluşu',
      weight: weights.structure,
      value: catStructure,
      light: getCategoryTrafficLight(catStructure),
      sentence: getSentenceForCategory('structure', catStructure),
      rawValues: `Gil ${parcel.data.soil.clayPct}%, Qum ${parcel.data.soil.sandPct}%, Toz ${parcel.data.soil.siltPct}%`,
      source: parcel.data.soil.source,
      badge: parcel.data.soil.badge
    },
    {
      key: 'climate',
      label: 'İqlim',
      weight: weights.climate,
      value: catClimate,
      light: getCategoryTrafficLight(catClimate),
      sentence: getSentenceForCategory('climate', catClimate),
      rawValues: `Vegetasiya temperaturu ${formatDecimal(parcel.data.climate.growSeasonMeanTempC, 1)} °C, İllik yağıntı ${parcel.data.climate.annualPrecipMm} mm`,
      source: parcel.data.climate.source,
      badge: parcel.data.climate.badge
    },
    {
      key: 'water',
      label: 'Su',
      weight: weights.water,
      value: catWater,
      light: getCategoryTrafficLight(catWater),
      sentence: getSentenceForCategory('water', catWater),
      rawValues: `Rütubət indeksi ${formatDecimal(parcel.data.climate.soilMoistureIndex, 2)}, Ən yaxın su ${formatDecimal(distKm, 1)} km (${parcel.data.distances.nearestWaterName})`,
      source: parcel.data.distances.source,
      badge: parcel.data.distances.badge
    },
    {
      key: 'relief',
      label: 'Relyef',
      weight: weights.relief,
      value: catRelief,
      light: getCategoryTrafficLight(catRelief),
      sentence: getSentenceForCategory('relief', catRelief),
      rawValues: `Yamac ${formatDecimal(parcel.data.relief.slopeDeg, 1)}°, Hündürlük ${parcel.data.relief.elevationM} m`,
      source: parcel.data.relief.source,
      badge: parcel.data.relief.badge
    },
    {
      key: 'cover',
      label: 'Ərazi örtüyü',
      weight: weights.cover,
      value: catCover,
      light: getCategoryTrafficLight(catCover),
      sentence: getSentenceForCategory('cover', catCover),
      rawValues: ndviArr && ndviArr.length ? `NDVI ${formatDecimal(ndviArr[ndviArr.length - 1].value, 2)}` : 'Məlumat yoxdur',
      source: parcel.data.ndviSource || 'Peyk məlumatı',
      badge: parcel.data.ndviBadge || 'Nümunə məlumat'
    }
  ];

  // 2 best + 1 worst category for reason sentence
  const sorted = [...breakdown].sort((a, b) => b.value - a.value);
  const best1 = sorted[0];
  const best2 = sorted[1];
  const worst = sorted[sorted.length - 1];

  let reasonSentence = '';
  if (score >= 75) {
    reasonSentence = `${capitalize(best1.sentence)}, ${best2.sentence}. Diqqət: ${worst.sentence}.`;
  } else if (score >= 50) {
    reasonSentence = `${capitalize(best1.sentence)}. Diqqət: ${worst.sentence}.`;
  } else {
    reasonSentence = `Riskli amillər mövcuddur: ${worst.sentence}, ${sorted[sorted.length - 2].sentence}.`;
  }

  return {
    score,
    excluded: false,
    exclusionReason: null,
    trafficLight,
    reasonSentence,
    breakdown,
    cropKey: crop.key,
    cropName: crop.name
  };
}

function getSentenceForCategory(key: string, val: number): string {
  const t = TEMPLATES[key];
  if (!t) return '';
  if (val >= 0.75) return t.good;
  if (val >= 0.50) return t.medium;
  return t.bad;
}

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
