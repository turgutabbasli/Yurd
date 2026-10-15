import React, { useState } from 'react';
import { Application, Parcel, Competition, ProjectListing } from '../types';
import { LABELS, formatArea, formatMoney, formatDateAz, formatDurationMonths, formatEndMonth } from '../labels';
import { api } from '../api';
import { ApplicationOffers } from './ApplicationOffers';
import { LocationMapView } from './LocationPicker';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Upload,
  ArrowRight,
  TrendingUp,
  ChevronRight,
  Send,
  Building,
  X
} from 'lucide-react';

interface MuracietlerimViewProps {
  applications: Application[];
  parcels: Parcel[];
  competitions: Competition[];
  onRefresh: () => void;
  onCreateProjectListing: (appId: string) => void;
  onSelectParcel: (parcelId: string) => void;
}

export const MuracietlerimView: React.FC<MuracietlerimViewProps> = ({
  applications,
  parcels,
  competitions,
  onRefresh,
  onCreateProjectListing,
  onSelectParcel
}) => {
  const [selectedApp, setSelectedApp] = useState<Application | null>(
    applications.length > 0 ? applications[0] : null
  );

  // Additional document upload state
  const [extraDocModalOpen, setExtraDocModalOpen] = useState(false);
  const [extraDocName, setExtraDocName] = useState('yenilenmis_suvarma_sxemi.pdf');
  const [extraDocAnswer, setExtraDocAnswer] = useState('Suvarma qrafiki və xətləri ekspert rəyinə əsasən dəqiqləşdirildi.');
  const [submittingInfo, setSubmittingInfo] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelConfirmModalOpen, setCancelConfirmModalOpen] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [extraDocError, setExtraDocError] = useState<string | null>(null);

  const getStatusBadgeClass = (status: string, outcome?: string | null) => {
    switch (status) {
      case 'QEBUL_EDILIB':
        return 'bg-[#2E6DB4]/10 text-[#2E6DB4] border-[#2E6DB4]/30';
      case 'BAXILIR':
        return 'bg-[#D98E04]/10 text-[#D98E04] border-[#D98E04]/30';
      case 'ELAVE_MELUMAT':
        return 'bg-[#C8553D]/10 text-[#C8553D] border-[#C8553D]/30';
      case 'LEGV_EDILIB':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'INVESTOR_SECILDI':
        return 'bg-[#6B3FA0]/10 text-[#6B3FA0] border-[#6B3FA0]/30';
      case 'QERAR_VERILIB':
        return outcome === 'TESDIQLENIB'
          ? 'bg-[#2F6B3A]/10 text-[#2F6B3A] border-[#2F6B3A]/30'
          : 'bg-[#C8553D]/10 text-[#C8553D] border-[#C8553D]/30';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string, outcome?: string | null) => {
    if (status === 'LEGV_EDILIB') {
      return 'Ləğv edilib';
    }
    if (status === 'QERAR_VERILIB') {
      return outcome === 'TESDIQLENIB' ? 'Qərar verilib — Təsdiq edilib' : 'Qərar verilib — Rədd edilib';
    }
    return LABELS.applicationStatus[status as keyof typeof LABELS.applicationStatus] || status;
  };

  const handleCancelApp = async () => {
    if (!selectedApp) return;
    setCancelling(true);
    setActionFeedback(null);
    try {
      await api.cancelApplication(selectedApp.id);
      onRefresh();
      const updated = api.getApplicationById(selectedApp.id);
      if (updated) setSelectedApp(updated);
      setCancelConfirmModalOpen(false);
      setActionFeedback('Müraciətiniz uğurla ləğv edildi.');
    } catch (e: any) {
      setActionFeedback(e.message || LABELS.errorGeneral);
    } finally {
      setCancelling(false);
    }
  };

  const handleSendExtraDoc = async () => {
    if (!selectedApp) return;
    setSubmittingInfo(true);
    setExtraDocError(null);
    try {
      await api.provideInfo(selectedApp.id, extraDocName, extraDocAnswer);
      setExtraDocModalOpen(false);
      onRefresh();
      // Re-fetch app
      const updated = api.getApplicationById(selectedApp.id);
      if (updated) setSelectedApp(updated);
      setActionFeedback('Əlavə sənəd və izahatınız uğurla nazirliyə göndərildi.');
    } catch (e: any) {
      setExtraDocError(e.message || LABELS.errorGeneral);
    } finally {
      setSubmittingInfo(false);
    }
  };

  if (applications.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-[#EADBC8] space-y-4">
        <FileText className="w-12 h-12 text-[#7A5230]/40 mx-auto" />
        <h3 className="text-xl font-bold text-[#1F2A24]">
          {LABELS.emptyList}
        </h3>
        <p className="text-xs text-[#7A5230] max-w-sm mx-auto">
          Hələ heç bir müsabiqəyə müraciət etməmisiniz. &ldquo;Torpaq tap&rdquo; bölməsindən uyğun sahəni taparaq müraciət göndərə bilərsiniz.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1F2A24]">
          Müraciətlərim ({applications.length})
        </h1>
        <p className="text-xs text-[#7A5230]">
          Göndərilmiş investisiya müraciətlərinin statusu, tarixi və icra prosesi
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Applications List */}
        <div className="space-y-3">
          {applications.map(app => {
            const parcel = parcels.find(p => p.id === app.parcelId);
            const comp = competitions.find(c => c.id === app.competitionId);
            const isSelected = selectedApp?.id === app.id;
            const offerCount = api.getOffersForApplication(app.id).length;

            return (
              <div
                key={app.id}
                onClick={() => setSelectedApp(app)}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#2F6B3A] bg-white shadow-sm'
                    : 'border-[#EADBC8] bg-white/70 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-sm text-[#1F2A24]">
                    {app.number}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadgeClass(
                      app.status,
                      app.outcome
                    )}`}
                  >
                    {getStatusText(app.status, app.outcome)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-bold text-[#2F6B3A]">
                    {parcel?.name || 'Torpaq sahəsi'}
                  </span>
                  {offerCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#6B3FA0]/10 text-[#6B3FA0] border border-[#6B3FA0]/30 shrink-0">
                      {offerCount} təklif
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#7A5230] pt-2 border-t border-[#EADBC8]/60">
                  <span>Müsabiqə: {comp?.number}</span>
                  <span>{formatDateAz(app.submittedAt)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Detail View */}
        {selectedApp && (
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#EADBC8] space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EADBC8]">
              <div>
                <span className="text-xs font-bold text-[#7A5230] uppercase">
                  Müraciət kartı
                </span>
                <h2 className="text-2xl font-black text-[#1F2A24] mt-0.5">
                  {selectedApp.number}
                </h2>
                <div className="text-xs text-[#7A5230] mt-1">
                  Göndərilmə tarixi: {formatDateAz(selectedApp.submittedAt)} · EKTİS kodu: <b>{selectedApp.ektisReference || 'Simulyasiya'}</b>
                </div>
              </div>

              <span
                className={`px-4 py-2 rounded-xl text-xs font-black border self-start sm:self-auto ${getStatusBadgeClass(
                  selectedApp.status,
                  selectedApp.outcome
                )}`}
              >
                {getStatusText(selectedApp.status, selectedApp.outcome)}
              </span>
            </div>

            {/* Feedback message banner */}
            {actionFeedback && (
              <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{actionFeedback}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActionFeedback(null)}
                  className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* If status is ELAVE_MELUMAT: Highlighted Operator Box + Upload Action */}
            {selectedApp.status === 'ELAVE_MELUMAT' && (
              <div className="p-5 rounded-2xl bg-[#C8553D]/10 border-2 border-[#C8553D] space-y-3">
                <div className="flex items-center gap-2 text-[#C8553D] font-extrabold text-sm">
                  <AlertCircle className="w-5 h-5" />
                  <span>Nazirlik operatorunun tələbi:</span>
                </div>
                <p className="text-xs text-[#1F2A24] font-medium leading-relaxed bg-white p-3.5 rounded-xl border border-[#C8553D]/30">
                  &ldquo;{selectedApp.operatorComment || 'Əlavə sənəd tələb olunur.'}&rdquo;
                </p>
                <button
                  onClick={() => setExtraDocModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#C8553D] hover:bg-[#A9402B] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Əlavə sənəd göndər</span>
                </button>
              </div>
            )}

            {/* If status is TESDIQLENIB: "Mənim layihəm" pitch form trigger */}
            {selectedApp.status === 'QERAR_VERILIB' && selectedApp.outcome === 'TESDIQLENIB' && (
              <div className="p-5 rounded-2xl bg-[#2F6B3A]/10 border-2 border-[#2F6B3A] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-[#2F6B3A] font-extrabold text-sm mb-1">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Müraciətiniz dövlət tərəfindən təsdiqlənib!</span>
                  </div>
                  <p className="text-xs text-[#1F2A24]">
                    Torpaq ayrıldı. Layihənizi investor vitrinində nümayiş etdirərək investisiya cəlb edə bilərsiniz.
                  </p>
                </div>
                <button
                  onClick={() => onCreateProjectListing(selectedApp.id)}
                  className="px-5 py-3 rounded-xl bg-[#2F6B3A] hover:bg-[#26572F] text-white text-xs font-extrabold transition-colors cursor-pointer shadow-xs shrink-0 flex items-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Layihəmi investorlara təqdim et</span>
                </button>
              </div>
            )}

            {/* If status is active: Cancel application action button */}
            {selectedApp.status !== 'LEGV_EDILIB' && selectedApp.status !== 'QERAR_VERILIB' && selectedApp.status !== 'INVESTOR_SECILDI' && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#F4EBDD]/40 border border-[#EADBC8] text-xs">
                <div>
                  <span className="font-bold text-[#1F2A24] block">Müraciətin geri götürülməsi</span>
                  <span className="text-[#7A5230]">Müraciət baxılma mərhələsindədir. Zərurət olduqda müraciətinizi ləğv edə bilərsiniz.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCancelConfirmModalOpen(true)}
                  disabled={cancelling}
                  className="px-4 py-2 rounded-xl border border-[#C8553D] text-[#C8553D] font-bold text-xs hover:bg-[#C8553D]/10 transition-colors cursor-pointer shrink-0"
                >
                  {cancelling ? 'Ləğv edilir…' : 'Müraciəti ləğv et'}
                </button>
              </div>
            )}

            {/* Application Overview Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#F4EBDD]/50 border border-[#EADBC8]">
                <span className="text-[#7A5230] block">İnvestisiya:</span>
                <span className="font-bold text-[#1F2A24] text-sm">
                  {formatMoney(selectedApp.plannedInvestmentAzn)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#F4EBDD]/50 border border-[#EADBC8]">
                <span className="text-[#7A5230] block">Öz vəsaiti:</span>
                <span className="font-bold text-[#1F2A24] text-sm">
                  {formatMoney(selectedApp.ownFundsAzn)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#F4EBDD]/50 border border-[#EADBC8]">
                <span className="text-[#7A5230] block">İş yeri:</span>
                <span className="font-bold text-[#1F2A24] text-sm">
                  {selectedApp.expectedJobs} nəfər
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#F4EBDD]/50 border border-[#EADBC8]">
                <span className="text-[#7A5230] block">Seçilmiş bitki:</span>
                <span className="font-bold text-[#2F6B3A] text-sm">
                  {selectedApp.intendedCrop}
                </span>
              </div>
            </div>

            {/* Incoming investor offers */}
            {(selectedApp.status === 'QERAR_VERILIB' || selectedApp.status === 'INVESTOR_SECILDI' || api.getOffersForApplication(selectedApp.id).length > 0) && (
              <ApplicationOffers
                application={selectedApp}
                offers={api.getOffersForApplication(selectedApp.id)}
                onSelected={updated => {
                  onRefresh();
                  setSelectedApp({ ...updated });
                  setActionFeedback('İnvestor seçildi. Digər təkliflər rədd edildi və investorlara bildiriş göndərildi.');
                }}
              />
            )}

            {/* Land location */}
            {(() => {
              const parcel = parcels.find(p => p.id === selectedApp.parcelId);
              let loc = selectedApp.location || null;
              if (!loc && parcel) {
                // Older applications have no marked location: show the parcel itself
                let polygon: Array<[number, number]> | null = null;
                try {
                  const geo = JSON.parse(parcel.geometry);
                  polygon = (geo.coordinates?.[0] || []).map((c: [number, number]) => [c[1], c[0]] as [number, number]);
                } catch {
                  polygon = null;
                }
                loc = { lat: parcel.centroidLat, lon: parcel.centroidLon, polygon };
              }
              if (!loc) return null;
              return (
                <div className="space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-[#7A5230]">Torpağın yeri:</span>
                    <span className="font-mono text-[#1F2A24]">
                      {loc.lat.toFixed(5)}, {loc.lon.toFixed(5)}
                      {loc.polygonAreaHa ? ` · çəkilmiş sahə ${String(loc.polygonAreaHa).replace('.', ',')} ha` : ''}
                    </span>
                  </div>
                  <LocationMapView key={selectedApp.id} location={loc} />
                </div>
              );
            })()}

            {/* Execution period */}
            {selectedApp.durationMonths ? (
              <div className="p-3 rounded-xl bg-[#F4EBDD]/50 border border-[#EADBC8] text-xs flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="text-[#7A5230]">İcra müddəti: </span>
                  <b className="text-[#1F2A24]">{formatDurationMonths(selectedApp.durationMonths)}</b>
                </span>
                <span className="text-[#7A5230]">
                  Başlama: {formatDateAz(selectedApp.startDate)} · Bitmə: {formatEndMonth(selectedApp.startDate, selectedApp.durationMonths)}
                </span>
              </div>
            ) : null}

            {/* Plan Text */}
            <div className="space-y-1 text-xs">
              <span className="font-bold text-[#7A5230]">Biznes plan xülasəsi:</span>
              <p className="p-3.5 rounded-xl bg-[#F4EBDD]/30 border border-[#EADBC8] text-[#1F2A24] leading-relaxed">
                {selectedApp.planText}
              </p>
            </div>

            {/* Status Timeline */}
            <div className="space-y-3 pt-2">
              <h3 className="font-extrabold text-[#1F2A24] text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#2F6B3A]" />
                <span>İcra və status tarixçəsi</span>
              </h3>

              <div className="space-y-3 pl-2 border-l-2 border-[#2F6B3A]/30">
                {(selectedApp.statusHistory || []).map((sh, idx) => (
                  <div key={idx} className="relative pl-5 space-y-1">
                    <span className="absolute -left-[11px] top-1 w-3 h-3 rounded-full bg-[#2F6B3A] border-2 border-white" />
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-[#1F2A24]">
                        {getStatusText(sh.toStatus, selectedApp.outcome)}
                      </span>
                      <span className="text-[10px] text-[#7A5230]">
                        ({LABELS.roles[sh.changedByRole] || sh.changedByRole})
                      </span>
                      <span className="text-[10px] text-[#7A5230]">
                        · {formatDateAz(sh.at)}
                      </span>
                    </div>
                    {sh.comment && (
                      <p className="text-xs text-[#7A5230] bg-[#F4EBDD]/40 p-2 rounded-lg border border-[#EADBC8]">
                        {sh.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Extra Document Upload Modal */}
      {extraDocModalOpen && (
        <div className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-[#EADBC8] space-y-4 animate-in zoom-in-95">
            <h3 className="font-extrabold text-[#1F2A24] text-base">
              Əlavə sənəd və məlumat təqdim et
            </h3>
            <p className="text-xs text-[#7A5230]">
              Operatorun rəyinə uyğun olaraq düzəliş edilmiş sənədi yükləyin və qısa izahat yazın.
            </p>

            {extraDocError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-800 border border-red-200 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{extraDocError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#7A5230] block mb-1">
                  Fayl adı (PDF):
                </label>
                <input
                  type="text"
                  value={extraDocName}
                  onChange={e => setExtraDocName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#EADBC8] font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-[#7A5230] block mb-1">
                  Sahibkarın qeydi / izahatı:
                </label>
                <textarea
                  rows={3}
                  value={extraDocAnswer}
                  onChange={e => setExtraDocAnswer(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#EADBC8]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExtraDocModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#EADBC8] text-xs font-bold text-[#1F2A24] hover:bg-[#F4EBDD]/60 cursor-pointer"
              >
                {LABELS.cancel}
              </button>
              <button
                type="button"
                onClick={handleSendExtraDoc}
                disabled={submittingInfo}
                className="px-5 py-2 rounded-xl bg-[#2F6B3A] text-white text-xs font-bold hover:bg-[#26572F] cursor-pointer disabled:opacity-50"
              >
                {submittingInfo ? 'Yüklənir…' : 'Göndər'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancelConfirmModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-[#EADBC8] space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-[#EADBC8]">
              <h3 className="font-extrabold text-[#1F2A24] text-base">
                Müraciəti ləğv etmək istəyirsiniz?
              </h3>
              <button
                onClick={() => setCancelConfirmModalOpen(false)}
                className="p-1 rounded-lg text-[#7A5230] hover:bg-[#F4EBDD] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#7A5230] leading-relaxed">
              <b>{selectedApp.number}</b> nömrəli müraciəti ləğv etmək istədiyinizə əminsiniz? Bu əməliyyatdan sonra müraciət üzrə baxış dayandırılacaq və status &ldquo;Ləğv edilib&rdquo; olaraq qeyd olunacaq.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#EADBC8] text-xs font-bold text-[#1F2A24] hover:bg-[#F4EBDD]/60 cursor-pointer"
              >
                İmtina
              </button>
              <button
                type="button"
                onClick={handleCancelApp}
                disabled={cancelling}
                className="px-5 py-2 rounded-xl bg-[#C8553D] hover:bg-[#A9402B] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {cancelling ? 'Ləğv edilir…' : 'Bəli, müraciəti ləğv et'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
