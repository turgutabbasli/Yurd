import React, { useState, useEffect } from 'react';
import { FilterSelect } from './FilterSelect';
import {
  Parcel,
  Competition,
  Application,
  Region,
  User,
  EktisLogEntry,
  AuditLogEntry
} from '../types';
import {
  LABELS,
  formatArea,
  formatMoney,
  formatDateAz,
  formatCountdown
} from '../labels';
import { api, db } from '../api';
import { mockEktis } from '../mockEktis';
import {
  Layers,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Building,
  RotateCcw,
  Plus,
  RefreshCw,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileText,
  BarChart3,
  Activity,
  History,
  X
} from 'lucide-react';

interface MinistryViewProps {
  currentUser: User;
  parcels: Parcel[];
  competitions: Competition[];
  applications: Application[];
  regions: Region[];
  onRefresh: () => void;
}

export const MinistryView: React.FC<MinistryViewProps> = ({
  currentUser,
  parcels,
  competitions,
  applications,
  regions,
  onRefresh
}) => {
  const isOperator = currentUser.role === 'OPERATOR';
  const isApprover = currentUser.role === 'TESDIQLEYICI';

  // Active tab
  const [activeTab, setActiveTab] = useState<'saheler' | 'musabiqeler' | 'muracietler' | 'qerarTesdiqi' | 'statistika' | 'ektis' | 'audit'>('saheler');

  // EKTIS logs with 2-second auto-refresh (as specified in Section 6.4)
  const [ektisLogs, setEktisLogs] = useState<EktisLogEntry[]>(mockEktis.getLogs());
  const [selectedLogJson, setSelectedLogJson] = useState<EktisLogEntry | null>(null);

  // Statistics
  const stats = api.getStatistics();
  const auditLogs = api.getAuditLogs();

  // Poll EKTIS logs every 2s
  useEffect(() => {
    const timer = setInterval(() => {
      setEktisLogs(mockEktis.getLogs());
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // Filter states
  const [appStatusFilter, setAppStatusFilter] = useState('');
  const [appCompFilter, setAppCompFilter] = useState('');

  // Modals
  const [newParcelModalOpen, setNewParcelModalOpen] = useState(false);
  const [newCompModalOpen, setNewCompModalOpen] = useState(false);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [selectedAppForDecision, setSelectedAppForDecision] = useState<Application | null>(null);
  const [decisionOutcome, setDecisionOutcome] = useState<'TESDIQLENIB' | 'REDD_EDILIB'>('TESDIQLENIB');
  const [decisionComment, setDecisionComment] = useState('');

  const [returnCompModalOpen, setReturnCompModalOpen] = useState(false);
  const [selectedCompForReturn, setSelectedCompForReturn] = useState<Competition | null>(null);
  const [returnCompComment, setReturnCompComment] = useState('');

  // Info request modal
  const [infoReqModalOpen, setInfoReqModalOpen] = useState(false);
  const [selectedAppForInfo, setSelectedAppForInfo] = useState<Application | null>(null);
  const [infoReqComment, setInfoReqComment] = useState('');

  // New Parcel Form State
  const [newParcelCode, setNewParcelCode] = useState('FZL-035');
  const [newParcelName, setNewParcelName] = useState('Dədəli Yeni Bağçılıq Sahəsi');
  const [newParcelRegion, setNewParcelRegion] = useState('fuzuli');
  const [newParcelVillage, setNewParcelVillage] = useState('Dədəli');
  const [newParcelHa, setNewParcelHa] = useState(35);
  const [newParcelPrice, setNewParcelPrice] = useState(60);

  // New Competition Form State
  const [newCompNum, setNewCompNum] = useState('V-2026');
  const [newCompName, setNewCompName] = useState('Şərqi Zəngəzur İntensiv Bağçılıq Müsabiqəsi');
  const [selectedParcelIdsForComp, setSelectedParcelIdsForComp] = useState<string[]>([]);
  const [newCompMinHa, setNewCompMinHa] = useState(20);
  const [newCompConditions, setNewCompConditions] = useState('5 il ilkin icarə + 44 ilədək uzadılma. Seçim qaydası nazirlik tərəfindən müəyyən edilir.');

  // Pending proposals for Təsdiqləyici
  const pendingProposals = applications.filter(a => a.status === 'BAXILIR' && a.proposedOutcome);

  // Free parcels for competition creation
  const freeBagliParcels = parcels.filter(p => p.status === 'BAGLI');

  // Success feedback after actions
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const notifySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Handlers
  const handleCreateParcel = async () => {
    try {
      await api.createParcel({
        code: newParcelCode,
        name: newParcelName,
        regionId: newParcelRegion,
        village: newParcelVillage,
        areaHa: newParcelHa,
        pricePerHaYearAzn: newParcelPrice,
        centroidLat: 39.55,
        centroidLon: 47.15,
        geometry: '{"type":"Polygon","coordinates":[[[47.14,39.54],[47.16,39.54],[47.16,39.56],[47.14,39.56],[47.14,39.54]]]}',
        allowedUses: ['MEYVE_BAGI', 'UZUMLUK', 'TAXIL'],
        deminingStatus: 'TEMIZLENIB',
        status: 'BAGLI',
        competitionId: null,
        data: {
          soil: { ph: 6.8, socGperKg: 16.0, nGperKg: 1.4, clayPct: 25, sandPct: 38, siltPct: 37, cecCmolPerKg: 24, salinityEc: 0.6, source: 'Laboratoriya təhlili', badge: 'Nümunə məlumat' },
          climate: { growSeasonMeanTempC: 22.0, annualPrecipMm: 450, solarMjM2Day: 17.5, soilMoistureIndex: 0.44, source: 'NASA POWER', badge: 'Həqiqi' },
          relief: { elevationM: 290, slopeDeg: 2.8, source: 'DEM modeli', badge: 'Nümunə məlumat' },
          distances: { nearestRoadKm: 1.0, nearestWaterKm: 1.5, nearestWaterName: 'Köndələnçay', source: 'Xəritə ölçmələri', badge: 'Nümunə məlumat' },
          ndvi: [{ year: 2025, value: 0.38 }]
        }
      });
      setNewParcelModalOpen(false);
      onRefresh();
      notifySuccess('Yeni sahə uğurla qeydə alındı.');
    } catch (e: any) {
      alert(e.message || LABELS.errorGeneral);
    }
  };

  const handleCreateCompetition = async () => {
    if (selectedParcelIdsForComp.length === 0) {
      alert('Müsabiqəyə ən azı bir sərbəst sahə əlavə edin.');
      return;
    }
    try {
      await api.createCompetition({
        number: newCompNum,
        name: newCompName,
        directions: ['MEYVE_BAGI', 'UZUMLUK'],
        announceDate: new Date().toISOString(),
        applyStart: '2026-11-01T00:00:00Z',
        applyDeadline: '2026-12-15T23:59:59Z',
        leaseInitialYears: 5,
        leaseExtensionYears: 44,
        minProjectHa: newCompMinHa,
        participationFeeAzn: 50,
        conditionsText: newCompConditions,
        parcelIds: selectedParcelIdsForComp
      });
      setNewCompModalOpen(false);
      setSelectedParcelIdsForComp([]);
      onRefresh();
      notifySuccess('Müsabiqə layihəsi yaradıldı.');
    } catch (e: any) {
      alert(e.message || LABELS.errorGeneral);
    }
  };

  const handleSubmitCompForApproval = async (compId: string) => {
    try {
      await api.submitCompetition(compId);
      onRefresh();
      notifySuccess('Müsabiqə təsdiqə göndərildi.');
    } catch (e: any) {
      alert(e.message || LABELS.errorGeneral);
    }
  };

  const handleApproveCompetition = async (compId: string) => {
    if (!window.confirm('Müsabiqəni təsdiqləyib dərc etmək istəyirsiniz? Torpaqlar müraciətə açılacaq və EKTİS-ə məlumat ötürüləcək.')) return;
    try {
      await api.approveCompetition(compId);
      onRefresh();
      notifySuccess('Müsabiqə təsdiqləndi və dərc edildi.');
    } catch (e: any) {
      alert(e.message || LABELS.errorGeneral);
    }
  };

  const handleReturnCompetition = async () => {
    if (!selectedCompForReturn || !returnCompComment.trim()) {
      alert('Qaytarma səbəbini qeyd edin.');
      return;
    }
    try {
      await api.returnCompetition(selectedCompForReturn.id, returnCompComment);
      setReturnCompModalOpen(false);
      setSelectedCompForReturn(null);
      setReturnCompComment('');
      onRefresh();
      notifySuccess('Müsabiqə şərhlə operatora qaytarıldı.');
    } catch (e: any) {
      alert(e.message || LABELS.errorGeneral);
    }
  };

  const handleCloseCompetition = async (compId: string) => {
    if (!window.confirm('Bu müsabiqə üzrə müraciət qəbulunu bağlamaq istəyirsiniz?')) return;
    try {
      await api.closeCompetition(compId);
      onRefresh();
      notifySuccess('Müsabiqə üzrə müraciət qəbulu bağlandı.');
    } catch (e: any) {
      alert(e.message || LABELS.errorGeneral);
    }
  };

  const handleMoveToReview = async (appId: string) => {
    try {
      await api.updateApplicationStatus(appId, 'BAXILIR');
      onRefresh();
      notifySuccess('Müraciət baxışa götürüldü.');
    } catch (e: any) {
      alert(e.message || LABELS.errorGeneral);
    }
  };

  const handleRequestInfoSubmit = async () => {
    if (!selectedAppForInfo || !infoReqComment.trim()) {
      alert('Əlavə məlumat tələbi üçün şərh yazın.');
      return;
    }
    try {
      await api.updateApplicationStatus(selectedAppForInfo.id, 'ELAVE_MELUMAT', infoReqComment);
      setInfoReqModalOpen(false);
      setSelectedAppForInfo(null);
      setInfoReqComment('');
      onRefresh();
      notifySuccess('Əlavə məlumat tələbi sahibkara göndərildi.');
    } catch (e: any) {
      alert(e.message || LABELS.errorGeneral);
    }
  };

  const handleProposeDecisionSubmit = async () => {
    if (!selectedAppForDecision || !decisionComment.trim()) {
      alert('Qərar təklifi üçün şərh yazılmalıdır.');
      return;
    }
    try {
      await api.proposeDecision(selectedAppForDecision.id, decisionOutcome, decisionComment);
      setDecisionModalOpen(false);
      setSelectedAppForDecision(null);
      setDecisionComment('');
      onRefresh();
      notifySuccess('Qərar təklifi təsdiqləyiciyə göndərildi.');
    } catch (e: any) {
      alert(e.message || LABELS.errorGeneral);
    }
  };

  const handleConfirmDecision = async (appId: string) => {
    if (!window.confirm('Dörd göz prinsipi ilə bu qərarı yekun təsdiqləmək istəyirsiniz? Bu addım geri qaytarıla bilməz.')) return;
    try {
      await api.confirmDecision(appId);
      onRefresh();
      notifySuccess('Yekun qərar təsdiqləndi.');
    } catch (e: any) {
      alert(e.message || LABELS.errorGeneral);
    }
  };

  const handleReturnProposal = async (appId: string) => {
    const comment = window.prompt('Qərar təklifinin qaytarılma səbəbini yazın:');
    if (!comment) return;
    try {
      await api.returnProposal(appId, comment);
      onRefresh();
      notifySuccess('Qərar təklifi operatora qaytarıldı.');
    } catch (e: any) {
      alert(e.message || LABELS.errorGeneral);
    }
  };

  const handleResetDemo = () => {
    if (window.confirm('Bütün sınaq məlumatları ilkin vəziyyətinə sıfırlansın? Bu əməliyyat brauzer keşini təmizləyəcək.')) {
      api.resetToDefault ? api.resetToDefault() : db.resetToDefault();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {successMsg && (
        <div className="fixed top-20 right-4 z-50 bg-[#2F6B3A] text-white px-5 py-3 rounded-2xl shadow-xl border border-white/20 flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Top Ministry Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-[#2F6B3A] via-[#24542E] to-[#1F2A24] text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 border border-[#2F6B3A]/40">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-bold text-emerald-200">
            <Building className="w-4 h-4" />
            <span>Kənd Təsərrüfatı Nazirliyi Portalı</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">
            Müsabiqə və Torpaq İdarəetmə Paneli
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90">
            Cari istifadəçi: <b>{currentUser.fullName}</b> ({LABELS.roles[currentUser.role]})
          </p>
        </div>

        {/* Reset Demo Button */}
        {isOperator && (
          <button
            onClick={handleResetDemo}
            className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-colors cursor-pointer border border-white/20 flex items-center gap-1.5 self-start md:self-auto"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Sınaq məlumatını sıfırla</span>
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl p-1.5 shadow-xs border border-[#EADBC8] flex flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('saheler')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'saheler' ? 'bg-[#2F6B3A] text-white shadow-xs' : 'text-[#7A5230] hover:text-[#1F2A24]'
          }`}
        >
          Sahələr ({parcels.length})
        </button>

        <button
          onClick={() => setActiveTab('musabiqeler')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'musabiqeler' ? 'bg-[#2F6B3A] text-white shadow-xs' : 'text-[#7A5230] hover:text-[#1F2A24]'
          }`}
        >
          Müsabiqələr ({competitions.length})
        </button>

        <button
          onClick={() => setActiveTab('muracietler')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'muracietler' ? 'bg-[#2F6B3A] text-white shadow-xs' : 'text-[#7A5230] hover:text-[#1F2A24]'
          }`}
        >
          Müraciətlər ({applications.filter(a => !a.isDraft).length})
        </button>

        {isApprover && (
          <button
            onClick={() => setActiveTab('qerarTesdiqi')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
              activeTab === 'qerarTesdiqi' ? 'bg-[#2E6DB4] text-white shadow-xs' : 'text-[#2E6DB4] hover:bg-[#2E6DB4]/10'
            }`}
          >
            <span>Qərar təsdiqi</span>
            {pendingProposals.length > 0 && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full bg-[#C8553D] text-white text-[10px] font-black">
                {pendingProposals.length}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setActiveTab('statistika')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'statistika' ? 'bg-[#2F6B3A] text-white shadow-xs' : 'text-[#7A5230] hover:text-[#1F2A24]'
          }`}
        >
          Statistika
        </button>

        <button
          onClick={() => setActiveTab('ektis')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'ektis' ? 'bg-[#2F6B3A] text-white shadow-xs' : 'text-[#7A5230] hover:text-[#1F2A24]'
          }`}
        >
          EKTİS jurnalı ({ektisLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'audit' ? 'bg-[#2F6B3A] text-white shadow-xs' : 'text-[#7A5230] hover:text-[#1F2A24]'
          }`}
        >
          Audit jurnalı
        </button>
      </div>

      {/* TAB 1: Sahələr */}
      {activeTab === 'saheler' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#EADBC8] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#1F2A24]">
              Torpaq Sahələri Reyestri
            </h2>
            {isOperator && (
              <button
                onClick={() => setNewParcelModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#2F6B3A] text-white text-xs font-bold hover:bg-[#26572F] cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni sahə</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#EADBC8] text-[#7A5230] font-bold uppercase">
                  <th className="py-3 px-3">Kod</th>
                  <th className="py-3 px-3">Ad</th>
                  <th className="py-3 px-3">Rayon / Kənd</th>
                  <th className="py-3 px-3">Sahə</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Müsabiqə</th>
                  <th className="py-3 px-3">Mina statusu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EADBC8]/60">
                {parcels.map(p => {
                  const comp = competitions.find(c => c.id === p.competitionId);
                  return (
                    <tr key={p.id} className="hover:bg-[#F4EBDD]/20">
                      <td className="py-3 px-3 font-extrabold text-[#2F6B3A]">{p.code}</td>
                      <td className="py-3 px-3 font-bold text-[#1F2A24]">{p.name}</td>
                      <td className="py-3 px-3">{regions.find(r => r.id === p.regionId)?.name}, {p.village}</td>
                      <td className="py-3 px-3 font-bold">{formatArea(p.areaHa)}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-md font-bold ${
                          p.status === 'ACIQ' ? 'bg-[#2F6B3A]/10 text-[#2F6B3A]' : p.status === 'AYRILIB' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {LABELS.parcelStatus[p.status]}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#7A5230]">{comp?.number || '—'}</td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-[#2F6B3A]">
                          {LABELS.demining[p.deminingStatus]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Müsabiqələr */}
      {activeTab === 'musabiqeler' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#EADBC8] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#1F2A24]">
              İnvestisiya Müsabiqələri
            </h2>
            {isOperator && (
              <button
                onClick={() => setNewCompModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#2F6B3A] text-white text-xs font-bold hover:bg-[#26572F] cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni müsabiqə</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#EADBC8] text-[#7A5230] font-bold uppercase">
                  <th className="py-3 px-3">Nömrə</th>
                  <th className="py-3 px-3">Müsabiqə adı</th>
                  <th className="py-3 px-3">Müddət</th>
                  <th className="py-3 px-3">Sahələr</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Əməliyyatlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EADBC8]/60">
                {competitions.map(comp => {
                  const compParcels = parcels.filter(p => p.competitionId === comp.id);
                  const isCreator = comp.createdBy === currentUser.id;

                  return (
                    <tr key={comp.id} className="hover:bg-[#F4EBDD]/20">
                      <td className="py-3 px-3 font-extrabold text-[#2F6B3A]">{comp.number}</td>
                      <td className="py-3 px-3 font-bold text-[#1F2A24] max-w-xs">{comp.name}</td>
                      <td className="py-3 px-3">{formatCountdown(comp.applyDeadline)}</td>
                      <td className="py-3 px-3 font-bold">{compParcels.length} sahə</td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-1 rounded-full font-bold ${
                          comp.status === 'DERC_EDILIB'
                            ? 'bg-[#2F6B3A]/10 text-[#2F6B3A]'
                            : comp.status === 'TESDIQ_GOZLEYIR'
                            ? 'bg-amber-100 text-amber-800'
                            : comp.status === 'BAGLANIB'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-blue-50 text-blue-800'
                        }`}>
                          {LABELS.competitionStatus[comp.status]}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Operator submits draft */}
                          {isOperator && comp.status === 'QARALAMA' && (
                            <button
                              onClick={() => handleSubmitCompForApproval(comp.id)}
                              className="px-3 py-1 rounded-lg bg-[#7A5230] text-white font-bold text-xs hover:bg-[#5C3E24] cursor-pointer"
                            >
                              {LABELS.ministryActions.submitForApproval}
                            </button>
                          )}

                          {/* Təsdiqləyici: Approve / Return (Four-eyes: creator cannot approve!) */}
                          {isApprover && comp.status === 'TESDIQ_GOZLEYIR' && (
                            <>
                              {!isCreator ? (
                                <button
                                  onClick={() => handleApproveCompetition(comp.id)}
                                  className="px-3 py-1 rounded-lg bg-[#2F6B3A] text-white font-bold text-xs hover:bg-[#26572F] cursor-pointer"
                                >
                                  {LABELS.ministryActions.approveAndPublish}
                                </button>
                              ) : (
                                <span className="text-[11px] text-amber-700 italic">
                                  Yaradan təsdiq edə bilməz
                                </span>
                              )}

                              <button
                                onClick={() => {
                                  setSelectedCompForReturn(comp);
                                  setReturnCompModalOpen(true);
                                }}
                                className="px-3 py-1 rounded-lg border border-[#C8553D] text-[#C8553D] font-bold text-xs hover:bg-[#C8553D]/10 cursor-pointer"
                              >
                                {LABELS.ministryActions.returnProposal}
                              </button>
                            </>
                          )}

                          {/* Close competition */}
                          {comp.status === 'DERC_EDILIB' && (
                            <button
                              onClick={() => handleCloseCompetition(comp.id)}
                              className="px-3 py-1 rounded-lg border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer"
                            >
                              {LABELS.ministryActions.closeCompetition}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Müraciətlər */}
      {activeTab === 'muracietler' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#EADBC8] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-[#1F2A24]">
              Daxil Olmuş İnvestisiya Müraciətləri
            </h2>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <FilterSelect
                value={appStatusFilter}
                onChange={setAppStatusFilter}
                options={[
                  { value: '', label: 'Bütün statuslar' },
                  { value: 'QEBUL_EDILIB', label: 'Qəbul edilib' },
                  { value: 'BAXILIR', label: 'Baxılır' },
                  { value: 'ELAVE_MELUMAT', label: 'Əlavə məlumat tələb olunur' },
                  { value: 'QERAR_VERILIB', label: 'Qərar verilib' }
                ]}
                ariaLabel="Status"
                className="px-3 py-1.5 rounded-xl border border-[#EADBC8] text-xs font-bold bg-[#F4EBDD]/40 text-[#1F2A24] cursor-pointer"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#EADBC8] text-[#7A5230] font-bold uppercase">
                  <th className="py-3 px-3">Müraciət №</th>
                  <th className="py-3 px-3">Ərizəçi</th>
                  <th className="py-3 px-3">Torpaq sahəsi</th>
                  <th className="py-3 px-3">Bitki</th>
                  <th className="py-3 px-3">İnvestisiya</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Operator əməliyyatları</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EADBC8]/60">
                {applications
                  .filter(a => !a.isDraft)
                  .filter(a => !appStatusFilter || a.status === appStatusFilter)
                  .map(app => {
                    const parcel = parcels.find(p => p.id === app.parcelId);
                    return (
                      <tr key={app.id} className="hover:bg-[#F4EBDD]/20">
                        <td className="py-3 px-3 font-extrabold text-[#2F6B3A]">{app.number}</td>
                        <td className="py-3 px-3 font-bold text-[#1F2A24]">
                          {app.applicantSnapshot?.name} (FİN: {app.applicantSnapshot?.maskedFin})
                        </td>
                        <td className="py-3 px-3">{parcel?.name} ({parcel?.code})</td>
                        <td className="py-3 px-3 font-bold">{app.intendedCrop}</td>
                        <td className="py-3 px-3 font-bold">{formatMoney(app.plannedInvestmentAzn)}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold ${
                            app.status === 'QEBUL_EDILIB'
                              ? 'bg-blue-100 text-blue-800'
                              : app.status === 'BAXILIR'
                              ? 'bg-amber-100 text-amber-800'
                              : app.status === 'ELAVE_MELUMAT'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {app.status === 'QERAR_VERILIB'
                              ? (app.outcome === 'TESDIQLENIB' ? 'Təsdiq edilib' : 'Rədd edilib')
                              : LABELS.applicationStatus[app.status]}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Operator: Move to review */}
                            {isOperator && app.status === 'QEBUL_EDILIB' && (
                              <button
                                onClick={() => handleMoveToReview(app.id)}
                                className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 cursor-pointer"
                              >
                                {LABELS.ministryActions.moveToReview}
                              </button>
                            )}

                            {/* Operator: Request info or Propose decision */}
                            {isOperator && app.status === 'BAXILIR' && !app.proposedOutcome && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedAppForInfo(app);
                                    setInfoReqModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg border border-[#C8553D] text-[#C8553D] font-bold text-xs hover:bg-[#C8553D]/10 cursor-pointer"
                                >
                                  {LABELS.ministryActions.requestInfo}
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedAppForDecision(app);
                                    setDecisionModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-[#2F6B3A] text-white font-bold text-xs hover:bg-[#26572F] cursor-pointer"
                                >
                                  {LABELS.ministryActions.proposeApproval}
                                </button>
                              </>
                            )}

                            {app.proposedOutcome && (
                              <span className="text-[11px] text-purple-700 font-bold">
                                Təklif irəli sürülüb ({app.proposedOutcome === 'TESDIQLENIB' ? 'Təsdiq' : 'Rədd'})
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Qərar Təsdiqi (Four-Eyes Screen for Təsdiqləyici) */}
      {activeTab === 'qerarTesdiqi' && isApprover && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#EADBC8] space-y-4">
          <div>
            <h2 className="text-xl font-bold text-[#1F2A24]">
              Qərar Təsdiqi (Dörd Göz Prinsipi)
            </h2>
            <p className="text-xs text-[#7A5230]">
              Operatorların hazırladığı qərar təkliflərinə müstəqil baxış və yekun təsdiqləmə
            </p>
          </div>

          {pendingProposals.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#7A5230]">
              Hal-hazırda təsdiq gözləyən qərar təklifi yoxdur.
            </div>
          ) : (
            <div className="space-y-4">
              {pendingProposals.map(prop => {
                const parcel = parcels.find(p => p.id === prop.parcelId);
                const isProposer = prop.proposedBy === currentUser.id;

                return (
                  <div
                    key={prop.id}
                    className="p-5 rounded-2xl bg-[#F4EBDD]/40 border-2 border-[#2E6DB4] space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-[#2E6DB4]">
                          {prop.number} · {parcel?.name}
                        </span>
                        <h3 className="font-extrabold text-[#1F2A24] text-base">
                          {prop.applicantSnapshot?.name} (VÖEN: {prop.applicantSnapshot?.voen || '—'})
                        </h3>
                      </div>
                      <span className="text-xs font-black px-3 py-1 rounded-full bg-purple-100 text-purple-800 w-fit">
                        Təklif: {prop.proposedOutcome === 'TESDIQLENIB' ? 'Təsdiq edilsin' : 'Rədd edilsin'}
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-[#EADBC8] text-xs text-[#1F2A24]">
                      <b>Operator şərhi:</b> &ldquo;{prop.proposalComment}&rdquo;
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        onClick={() => handleReturnProposal(prop.id)}
                        className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold hover:bg-white cursor-pointer"
                      >
                        Qaytar (Şərhlə)
                      </button>

                      {!isProposer ? (
                        <button
                          onClick={() => handleConfirmDecision(prop.id)}
                          className="px-5 py-2 rounded-xl bg-[#2F6B3A] hover:bg-[#26572F] text-white text-xs font-extrabold shadow-xs cursor-pointer"
                        >
                          Qərarı təsdiqlə
                        </button>
                      ) : (
                        <span className="text-xs text-amber-700 italic">
                          Dörd göz qaydası: Təklif edən şəxs təsdiqləyə bilməz
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: Statistika */}
      {activeTab === 'statistika' && (
        <div className="space-y-6">
          {/* Big Number Tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-[#EADBC8] shadow-xs">
              <span className="text-xs text-[#7A5230] font-bold block">Açıq müsabiqə</span>
              <span className="text-3xl font-black text-[#2F6B3A] mt-1 block">{stats.openCompetitions}</span>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-[#EADBC8] shadow-xs">
              <span className="text-xs text-[#7A5230] font-bold block">Cəmi müraciət</span>
              <span className="text-3xl font-black text-[#2E6DB4] mt-1 block">{stats.applicationsCount}</span>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-[#EADBC8] shadow-xs">
              <span className="text-xs text-[#7A5230] font-bold block">Ayrılmış sahə (ha)</span>
              <span className="text-3xl font-black text-[#7A5230] mt-1 block">{formatArea(stats.allocatedHa)}</span>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-[#EADBC8] shadow-xs">
              <span className="text-xs text-[#7A5230] font-bold block">İnvestor marağı</span>
              <span className="text-3xl font-black text-[#6B3FA0] mt-1 block">{stats.totalInterests}</span>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Applications by Status */}
            <div className="bg-white p-6 rounded-3xl border border-[#EADBC8] shadow-xs space-y-4">
              <h3 className="font-extrabold text-[#1F2A24] text-base">
                Müraciətlərin status üzrə bölgüsü
              </h3>
              <div className="space-y-3 pt-2 text-xs">
                {Object.entries(stats.statusCounts).map(([st, cnt]) => (
                  <div key={st} className="space-y-1">
                    <div className="flex justify-between font-bold">
                      <span>{LABELS.applicationStatus[st as keyof typeof LABELS.applicationStatus] || st}</span>
                      <span>{cnt} müraciət</span>
                    </div>
                    <div className="w-full bg-[#EADBC8] h-3 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#2F6B3A]"
                        style={{ width: `${stats.applicationsCount > 0 ? (cnt / stats.applicationsCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 2: Allocated Hectares by Region */}
            <div className="bg-white p-6 rounded-3xl border border-[#EADBC8] shadow-xs space-y-4">
              <h3 className="font-extrabold text-[#1F2A24] text-base">
                Rayonlar üzrə ayrılmış torpaq sahələri (ha)
              </h3>
              <div className="space-y-3 pt-2 text-xs">
                {Object.entries(stats.allocatedByRegion).map(([reg, ha]) => (
                  <div key={reg} className="space-y-1">
                    <div className="flex justify-between font-bold">
                      <span>{reg}</span>
                      <span>{formatArea(ha)}</span>
                    </div>
                    <div className="w-full bg-[#EADBC8] h-3 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#7A5230]"
                        style={{ width: `${stats.allocatedHa > 0 ? (ha / stats.allocatedHa) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: EKTİS Jurnalı (Live table, 2s auto-refresh, row click modal, retry) */}
      {activeTab === 'ektis' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#EADBC8] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[#1F2A24]">
                  EKTİS İnteqrasiya Jurnalı
                </h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-[#2E6DB4] text-white">
                  {LABELS.badges.SIMULYASIYA}
                </span>
              </div>
              <p className="text-xs text-[#7A5230]">
                Elektron Kənd Təsərrüfatı İnformasiya Sistemi ilə qarşılıqlı məlumat mübadiləsi (avtomatik 2 saniyədən bir yenilənir)
              </p>
            </div>
            <button
              onClick={() => setEktisLogs(mockEktis.getLogs())}
              className="p-2 rounded-xl text-[#7A5230] hover:bg-[#F4EBDD] cursor-pointer"
              title="Yenilə"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#EADBC8] text-[#7A5230] font-bold uppercase">
                  <th className="py-3 px-3">Tarix</th>
                  <th className="py-3 px-3">İstiqamət</th>
                  <th className="py-3 px-3">Endpoint</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Nəticə</th>
                  <th className="py-3 px-3 text-right">Əməliyyat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EADBC8]/60">
                {ektisLogs.map(log => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLogJson(log)}
                    className="hover:bg-[#F4EBDD]/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 text-[#7A5230]">{formatDateAz(log.at)}</td>
                    <td className="py-3 px-3 font-bold text-[#2F6B3A]">
                      {log.direction === 'GEDEN' ? 'Göndərilən' : 'Gələn'}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-[#1F2A24]">{log.endpoint}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-md font-black ${log.httpStatus === 200 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {log.httpStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {log.success ? (
                        <span className="text-[#2F6B3A] font-bold">Uğurlu</span>
                      ) : (
                        <span className="text-[#C8553D] font-bold">Uğursuz</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {!log.success && (
                        <button
                          onClick={async e => {
                            e.stopPropagation();
                            const ok = await mockEktis.retryLog(log.id);
                            setEktisLogs(mockEktis.getLogs());
                            if (ok) notifySuccess('Sorğu EKTİS-ə yenidən uğurla göndərildi.');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#C8553D] text-white text-[11px] font-bold hover:bg-[#A9402B] cursor-pointer"
                        >
                          Yenidən göndər
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: Audit Jurnalı */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#EADBC8] space-y-4">
          <h2 className="text-xl font-bold text-[#1F2A24]">
            Sistem Audit Jurnalı
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#EADBC8] text-[#7A5230] font-bold uppercase">
                  <th className="py-3 px-3">Tarix</th>
                  <th className="py-3 px-3">İstifadəçi</th>
                  <th className="py-3 px-3">Rol</th>
                  <th className="py-3 px-3">Əməliyyat</th>
                  <th className="py-3 px-3">Təfərrüat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EADBC8]/60">
                {auditLogs.map(aud => (
                  <tr key={aud.id} className="hover:bg-[#F4EBDD]/20">
                    <td className="py-3 px-3 text-[#7A5230]">{formatDateAz(aud.at)}</td>
                    <td className="py-3 px-3 font-bold text-[#1F2A24]">{aud.userId}</td>
                    <td className="py-3 px-3 font-bold text-[#2F6B3A]">{LABELS.roles[aud.role] || aud.role}</td>
                    <td className="py-3 px-3 font-extrabold">{aud.action}</td>
                    <td className="py-3 px-3 text-[#1F2A24] max-w-md">{aud.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Full JSON payload viewer for EKTIS log */}
      {selectedLogJson && (
        <div className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 shadow-2xl border border-[#EADBC8] space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-[#EADBC8]">
              <h3 className="font-extrabold text-[#1F2A24] text-base">
                EKTİS Sorğu Detalları ({selectedLogJson.endpoint})
              </h3>
              <button
                onClick={() => setSelectedLogJson(null)}
                className="p-1 rounded-lg text-[#7A5230] hover:bg-[#F4EBDD]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <span className="font-bold text-[#7A5230] block mb-1">Göndərilən (Request):</span>
                <pre className="p-3 bg-gray-900 text-emerald-400 rounded-xl overflow-x-auto text-[11px]">
                  {JSON.stringify(selectedLogJson.requestBody, null, 2)}
                </pre>
              </div>

              <div>
                <span className="font-bold text-[#7A5230] block mb-1">Cavab (Response):</span>
                <pre className="p-3 bg-gray-900 text-sky-400 rounded-xl overflow-x-auto text-[11px]">
                  {JSON.stringify(selectedLogJson.responseBody, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLogJson(null)}
                className="px-5 py-2 rounded-xl bg-[#2F6B3A] text-white text-xs font-bold"
              >
                {LABELS.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Propose Decision */}
      {decisionModalOpen && selectedAppForDecision && (
        <div className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-[#EADBC8] space-y-4 animate-in zoom-in-95">
            <h3 className="font-extrabold text-[#1F2A24] text-base">
              Qərar Təklifi İrəli Sür ({selectedAppForDecision.number})
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#7A5230] block mb-1">
                  Təklif olunan qərar:
                </label>
                <select
                  value={decisionOutcome}
                  onChange={e => setDecisionOutcome(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-[#EADBC8] font-bold"
                >
                  <option value="TESDIQLENIB">Təsdiq edilsin</option>
                  <option value="REDD_EDILIB">Rədd edilsin</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#7A5230] block mb-1">
                  Əsaslandırma və şərh:
                </label>
                <textarea
                  rows={4}
                  value={decisionComment}
                  onChange={e => setDecisionComment(e.target.value)}
                  placeholder="Aqroekoloji göstəricilər və maliyyə təminatı tələblərə cavab verir…"
                  className="w-full p-2.5 rounded-xl border border-[#EADBC8]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDecisionModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#EADBC8] text-xs font-bold text-[#1F2A24]"
              >
                {LABELS.cancel}
              </button>
              <button
                onClick={handleProposeDecisionSubmit}
                className="px-5 py-2 rounded-xl bg-[#2F6B3A] text-white text-xs font-bold"
              >
                Təklifi göndər
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Request Info */}
      {infoReqModalOpen && selectedAppForInfo && (
        <div className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-[#EADBC8] space-y-4 animate-in zoom-in-95">
            <h3 className="font-extrabold text-[#1F2A24] text-base">
              Əlavə Məlumat İstə ({selectedAppForInfo.number})
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#7A5230] block mb-1">
                  Çatışmazlıq və ya tələb olunan sənəd barədə qeyd:
                </label>
                <textarea
                  rows={4}
                  value={infoReqComment}
                  onChange={e => setInfoReqComment(e.target.value)}
                  placeholder="Biznes plan sənədinin suvarma bölməsi dəqiqləşdirilməlidir…"
                  className="w-full p-2.5 rounded-xl border border-[#EADBC8]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setInfoReqModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#EADBC8] text-xs font-bold text-[#1F2A24]"
              >
                {LABELS.cancel}
              </button>
              <button
                onClick={handleRequestInfoSubmit}
                className="px-5 py-2 rounded-xl bg-[#C8553D] text-white text-xs font-bold"
              >
                Tələbi göndər
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Return Competition */}
      {returnCompModalOpen && selectedCompForReturn && (
        <div className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-[#EADBC8] space-y-4 animate-in zoom-in-95">
            <h3 className="font-extrabold text-[#1F2A24] text-base">
              Müsabiqəni Qaralamaya Qaytar ({selectedCompForReturn.number})
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#7A5230] block mb-1">
                  Qaytarma səbəbi (məcburi):
                </label>
                <textarea
                  rows={4}
                  value={returnCompComment}
                  onChange={e => setReturnCompComment(e.target.value)}
                  placeholder="Müsabiqə şərtlərində minimum layihə ölçüsü dəqiqləşdirilməlidir…"
                  className="w-full p-2.5 rounded-xl border border-[#EADBC8]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setReturnCompModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#EADBC8] text-xs font-bold text-[#1F2A24]"
              >
                {LABELS.cancel}
              </button>
              <button
                onClick={handleReturnCompetition}
                className="px-5 py-2 rounded-xl bg-[#C8553D] text-white text-xs font-bold"
              >
                Qaytar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: New Parcel */}
      {newParcelModalOpen && (
        <div className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-[#EADBC8] space-y-4 animate-in zoom-in-95">
            <h3 className="font-extrabold text-[#1F2A24] text-base">
              Yeni Torpaq Sahəsi Əlavə Et
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#7A5230] block mb-1">Sahə kodu:</label>
                <input
                  type="text"
                  value={newParcelCode}
                  onChange={e => setNewParcelCode(e.target.value)}
                  className="w-full p-2 rounded-xl border border-[#EADBC8]"
                />
              </div>
              <div>
                <label className="font-bold text-[#7A5230] block mb-1">Sahə adı:</label>
                <input
                  type="text"
                  value={newParcelName}
                  onChange={e => setNewParcelName(e.target.value)}
                  className="w-full p-2 rounded-xl border border-[#EADBC8]"
                />
              </div>
              <div>
                <label className="font-bold text-[#7A5230] block mb-1">Rayon:</label>
                <select
                  value={newParcelRegion}
                  onChange={e => setNewParcelRegion(e.target.value)}
                  className="w-full p-2 rounded-xl border border-[#EADBC8]"
                >
                  {regions.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-[#7A5230] block mb-1">Kənd:</label>
                <input
                  type="text"
                  value={newParcelVillage}
                  onChange={e => setNewParcelVillage(e.target.value)}
                  className="w-full p-2 rounded-xl border border-[#EADBC8]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[#7A5230] block mb-1">Sahə (ha):</label>
                  <input
                    type="number"
                    value={newParcelHa}
                    onChange={e => setNewParcelHa(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-[#EADBC8]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#7A5230] block mb-1">İcarə haqqı (₼/ha):</label>
                  <input
                    type="number"
                    value={newParcelPrice}
                    onChange={e => setNewParcelPrice(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-[#EADBC8]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setNewParcelModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#EADBC8] text-xs font-bold text-[#1F2A24]"
              >
                {LABELS.cancel}
              </button>
              <button
                onClick={handleCreateParcel}
                className="px-5 py-2 rounded-xl bg-[#2F6B3A] text-white text-xs font-bold"
              >
                {LABELS.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: New Competition */}
      {newCompModalOpen && (
        <div className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 shadow-2xl border border-[#EADBC8] space-y-4 animate-in zoom-in-95 max-h-[85vh] overflow-y-auto">
            <h3 className="font-extrabold text-[#1F2A24] text-base">
              Yeni Müsabiqə Tərtib Et (Operator)
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#7A5230] block mb-1">Müsabiqə nömrəsi:</label>
                <input
                  type="text"
                  value={newCompNum}
                  onChange={e => setNewCompNum(e.target.value)}
                  className="w-full p-2 rounded-xl border border-[#EADBC8]"
                />
              </div>
              <div>
                <label className="font-bold text-[#7A5230] block mb-1">Müsabiqə adı:</label>
                <input
                  type="text"
                  value={newCompName}
                  onChange={e => setNewCompName(e.target.value)}
                  className="w-full p-2 rounded-xl border border-[#EADBC8]"
                />
              </div>

              <div>
                <label className="font-bold text-[#7A5230] block mb-1">
                  Müsabiqəyə daxil ediləcək sərbəst sahələr (Çoxsaylı seçim):
                </label>
                <div className="max-h-40 overflow-y-auto border border-[#EADBC8] p-2 rounded-xl space-y-1.5">
                  {freeBagliParcels.map(p => {
                    const isSelected = selectedParcelIdsForComp.includes(p.id);
                    return (
                      <label key={p.id} className="flex items-center gap-2 p-1.5 hover:bg-[#F4EBDD]/40 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedParcelIdsForComp([...selectedParcelIdsForComp, p.id]);
                            } else {
                              setSelectedParcelIdsForComp(selectedParcelIdsForComp.filter(id => id !== p.id));
                            }
                          }}
                          className="accent-[#2F6B3A]"
                        />
                        <span>{p.code} · {p.name} ({formatArea(p.areaHa)})</span>
                      </label>
                    );
                  })}
                  {freeBagliParcels.length === 0 && (
                    <div className="text-gray-400 p-2">Hazırda sərbəst bağlı sahə yoxdur. Əvvəlcə yeni sahə əlavə edin.</div>
                  )}
                </div>
              </div>

              <div>
                <label className="font-bold text-[#7A5230] block mb-1">Minimum layihə sahəsi (ha):</label>
                <input
                  type="number"
                  value={newCompMinHa}
                  onChange={e => setNewCompMinHa(Number(e.target.value))}
                  className="w-full p-2 rounded-xl border border-[#EADBC8]"
                />
              </div>

              <div>
                <label className="font-bold text-[#7A5230] block mb-1">Müsabiqə şərtləri:</label>
                <textarea
                  rows={3}
                  value={newCompConditions}
                  onChange={e => setNewCompConditions(e.target.value)}
                  className="w-full p-2 rounded-xl border border-[#EADBC8]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setNewCompModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#EADBC8] text-xs font-bold text-[#1F2A24]"
              >
                {LABELS.cancel}
              </button>
              <button
                onClick={handleCreateCompetition}
                className="px-5 py-2 rounded-xl bg-[#2F6B3A] text-white text-xs font-bold"
              >
                Müsabiqəni yarat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
