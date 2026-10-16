import React, { useState, useEffect } from 'react';
import {
  User,
  Parcel,
  Competition,
  Application,
  ProjectListing,
  Notification,
  Crop,
  Region
} from './types';
import { LABELS } from './labels';
import { api } from './api';
import { Header } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { TorpaqTapFlow } from './components/TorpaqTapFlow';
import { ParcelDetailPage } from './components/ParcelDetailPage';
import { CompareView } from './components/CompareView';
import { ApplicationFormModal } from './components/ApplicationFormModal';
import { MuracietlerimView } from './components/MuracietlerimView';
import { InvestorView } from './components/InvestorView';
import { MinistryView } from './components/MinistryView';
import { FaqModal } from './components/FaqModal';
import { PitchModal } from './components/PitchModal';
import { NotificationsModal } from './components/NotificationsModal';
import { ChatbotWidget } from './components/ChatbotWidget';
import {
  Compass,
  FileText,
  HelpCircle,
  TrendingUp,
  Briefcase,
  CheckCircle2,
  Calendar,
  Layers,
  Building
} from 'lucide-react';

export function App() {
  // App state
  const [currentUser, setCurrentUser] = useState<User | null>(api.getCurrentUser());
  // Restored session opens the page matching the account's role
  const [view, setView] = useState<'landing' | 'home' | 'torpaqTap' | 'parcelDetail' | 'compare' | 'muracietlerim' | 'investor' | 'ministry'>(() => {
    const restored = api.getCurrentUser();
    if (!restored) return 'landing';
    if (restored.role === 'SAHIBKAR') return 'home';
    if (restored.role === 'INVESTOR') return 'investor';
    return 'ministry';
  });

  // Data state
  const [parcels, setParcels] = useState<any[]>(api.getParcels());
  const [competitions, setCompetitions] = useState<Competition[]>(api.getCompetitions());
  const [applications, setApplications] = useState<Application[]>([]);
  const [projects, setProjects] = useState<ProjectListing[]>(api.getListings());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [regions, setRegions] = useState<Region[]>(api.getRegions());
  const [crops, setCrops] = useState<Crop[]>(api.getCrops());

  // Navigation / Selection params
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  const [compareParcelIds, setCompareParcelIds] = useState<string[]>([]);
  const [initialTorpaqTapRegion, setInitialTorpaqTapRegion] = useState<string | undefined>(undefined);
  const [initialTorpaqTapComp, setInitialTorpaqTapComp] = useState<string | undefined>(undefined);

  // Modals state
  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [pitchModalAppId, setPitchModalAppId] = useState<string | null>(null);

  // Investor selection
  const [investorListing, setInvestorListing] = useState<ProjectListing | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const refreshData = () => {
    setParcels(api.getParcels());
    setCompetitions(api.getCompetitions());
    setProjects(api.getListings());
    if (currentUser) {
      if (currentUser.role === 'SAHIBKAR') {
        setApplications(api.getMyApplications());
      } else if (currentUser.role === 'OPERATOR' || currentUser.role === 'TESDIQLEYICI') {
        setApplications(api.getAllApplications());
      }
      setNotifications(api.getNotifications());
    }
  };

  useEffect(() => {
    refreshData();
  }, [currentUser]);

  // Route routing if user logs in
  const handleUserLogin = (user: User) => {
    setCurrentUser(user);

    if (user.role === 'SAHIBKAR') {
      setView('home');
    } else if (user.role === 'INVESTOR') {
      setView('investor');
    } else if (user.role === 'OPERATOR' || user.role === 'TESDIQLEYICI') {
      setView('ministry');
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setView('landing');
  };

  // Open Parcel Details
  const handleSelectParcel = (parcelId: string) => {
    setSelectedParcelId(parcelId);
    setInvestorListing(null);
    setView('parcelDetail');
  };

  // Open Parcel in Investor Mode
  const handleOpenParcelInInvestorMode = (parcelId: string, listing: ProjectListing) => {
    setSelectedParcelId(parcelId);
    setInvestorListing(listing);
    setView('parcelDetail');
  };

  // Express Interest as Investor
  const handleExpressInterest = async (listingId: string) => {
    try {
      await api.expressInterest(listingId);
      showToast(LABELS.investor.toastSent);
      refreshData();
      // Keep the open parcel page in sync so its button switches to "already interested"
      if (investorListing?.id === listingId) {
        setInvestorListing(api.getListingById(listingId) || investorListing);
      }
    } catch (e: any) {
      alert(e.message || LABELS.errorGeneral);
    }
  };

  // Compare navigation
  const handleCompareParcel = (parcelId: string) => {
    if (!compareParcelIds.includes(parcelId)) {
      if (compareParcelIds.length >= 3) {
        alert('Ən çox 3 sahəni müqayisə edə bilərsiniz.');
        return;
      }
      setCompareParcelIds([...compareParcelIds, parcelId]);
    }
    setView('compare');
  };

  // Selected parcel object for detail
  const currentParcel = selectedParcelId ? api.getParcelById(selectedParcelId) : null;
  const currentParcelComp = currentParcel?.competitionId ? api.getCompetitionById(currentParcel.competitionId) : null;

  return (
    <div className="min-h-screen flex flex-col topographic-bg">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-[#2F6B3A] text-white px-5 py-3 rounded-2xl shadow-xl border border-white/20 flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Login screen (myGov) replaces the header and content until the user signs in */}
      {view === 'landing' && <LoginScreen onUserLogin={handleUserLogin} />}

      {/* Header */}
      {view !== 'landing' && (
      <Header
        user={currentUser}
        notifications={notifications}
        onLogout={handleLogout}
        onOpenFaq={() => setFaqModalOpen(true)}
        onOpenNotifications={() => setNotifModalOpen(true)}
        onNavigateHome={() => {
          if (!currentUser) setView('landing');
          else if (currentUser.role === 'SAHIBKAR') setView('home');
          else if (currentUser.role === 'INVESTOR') setView('investor');
          else setView('ministry');
        }}
      />
      )}

      {/* Main Content Area */}
      <main className={`flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 ${view === 'landing' ? 'hidden' : ''}`}>

        {/* VIEW 2: Sahibkar Home Screen (4 Big Tiles) */}
        {view === 'home' && currentUser?.role === 'SAHIBKAR' && (
          <div className="space-y-8 pb-12">
            <div className="p-8 rounded-3xl bg-gradient-to-r from-[#2F6B3A] to-[#26572F] text-white shadow-md space-y-2">
              <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider">
                Xoş gəlmisiniz, {currentUser.fullName}
              </span>
              <h1 className="text-3xl sm:text-4xl font-black">
                Sahibkar İdarəetmə Paneli
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100 max-w-xl">
                Azad edilmiş ərazilərdə ən uyğun torpağı tapın, investisiya müsabiqələrinə müraciət edin və layihənizi investorlara təqdim edin.
              </p>
            </div>

            {/* 4 Big Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Tile 1: Torpaq tap */}
              <button
                onClick={() => setView('torpaqTap')}
                className="p-8 rounded-3xl bg-white hover:bg-[#F4EBDD]/60 border-2 border-transparent hover:border-[#2F6B3A] text-left transition-all shadow-sm cursor-pointer group flex flex-col justify-between min-h-[220px]"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#2F6B3A]/10 text-[#2F6B3A] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Compass className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#1F2A24] mb-1">Torpaq tap</h3>
                  <p className="text-xs text-[#7A5230]">
                    Rayon və fəaliyyət növünü seçin, ən yüksək ballı sahələri tapın
                  </p>
                </div>
              </button>

              {/* Tile 2: Açıq müsabiqələr */}
              <button
                onClick={() => {
                  const firstOpen = competitions.find(c => c.status === 'DERC_EDILIB');
                  setInitialTorpaqTapComp(firstOpen?.id);
                  setView('torpaqTap');
                }}
                className="p-8 rounded-3xl bg-white hover:bg-[#F4EBDD]/60 border-2 border-transparent hover:border-[#2F6B3A] text-left transition-all shadow-sm cursor-pointer group flex flex-col justify-between min-h-[220px]"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#D98E04]/10 text-[#D98E04] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Calendar className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#1F2A24] mb-1">Açıq müsabiqələr</h3>
                  <p className="text-xs text-[#7A5230]">
                    Aktiv dövlət müsabiqələri və müraciət müddətləri
                  </p>
                </div>
              </button>

              {/* Tile 3: Müraciətlərim */}
              <button
                onClick={() => setView('muracietlerim')}
                className="p-8 rounded-3xl bg-white hover:bg-[#F4EBDD]/60 border-2 border-transparent hover:border-[#2F6B3A] text-left transition-all shadow-sm cursor-pointer group flex flex-col justify-between min-h-[220px]"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#2E6DB4]/10 text-[#2E6DB4] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#1F2A24] mb-1">Müraciətlərim</h3>
                  <p className="text-xs text-[#7A5230]">
                    Göndərilmiş müraciətlərin statusu və icra tarixçəsi ({applications.length})
                  </p>
                </div>
              </button>

              {/* Tile 4: Kömək */}
              <button
                onClick={() => setFaqModalOpen(true)}
                className="p-8 rounded-3xl bg-white hover:bg-[#F4EBDD]/60 border-2 border-transparent hover:border-[#2F6B3A] text-left transition-all shadow-sm cursor-pointer group flex flex-col justify-between min-h-[220px]"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#7A5230]/10 text-[#7A5230] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <HelpCircle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#1F2A24] mb-1">Kömək</h3>
                  <p className="text-xs text-[#7A5230]">
                    Tez-tez verilən suallar və müsabiqə təlimatları
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 3: Torpaq tap flow */}
        {view === 'torpaqTap' && (
          <TorpaqTapFlow
            parcels={parcels}
            regions={regions}
            crops={crops}
            onSelectParcel={handleSelectParcel}
            onCompareListChange={setCompareParcelIds}
            selectedCompareIds={compareParcelIds}
            initialRegion={initialTorpaqTapRegion}
            initialActivity={undefined}
            initialCompetitionId={initialTorpaqTapComp}
          />
        )}

        {/* VIEW 4: Parcel Detail Page */}
        {view === 'parcelDetail' && currentParcel && (
          <ParcelDetailPage
            parcel={currentParcel}
            crops={crops}
            regions={regions}
            competitions={competitions}
            currentUser={currentUser}
            investorMode={Boolean(investorListing)}
            investorListingInfo={
              investorListing
                ? {
                    requiredFundingAzn: investorListing.requiredFundingAzn,
                    expectedJobs: investorListing.expectedJobs,
                    cropName: crops.find(c => c.key === investorListing.crop)?.name || investorListing.crop
                  }
                : undefined
            }
            onApply={() => {
              if (!currentUser) {
                setView('landing');
                return;
              }
              setAppModalOpen(true);
            }}
            onCompare={handleCompareParcel}
            compareCount={compareParcelIds.length}
            onOpenCompare={() => setView('compare')}
            onExpressInterest={() => {
              if (investorListing) {
                handleExpressInterest(investorListing.id);
              }
            }}
            interestExpressed={investorListing?.interestedByMe}
            onBack={() => {
              if (investorListing) setView('investor');
              else setView('torpaqTap');
            }}
          />
        )}

        {/* VIEW 5: Compare View */}
        {view === 'compare' && (
          <CompareView
            parcels={parcels.filter(p => compareParcelIds.includes(p.id))}
            crops={crops}
            regions={regions}
            competitions={competitions}
            onRemoveFromCompare={id => setCompareParcelIds(compareParcelIds.filter(x => x !== id))}
            onApply={pid => {
              setSelectedParcelId(pid);
              if (!currentUser) setView('landing');
              else setAppModalOpen(true);
            }}
            onBack={() => setView('torpaqTap')}
          />
        )}

        {/* VIEW 6: Müraciətlərim */}
        {view === 'muracietlerim' && (
          <MuracietlerimView
            applications={applications}
            parcels={parcels}
            competitions={competitions}
            onRefresh={refreshData}
            onCreateProjectListing={appId => setPitchModalAppId(appId)}
            onSelectParcel={handleSelectParcel}
          />
        )}

        {/* VIEW 7: Investor View */}
        {view === 'investor' && (
          <InvestorView
            projects={projects}
            parcels={parcels}
            regions={regions}
            crops={crops}
            onOpenParcelInInvestorMode={handleOpenParcelInInvestorMode}
            onExpressInterest={handleExpressInterest}
            currentUser={currentUser}
            onNotify={showToast}
          />
        )}

        {/* VIEW 8: Ministry View */}
        {view === 'ministry' && currentUser && (
          <MinistryView
            currentUser={currentUser}
            parcels={parcels}
            competitions={competitions}
            applications={applications}
            regions={regions}
            onRefresh={refreshData}
          />
        )}
      </main>

      {/* Floating Compare Button if items selected */}
      {compareParcelIds.length > 0 && view !== 'compare' && view !== 'parcelDetail' && (
        <div className="fixed bottom-6 right-6 z-40 animate-bounce">
          <button
            onClick={() => setView('compare')}
            className="px-4 py-2.5 rounded-2xl bg-[#2F6B3A] text-white font-extrabold text-[11px] shadow-xl flex items-center gap-1.5 hover:bg-[#26572F] cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Müqayisə et ({compareParcelIds.length} sahə)</span>
          </button>
        </div>
      )}

      {/* AI chatbot, only after login */}
      {currentUser && view !== 'landing' && (
        <ChatbotWidget raised={view === 'parcelDetail' || (compareParcelIds.length > 0 && view !== 'compare')} />
      )}

      {/* FAQ Modal */}
      {faqModalOpen && (
        <FaqModal onClose={() => setFaqModalOpen(false)} />
      )}

      {/* Notifications Modal */}
      {notifModalOpen && (
        <NotificationsModal
          notifications={notifications}
          onMarkRead={id => {
            api.markNotificationAsRead(id);
            refreshData();
          }}
          onMarkAllRead={() => {
            api.markAllNotificationsAsRead();
            refreshData();
          }}
          onClose={() => setNotifModalOpen(false)}
        />
      )}

      {/* 4-Step Application Form Modal */}
      {appModalOpen && currentParcel && currentParcelComp && currentUser && (
        <ApplicationFormModal
          parcel={currentParcel}
          competition={currentParcelComp}
          crop={crops.find(c => c.key === 'UZUM') || crops[0]}
          currentUser={currentUser}
          onSuccess={app => {
            refreshData();
            if (app.isDraft) {
              showToast(`${app.number} nömrəli qaralama yadda saxlanıldı.`);
            }
          }}
          onClose={() => setAppModalOpen(false)}
          onNavigateMine={() => {
            setAppModalOpen(false);
            setView('muracietlerim');
          }}
          onNavigateHome={() => {
            setAppModalOpen(false);
            setView('home');
          }}
        />
      )}

      {/* Pitch Modal */}
      {pitchModalAppId && (
        <PitchModal
          application={applications.find(a => a.id === pitchModalAppId)!}
          parcel={parcels.find(p => p.id === applications.find(a => a.id === pitchModalAppId)?.parcelId)!}
          onSuccess={() => {
            setPitchModalAppId(null);
            showToast('Layihəniz investor vitrinində dərc edildi!');
            refreshData();
            setView('investor');
          }}
          onClose={() => setPitchModalAppId(null)}
        />
      )}
    </div>
  );
}

export default App;
