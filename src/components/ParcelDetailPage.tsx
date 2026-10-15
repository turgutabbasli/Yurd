import React, { useState, useEffect, useRef } from 'react';
import { Parcel, Crop, Region, Competition, User, LandZoneType } from '../types';
import { LABELS, formatArea, formatMoney, formatDecimal, formatCountdown, formatDateAz, LAND_ZONES } from '../labels';
import { calculateSuitabilityScore, DEFAULT_WEIGHTS, ScoringWeights } from '../scoring';
import { askAdvisor } from '../advisor';
import { api } from '../api';
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Compass,
  Layers,
  Sparkles,
  Droplet,
  Mountain,
  Sun,
  ShieldAlert,
  Send,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  XCircle,
  MessageSquare,
  TrendingUp,
  Briefcase,
  FileCheck,
  Bookmark
} from 'lucide-react';
import L from 'leaflet';
import { addBaseLayers } from '../mapLayers';

interface ParcelDetailPageProps {
  parcel: Parcel;
  crops: Crop[];
  regions: Region[];
  competitions: Competition[];
  currentUser: User | null;
  investorMode?: boolean;
  investorListingInfo?: { requiredFundingAzn: number; expectedJobs: number; cropName: string };
  onApply: (parcelId: string, cropKey: string) => void;
  onCompare: (parcelId: string) => void;
  onExpressInterest?: () => void;
  interestExpressed?: boolean;
  onBack: () => void;
  compareCount?: number;
  onOpenCompare?: () => void;
}

export const ParcelDetailPage: React.FC<ParcelDetailPageProps> = ({
  parcel,
  crops,
  regions,
  competitions,
  currentUser,
  investorMode = false,
  investorListingInfo,
  onApply,
  onCompare,
  onExpressInterest,
  interestExpressed = false,
  onBack,
  compareCount = 0,
  onOpenCompare
}) => {
  // Active crop state
  const defaultCrop = crops.find(c => c.key === 'UZUM') || crops[0];
  const [selectedCrop, setSelectedCrop] = useState<Crop>(defaultCrop);

  // Sliders state
  const [weights, setWeights] = useState<ScoringWeights>({ ...DEFAULT_WEIGHTS });
  const [customSlidersOpen, setCustomSlidersOpen] = useState(false);

  // Collapsible cards state (first two open by default as required by Section 6.5)
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({
    header: true,
    map: true,
    topCrops: true,
    soilProfile: true,
    conditions: true,
    sliders: false,
    ndvi: false,
    advisor: true
  });

  const toggleCard = (key: string) => {
    setOpenCards(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Saved parcel state
  const [isSaved, setIsSaved] = useState<boolean>(() => api.isParcelSaved(parcel.id));
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const handleToggleSave = () => {
    try {
      const saved = api.toggleSavedParcel(parcel.id);
      setIsSaved(saved);
      setSaveToast(saved ? 'Sahə uğurla yadda saxlanıldı!' : 'Sahə yaddaşdan silindi.');
      setTimeout(() => setSaveToast(null), 2500);
    } catch (e: any) {
      setSaveToast(e.message || 'Sahəni yadda saxlamaq üçün daxil olun.');
      setTimeout(() => setSaveToast(null), 2500);
    }
  };

  // NDVI year slider
  const [selectedNdviYear, setSelectedNdviYear] = useState<number>(2025);

  // AI Chat Advisor state
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; sources?: string[]; disclaimer?: string }>>([
    {
      sender: 'ai',
      text: `Salam! Mən bu torpaq sahəsi üzrə aqro-məsləhətçiyəm. ${parcel.name} haqqında sualınızı verə və ya aşağıdakı hazır suallardan birini seçə bilərsiniz.`,
      disclaimer: 'Bu, məsləhətdir, rəsmi qərar deyil.'
    }
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [advisorLoading, setAdvisorLoading] = useState(false);

  // Map layers
  const [showWaterLayer, setShowWaterLayer] = useState(true);
  const [showRoadLayer, setShowRoadLayer] = useState(true);

  // Suitability score calculation
  const suitability = calculateSuitabilityScore(parcel, selectedCrop, weights);

  // Associated competition
  const competition = competitions.find(c => c.id === parcel.competitionId);
  const deadlinePassed = competition
    ? new Date(competition.applyDeadline).getTime() < Date.now()
    : true;
  const canApply = parcel.status === 'ACIQ' && !deadlinePassed;

  // Leaflet map setup
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Publish the bottom panel height so floating elements (chatbot) stay above it
  const bottomBarRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = bottomBarRef.current;
    if (!el) return;
    const root = document.documentElement;
    const update = () => root.style.setProperty('--bottom-bar-h', `${el.offsetHeight}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty('--bottom-bar-h');
    };
  }, []);

  // Land-use zones (arable / hayfield / pasture) drawn inside the parcel
  const landZones = api.getLandZones(parcel.id);
  const zoneLayersRef = useRef<Partial<Record<LandZoneType, L.Polygon>>>({});
  const [zoneVisible, setZoneVisible] = useState<Record<LandZoneType, boolean>>({ EKIN: true, BICENEK: true, OTLAQ: true });
  const zoneVisibleRef = useRef(zoneVisible);
  zoneVisibleRef.current = zoneVisible;

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    (Object.keys(zoneLayersRef.current) as LandZoneType[]).forEach(type => {
      const layer = zoneLayersRef.current[type];
      if (!layer) return;
      if (zoneVisible[type] && !map.hasLayer(layer)) layer.addTo(map);
      if (!zoneVisible[type] && map.hasLayer(layer)) map.removeLayer(layer);
    });
  }, [zoneVisible]);

  useEffect(() => {
    if (mapContainerRef.current && !mapInstanceRef.current && openCards.map) {
      const map = L.map(mapContainerRef.current).setView([parcel.centroidLat, parcel.centroidLon], 13);
      addBaseLayers(map);

      // Add parcel polygon
      try {
        const geo = JSON.parse(parcel.geometry);
        const poly = L.geoJSON(geo, {
          style: {
            color: '#2F6B3A',
            weight: 3,
            fillColor: '#2F6B3A',
            // Zones fill the parcel, so only its outline is drawn when they exist
            fillOpacity: landZones.length ? 0.04 : 0.35
          }
        }).addTo(map);
        // No animation: a pending zoom transition throws in Leaflet if the page is left mid-animation
        map.fitBounds(poly.getBounds(), { padding: [30, 30], animate: false });
      } catch (e) {
        L.marker([parcel.centroidLat, parcel.centroidLon]).addTo(map);
      }

      // Land-use zones
      zoneLayersRef.current = {};
      for (const z of landZones) {
        const style = LAND_ZONES[z.type];
        const label = `<b>${style.name}</b><br/>${formatDecimal(z.areaHa, 1)} ha (${z.sharePct}%)`;
        const layer = L.polygon(z.polygon, {
          color: style.stroke,
          weight: 1.5,
          fillColor: style.fill,
          fillOpacity: 0.6
        });
        layer.bindTooltip(label, { sticky: true, direction: 'top' });
        layer.bindPopup(label);
        layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.8, weight: 2.5 }));
        layer.on('mouseout', () => layer.setStyle({ fillOpacity: 0.6, weight: 1.5 }));
        if (zoneVisibleRef.current[z.type]) layer.addTo(map);
        zoneLayersRef.current[z.type] = layer;
      }

      // Add nearby water marker if enabled
      if (showWaterLayer) {
        const waterMarker = L.circleMarker([parcel.centroidLat + 0.008, parcel.centroidLon + 0.008], {
          radius: 8,
          color: '#2E6DB4',
          fillColor: '#2E6DB4',
          fillOpacity: 0.8
        }).addTo(map);
        waterMarker.bindTooltip(`Su mənbəyi: ${parcel.data.distances.nearestWaterName} (${formatDecimal(parcel.data.distances.nearestWaterKm, 1)} km)`, { permanent: false });
      }

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.stop();
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [openCards.map, parcel]);

  const handleAsk = async (q: string) => {
    if (!q.trim() || advisorLoading) return;
    const userMsg = q.trim();
    setInputQuestion('');
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setAdvisorLoading(true);

    try {
      const resp = await askAdvisor(
        parcel,
        userMsg,
        investorMode ? 'INVESTOR' : 'SAHIBKAR',
        selectedCrop
      );
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: resp.answer,
          sources: resp.sources,
          disclaimer: resp.disclaimer
        }
      ]);
    } catch (e) {
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: 'Üzr istəyirik, sualınızı emal edərkən xəta baş verdi.',
          disclaimer: 'Bu, məsləhətdir, rəsmi qərar deyil.'
        }
      ]);
    } finally {
      setAdvisorLoading(false);
    }
  };

  // Quick questions
  const quickQuestions = investorMode
    ? ['Əsas risk nədir?', 'Layihə üçün uyğundur?', 'Su və yamac problemi varmı?', 'Torpaq necə dəyişib?']
    : ['Münbitdir?', 'Üzümə uyğundur?', 'Heyvandarlıq olarmı?', 'Mənə nə lazım olacaq?'];

  return (
    <div className="space-y-6 pb-20">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#EADBC8] text-xs font-bold text-[#1F2A24] hover:bg-[#F4EBDD] transition-colors cursor-pointer"
        >
          ← {LABELS.back}
        </button>
      </div>

      {/* Investor Mode Top Banner */}
      {investorMode && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-[#6B3FA0] to-[#4D277A] text-white shadow-md space-y-2 border border-purple-400/30">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-white/20 text-white">
              <TrendingUp className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
              Dövlət tərəfindən təsdiqlənmiş sahibkar layihəsi
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">
            Sahibkarın layihəsi: {investorListingInfo?.cropName || selectedCrop.name}, {parcel.areaHa} ha, təxminən {formatMoney(investorListingInfo?.requiredFundingAzn || 380000)} lazımdır
          </h2>
          <p className="text-xs text-purple-100 max-w-2xl">
            Bu layihə müsabiqə komissiyası tərəfindən təsdiq edilib və torpaq sahəsi sahibkara ayrılmışdır. İnvestor kimi birgə maliyyələşdirmə üçün &ldquo;Maraqlanıram&rdquo; təşəbbüsü göndərə bilərsiniz.
          </p>
        </div>
      )}

      {/* 1. Başlıq Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#EADBC8] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-[#F4EBDD] text-[#7A5230]">
                {parcel.code}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#2F6B3A]/10 text-[#2F6B3A]">
                {LABELS.parcelStatus[parcel.status]}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1F2A24]">
              {parcel.name}
            </h1>
            <p className="text-xs text-[#7A5230] mt-1 flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              <span>{parcel.village}, {regions.find(r => r.id === parcel.regionId)?.name}</span>
              <span>·</span>
              <span className="font-bold text-[#1F2A24]">{formatArea(parcel.areaHa)}</span>
            </p>
          </div>

          {/* Traffic light & Score */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#F4EBDD]/60 border border-[#EADBC8]">
            <div className="text-right">
              <span className="text-xs text-[#7A5230] block font-medium">Aqro-uyğunluq balı:</span>
              <div className="text-2xl sm:text-3xl font-black text-[#2F6B3A]">
                {suitability.score !== null ? `${suitability.score} / 100` : 'İstisna'}
              </div>
            </div>
            <span
              className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 ${
                suitability.trafficLight === 'YASIL'
                  ? 'bg-[#2F6B3A] text-white'
                  : suitability.trafficLight === 'SARI'
                  ? 'bg-[#D98E04] text-white'
                  : 'bg-[#C8553D] text-white'
              }`}
            >
              {suitability.trafficLight ? LABELS.trafficLight[suitability.trafficLight] : 'Riskli'}
            </span>
          </div>
        </div>

        {/* Reason Sentence */}
        <div className="p-4 rounded-2xl bg-[#2F6B3A]/5 border border-[#2F6B3A]/20 text-sm font-medium text-[#1F2A24]">
          <span className="font-bold text-[#2F6B3A]">Nəticə izahı: </span>
          &ldquo;{suitability.reasonSentence}&rdquo;
        </div>
      </div>

      {/* 2. Xəritə Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#EADBC8] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#2F6B3A]/10 text-[#2F6B3A]">
              <Layers className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-[#1F2A24]">
              Ərazi sərhədləri və xəritə
            </h2>
          </div>
          <button
            onClick={() => toggleCard('map')}
            className="p-1.5 rounded-lg text-[#7A5230] hover:bg-[#F4EBDD] cursor-pointer"
          >
            {openCards.map ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {openCards.map && (
          <div className="space-y-4">
            <div className="relative">
              <div
                ref={mapContainerRef}
                className="w-full h-80 sm:h-96 rounded-2xl border border-[#EADBC8] shadow-inner"
              />
              {landZones.length > 0 && (
                <div className="absolute bottom-3 left-3 z-20 bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl border border-[#EADBC8] text-xs space-y-1 shadow-sm">
                  <div className="font-bold text-[#1F2A24] mb-1">İstifadə zonaları:</div>
                  {landZones.map(z => (
                    <label key={z.type} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={zoneVisible[z.type]}
                        onChange={e => setZoneVisible(v => ({ ...v, [z.type]: e.target.checked }))}
                        className="accent-[#2F6B3A] cursor-pointer"
                      />
                      <span className="w-3 h-3 rounded-sm border" style={{ background: LAND_ZONES[z.type].fill, borderColor: LAND_ZONES[z.type].stroke }} />
                      <span className="text-[#1F2A24]">{LAND_ZONES[z.type].name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {landZones.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex h-2.5 rounded-full overflow-hidden border border-[#EADBC8]">
                  {landZones.map(z => (
                    <div
                      key={z.type}
                      style={{ width: `${z.sharePct}%`, background: LAND_ZONES[z.type].fill }}
                      title={`${LAND_ZONES[z.type].name}: ${z.sharePct}%`}
                    />
                  ))}
                </div>
                <div className="text-xs text-[#1F2A24] font-medium">
                  {landZones
                    .map(z => `${LAND_ZONES[z.type].name.split(' ')[0]}: ${formatDecimal(z.areaHa, 1)} ha (${z.sharePct}%)`)
                    .join(' · ')}
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between text-xs text-[#7A5230] pt-1 gap-2">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#2F6B3A]" />
                  <span>Sahə poliqonu</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#2E6DB4]" />
                  <span>Su mənbəyi ({parcel.data.distances.nearestWaterName})</span>
                </span>
              </div>
              <span className="italic">Xəritə: OpenStreetMap (Həqiqi koordinatlar)</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Ən Uyğun Bitkilər Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#EADBC8] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#D98E04]/10 text-[#D98E04]">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-[#1F2A24]">
                Ən uyğun bitkilər
              </h2>
              <p className="text-xs text-[#7A5230]">
                Bitki çipinə sıxaraq balı və torpaq profilini yenidən hesablayın
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleCard('topCrops')}
            className="p-1.5 rounded-lg text-[#7A5230] hover:bg-[#F4EBDD] cursor-pointer"
          >
            {openCards.topCrops ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {openCards.topCrops && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {crops.map(crop => {
              const res = calculateSuitabilityScore(parcel, crop, weights);
              const isSelected = selectedCrop.key === crop.key;

              return (
                <button
                  key={crop.key}
                  onClick={() => setSelectedCrop(crop)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#2F6B3A] bg-[#2F6B3A]/5 shadow-xs'
                      : 'border-[#EADBC8] bg-[#F4EBDD]/40 hover:bg-[#F4EBDD]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-extrabold text-[#1F2A24]">
                      {crop.name}
                    </span>
                    <span
                      className={`text-xs font-black px-2 py-0.5 rounded-md ${
                        res.trafficLight === 'YASIL'
                          ? 'bg-[#2F6B3A] text-white'
                          : res.trafficLight === 'SARI'
                          ? 'bg-[#D98E04] text-white'
                          : 'bg-[#C8553D] text-white'
                      }`}
                    >
                      {res.score ?? 0}
                    </span>
                  </div>
                  <div className="w-full bg-[#EADBC8] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        res.trafficLight === 'YASIL' ? 'bg-[#2F6B3A]' : res.trafficLight === 'SARI' ? 'bg-[#D98E04]' : 'bg-[#C8553D]'
                      }`}
                      style={{ width: `${res.score ?? 0}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Torpaq Profili (6 Rows with Traffic Lights, plain explanations, and source badges) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#EADBC8] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#2F6B3A]/10 text-[#2F6B3A]">
              <Compass className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-[#1F2A24]">
                Torpaq profili (6 kateqoriya)
              </h2>
              <p className="text-xs text-[#7A5230]">
                {selectedCrop.name} üzrə aqroekoloji göstəricilər və rəsmi mənbə nişanları
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleCard('soilProfile')}
            className="p-1.5 rounded-lg text-[#7A5230] hover:bg-[#F4EBDD] cursor-pointer"
          >
            {openCards.soilProfile ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {openCards.soilProfile && (
          <div className="space-y-3 pt-2">
            {suitability.breakdown.map(cat => (
              <div
                key={cat.key}
                className="p-4 rounded-2xl bg-[#F4EBDD]/40 border border-[#EADBC8] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#1F2A24]">
                      {cat.label} ({cat.weight}%)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-[#EADBC8] text-[#7A5230]">
                      {cat.badge}
                    </span>
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                      cat.light === 'YASIL'
                        ? 'bg-[#2F6B3A]/10 text-[#2F6B3A]'
                        : cat.light === 'SARI'
                        ? 'bg-[#D98E04]/10 text-[#D98E04]'
                        : 'bg-[#C8553D]/10 text-[#C8553D]'
                    }`}
                  >
                    <span>{cat.light === 'YASIL' ? '✓ Əla uyğun' : cat.light === 'SARI' ? '! Orta uyğun' : '✕ Riskli'}</span>
                  </span>
                </div>

                <p className="text-xs text-[#1F2A24]">
                  {cat.sentence}
                </p>

                <div className="text-[11px] text-[#7A5230] pt-1 border-t border-[#EADBC8]/60 flex items-center justify-between">
                  <span>Dəqiq göstəricilər: <b>{cat.rawValues}</b></span>
                  <span className="italic">Mənbə: {cat.source}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Məsafələr və Şərtlər Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#EADBC8] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#7A5230]/10 text-[#7A5230]">
              <Mountain className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-[#1F2A24]">
              Məsafələr, infrastruktur və icarə şərtləri
            </h2>
          </div>
          <button
            onClick={() => toggleCard('conditions')}
            className="p-1.5 rounded-lg text-[#7A5230] hover:bg-[#F4EBDD] cursor-pointer"
          >
            {openCards.conditions ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {openCards.conditions && (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#F4EBDD]/50 border border-[#EADBC8]">
                <span className="text-[#7A5230] block">Ən yaxın su mənbəyi:</span>
                <span className="font-bold text-[#1F2A24] text-sm">
                  {formatDecimal(parcel.data.distances.nearestWaterKm, 1)} km
                </span>
                <span className="text-[10px] text-[#7A5230] block mt-0.5">
                  {parcel.data.distances.nearestWaterName}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#F4EBDD]/50 border border-[#EADBC8]">
                <span className="text-[#7A5230] block">Ən yaxın yol:</span>
                <span className="font-bold text-[#1F2A24] text-sm">
                  {formatDecimal(parcel.data.distances.nearestRoadKm, 1)} km
                </span>
                <span className="text-[10px] text-[#7A5230] block mt-0.5">
                  Magistral və kənd yolu
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#F4EBDD]/50 border border-[#EADBC8]">
                <span className="text-[#7A5230] block">İllik icarə haqqı:</span>
                <span className="font-bold text-[#1F2A24] text-sm">
                  {parcel.pricePerHaYearAzn} ₼ / ha
                </span>
                <span className="text-[10px] text-[#7A5230] block mt-0.5">
                  Cəmi: {formatMoney(parcel.pricePerHaYearAzn * parcel.areaHa)} / il
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#F4EBDD]/50 border border-[#EADBC8]">
                <span className="text-[#7A5230] block">Mina təmizlənməsi:</span>
                <span className="font-bold text-[#2F6B3A] text-sm flex items-center gap-1">
                  <span>{LABELS.demining[parcel.deminingStatus]}</span>
                </span>
                <span className="text-[10px] text-amber-700 font-bold block mt-0.5">
                  {LABELS.badges.SIMULYASIYA}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#F4EBDD]/50 border border-[#EADBC8]">
                <span className="text-[#7A5230] block">Müsabiqə müddəti:</span>
                <span className="font-bold text-[#1F2A24] text-sm">
                  {competition ? formatCountdown(competition.applyDeadline) : 'Bağlı'}
                </span>
                <span className="text-[10px] text-[#7A5230] block mt-0.5">
                  {competition?.number || '—'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#F4EBDD]/50 border border-[#EADBC8]">
                <span className="text-[#7A5230] block">İcazə verilən istifadələr:</span>
                <span className="font-bold text-[#1F2A24] text-xs">
                  {parcel.allowedUses.map(u => LABELS.allowedUses[u] || u).join(', ')}
                </span>
              </div>
            </div>

            {/* Mandatory Fixed Notice */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-bold">
              ℹ {LABELS.fixedMinistryNotice}
            </div>
          </div>
        )}
      </div>

      {/* 6. Prioritet Slayderləri (SHOULD) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#EADBC8] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#2F6B3A]/10 text-[#2F6B3A]">
              <Sliders className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-[#1F2A24]">
                Prioritet slayderləri (Fərdi çəkilər)
              </h2>
              <p className="text-xs text-[#7A5230]">
                Çəkiləri dəyişdirərək balı anında fərdi prioritetlərinizə uyğunlaşdırın
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleCard('sliders')}
            className="p-1.5 rounded-lg text-[#7A5230] hover:bg-[#F4EBDD] cursor-pointer"
          >
            {openCards.sliders ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {openCards.sliders && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Object.keys(DEFAULT_WEIGHTS) as Array<keyof ScoringWeights>).map(key => (
                <div key={key} className="p-3.5 rounded-xl bg-[#F4EBDD]/40 border border-[#EADBC8]">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-[#1F2A24]">
                      {LABELS.scoringCategories[key]}:
                    </span>
                    <span className="font-black text-[#2F6B3A]">{weights[key]}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={weights[key]}
                    onChange={e => setWeights(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                    className="w-full accent-[#2F6B3A] cursor-pointer"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setWeights({ ...DEFAULT_WEIGHTS })}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#EADBC8] text-xs font-bold text-[#7A5230] hover:text-[#1F2A24] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Sıfırla</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 7. Ərazi Yaşıllığı 2018-2025 (NDVI Card) */}
      {parcel.data.ndvi && parcel.data.ndvi.length > 0 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#EADBC8] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#2F6B3A]/10 text-[#2F6B3A]">
                <Sun className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-[#1F2A24]">
                  Ərazi yaşıllığı 2018–2025 (NDVI Dinamikası)
                </h2>
                <p className="text-xs text-[#7A5230]">
                  İşğaldan azad olunduqdan sonra vegetasiya örtüyünün bərpa tendensiyası
                </p>
              </div>
            </div>
            <button
              onClick={() => toggleCard('ndvi')}
              className="p-1.5 rounded-lg text-[#7A5230] hover:bg-[#F4EBDD] cursor-pointer"
            >
              {openCards.ndvi ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>

          {openCards.ndvi && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-4">
                {parcel.data.ndvi.map(point => (
                  <div
                    key={point.year}
                    className={`flex-1 p-3.5 rounded-2xl text-center border transition-all ${
                      point.year === selectedNdviYear
                        ? 'bg-[#2F6B3A] text-white border-[#2F6B3A]'
                        : 'bg-[#F4EBDD]/40 text-[#1F2A24] border-[#EADBC8]'
                    }`}
                    onClick={() => setSelectedNdviYear(point.year)}
                  >
                    <span className="text-xs block font-semibold opacity-80">{point.year}</span>
                    <span className="text-lg font-black block mt-0.5">
                      {formatDecimal(point.value, 2)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#7A5230] italic">
                Sentinel-2 multispektral peyk müşahidəsi. NDVI 0,20–0,60 aralığı normal kənd təsərrüfatı vegetasiyası üçün optimaldır.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 8. Torpaq Məsləhətçisi (AI Chat, Purple Accent #6B3FA0) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border-2 border-[#6B3FA0]/30 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-[#6B3FA0] text-white flex items-center justify-center shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-[#1F2A24] flex items-center gap-2">
                <span>Torpaq məsləhətçisi</span>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-[#6B3FA0]/15 text-[#6B3FA0]">
                  Süni intellekt
                </span>
              </h2>
              <p className="text-xs text-[#7A5230]">
                Yalnız bu torpağın aqro-məlumatlarına əsaslanan sadə dildə cavablar
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleCard('advisor')}
            className="p-1.5 rounded-lg text-[#7A5230] hover:bg-[#F4EBDD] cursor-pointer"
          >
            {openCards.advisor ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {openCards.advisor && (
          <div className="space-y-4 pt-2">
            {/* Quick Questions */}
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAsk(q)}
                  disabled={advisorLoading}
                  className="px-3.5 py-1.5 rounded-xl bg-[#6B3FA0]/10 hover:bg-[#6B3FA0]/20 text-[#6B3FA0] text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Chat Messages */}
            <div className="max-h-80 overflow-y-auto space-y-3 p-4 rounded-2xl bg-[#F4EBDD]/40 border border-[#EADBC8]">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#2F6B3A] text-white font-medium rounded-br-xs'
                        : 'bg-white text-[#1F2A24] border border-[#EADBC8] shadow-xs rounded-bl-xs'
                    }`}
                  >
                    {msg.text}

                    {msg.disclaimer && (
                      <div className="mt-2 pt-2 border-t border-[#EADBC8] text-[11px] text-[#7A5230] italic">
                        {msg.disclaimer}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {advisorLoading && (
                <div className="text-xs text-[#6B3FA0] font-bold animate-pulse">
                  Torpaq məlumatları təhlil edilir…
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={e => {
                e.preventDefault();
                handleAsk(inputQuestion);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Bu torpaq haqqında sualınızı yazın…"
                value={inputQuestion}
                onChange={e => setInputQuestion(e.target.value)}
                disabled={advisorLoading}
                className="flex-1 px-4 py-3 rounded-xl border border-[#EADBC8] bg-white text-sm text-[#1F2A24] focus:outline-none focus:border-[#6B3FA0]"
              />
              <button
                type="submit"
                disabled={advisorLoading || !inputQuestion.trim()}
                className="px-5 py-3 rounded-xl bg-[#6B3FA0] hover:bg-[#583286] text-white font-bold text-sm flex items-center gap-2 cursor-pointer disabled:opacity-40 transition-colors shadow-xs"
              >
                <span>Göndər</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>

      {saveToast && (
        <div className="fixed top-20 right-4 z-50 bg-[#2F6B3A] text-white px-5 py-3 rounded-2xl shadow-xl border border-white/20 flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* 9. Bottom Sticky Action Bar */}
      <div ref={bottomBarRef} className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#EADBC8] p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 min-w-0">
            <div>
              <span className="text-xs text-[#7A5230] block">Seçilmiş bitki:</span>
              <span className="font-bold text-[#1F2A24] text-sm">
                {selectedCrop.name} · {suitability.score} bal ({suitability.trafficLight ? LABELS.trafficLight[suitability.trafficLight] : ''})
              </span>
            </div>
            {compareCount > 0 && onOpenCompare && (
              <button
                onClick={onOpenCompare}
                className="px-4 py-2.5 rounded-2xl bg-[#2F6B3A] text-white font-extrabold text-[11px] shadow-md flex items-center gap-1.5 hover:bg-[#26572F] cursor-pointer whitespace-nowrap"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Müqayisə et ({compareCount} sahə)</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {investorMode ? (
              <button
                onClick={onExpressInterest}
                disabled={interestExpressed}
                className={`px-8 py-3.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all shadow-md cursor-pointer ${
                  interestExpressed
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-not-allowed'
                    : 'bg-[#6B3FA0] hover:bg-[#583286] text-white'
                }`}
              >
                {interestExpressed ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                    <span>{LABELS.investor.alreadyInterested}</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-5 h-5" />
                    <span>{LABELS.investor.interested}</span>
                  </>
                )}
              </button>
            ) : (
              <>
                {currentUser && (
                  <button
                    onClick={handleToggleSave}
                    title={isSaved ? 'Yaddaşdan sil' : 'Yadda saxla'}
                    className={`px-4 py-3 rounded-xl border font-bold text-sm flex items-center gap-1.5 cursor-pointer transition-colors ${
                      isSaved
                        ? 'border-[#2F6B3A]/40 bg-[#2F6B3A]/10 text-[#2F6B3A]'
                        : 'border-[#EADBC8] bg-white text-[#1F2A24] hover:bg-[#F4EBDD]'
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                    <span className="hidden sm:inline">{isSaved ? 'Yadda saxlanılıb' : 'Yadda saxla'}</span>
                  </button>
                )}

                <button
                  onClick={() => onCompare(parcel.id)}
                  className="px-5 py-3 rounded-xl border border-[#EADBC8] bg-white text-[#1F2A24] font-bold text-sm hover:bg-[#F4EBDD] cursor-pointer"
                >
                  {LABELS.compare}
                </button>

                <button
                  onClick={() => onApply(parcel.id, selectedCrop.key)}
                  disabled={!canApply}
                  className={`px-8 py-3.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all shadow-md cursor-pointer ${
                    canApply
                      ? 'bg-[#2F6B3A] hover:bg-[#26572F] text-white'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Briefcase className="w-5 h-5" />
                  <span>{canApply ? LABELS.apply : LABELS.deadlinePassed}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
