import React, { useState, useEffect } from 'react';
import { Parcel, Competition, Crop, User, Application } from '../types';
import { LABELS, formatArea, formatMoney } from '../labels';
import { mockEktis } from '../mockEktis';
import { api } from '../api';
import { LocationPicker, validateCoordinates, parseCoord } from './LocationPicker';
import { DurationField, durationError } from './DurationField';
import {
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  ArrowRight,
  ArrowLeft,
  Briefcase,
  Building,
  HelpCircle
} from 'lucide-react';

interface ApplicationFormModalProps {
  parcel: Parcel;
  competition: Competition;
  crop: Crop;
  currentUser: User;
  onSuccess: (app: Application) => void;
  onClose: () => void;
  onNavigateMine: () => void;
  onNavigateHome: () => void;
}

export const ApplicationFormModal: React.FC<ApplicationFormModalProps> = ({
  parcel,
  competition,
  crop,
  currentUser,
  onSuccess,
  onClose,
  onNavigateMine,
  onNavigateHome
}) => {
  // 4 steps: 1 (Applicant) | 2 (Parcel & Activity) | 3 (Plan & Investment) | 4 (Documents & Submit)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // VÖEN verification state
  const [voenInput, setVoenInput] = useState(currentUser.voen || '1402345678');
  const [voenVerified, setVoenVerified] = useState<boolean | null>(null);
  const [voenLegalName, setVoenLegalName] = useState<string>('');
  const [voenLoading, setVoenLoading] = useState(false);

  // Form Fields
  const [selectedCropKey, setSelectedCropKey] = useState(crop.key);
  const [plannedInvestment, setPlannedInvestment] = useState<number>(350000);
  const [ownFunds, setOwnFunds] = useState<number>(120000);
  const [expectedJobs, setExpectedJobs] = useState<number>(15);
  const [planText, setPlanText] = useState<string>(
    `${parcel.village} ərazisində ${parcel.areaHa} ha sahədə intensiv ${crop.name} təsərrüfatının yaradılması, müasir damla suvarma şəbəkəsinin qurulması və məhsulun ilkin emalı planlaşdırılır.`
  );
  const [startDate, setStartDate] = useState<string>('2026-11-15');
  const [durationMonths, setDurationMonths] = useState<number | ''>(60);

  // Document files uploaded state
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, { name: string; size: number } | null>>({
    SEXSIYYET: { name: 'qeydiyyat_sehadetnamesi.pdf', size: 1024 * 420 },
    BIZNES_PLAN: { name: 'biznes_plan_2026.pdf', size: 1024 * 1200 },
    MALI_SENED: { name: 'bank_arayisi.pdf', size: 1024 * 350 },
    DIGER: null
  });

  // Land location on the map
  const [location, setLocation] = useState<{ latText: string; lonText: string; polygon: Array<[number, number]> | null; polygonAreaHa: number | null }>({
    latText: '',
    lonText: '',
    polygon: null,
    polygonAreaHa: null
  });
  const locationCheck = validateCoordinates(location.latText, location.lonText);
  const locationPayload = locationCheck.error
    ? null
    : {
        lat: parseCoord(location.latText),
        lon: parseCoord(location.lonText),
        polygon: location.polygon,
        polygonAreaHa: location.polygonAreaHa
      };

  // Dialog and submit state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedApp, setSubmittedApp] = useState<Application | null>(null);

  // Live VÖEN check on mount or when changed
  useEffect(() => {
    let active = true;
    const verify = async () => {
      if (!voenInput || voenInput.length !== 10) {
        setVoenVerified(null);
        return;
      }
      setVoenLoading(true);
      const res = await mockEktis.verifyEntrepreneur(voenInput);
      if (active) {
        setVoenLoading(false);
        setVoenVerified(res.valid);
        setVoenLegalName(res.legalName || '');
      }
    };
    verify();
    return () => {
      active = false;
    };
  }, [voenInput]);

  // Validation checks for Step 2
  const isOrchardOrVineyard = selectedCropKey === 'UZUM' || selectedCropKey === 'NAR' || selectedCropKey === 'QOZ';
  const minHaError = isOrchardOrVineyard && parcel.areaHa < competition.minProjectHa
    ? `Bu istiqamət üçün minimum sahə ${competition.minProjectHa} ha-dır`
    : null;

  // File upload handler
  const handleFileUpload = (kind: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type and size (<= 10MB)
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      alert('Yalnız PDF, JPG və ya PNG fayl, ən çox 10 MB.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Yalnız PDF, JPG və ya PNG fayl, ən çox 10 MB.');
      return;
    }

    setUploadedDocs(prev => ({
      ...prev,
      [kind]: { name: file.name, size: file.size }
    }));
  };

  const handleNext = () => {
    setErrorMsg(null);
    if (step === 1) {
      if (voenVerified === false) {
        setErrorMsg('Davam etmək üçün VÖEN EKTİS tərəfindən təsdiqlənməlidir.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (locationCheck.error) {
        setErrorMsg(locationCheck.error);
        return;
      }
      if (minHaError) {
        setErrorMsg(minHaError);
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (plannedInvestment <= 0) {
        setErrorMsg('Planlaşdırılan investisiya məbləğini qeyd edin.');
        return;
      }
      const durErr = durationError(durationMonths);
      if (durErr) {
        setErrorMsg(durErr);
        return;
      }
      if (planText.length > 1500) {
        setErrorMsg('Biznes plan mətni 1500 simvoldan çox ola bilməz.');
        return;
      }
      setStep(4);
    }
  };

  const handleFinalSubmit = async () => {
    // Check required documents
    if (!uploadedDocs.SEXSIYYET || !uploadedDocs.BIZNES_PLAN || !uploadedDocs.MALI_SENED) {
      setErrorMsg('Məcburi sənədlər (Şəxsiyyət/Qeydiyyat, Biznes plan və Maliyyə sənədi) yüklənməlidir.');
      setConfirmDialogOpen(false);
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const docs = Object.entries(uploadedDocs)
        .filter(([_, file]) => file !== null)
        .map(([kind, file]) => ({
          kind: kind as any,
          fileName: file!.name,
          mimeType: 'application/pdf',
          sizeBytes: file!.size
        }));

      const newApp = await api.createApplication({
        competitionId: competition.id,
        parcelId: parcel.id,
        intendedCrop: selectedCropKey,
        plannedInvestmentAzn: plannedInvestment,
        ownFundsAzn: ownFunds,
        expectedJobs: expectedJobs,
        planText,
        startDate,
        durationMonths: durationMonths === '' ? null : durationMonths,
        isDraft: false,
        documents: docs,
        location: locationPayload
      });

      setSubmittedApp(newApp);
      setConfirmDialogOpen(false);
      onSuccess(newApp);
    } catch (e: any) {
      setErrorMsg(e.message || LABELS.errorGeneral);
      setConfirmDialogOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    setSubmitting(true);
    try {
      const docs = Object.entries(uploadedDocs)
        .filter(([_, d]) => Boolean(d))
        .map(([kind, d]) => ({
          kind: kind as any,
          fileName: d!.name,
          mimeType: 'application/pdf',
          sizeBytes: d!.size
        }));

      const newApp = await api.createApplication({
        competitionId: competition.id,
        parcelId: parcel.id,
        intendedCrop: selectedCropKey,
        plannedInvestmentAzn: plannedInvestment,
        ownFundsAzn: ownFunds,
        expectedJobs: expectedJobs,
        planText,
        startDate,
        durationMonths: durationMonths === '' ? null : durationMonths,
        isDraft: true,
        documents: docs,
        location: locationPayload
      });

      onSuccess(newApp);
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message || LABELS.errorGeneral);
    } finally {
      setSubmitting(false);
    }
  };

  // If application was submitted, show Success Screen
  if (submittedApp) {
    return (
      <div className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl border border-[#EADBC8] text-center space-y-6 animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-[#2F6B3A]/10 text-[#2F6B3A] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-[#7A5230] uppercase">
              Müraciət qeydiyyata alındı
            </span>
            <h2 className="text-3xl font-black text-[#2F6B3A] tracking-tight">
              {submittedApp.number}
            </h2>
            <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#2E6DB4]/10 text-[#2E6DB4]">
              {LABELS.applicationStatus.QEBUL_EDILIB}
            </div>
          </div>

          <p className="text-sm text-[#1F2A24] bg-[#F4EBDD]/60 p-4 rounded-2xl border border-[#EADBC8]">
            Müraciətiniz qəbul edildi və EKTİS-ə ötürüldü (simulyasiya). Reyestr nömrəsi: <b>{submittedApp.ektisReference || 'EKTIS-A-2026-000123'}</b>
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={onNavigateMine}
              className="w-full py-3.5 px-4 rounded-xl bg-[#2F6B3A] hover:bg-[#26572F] text-white font-bold text-sm shadow-xs cursor-pointer transition-colors"
            >
              Müraciətlərim
            </button>
            <button
              onClick={onNavigateHome}
              className="w-full py-3.5 px-4 rounded-xl border border-[#EADBC8] text-[#1F2A24] font-bold text-sm hover:bg-[#F4EBDD] cursor-pointer transition-colors"
            >
              Əsas səhifə
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#EADBC8] flex flex-col justify-between overflow-y-auto animate-in fade-in">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#EADBC8]">
            <div>
              <span className="text-xs font-bold text-[#7A5230] uppercase">
                İnvestisiya Müsabiqəsi Müraciəti · {competition.number}
              </span>
              <h2 className="text-xl font-bold text-[#1F2A24]">
                {parcel.name} ({formatArea(parcel.areaHa)})
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#7A5230] hover:bg-[#F4EBDD] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar (4 steps) */}
          <div className="py-4">
            <div className="flex items-center justify-between text-xs font-bold text-[#7A5230] mb-2">
              <span className={step >= 1 ? 'text-[#2F6B3A]' : ''}>1. Ərizəçi</span>
              <span className={step >= 2 ? 'text-[#2F6B3A]' : ''}>2. Sahə və fəaliyyət</span>
              <span className={step >= 3 ? 'text-[#2F6B3A]' : ''}>3. İnvestisiya</span>
              <span className={step >= 4 ? 'text-[#2F6B3A]' : ''}>4. Sənədlər</span>
            </div>
            <div className="w-full bg-[#EADBC8] h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#2F6B3A] transition-all duration-300"
                style={{ width: `${(step / 4) * 100}%` }}
              />
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Ərizəçi */}
          {step === 1 && (
            <div className="space-y-4 pt-2">
              <h3 className="font-extrabold text-[#1F2A24] text-base">
                Ərizəçi və hüquqi məlumatlar
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-[#7A5230] block mb-1">
                    Ad, Soyad:
                  </label>
                  <input
                    type="text"
                    disabled
                    value={currentUser.fullName}
                    className="w-full p-3 rounded-xl border border-[#EADBC8] bg-[#F4EBDD]/40 font-bold text-[#1F2A24]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#7A5230] block mb-1">
                    FİN nömrəsi:
                  </label>
                  <input
                    type="text"
                    disabled
                    value={currentUser.fin}
                    className="w-full p-3 rounded-xl border border-[#EADBC8] bg-[#F4EBDD]/40 font-bold text-[#1F2A24]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#7A5230] block mb-1">
                    Əlaqə telefonu:
                  </label>
                  <input
                    type="text"
                    disabled
                    value={currentUser.phone}
                    className="w-full p-3 rounded-xl border border-[#EADBC8] bg-[#F4EBDD]/40 font-bold text-[#1F2A24]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#7A5230] block mb-1">
                    VÖEN (10 rəqəm):
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={voenInput}
                    onChange={e => setVoenInput(e.target.value)}
                    className="w-full p-3 rounded-xl border border-[#EADBC8] bg-white font-bold text-[#1F2A24]"
                  />
                </div>
              </div>

              {/* Live Mock EKTİS VÖEN check status */}
              <div className="p-3.5 rounded-2xl bg-[#F4EBDD]/50 border border-[#EADBC8] text-xs">
                {voenLoading && (
                  <span className="text-[#7A5230] animate-pulse">
                    VÖEN EKTİS reyestri ilə yoxlanılır… ({LABELS.badges.SIMULYASIYA})
                  </span>
                )}
                {!voenLoading && voenVerified === true && (
                  <div className="flex items-center gap-2 text-[#2F6B3A] font-bold">
                    <CheckCircle2 className="w-4 h-4 text-[#2F6B3A]" />
                    <span>VÖEN təsdiqləndi: {voenLegalName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#2F6B3A]/10">
                      {LABELS.badges.SIMULYASIYA}
                    </span>
                  </div>
                )}
                {!voenLoading && voenVerified === false && (
                  <div className="flex items-center gap-2 text-[#C8553D] font-bold">
                    <AlertCircle className="w-4 h-4 text-[#C8553D]" />
                    <span>VÖEN EKTİS-də tapılmadı</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Sahə və fəaliyyət */}
          {step === 2 && (
            <div className="space-y-4 pt-2">
              <h3 className="font-extrabold text-[#1F2A24] text-base">
                Sahə və nəzərdə tutulan əkin fəaliyyəti
              </h3>

              <div className="p-4 rounded-2xl bg-[#F4EBDD]/50 border border-[#EADBC8] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#7A5230]">Seçilmiş torpaq:</span>
                  <span className="font-bold text-[#1F2A24]">{parcel.name} ({parcel.code})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7A5230]">Ümumi sahə:</span>
                  <span className="font-bold text-[#1F2A24]">{formatArea(parcel.areaHa)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7A5230]">Müsabiqə nömrəsi:</span>
                  <span className="font-bold text-[#2F6B3A]">{competition.number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7A5230]">Minimum sahə tələbi:</span>
                  <span className="font-bold text-[#1F2A24]">{competition.minProjectHa} ha</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#7A5230] text-xs block mb-1">
                  Nəzərdə tutulan kənd təsərrüfatı bitkisi:
                </label>
                <select
                  value={selectedCropKey}
                  onChange={e => setSelectedCropKey(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#EADBC8] bg-white font-bold text-sm text-[#1F2A24]"
                >
                  <option value="UZUM">Üzüm</option>
                  <option value="NAR">Nar</option>
                  <option value="QOZ">Fındıq / Qoz</option>
                  <option value="BUGDA">Buğda</option>
                  <option value="ARPA">Arpa</option>
                  <option value="PAMBIQ">Pambıq</option>
                  <option value="KARTOF">Kartof (dağlıq)</option>
                  <option value="YEM_OTU">Yem otları</option>
                </select>
              </div>

              {minHaError && (
                <div className="p-3 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                  {minHaError}
                </div>
              )}

              <div className="text-xs">
                <LocationPicker
                  latText={location.latText}
                  lonText={location.lonText}
                  polygon={location.polygon}
                  polygonAreaHa={location.polygonAreaHa}
                  onChange={next => {
                    setLocation(next);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  fallbackCenter={[parcel.centroidLat, parcel.centroidLon]}
                />
              </div>
            </div>
          )}

          {/* STEP 3: İnvestisiya və biznes plan */}
          {step === 3 && (
            <div className="space-y-4 pt-2">
              <h3 className="font-extrabold text-[#1F2A24] text-base">
                İnvestisiya həcmi və biznes plan xülasəsi
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-[#7A5230] block mb-1">
                    Planlaşdırılan investisiya (₼):
                  </label>
                  <input
                    type="number"
                    value={plannedInvestment}
                    onChange={e => setPlannedInvestment(Number(e.target.value))}
                    className="w-full p-3 rounded-xl border border-[#EADBC8] bg-white font-bold text-sm text-[#1F2A24]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#7A5230] block mb-1">
                    Öz vəsaiti (₼):
                  </label>
                  <input
                    type="number"
                    value={ownFunds}
                    onChange={e => setOwnFunds(Number(e.target.value))}
                    className="w-full p-3 rounded-xl border border-[#EADBC8] bg-white font-bold text-sm text-[#1F2A24]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#7A5230] block mb-1">
                    Gözlənilən yeni iş yeri (nəfər):
                  </label>
                  <input
                    type="number"
                    value={expectedJobs}
                    onChange={e => setExpectedJobs(Number(e.target.value))}
                    className="w-full p-3 rounded-xl border border-[#EADBC8] bg-white font-bold text-sm text-[#1F2A24]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#7A5230] block mb-1">
                    İşlərin başlama tarixi:
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full p-3 rounded-xl border border-[#EADBC8] bg-white font-bold text-sm text-[#1F2A24]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <DurationField
                    months={durationMonths}
                    onChange={setDurationMonths}
                    startDate={startDate}
                    inputClassName="w-full p-3 rounded-xl border border-[#EADBC8] bg-white font-bold text-sm text-[#1F2A24]"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <label className="font-bold text-[#7A5230]">
                    Biznes planın qısa xülasəsi:
                  </label>
                  <span className="text-[#7A5230]">
                    {planText.length} / 1500 simvol
                  </span>
                </div>
                <textarea
                  rows={4}
                  maxLength={1500}
                  value={planText}
                  onChange={e => setPlanText(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#EADBC8] bg-white text-xs text-[#1F2A24] focus:outline-none focus:border-[#2F6B3A]"
                />
              </div>
            </div>
          )}

          {/* STEP 4: Sənədlər */}
          {step === 4 && (
            <div className="space-y-4 pt-2">
              <h3 className="font-extrabold text-[#1F2A24] text-base">
                Tələb olunan sənədlərin yüklənməsi
              </h3>
              <p className="text-xs text-[#7A5230]">
                Yalnız PDF, JPG və ya PNG fayl, hər biri ən çox 10 MB həcmində olmalıdır.
              </p>

              <div className="space-y-3">
                {/* 1. Şəxsiyyət vəsiqəsi */}
                <div className="p-3.5 rounded-2xl bg-[#F4EBDD]/40 border border-[#EADBC8] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-[#2F6B3A]" />
                    <div>
                      <span className="font-bold text-xs text-[#1F2A24] block">
                        Şəxsiyyət vəsiqəsi / qeydiyyat sənədi *
                      </span>
                      <span className="text-[11px] text-[#7A5230]">
                        {uploadedDocs.SEXSIYYET ? uploadedDocs.SEXSIYYET.name : 'Sənəd seçilməyib'}
                      </span>
                    </div>
                  </div>
                  <label className="px-3 py-1.5 rounded-xl border border-[#EADBC8] text-xs font-bold text-[#1F2A24] hover:bg-white cursor-pointer transition-colors">
                    <span>{uploadedDocs.SEXSIYYET ? 'Dəyiş' : 'Yüklə'}</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={e => handleFileUpload('SEXSIYYET', e)}
                    />
                  </label>
                </div>

                {/* 2. Biznes plan */}
                <div className="p-3.5 rounded-2xl bg-[#F4EBDD]/40 border border-[#EADBC8] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-[#2F6B3A]" />
                    <div>
                      <span className="font-bold text-xs text-[#1F2A24] block">
                        Biznes plan *
                      </span>
                      <span className="text-[11px] text-[#7A5230]">
                        {uploadedDocs.BIZNES_PLAN ? uploadedDocs.BIZNES_PLAN.name : 'Sənəd seçilməyib'}
                      </span>
                    </div>
                  </div>
                  <label className="px-3 py-1.5 rounded-xl border border-[#EADBC8] text-xs font-bold text-[#1F2A24] hover:bg-white cursor-pointer transition-colors">
                    <span>{uploadedDocs.BIZNES_PLAN ? 'Dəyiş' : 'Yüklə'}</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={e => handleFileUpload('BIZNES_PLAN', e)}
                    />
                  </label>
                </div>

                {/* 3. Maliyyə sənədi */}
                <div className="p-3.5 rounded-2xl bg-[#F4EBDD]/40 border border-[#EADBC8] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-[#2F6B3A]" />
                    <div>
                      <span className="font-bold text-xs text-[#1F2A24] block">
                        Maliyyə sənədi (Bank çıxarışı / zəmanət) *
                      </span>
                      <span className="text-[11px] text-[#7A5230]">
                        {uploadedDocs.MALI_SENED ? uploadedDocs.MALI_SENED.name : 'Sənəd seçilməyib'}
                      </span>
                    </div>
                  </div>
                  <label className="px-3 py-1.5 rounded-xl border border-[#EADBC8] text-xs font-bold text-[#1F2A24] hover:bg-white cursor-pointer transition-colors">
                    <span>{uploadedDocs.MALI_SENED ? 'Dəyiş' : 'Yüklə'}</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={e => handleFileUpload('MALI_SENED', e)}
                    />
                  </label>
                </div>

                {/* 4. Digər */}
                <div className="p-3.5 rounded-2xl bg-[#F4EBDD]/40 border border-[#EADBC8] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-[#7A5230]" />
                    <div>
                      <span className="font-bold text-xs text-[#1F2A24] block">
                        Digər əlavə sənədlər (Könüllü)
                      </span>
                      <span className="text-[11px] text-[#7A5230]">
                        {uploadedDocs.DIGER ? uploadedDocs.DIGER.name : 'Sənəd seçilməyib'}
                      </span>
                    </div>
                  </div>
                  <label className="px-3 py-1.5 rounded-xl border border-[#EADBC8] text-xs font-bold text-[#1F2A24] hover:bg-white cursor-pointer transition-colors">
                    <span>{uploadedDocs.DIGER ? 'Dəyiş' : 'Yüklə'}</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={e => handleFileUpload('DIGER', e)}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="pt-6 border-t border-[#EADBC8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step > 1 ? (
              <button
                onClick={() => setStep((step - 1) as any)}
                className="px-5 py-2.5 rounded-xl border border-[#EADBC8] text-xs font-bold text-[#1F2A24] hover:bg-[#F4EBDD] cursor-pointer"
              >
                {LABELS.back}
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-[#EADBC8] text-xs font-bold text-[#7A5230] hover:text-[#1F2A24] cursor-pointer"
              >
                {LABELS.cancel}
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-[#2F6B3A]/40 text-[#2F6B3A] hover:bg-[#2F6B3A]/10 text-xs font-bold cursor-pointer transition-colors"
            >
              Qaralama kimi yadda saxla
            </button>
          </div>

          {step < 4 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-[#2F6B3A] hover:bg-[#26572F] text-white text-xs font-bold cursor-pointer"
            >
              {LABELS.next}
            </button>
          ) : (
            <button
              onClick={() => setConfirmDialogOpen(true)}
              disabled={submitting}
              className="px-8 py-3 rounded-xl bg-[#2F6B3A] hover:bg-[#26572F] text-white text-xs font-extrabold cursor-pointer shadow-md"
            >
              {LABELS.submitApplication}
            </button>
          )}
        </div>
      </div>

      {/* Confirm Submission Dialog */}
      {confirmDialogOpen && (
        <div className="fixed inset-0 z-60 modal-backdrop flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full rounded-3xl p-6 shadow-2xl border border-[#EADBC8] space-y-4 animate-in zoom-in-95">
            <h4 className="font-extrabold text-[#1F2A24] text-base">
              Müraciəti göndərmək istəyirsiniz?
            </h4>
            <p className="text-xs text-[#7A5230] leading-relaxed">
              Müraciət göndərildikdən sonra nazirlik operatorunun baxışına təqdim ediləcək və unikal QM qeydiyyat nömrəsi veriləcəkdir.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmDialogOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#EADBC8] text-xs font-bold text-[#1F2A24] hover:bg-[#F4EBDD] cursor-pointer"
              >
                Xeyr
              </button>
              <button
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-[#2F6B3A] text-white text-xs font-bold hover:bg-[#26572F] cursor-pointer shadow-xs"
              >
                {submitting ? 'Göndərilir…' : 'Bəli'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
