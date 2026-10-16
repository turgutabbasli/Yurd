import React, { useState, useEffect, useRef } from 'react';
import { FilterSelect } from './FilterSelect';
import { Parcel, Region, Crop } from '../types';
import { LABELS, formatArea, formatCountdown } from '../labels';
import {
  MapPin,
  Check,
  ChevronRight,
  Filter,
  SlidersHorizontal,
  X,
  Compass,
  Layers,
  ArrowRight,
  Sparkles,
  TreePine,
  Wheat,
  Footprints,
  HelpCircle,
  Eye,
  CheckSquare,
  Square
} from 'lucide-react';
import L from 'leaflet';
import { addBaseLayers } from '../mapLayers';

interface TorpaqTapFlowProps {
  parcels: Array<Parcel & { suitability?: any; bestCrop?: Crop; bestScore?: number }>;
  regions: Region[];
  crops: Crop[];
  onSelectParcel: (parcelId: string) => void;
  onCompareListChange: (ids: string[]) => void;
  selectedCompareIds: string[];
  initialRegion?: string;
  initialActivity?: string;
  initialCompetitionId?: string;
}

export const TorpaqTapFlow: React.FC<TorpaqTapFlowProps> = ({
  parcels,
  regions,
  crops,
  onSelectParcel,
  onCompareListChange,
  selectedCompareIds,
  initialRegion,
  initialActivity,
  initialCompetitionId
}) => {
  // Step tracking: 'A' (Region) | 'B' (Activity) | 'C' (Ranked Parcels)
  const [currentStep, setCurrentStep] = useState<'A' | 'B' | 'C'>(initialRegion || initialCompetitionId ? 'C' : 'A');
  const [selectedRegion, setSelectedRegion] = useState<string>(initialRegion || '');
  const [selectedActivity, setSelectedActivity] = useState<string>(initialActivity || '');
  const [selectedCompetition, setSelectedCompetition] = useState<string>(initialCompetitionId || '');
  const [maxHaFilter, setMaxHaFilter] = useState<number>(600);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list');
  const [previewParcel, setPreviewParcel] = useState<(Parcel & { suitability?: any; bestCrop?: Crop; bestScore?: number }) | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Filter parcels
  const filteredParcels = parcels.filter(p => {
    if (selectedRegion && p.regionId !== selectedRegion) return false;
    if (selectedCompetition && p.competitionId !== selectedCompetition) return false;
    if (p.areaHa > maxHaFilter) return false;

    if (selectedActivity && selectedActivity !== 'BILMIREM') {
      if (selectedActivity === 'BAGCHILIQ') {
        if (!p.allowedUses.includes('MEYVE_BAGI') && !p.allowedUses.includes('UZUMLUK')) return false;
      } else if (selectedActivity === 'EKINCILIK') {
        if (!p.allowedUses.includes('TAXIL') && !p.allowedUses.includes('PAMBIQ')) return false;
      } else if (selectedActivity === 'HEYVANDARLIQ') {
        if (!p.allowedUses.includes('HEYVANDARLIQ')) return false;
      } else if (selectedActivity === 'ARICILIQ') {
        if (!p.allowedUses.includes('ARICILIQ')) return false;
      }
    }
    return true;
  });

  const getRegionParcelCount = (rId: string) => {
    return parcels.filter(p => p.regionId === rId).length;
  };

  const handleRegionSelect = (rId: string) => {
    setSelectedRegion(rId);
    setCurrentStep('B');
  };

  const handleActivitySelect = (actKey: string) => {
    setSelectedActivity(actKey);
    setCurrentStep('C');
  };

  const toggleCompare = (pId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedCompareIds.includes(pId)) {
      onCompareListChange(selectedCompareIds.filter(id => id !== pId));
    } else {
      if (selectedCompareIds.length >= 3) {
        alert('Ən çox 3 sahəni müqayisə edə bilərsiniz.');
        return;
      }
      onCompareListChange([...selectedCompareIds, pId]);
    }
  };

  // Leaflet map setup for Step C
  useEffect(() => {
    if (currentStep === 'C' && mapContainerRef.current && !mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([39.6, 46.8], 9);
      addBaseLayers(map);

      const layers = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
      layerGroupRef.current = layers;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.stop();
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [currentStep, viewMode]);

  // Render polygons and markers on map
  useEffect(() => {
    if (mapInstanceRef.current && layerGroupRef.current) {
      layerGroupRef.current.clearLayers();

      filteredParcels.forEach(p => {
        const color = p.suitability?.trafficLight === 'YASIL'
          ? '#2F6B3A'
          : p.suitability?.trafficLight === 'SARI'
          ? '#D98E04'
          : '#C8553D';

        try {
          const geo = JSON.parse(p.geometry);
          const poly = L.geoJSON(geo, {
            style: {
              color,
              weight: 3,
              fillColor: color,
              fillOpacity: 0.4
            }
          });

          poly.on('click', () => {
            setPreviewParcel(p);
          });

          poly.bindTooltip(`<b>${p.name}</b><br>${p.areaHa} ha · Bal: ${p.bestScore ?? '-'}`, {
            permanent: false,
            direction: 'top'
          });

          poly.addTo(layerGroupRef.current!);
        } catch (e) {
          // Centroid marker fallback
          const marker = L.circleMarker([p.centroidLat, p.centroidLon], {
            radius: 8,
            color,
            fillColor: color,
            fillOpacity: 0.8
          });
          marker.on('click', () => setPreviewParcel(p));
          marker.addTo(layerGroupRef.current!);
        }
      });

      if (filteredParcels.length > 0) {
        const first = filteredParcels[0];
        mapInstanceRef.current.panTo([first.centroidLat, first.centroidLon]);
      }
    }
  }, [filteredParcels, currentStep, viewMode]);

  return (
    <div className="space-y-6">
      {/* Step Indicator & Breadcrumb */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#EADBC8] flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold">
          <button
            onClick={() => setCurrentStep('A')}
            className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
              currentStep === 'A'
                ? 'bg-[#2F6B3A] text-white'
                : 'bg-[#F4EBDD] text-[#7A5230] hover:text-[#1F2A24]'
            }`}
          >
            1. Rayon seçimi
          </button>
          <ChevronRight className="w-4 h-4 text-[#7A5230]" />
          <button
            onClick={() => {
              if (selectedRegion) setCurrentStep('B');
            }}
            disabled={!selectedRegion}
            className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer disabled:opacity-40 ${
              currentStep === 'B'
                ? 'bg-[#2F6B3A] text-white'
                : 'bg-[#F4EBDD] text-[#7A5230] hover:text-[#1F2A24]'
            }`}
          >
            2. Fəaliyyət növü
          </button>
          <ChevronRight className="w-4 h-4 text-[#7A5230]" />
          <button
            onClick={() => {
              if (selectedRegion && selectedActivity) setCurrentStep('C');
            }}
            disabled={!selectedRegion || !selectedActivity}
            className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer disabled:opacity-40 ${
              currentStep === 'C'
                ? 'bg-[#2F6B3A] text-white'
                : 'bg-[#F4EBDD] text-[#7A5230] hover:text-[#1F2A24]'
            }`}
          >
            3. Sahələr və Qiymətləndirmə
          </button>
        </div>

        {selectedCompareIds.length > 0 && (
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-bold text-[#2F6B3A] bg-[#2F6B3A]/10 px-3 py-1.5 rounded-xl">
              {selectedCompareIds.length} sahə müqayisədədir
            </span>
          </div>
        )}
      </div>

      {/* STEP A: Region Selection */}
      {currentStep === 'A' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#EADBC8]">
            <h2 className="text-2xl font-extrabold text-[#1F2A24] mb-2">
              Addım 1: Rayonu seçin
            </h2>
            <p className="text-sm text-[#7A5230] mb-6">
              İnvestisiya müsabiqəsinə qoşulmaq istədiyiniz bölgəni xəritədən və ya aşağıdakı siyahıdan seçin
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {regions.map(reg => {
                const count = getRegionParcelCount(reg.id);
                return (
                  <div
                    key={reg.id}
                    onClick={() => handleRegionSelect(reg.id)}
                    className="p-5 rounded-2xl bg-[#F4EBDD]/50 hover:bg-[#F4EBDD] border-2 border-transparent hover:border-[#2F6B3A] transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="w-10 h-10 rounded-xl bg-[#2F6B3A]/10 text-[#2F6B3A] flex items-center justify-center font-bold">
                          <MapPin className="w-5 h-5" />
                        </span>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#2F6B3A] text-white">
                          {count} sahə
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-[#1F2A24] group-hover:text-[#2F6B3A] transition-colors">
                        {reg.name}
                      </h3>
                      <p className="text-xs text-[#7A5230] mt-1 line-clamp-2">
                        {reg.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#EADBC8] flex items-center justify-between text-xs font-bold text-[#2F6B3A]">
                      <span>Bu rayonu seç</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* STEP B: Activity Selection */}
      {currentStep === 'B' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#EADBC8]">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-extrabold text-[#1F2A24]">
                Addım 2: Nə etmək istəyirsən?
              </h2>
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#2F6B3A]/10 text-[#2F6B3A]">
                Seçilmiş rayon: {regions.find(r => r.id === selectedRegion)?.name}
              </span>
            </div>
            <p className="text-sm text-[#7A5230] mb-8">
              Məqsədinizə uyğun fəaliyyət növünü seçin. Sistem aqroekoloji göstəricilərə görə ən uyğun torpaqları dərəcələndirəcək.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Bağçılıq */}
              <button
                onClick={() => handleActivitySelect('BAGCHILIQ')}
                className="p-6 rounded-2xl bg-[#F4EBDD]/60 hover:bg-[#F4EBDD] border-2 border-transparent hover:border-[#2F6B3A] text-left transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#2F6B3A]/10 text-[#2F6B3A] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <TreePine className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#1F2A24] mb-1">
                  {LABELS.activities.BAGCHILIQ}
                </h3>
                <p className="text-xs text-[#7A5230]">
                  İntensiv meyvə bağları, süfrə və texniki üzümlüklər, nar və qoz-fındıq bağları
                </p>
              </button>

              {/* Əkinçilik */}
              <button
                onClick={() => handleActivitySelect('EKINCILIK')}
                className="p-6 rounded-2xl bg-[#F4EBDD]/60 hover:bg-[#F4EBDD] border-2 border-transparent hover:border-[#2F6B3A] text-left transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#D98E04]/10 text-[#D98E04] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Wheat className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#1F2A24] mb-1">
                  {LABELS.activities.EKINCILIK}
                </h3>
                <p className="text-xs text-[#7A5230]">
                  Taxıl, arpa, pambıqçılıq, dağlıq kartof və dənli bitkilər
                </p>
              </button>

              {/* Heyvandarlıq */}
              <button
                onClick={() => handleActivitySelect('HEYVANDARLIQ')}
                className="p-6 rounded-2xl bg-[#F4EBDD]/60 hover:bg-[#F4EBDD] border-2 border-transparent hover:border-[#2F6B3A] text-left transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#7A5230]/10 text-[#7A5230] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Footprints className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#1F2A24] mb-1">
                  {LABELS.activities.HEYVANDARLIQ}
                </h3>
                <p className="text-xs text-[#7A5230]">
                  Yaylaq və örüş sahələri, yem otları və damazlıq maldarlıq kompleksləri
                </p>
              </button>

              {/* Arıçılıq */}
              <button
                onClick={() => handleActivitySelect('ARICILIQ')}
                className="p-6 rounded-2xl bg-[#F4EBDD]/60 hover:bg-[#F4EBDD] border-2 border-transparent hover:border-[#2F6B3A] text-left transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#1F2A24] mb-1">
                  {LABELS.activities.ARICILIQ}
                </h3>
                <p className="text-xs text-[#7A5230]">
                  Alp çəmənlikləri, meşəətəyi bal arıçılığı və arı ailələrinin saxlanılması
                </p>
              </button>

              {/* Bilmirəm, sistem məsləhət versin */}
              <button
                onClick={() => handleActivitySelect('BILMIREM')}
                className="p-6 rounded-2xl bg-gradient-to-br from-[#2F6B3A]/10 to-[#6B3FA0]/10 hover:from-[#2F6B3A]/20 hover:to-[#6B3FA0]/20 border-2 border-transparent hover:border-[#6B3FA0] text-left transition-all cursor-pointer group sm:col-span-2 lg:col-span-2"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#6B3FA0]/10 text-[#6B3FA0] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Compass className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#1F2A24] mb-1">
                  {LABELS.activities.BILMIREM}
                </h3>
                <p className="text-xs text-[#7A5230]">
                  Torpağın xüsusiyyətlərinə görə ən yüksək məhsuldarlıq verə biləcək top-3 bitkini avtomatik təyin et
                </p>
              </button>
            </div>

            {/* Optional Hectare Slider */}
            <div className="mt-8 pt-6 border-t border-[#EADBC8] max-w-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-[#1F2A24]">
                  Maksimum torpaq ölçüsü:
                </span>
                <span className="text-sm font-extrabold text-[#2F6B3A]">
                  {maxHaFilter} ha
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="600"
                step="10"
                value={maxHaFilter}
                onChange={e => setMaxHaFilter(Number(e.target.value))}
                className="w-full accent-[#2F6B3A] cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP C: Ranked Parcels Map and List */}
      {currentStep === 'C' && (
        <div className="space-y-6">
          {/* Filter Bar & Controls */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#EADBC8] flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-[#7A5230] uppercase tracking-wider">
                Filtrlər:
              </span>

              {/* Region filter */}
              <FilterSelect
                value={selectedRegion}
                onChange={setSelectedRegion}
                options={[{ value: '', label: 'Bütün rayonlar' }, ...regions.map(r => ({ value: r.id, label: r.name }))]}
                ariaLabel="Rayon"
                className="px-3 py-1.5 rounded-xl border border-[#EADBC8] text-xs font-bold bg-[#F4EBDD]/40 text-[#1F2A24] cursor-pointer"
              />

              {/* Activity filter */}
              <FilterSelect
                value={selectedActivity}
                onChange={setSelectedActivity}
                options={[
                  { value: '', label: 'Bütün fəaliyyətlər' },
                  { value: 'BAGCHILIQ', label: 'Bağçılıq' },
                  { value: 'EKINCILIK', label: 'Əkinçilik' },
                  { value: 'HEYVANDARLIQ', label: 'Heyvandarlıq' },
                  { value: 'ARICILIQ', label: 'Arıçılıq' }
                ]}
                ariaLabel="Fəaliyyət"
                className="px-3 py-1.5 rounded-xl border border-[#EADBC8] text-xs font-bold bg-[#F4EBDD]/40 text-[#1F2A24] cursor-pointer"
              />

              {/* Reset Filter Button */}
              {(selectedRegion || selectedActivity || selectedCompetition || maxHaFilter < 600) && (
                <button
                  onClick={() => {
                    setSelectedRegion('');
                    setSelectedActivity('');
                    setSelectedCompetition('');
                    setMaxHaFilter(600);
                  }}
                  className="text-xs text-[#7A5230] hover:text-[#C8553D] underline cursor-pointer"
                >
                  {LABELS.resetFilter}
                </button>
              )}
            </div>

            {/* Toggle View: Map vs List */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F4EBDD] border border-[#EADBC8]">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'list' ? 'bg-white text-[#2F6B3A] shadow-xs' : 'text-[#7A5230]'
                }`}
              >
                {LABELS.listView}
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'map' ? 'bg-white text-[#2F6B3A] shadow-xs' : 'text-[#7A5230]'
                }`}
              >
                {LABELS.mapView}
              </button>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between text-xs text-[#7A5230]">
            <span>
              Tapılan torpaq sahələri: <b className="text-[#1F2A24]">{filteredParcels.length}</b> (uyğunluq balına görə sıralanıb)
            </span>
            <span className="italic">
              {LABELS.fixedMinistryNotice}
            </span>
          </div>

          {/* Empty State */}
          {filteredParcels.length === 0 && (
            <div className="bg-white rounded-3xl p-12 text-center border border-[#EADBC8] space-y-3">
              <Compass className="w-12 h-12 text-[#7A5230]/40 mx-auto" />
              <h3 className="text-lg font-bold text-[#1F2A24]">
                Bu filtrə uyğun sahə yoxdur. Hektarı azaltmağı yoxla.
              </h3>
              <p className="text-xs text-[#7A5230] max-w-md mx-auto">
                Filtr meyarlarını dəyişdirərək və ya başqa rayon seçərək yenidən axtarış edə bilərsiniz.
              </p>
            </div>
          )}

          {/* View Mode: Map */}
          {viewMode === 'map' && (
            <div className="relative">
              <div
                ref={mapContainerRef}
                className="w-full h-[550px] rounded-3xl border border-[#EADBC8] shadow-sm z-10"
              />
              <div className="absolute top-16 right-4 z-20 bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl border border-[#EADBC8] text-xs space-y-1 shadow-sm">
                <div className="font-bold text-[#1F2A24] mb-1">İşıqfor:</div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#2F6B3A]" />
                  <span>Əla uyğun (≥ 75)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#D98E04]" />
                  <span>Orta uyğun (50-74)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#C8553D]" />
                  <span>Riskli (&lt; 50)</span>
                </div>
              </div>
            </div>
          )}

          {/* View Mode: List */}
          {viewMode === 'list' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredParcels.map(parcel => {
                const isCompared = selectedCompareIds.includes(parcel.id);
                const score = parcel.bestScore ?? 0;
                const light = parcel.suitability?.trafficLight;

                return (
                  <div
                    key={parcel.id}
                    onClick={() => setPreviewParcel(parcel)}
                    className="bg-white rounded-3xl p-6 shadow-sm border border-[#EADBC8] hover:border-[#2F6B3A]/50 transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top badges */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#F4EBDD] text-[#7A5230]">
                          {parcel.code}
                        </span>

                        <div className="flex items-center gap-2">
                          {/* Traffic light badge */}
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 ${
                              light === 'YASIL'
                                ? 'bg-[#2F6B3A]/10 text-[#2F6B3A] border border-[#2F6B3A]/30'
                                : light === 'SARI'
                                ? 'bg-[#D98E04]/10 text-[#D98E04] border border-[#D98E04]/30'
                                : 'bg-[#C8553D]/10 text-[#C8553D] border border-[#C8553D]/30'
                            }`}
                          >
                            <span>{score} bal</span>
                            <span>·</span>
                            <span>{light ? LABELS.trafficLight[light as keyof typeof LABELS.trafficLight] : ''}</span>
                          </span>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-[#1F2A24] group-hover:text-[#2F6B3A] transition-colors leading-snug">
                        {parcel.name}
                      </h3>

                      <div className="flex items-center gap-2 text-xs text-[#7A5230] mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{parcel.village}, {regions.find(r => r.id === parcel.regionId)?.name}</span>
                        <span>·</span>
                        <span className="font-bold text-[#1F2A24]">{formatArea(parcel.areaHa)}</span>
                      </div>

                      {/* Best Crop and reason */}
                      <div className="mt-4 p-3 rounded-xl bg-[#F4EBDD]/50 border border-[#EADBC8] space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#7A5230]">Ən uyğun bitki:</span>
                          <span className="font-bold text-[#2F6B3A]">
                            {parcel.bestCrop?.name}
                          </span>
                        </div>
                        <p className="text-xs text-[#1F2A24]/80 line-clamp-2">
                          {parcel.suitability?.reasonSentence}
                        </p>
                      </div>
                    </div>

                    {/* Bottom controls */}
                    <div className="mt-5 pt-4 border-t border-[#EADBC8] flex items-center justify-between">
                      {/* Compare checkbox */}
                      <button
                        onClick={e => toggleCompare(parcel.id, e)}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                          isCompared
                            ? 'bg-[#2F6B3A]/10 text-[#2F6B3A] border-[#2F6B3A]'
                            : 'bg-white text-[#7A5230] border-[#EADBC8] hover:border-[#7A5230]'
                        }`}
                      >
                        {isCompared ? (
                          <CheckSquare className="w-4 h-4 text-[#2F6B3A]" />
                        ) : (
                          <Square className="w-4 h-4 text-[#7A5230]" />
                        )}
                        <span>{LABELS.addToCompare}</span>
                      </button>

                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onSelectParcel(parcel.id);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#2F6B3A] hover:underline cursor-pointer"
                      >
                        <span>{LABELS.details}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Torpaq Pəncərəsi (Bottom Sheet / Side Panel) */}
          {previewParcel && (
            <div className="fixed inset-0 z-50 modal-backdrop flex items-end sm:items-center justify-center p-0 sm:p-4">
              <div className="bg-white w-full sm:max-w-xl max-h-[85vh] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-[#EADBC8] overflow-y-auto space-y-5 animate-in fade-in slide-in-from-bottom-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#7A5230] uppercase">
                      Torpaq pəncərəsi · {previewParcel.code}
                    </span>
                    <h3 className="text-xl font-bold text-[#1F2A24] mt-0.5">
                      {previewParcel.name}
                    </h3>
                    <p className="text-xs text-[#7A5230]">
                      {previewParcel.village}, {regions.find(r => r.id === previewParcel.regionId)?.name} · {formatArea(previewParcel.areaHa)}
                    </p>
                  </div>
                  <button
                    onClick={() => setPreviewParcel(null)}
                    className="p-2 rounded-xl text-[#7A5230] hover:bg-[#F4EBDD] cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Score and Traffic light */}
                <div className="p-4 rounded-2xl bg-[#F4EBDD]/60 border border-[#EADBC8] flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#7A5230] block">Hesablanmış aqro-bal:</span>
                    <span className="text-2xl font-extrabold text-[#2F6B3A]">
                      {previewParcel.bestScore} / 100
                    </span>
                  </div>
                  <span
                    className={`px-3 py-1.5 rounded-full text-xs font-extrabold ${
                      previewParcel.suitability?.trafficLight === 'YASIL'
                        ? 'bg-[#2F6B3A] text-white'
                        : previewParcel.suitability?.trafficLight === 'SARI'
                        ? 'bg-[#D98E04] text-white'
                        : 'bg-[#C8553D] text-white'
                    }`}
                  >
                    {previewParcel.suitability?.trafficLight ? LABELS.trafficLight[previewParcel.suitability.trafficLight as keyof typeof LABELS.trafficLight] : ''}
                  </span>
                </div>

                <p className="text-xs text-[#1F2A24] italic border-l-3 border-[#2F6B3A] pl-3 py-1">
                  &ldquo;{previewParcel.suitability?.reasonSentence}&rdquo;
                </p>

                {/* 6 Category Summary */}
                <div className="space-y-2 text-xs">
                  <span className="font-bold text-[#1F2A24] block">Torpaq profili (6 meyar):</span>
                  {previewParcel.suitability?.breakdown?.map((item: any) => (
                    <div
                      key={item.key}
                      className="p-2.5 rounded-xl bg-white border border-[#EADBC8] flex items-center justify-between"
                    >
                      <span className="font-semibold text-[#1F2A24]">{item.label}</span>
                      <span
                        className={`font-bold ${
                          item.light === 'YASIL'
                            ? 'text-[#2F6B3A]'
                            : item.light === 'SARI'
                            ? 'text-[#D98E04]'
                            : 'text-[#C8553D]'
                        }`}
                      >
                        {item.light === 'YASIL' ? '✓ Əla' : item.light === 'SARI' ? '! Orta' : '✕ Riskli'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => {
                      const pid = previewParcel.id;
                      setPreviewParcel(null);
                      onSelectParcel(pid);
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-[#2F6B3A] hover:bg-[#26572F] text-white font-bold text-sm text-center shadow-xs cursor-pointer"
                  >
                    Ətraflı bax
                  </button>
                  <button
                    onClick={() => setPreviewParcel(null)}
                    className="py-3 px-6 rounded-xl border border-[#EADBC8] text-[#1F2A24] font-bold text-sm hover:bg-[#F4EBDD] cursor-pointer"
                  >
                    {LABELS.close}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
