import React, { useState } from 'react';
import { FilterSelect } from './FilterSelect';
import { Parcel, Crop, Region, Competition } from '../types';
import { LABELS, formatArea, formatMoney, formatDecimal, formatCountdown } from '../labels';
import { calculateSuitabilityScore } from '../scoring';
import { X, Check, ArrowLeft, ArrowRight, Layers } from 'lucide-react';

interface CompareViewProps {
  parcels: Parcel[];
  crops: Crop[];
  regions: Region[];
  competitions: Competition[];
  onRemoveFromCompare: (parcelId: string) => void;
  onApply: (parcelId: string) => void;
  onBack: () => void;
}

export const CompareView: React.FC<CompareViewProps> = ({
  parcels,
  crops,
  regions,
  competitions,
  onRemoveFromCompare,
  onApply,
  onBack
}) => {
  const defaultCrop = crops.find(c => c.key === 'UZUM') || crops[0];
  const [selectedCrop, setSelectedCrop] = useState<Crop>(defaultCrop);
  const [onlyDifferences, setOnlyDifferences] = useState(false);

  if (parcels.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-[#EADBC8] space-y-4">
        <Layers className="w-12 h-12 text-[#7A5230]/40 mx-auto" />
        <h3 className="text-xl font-bold text-[#1F2A24]">
          Müqayisə üçün sahə seçilməyib
        </h3>
        <p className="text-xs text-[#7A5230] max-w-sm mx-auto">
          &ldquo;Torpaq tap&rdquo; bölməsindən 2 və ya 3 sahəni seçərək yan-yana müqayisə edə bilərsiniz.
        </p>
        <button
          onClick={onBack}
          className="px-6 py-2.5 rounded-xl bg-[#2F6B3A] text-white font-bold text-xs cursor-pointer"
        >
          {LABELS.back}
        </button>
      </div>
    );
  }

  // Calculate scores for all compared parcels
  const parcelScores = parcels.map(p => ({
    parcel: p,
    suit: calculateSuitabilityScore(p, selectedCrop)
  }));

  // Helper to determine best in row
  const getBestIndex = (type: 'max' | 'min', values: number[]) => {
    if (values.length === 0) return -1;
    let bestVal = values[0];
    let bestIdx = 0;
    values.forEach((v, idx) => {
      if (type === 'max' && v > bestVal) {
        bestVal = v;
        bestIdx = idx;
      }
      if (type === 'min' && v < bestVal) {
        bestVal = v;
        bestIdx = idx;
      }
    });
    return bestIdx;
  };

  const bestScoreIdx = getBestIndex('max', parcelScores.map(ps => ps.suit.score ?? 0));
  const bestHaIdx = getBestIndex('max', parcels.map(p => p.areaHa));
  const bestPriceIdx = getBestIndex('min', parcels.map(p => p.pricePerHaYearAzn));
  const bestWaterDistIdx = getBestIndex('min', parcels.map(p => p.data.distances.nearestWaterKm));
  const bestRoadDistIdx = getBestIndex('min', parcels.map(p => p.data.distances.nearestRoadKm));
  const bestSlopeIdx = getBestIndex('min', parcels.map(p => p.data.relief.slopeDeg));

  // Rows definition
  const rows = [
    {
      title: 'Hesablanmış aqro-bal',
      bestIdx: bestScoreIdx,
      values: parcelScores.map((ps, idx) => ({
        text: `${ps.suit.score ?? 'İstisna'} / 100`,
        sub: ps.suit.trafficLight ? LABELS.trafficLight[ps.suit.trafficLight] : 'Riskli',
        isBest: idx === bestScoreIdx
      }))
    },
    {
      title: 'Torpaq sahəsi',
      bestIdx: bestHaIdx,
      values: parcels.map((p, idx) => ({
        text: formatArea(p.areaHa),
        sub: null,
        isBest: idx === bestHaIdx
      }))
    },
    {
      title: 'Rayon və kənd',
      bestIdx: -1,
      values: parcels.map(p => ({
        text: `${regions.find(r => r.id === p.regionId)?.name || ''}, ${p.village}`,
        sub: null,
        isBest: false
      }))
    },
    {
      title: 'İllik icarə haqqı',
      bestIdx: bestPriceIdx,
      values: parcels.map((p, idx) => ({
        text: `${p.pricePerHaYearAzn} ₼ / ha`,
        sub: `Cəmi: ${formatMoney(p.pricePerHaYearAzn * p.areaHa)}`,
        isBest: idx === bestPriceIdx
      }))
    },
    {
      title: 'Su mənbəyinə məsafə',
      bestIdx: bestWaterDistIdx,
      values: parcels.map((p, idx) => ({
        text: `${formatDecimal(p.data.distances.nearestWaterKm, 1)} km`,
        sub: p.data.distances.nearestWaterName,
        isBest: idx === bestWaterDistIdx
      }))
    },
    {
      title: 'Yola məsafə',
      bestIdx: bestRoadDistIdx,
      values: parcels.map((p, idx) => ({
        text: `${formatDecimal(p.data.distances.nearestRoadKm, 1)} km`,
        sub: 'Magistral / kənd',
        isBest: idx === bestRoadDistIdx
      }))
    },
    {
      title: 'Yamac meyilliliyi',
      bestIdx: bestSlopeIdx,
      values: parcels.map((p, idx) => ({
        text: `${formatDecimal(p.data.relief.slopeDeg, 1)}°`,
        sub: p.data.relief.slopeDeg <= 5 ? 'Düzən / Əlverişli' : 'Meyilli',
        isBest: idx === bestSlopeIdx
      }))
    },
    {
      title: 'Torpaq kimyası (pH)',
      bestIdx: -1,
      values: parcels.map(p => ({
        text: `pH ${formatDecimal(p.data.soil.ph, 1)}`,
        sub: `SOC: ${formatDecimal(p.data.soil.socGperKg, 1)} q/kq`,
        isBest: false
      }))
    },
    {
      title: 'İqlim və temperatur',
      bestIdx: -1,
      values: parcels.map(p => ({
        text: `${formatDecimal(p.data.climate.growSeasonMeanTempC, 1)} °C`,
        sub: `${p.data.climate.annualPrecipMm} mm yağıntı`,
        isBest: false
      }))
    },
    {
      title: 'Mina təmizlənməsi',
      bestIdx: -1,
      values: parcels.map(p => ({
        text: LABELS.demining[p.deminingStatus],
        sub: LABELS.badges.SIMULYASIYA,
        isBest: false
      }))
    },
    {
      title: 'Müsabiqə müddəti',
      bestIdx: -1,
      values: parcels.map(p => {
        const comp = competitions.find(c => c.id === p.competitionId);
        return {
          text: comp ? formatCountdown(comp.applyDeadline) : 'Bağlı',
          sub: comp?.number || '—',
          isBest: false
        };
      })
    }
  ];

  const visibleRows = onlyDifferences
    ? rows.filter(r => {
        const first = r.values[0]?.text;
        return r.values.some(v => v.text !== first);
      })
    : rows;

  return (
    <div className="space-y-6 pb-16">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7A5230] hover:text-[#1F2A24] mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{LABELS.back}</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1F2A24]">
            Torpaqların Müqayisəsi ({parcels.length} sahə)
          </h1>
          <p className="text-xs text-[#7A5230]">
            Aqroekoloji və iqtisadi parametrlərin yan-yana müqayisəsi
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Toggle only differences */}
          <label className="flex items-center gap-2 text-xs font-bold text-[#1F2A24] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyDifferences}
              onChange={e => setOnlyDifferences(e.target.checked)}
              className="rounded-md accent-[#2F6B3A] cursor-pointer"
            />
            <span>Yalnız fərqləri göstər</span>
          </label>

          {/* Crop selector */}
          <FilterSelect
            value={selectedCrop.key}
            onChange={v => {
              const c = crops.find(x => x.key === v);
              if (c) setSelectedCrop(c);
            }}
            options={crops.map(c => ({ value: c.key, label: `${c.name} üçün bal` }))}
            ariaLabel="Bitki"
            className="px-3 py-2 rounded-xl border border-[#EADBC8] text-xs font-bold bg-white text-[#1F2A24] cursor-pointer"
          />
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#EADBC8] overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[650px]">
          <thead>
            <tr className="border-b border-[#EADBC8]">
              <th className="py-4 px-4 text-xs font-bold text-[#7A5230] uppercase tracking-wider w-1/4">
                Parametr
              </th>
              {parcels.map(p => (
                <th key={p.id} className="py-4 px-4 text-sm font-extrabold text-[#1F2A24] w-1/4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#F4EBDD] text-[#7A5230] block w-fit mb-1">
                        {p.code}
                      </span>
                      <span>{p.name}</span>
                    </div>
                    <button
                      onClick={() => onRemoveFromCompare(p.id)}
                      className="p-1 rounded-lg text-[#7A5230] hover:bg-[#F4EBDD] hover:text-[#C8553D] cursor-pointer"
                      title="Müqayisədən sil"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EADBC8]/60 text-xs">
            {visibleRows.map((r, rIdx) => (
              <tr key={rIdx} className="hover:bg-[#F4EBDD]/20 transition-colors">
                <td className="py-3.5 px-4 font-bold text-[#7A5230]">
                  {r.title}
                </td>
                {r.values.map((v, cIdx) => (
                  <td
                    key={cIdx}
                    className={`py-3.5 px-4 ${
                      v.isBest ? 'bg-emerald-50/80 font-bold text-[#2F6B3A] border-l-2 border-emerald-500' : 'text-[#1F2A24]'
                    }`}
                  >
                    <div className="font-bold text-sm">{v.text}</div>
                    {v.sub && (
                      <div className="text-[11px] text-[#7A5230] mt-0.5">{v.sub}</div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-[#EADBC8]">
              <td className="py-4 px-4 font-bold text-xs text-[#7A5230]">
                Müraciət
              </td>
              {parcels.map(p => {
                const comp = competitions.find(c => c.id === p.competitionId);
                const can = p.status === 'ACIQ' && comp && new Date(comp.applyDeadline).getTime() > Date.now();

                return (
                  <td key={p.id} className="py-4 px-4">
                    <button
                      onClick={() => onApply(p.id)}
                      disabled={!can}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-center transition-colors cursor-pointer ${
                        can
                          ? 'bg-[#2F6B3A] text-white hover:bg-[#26572F] shadow-xs'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {can ? LABELS.apply : LABELS.deadlinePassed}
                    </button>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
