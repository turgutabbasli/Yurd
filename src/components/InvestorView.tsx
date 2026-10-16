import React, { useState } from 'react';
import { FilterSelect } from './FilterSelect';
import { ProjectListing, Parcel, Region, Crop, User } from '../types';
import { LABELS, formatArea, formatMoney, formatDateAz, formatDurationMonths } from '../labels';
import { calculateSuitabilityScore } from '../scoring';
import { api } from '../api';
import { OfferFormModal } from './OfferFormModal';
import { offerStatusClass, offerTermsText } from './ApplicationOffers';
import {
  TrendingUp,
  MapPin,
  ArrowRight,
  Filter,
  CheckCircle2,
  Briefcase,
  Layers,
  Sparkles,
  Handshake
} from 'lucide-react';

interface InvestorViewProps {
  projects: ProjectListing[];
  parcels: Parcel[];
  regions: Region[];
  crops: Crop[];
  onOpenParcelInInvestorMode: (parcelId: string, listing: ProjectListing) => void;
  onExpressInterest: (listingId: string) => void;
  currentUser?: User | null;
  onNotify?: (msg: string) => void;
}

export const InvestorView: React.FC<InvestorViewProps> = ({
  projects,
  parcels,
  regions,
  crops,
  onOpenParcelInInvestorMode,
  onExpressInterest,
  currentUser,
  onNotify
}) => {
  const [activeTab, setActiveTab] = useState<'listings' | 'myInterests' | 'myOffers'>('listings');
  const [offerListing, setOfferListing] = useState<ProjectListing | null>(null);
  // Bumped after an offer is sent so offer-derived UI re-reads the store
  const [offersVersion, setOffersVersion] = useState(0);
  const myOffers = api.getMyOffers();
  void offersVersion;
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('');

  // Filter listings
  const filteredProjects = projects.filter(p => {
    const parcel = parcels.find(x => x.id === p.parcelId);
    if (!parcel) return false;
    if (selectedRegion && parcel.regionId !== selectedRegion) return false;
    if (selectedCrop && p.crop !== selectedCrop) return false;
    if (activeTab === 'myInterests' && !p.interestedByMe) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-[#6B3FA0] via-[#583286] to-[#42206B] text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 border border-purple-400/20">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-bold text-purple-200">
            <TrendingUp className="w-4 h-4" />
            <span>İnvestor Portalı</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black">
            Təsdiqlənmiş Aqrar İnvestisiya Layihələri
          </h1>
          <p className="text-xs sm:text-sm text-purple-100 max-w-xl">
            Burada yalnız dövlət müsabiqəsindən uğurla keçmiş, torpaq sahəsi ayrılmış və sahibkarlar tərəfindən investor cəlbi üçün təqdim edilmiş layihələr yer alır.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-black/20 backdrop-blur-md border border-white/10 shrink-0">
          <button
            onClick={() => setActiveTab('listings')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'listings' ? 'bg-white text-[#6B3FA0] shadow-sm' : 'text-white/80 hover:text-white'
            }`}
          >
            Layihələr ({projects.length})
          </button>
          <button
            onClick={() => setActiveTab('myInterests')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'myInterests' ? 'bg-white text-[#6B3FA0] shadow-sm' : 'text-white/80 hover:text-white'
            }`}
          >
            Maraqlandıqlarım ({projects.filter(p => p.interestedByMe).length})
          </button>
          <button
            onClick={() => setActiveTab('myOffers')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'myOffers' ? 'bg-white text-[#6B3FA0] shadow-sm' : 'text-white/80 hover:text-white'
            }`}
          >
            Təkliflərim ({myOffers.length})
          </button>
        </div>
      </div>

      {activeTab === 'myOffers' ? (
        <div className="space-y-3">
          {myOffers.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-[#EADBC8] space-y-3">
              <Handshake className="w-12 h-12 text-[#7A5230]/40 mx-auto" />
              <h3 className="text-lg font-bold text-[#1F2A24]">Hələ heç bir təklif göndərməmisiniz</h3>
              <p className="text-xs text-[#7A5230] max-w-sm mx-auto">
                Layihələr bölməsində bəyəndiyiniz layihənin kartında &ldquo;Təklif göndər&rdquo; düyməsini sıxın.
              </p>
            </div>
          ) : (
            myOffers.map(o => {
              const listing = projects.find(p => p.applicationId === o.applicationId);
              const parcel = listing ? parcels.find(p => p.id === listing.parcelId) : undefined;
              const cropName = listing ? crops.find(c => c.key === listing.crop)?.name || listing.crop : '';
              return (
                <div key={o.id} className="bg-white rounded-2xl p-5 shadow-xs border border-[#EADBC8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="font-extrabold text-sm text-[#1F2A24]">
                      {parcel ? `${cropName} · ${parcel.name}` : 'Layihə'}
                    </div>
                    <div className="text-[#7A5230]">
                      {formatMoney(o.amountAzn)} · {LABELS.offerModels[o.model]} · {offerTermsText(o)} · {formatDurationMonths(o.durationMonths)}
                    </div>
                    <div className="text-[11px] text-[#7A5230]">Göndərilib: {formatDateAz(o.createdAt)}</div>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border self-start sm:self-auto ${offerStatusClass(o.status)}`}>
                    {LABELS.offerStatus[o.status]}
                  </span>
                </div>
              );
            })
          )}
        </div>
      ) : (
      <>
      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#EADBC8] flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-[#7A5230] uppercase">
            Filtrlər:
          </span>

          <FilterSelect
            value={selectedRegion}
            onChange={setSelectedRegion}
            options={[{ value: '', label: 'Bütün rayonlar' }, ...regions.map(r => ({ value: r.id, label: r.name }))]}
            ariaLabel="Rayon"
            className="px-3 py-1.5 rounded-xl border border-[#EADBC8] text-xs font-bold bg-[#F4EBDD]/40 text-[#1F2A24] cursor-pointer"
          />

          <FilterSelect
            value={selectedCrop}
            onChange={setSelectedCrop}
            options={[{ value: '', label: 'Bütün bitkilər' }, ...crops.map(c => ({ value: c.key, label: c.name }))]}
            ariaLabel="Bitki"
            className="px-3 py-1.5 rounded-xl border border-[#EADBC8] text-xs font-bold bg-[#F4EBDD]/40 text-[#1F2A24] cursor-pointer"
          />

          {(selectedRegion || selectedCrop) && (
            <button
              onClick={() => {
                setSelectedRegion('');
                setSelectedCrop('');
              }}
              className="text-xs text-[#7A5230] hover:text-[#C8553D] underline cursor-pointer"
            >
              {LABELS.resetFilter}
            </button>
          )}
        </div>

        <span className="text-xs text-[#7A5230]">
          Göstərilir: <b>{filteredProjects.length} layihə</b>
        </span>
      </div>

      {/* Empty State */}
      {filteredProjects.length === 0 && (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#EADBC8] space-y-3">
          <TrendingUp className="w-12 h-12 text-[#7A5230]/40 mx-auto" />
          <h3 className="text-lg font-bold text-[#1F2A24]">
            {activeTab === 'myInterests'
              ? 'Hələ heç bir layihəyə maraq bildirməmisiniz'
              : 'Bu kriteriyalara uyğun təsdiqlənmiş layihə yoxdur'}
          </h3>
          <p className="text-xs text-[#7A5230] max-w-sm mx-auto">
            {activeTab === 'myInterests'
              ? 'Layihələr bölməsinə keçərək təsdiqlənmiş sahələrlə tanış olun və "Maraqlanıram" düyməsini sıxın.'
              : 'Filtrləri sıfırlayaraq bütün təsdiqlənmiş layihələri görə bilərsiniz.'}
          </p>
        </div>
      )}

      {/* Projects Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map(proj => {
          const parcel = parcels.find(p => p.id === proj.parcelId);
          if (!parcel) return null;

          const cropObj = crops.find(c => c.key === proj.crop) || crops[0];
          const suit = calculateSuitabilityScore(parcel, cropObj);

          return (
            <div
              key={proj.id}
              onClick={() => onOpenParcelInInvestorMode(parcel.id, proj)}
              className="bg-white rounded-3xl p-6 shadow-sm border border-[#EADBC8] hover:border-[#6B3FA0]/50 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                {/* Badges */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-[#6B3FA0]/10 text-[#6B3FA0]">
                    Sahibkar: {proj.entrepreneurMasked}
                  </span>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                      suit.trafficLight === 'YASIL'
                        ? 'bg-[#2F6B3A]/10 text-[#2F6B3A] border border-[#2F6B3A]/30'
                        : suit.trafficLight === 'SARI'
                        ? 'bg-[#D98E04]/10 text-[#D98E04] border border-[#D98E04]/30'
                        : 'bg-[#C8553D]/10 text-[#C8553D] border border-[#C8553D]/30'
                    }`}
                  >
                    {suit.score ?? '-'} bal · {suit.trafficLight ? LABELS.trafficLight[suit.trafficLight] : ''}
                  </span>
                </div>

                <h3 className="text-xl font-black text-[#1F2A24] group-hover:text-[#6B3FA0] transition-colors leading-snug">
                  {cropObj.name} · {formatArea(parcel.areaHa)}
                </h3>

                <p className="text-xs text-[#7A5230] mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{parcel.village}, {regions.find(r => r.id === parcel.regionId)?.name} ({parcel.code})</span>
                </p>

                <p className="text-xs text-[#1F2A24]/80 mt-3 line-clamp-3 leading-relaxed">
                  {proj.summary}
                </p>

                {/* Key financials */}
                <div className="mt-4 p-3.5 rounded-2xl bg-[#F4EBDD]/50 border border-[#EADBC8] grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[#7A5230] block">Tələb olunan investisiya:</span>
                    <span className="font-extrabold text-[#1F2A24] text-sm">
                      {formatMoney(proj.requiredFundingAzn)}
                    </span>
                    <span className="text-[10px] text-amber-700 block font-semibold">
                      ({LABELS.badges.TEXMINI})
                    </span>
                  </div>

                  <div>
                    <span className="text-[#7A5230] block">Yaranacaq iş yeri:</span>
                    <span className="font-extrabold text-[#1F2A24] text-sm">
                      {proj.expectedJobs} nəfər
                    </span>
                    <span className="text-[10px] text-[#2F6B3A] block font-semibold">
                      Dövlət təsdiqli
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom action bar */}
              <div className="mt-5 pt-4 border-t border-[#EADBC8] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                    {LABELS.badges.NUMUNE}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                {(() => {
                  const mine = myOffers.find(o => o.applicationId === proj.applicationId && o.status === 'GOZLEMEDE');
                  if (mine) {
                    return (
                      <span className="text-[11px] font-bold text-[#D98E04] bg-[#D98E04]/10 px-2 py-1 rounded-lg">
                        Təklif gözləmədə
                      </span>
                    );
                  }
                  if (!api.isAcceptingOffers(proj.applicationId)) {
                    return (
                      <span className="text-[11px] font-bold text-[#7A5230] bg-[#F4EBDD] px-2 py-1 rounded-lg">
                        Təklif qəbulu bağlıdır
                      </span>
                    );
                  }
                  return (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setOfferListing(proj);
                      }}
                      className="px-3 py-2 rounded-xl border border-[#6B3FA0]/40 text-[#6B3FA0] hover:bg-[#6B3FA0]/10 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Təklif göndər
                    </button>
                  );
                })()}
                {proj.interestedByMe ? (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{LABELS.investor.alreadyInterested}</span>
                  </span>
                ) : (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onExpressInterest(proj.id);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#6B3FA0] hover:bg-[#583286] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    {LABELS.investor.interested}
                  </button>
                )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      </>
      )}

      {offerListing && currentUser && (() => {
        const parcel = parcels.find(p => p.id === offerListing.parcelId);
        if (!parcel) return null;
        return (
          <OfferFormModal
            listing={offerListing}
            parcel={parcel}
            cropName={crops.find(c => c.key === offerListing.crop)?.name || offerListing.crop}
            currentUser={currentUser}
            onClose={() => setOfferListing(null)}
            onSuccess={() => {
              setOfferListing(null);
              setOffersVersion(v => v + 1);
              onNotify?.('Təklifiniz torpaq sahibinə göndərildi.');
            }}
          />
        );
      })()}
    </div>
  );
};
