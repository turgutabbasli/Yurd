import initialUsers from './data/users.json';
import initialRegions from './data/regions.json';
import initialCrops from './data/crops.json';
import initialParcels from './data/parcels.json';
import initialCompetitions from './data/competitions.json';
import initialApplications from './data/applications.json';
import initialProjects from './data/projects.json';
import initialFaq from './data/faq.json';
import initialOffers from './data/offers.json';
import initialLandZones from './data/landZones.json';
import { mockEktis } from './mockEktis';
import { calculateSuitabilityScore, ScoringWeights } from './scoring';
import {
  User,
  Parcel,
  Competition,
  Application,
  ProjectListing,
  Notification,
  AuditLogEntry,
  Crop,
  Region,
  Role,
  ApplicationStatus,
  Outcome,
  InvestorOffer,
  OfferModel,
  ApplicationLocation,
  LandZone
} from './types';
import { maskFin } from './labels';

const STORAGE_KEY_PREFIX = 'yurd_portal_v4_';
const DEMO_SAHIBKAR_FIN = '5AB78CD'; // demo Sahibkar account used for any other valid FİN

function getStorage<T>(key: string, defaultValue: T): T {
  try {
    if (typeof localStorage === 'undefined') return defaultValue;
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    return defaultValue;
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage write error', e);
  }
}

// In-Memory & LocalStorage backed Data Store
class YurdDatabase {
  public users: User[] = [];
  public regions: Region[] = [];
  public crops: Crop[] = [];
  public parcels: Parcel[] = [];
  public competitions: Competition[] = [];
  public applications: Application[] = [];
  public projects: ProjectListing[] = [];
  public notifications: Notification[] = [];
  public auditLogs: AuditLogEntry[] = [];
  public investorInterests: Record<string, string[]> = {}; // listingId -> investorIds[]
  public offers: InvestorOffer[] = [];
  public landZones: Record<string, LandZone[]> = {}; // parcelId -> zones

  // Login rate limiting: email -> attempts[]
  private loginFailures: Record<string, number[]> = {};

  constructor() {
    this.init();
  }

  public init() {
    this.users = getStorage('users', initialUsers as User[]);
    // Seed accounts added after a browser already stored its data are merged in
    for (const seed of initialUsers as User[]) {
      if (!this.users.some(u => u.id === seed.id)) this.users.push(seed);
    }
    this.regions = getStorage('regions', initialRegions as Region[]);
    this.crops = getStorage('crops', initialCrops as unknown as Crop[]);
    this.parcels = getStorage('parcels', initialParcels as unknown as Parcel[]);
    this.competitions = getStorage('competitions', initialCompetitions as unknown as Competition[]);
    this.applications = getStorage('applications', initialApplications as unknown as Application[]);
    this.projects = getStorage('projects', initialProjects as unknown as ProjectListing[]);
    this.notifications = getStorage('notifications', [
      {
        id: 'notif-init-1',
        userId: 'usr-sahibkar-1',
        type: 'STATUS_YENILIK',
        text: 'QM-2026-000102 nömrəli müraciətiniz üzrə əlavə sənəd tələb olunur.',
        refType: 'APPLICATION',
        refId: 'app-002',
        read: false,
        createdAt: '2026-10-08T15:45:00Z'
      },
      {
        id: 'notif-init-3',
        userId: 'usr-sahibkar-1',
        type: 'INVESTOR_TEKLIFI',
        text: 'QM-2026-000101 nömrəli müraciətinizə 3 investor təklifi daxil olub. Müqayisə edib birini seçə bilərsiniz.',
        refType: 'APPLICATION',
        refId: 'app-001',
        read: false,
        createdAt: '2026-10-11T09:40:00Z'
      },
      {
        id: 'notif-init-2',
        userId: 'usr-sahibkar-1',
        type: 'MUSABIQE_ELANI',
        text: 'Yeni müsabiqə elan edildi: İşğaldan Azad Edilmiş Torpaqlarda Payızlıq Əkin və Bağçılıq Müsabiqəsi (III-2026)',
        refType: 'COMPETITION',
        refId: 'comp-3',
        read: true,
        createdAt: '2026-09-20T14:30:00Z'
      }
    ]);
    this.auditLogs = getStorage('auditLogs', [
      {
        id: 'aud-init-1',
        userId: 'usr-tesdiqleyici-1',
        role: 'TESDIQLEYICI',
        action: 'MUSABIQE_TESDIQI',
        entityType: 'COMPETITION',
        entityId: 'comp-3',
        details: 'III-2026 nömrəli müsabiqə təsdiqləndi və dərc edildi.',
        ip: '192.168.1.10',
        at: '2026-09-20T14:30:00Z'
      }
    ]);
    this.landZones = getStorage('landZones', initialLandZones as unknown as Record<string, LandZone[]>);
    this.offers = getStorage('offers', initialOffers as unknown as InvestorOffer[]);
    for (const o of this.offers) {
      if (!o.durationMonths && o.durationYears) o.durationMonths = o.durationYears * 12;
    }
    for (const a of this.applications) {
      if (a.durationMonths == null) {
        const seed = (initialApplications as unknown as Application[]).find(s => s.id === a.id);
        if (seed?.durationMonths) a.durationMonths = seed.durationMonths;
      }
    }
    this.investorInterests = getStorage('investorInterests', {
      'proj-101': ['usr-investor-1']
    });
  }

  public save() {
    setStorage('users', this.users);
    setStorage('parcels', this.parcels);
    setStorage('competitions', this.competitions);
    setStorage('applications', this.applications);
    setStorage('projects', this.projects);
    setStorage('notifications', this.notifications);
    setStorage('auditLogs', this.auditLogs);
    setStorage('investorInterests', this.investorInterests);
    setStorage('offers', this.offers);
    setStorage('landZones', this.landZones);
  }

  public resetToDefault() {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    this.init();
  }

  public addAudit(userId: string, role: Role, action: string, entityType: string, entityId: string, details: string) {
    const entry: AuditLogEntry = {
      id: 'aud-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      userId,
      role,
      action,
      entityType,
      entityId,
      details,
      ip: '127.0.0.1',
      at: new Date().toISOString()
    };
    this.auditLogs.unshift(entry);
    this.save();
  }

  public addNotification(userId: string, type: string, text: string, refType?: string, refId?: string) {
    const notif: Notification = {
      id: 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      userId,
      type,
      text,
      refType,
      refId,
      read: false,
      createdAt: new Date().toISOString()
    };
    this.notifications.unshift(notif);
    this.save();
  }

  public checkRateLimit(email: string): boolean {
    const now = Date.now();
    const attempts = this.loginFailures[email] || [];
    const recent = attempts.filter(t => now - t < 60000);
    this.loginFailures[email] = recent;
    return recent.length < 5;
  }

  public recordLoginFailure(email: string) {
    const now = Date.now();
    const attempts = this.loginFailures[email] || [];
    attempts.push(now);
    this.loginFailures[email] = attempts;
  }
}

export const db = new YurdDatabase();

// In-Memory Session
let currentUser: User | null = null;
let currentToken: string | null = null;

// Initial auth restoration from sessionStorage
try {
  if (typeof sessionStorage !== 'undefined') {
    const savedToken = sessionStorage.getItem('yurd_auth_token');
    const savedUserId = sessionStorage.getItem('yurd_user_id');
    if (savedToken && savedUserId) {
      const found = db.users.find(u => u.id === savedUserId);
      if (found) {
        currentUser = found;
        currentToken = savedToken;
      }
    }
  }
} catch (e) {}

// API Service Layer
export const api = {
  // Auth endpoints
  logout(): void {
    if (currentUser) {
      db.addAudit(currentUser.id, currentUser.role, 'CIXIS', 'USER', currentUser.id, `${currentUser.fullName} sistemdən çıxdı.`);
    }
    currentUser = null;
    currentToken = null;
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('yurd_auth_token');
      sessionStorage.removeItem('yurd_user_id');
    }
  },

  getCurrentUser(): User | null {
    return currentUser ? this.sanitizeUser(currentUser) : null;
  },

  sanitizeUser(user: User): User {
    return {
      ...user,
      fin: maskFin(user.fin),
      passportNumber: user.passportNumber ? maskFin(user.passportNumber) : user.passportNumber
    };
  },

  // ----- myGov demo login (simulation: no real myGov integration) -----

  startSession(user: User): { token: string; user: User } {
    const token = 'jwt_' + user.id + '_' + Date.now();
    currentUser = user;
    currentToken = token;
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('yurd_auth_token', token);
      sessionStorage.setItem('yurd_user_id', user.id);
    }
    return { token, user: this.sanitizeUser(user) };
  },

  // Azerbaijani citizens: FİN code (7 letters/digits). The role comes from the account.
  async loginWithFin(finInput: string): Promise<{ token: string; user: User }> {
    const fin = finInput.trim().toUpperCase();
    if (!/^[0-9A-Z]{7}$/.test(fin)) {
      throw new Error('FİN kod 7 simvoldan ibarət olmalıdır');
    }
    const key = 'fin:' + fin;
    if (!db.checkRateLimit(key)) {
      throw new Error('Çox sayda uğursuz cəhd. Bir dəqiqə sonra yenidən yoxlayın.');
    }
    // Demo: a valid FİN without its own account signs in as the demo Sahibkar, so anyone can try the portal
    const user =
      db.users.find(u => !u.isForeign && (u.fin || '').toUpperCase() === fin) ||
      db.users.find(u => !u.isForeign && (u.fin || '').toUpperCase() === DEMO_SAHIBKAR_FIN);
    if (!user || user.active === false) {
      db.recordLoginFailure(key);
      throw new Error('Bu FİN kod ilə portalda hesab tapılmadı.');
    }
    const session = this.startSession(user);
    db.addAudit(user.id, user.role, 'GIRIS', 'USER', user.id, `${user.fullName} myGov (FİN) ilə daxil oldu.`);
    return session;
  },

  // Foreign citizens: passport data. An existing account must match the passport holder;
  // a first login with a new valid passport opens an investor account.
  async loginWithPassport(data: {
    firstName: string;
    lastName: string;
    citizenship: string;
    passportNumber: string;
    birthDate: string;
    passportExpiry: string;
  }): Promise<{ token: string; user: User; created: boolean }> {
    const firstName = data.firstName.trim();
    const lastName = data.lastName.trim();
    const passport = data.passportNumber.trim().toUpperCase();

    if (!firstName || !lastName || !data.citizenship || !passport || !data.birthDate || !data.passportExpiry) {
      throw new Error('Bütün məcburi sahələri doldurun.');
    }
    if (!/^[A-Z0-9]{6,12}$/.test(passport)) {
      throw new Error('Pasport nömrəsi 6–12 simvoldan ibarət olmalı və yalnız hərf və rəqəmlərdən ibarət olmalıdır.');
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const birth = new Date(data.birthDate);
    const expiry = new Date(data.passportExpiry);
    if (isNaN(birth.getTime()) || birth >= today) {
      throw new Error('Doğum tarixini düzgün daxil edin.');
    }
    if (isNaN(expiry.getTime())) {
      throw new Error('Pasportun bitmə tarixini düzgün daxil edin.');
    }
    if (expiry < today) {
      throw new Error('Pasportun müddəti bitib. Giriş üçün etibarlı pasport tələb olunur.');
    }
    const key = 'passport:' + passport;
    if (!db.checkRateLimit(key)) {
      throw new Error('Çox sayda uğursuz cəhd. Bir dəqiqə sonra yenidən yoxlayın.');
    }

    const norm = (v: string) => v.trim().toLocaleLowerCase('az');
    const existing = db.users.find(u => (u.passportNumber || '').toUpperCase() === passport);
    if (existing) {
      const [exFirst, ...exRest] = existing.fullName.split(' ');
      const matches =
        norm(exFirst) === norm(firstName) &&
        norm(exRest.join(' ')) === norm(lastName) &&
        (existing.birthDate || '') === data.birthDate;
      if (!matches) {
        db.recordLoginFailure(key);
        throw new Error('Pasport məlumatları portaldakı hesabla uyğun gəlmir. Ad, soyad və doğum tarixini yoxlayın.');
      }
      if (existing.passportExpiry !== data.passportExpiry || existing.citizenship !== data.citizenship) {
        existing.passportExpiry = data.passportExpiry;
        existing.citizenship = data.citizenship;
        db.save();
      }
      const session = this.startSession(existing);
      db.addAudit(existing.id, existing.role, 'GIRIS', 'USER', existing.id, `${existing.fullName} myGov (pasport) ilə daxil oldu.`);
      return { ...session, created: false };
    }

    const now = new Date().toISOString();
    const newUser: User = {
      id: 'usr-foreign-' + Date.now(),
      email: '',
      role: 'INVESTOR',
      fullName: `${firstName} ${lastName}`,
      entityType: 'FIZIKI_SEXS',
      fin: '',
      voen: null,
      phone: '',
      consentAt: now,
      createdAt: now,
      active: true,
      isTestAccount: false,
      isForeign: true,
      citizenship: data.citizenship,
      passportNumber: passport,
      birthDate: data.birthDate,
      passportExpiry: data.passportExpiry
    };
    db.users.push(newUser);
    db.save();
    const session = this.startSession(newUser);
    db.addAudit(newUser.id, newUser.role, 'QEYDIYYAT', 'USER', newUser.id, `${newUser.fullName} myGov (pasport) ilə ilk dəfə daxil oldu.`);
    return { ...session, created: true };
  },

  // Regions & Crops & FAQ
  getRegions(): Region[] {
    return db.regions;
  },

  getCrops(): Crop[] {
    return db.crops;
  },

  getFaq(): Array<{ role: string; question: string; answer: string }> {
    return initialFaq;
  },

  // Competitions
  getCompetitions(filterStatus?: string): Competition[] {
    if (filterStatus) {
      return db.competitions.filter(c => c.status === filterStatus);
    }
    // Public visitors see DERC_EDILIB only if not ministry
    if (!currentUser || (currentUser.role !== 'OPERATOR' && currentUser.role !== 'TESDIQLEYICI')) {
      return db.competitions.filter(c => c.status === 'DERC_EDILIB' || c.status === 'BAGLANIB');
    }
    return db.competitions;
  },

  getCompetitionById(id: string): Competition | undefined {
    return db.competitions.find(c => c.id === id);
  },

  async createCompetition(data: Omit<Competition, 'id' | 'status' | 'createdBy' | 'createdAt'> & { parcelIds: string[] }): Promise<Competition> {
    if (!currentUser || currentUser.role !== 'OPERATOR') {
      throw new Error('Bu əməliyyat üçün icazəniz yoxdur.');
    }
    if (!data.parcelIds || data.parcelIds.length === 0) {
      throw new Error('Müsabiqəyə ən azı bir sərbəst torpaq sahəsi seçilməlidir.');
    }

    const newComp: Competition = {
      id: 'comp-' + Date.now(),
      number: data.number,
      name: data.name,
      directions: data.directions,
      announceDate: data.announceDate,
      applyStart: data.applyStart,
      applyDeadline: data.applyDeadline,
      leaseInitialYears: data.leaseInitialYears || 5,
      leaseExtensionYears: data.leaseExtensionYears || 44,
      minProjectHa: data.minProjectHa || 20,
      participationFeeAzn: data.participationFeeAzn || 50,
      conditionsText: data.conditionsText,
      status: 'QARALAMA',
      createdBy: currentUser.id,
      approvedBy: null,
      approvedAt: null,
      returnComment: null,
      createdAt: new Date().toISOString()
    };

    db.competitions.push(newComp);

    // Link parcels as BAGLI with competitionId
    for (const pid of data.parcelIds) {
      const p = db.parcels.find(x => x.id === pid);
      if (p) {
        p.competitionId = newComp.id;
        p.status = 'BAGLI';
      }
    }

    db.save();
    db.addAudit(currentUser.id, currentUser.role, 'MUSABIQE_YARADILMASI', 'COMPETITION', newComp.id, `${newComp.number} müsabiqəsi qaralama yaradıldı.`);
    return newComp;
  },

  async submitCompetition(competitionId: string): Promise<Competition> {
    if (!currentUser || currentUser.role !== 'OPERATOR') {
      throw new Error('Bu əməliyyat üçün icazəniz yoxdur.');
    }
    const comp = db.competitions.find(c => c.id === competitionId);
    if (!comp) throw new Error('Axtardığınız məlumat tapılmadı.');
    if (comp.status !== 'QARALAMA') {
      throw new Error('Bu status keçidi mümkün deyil');
    }

    comp.status = 'TESDIQ_GOZLEYIR';
    db.save();
    db.addAudit(currentUser.id, currentUser.role, 'MUSABIQE_TESDIQE_GONDERILDI', 'COMPETITION', comp.id, `${comp.number} təsdiqə göndərildi.`);
    return comp;
  },

  async approveCompetition(competitionId: string): Promise<Competition> {
    if (!currentUser || currentUser.role !== 'TESDIQLEYICI') {
      throw new Error('Bu əməliyyat üçün icazəniz yoxdur.');
    }
    const comp = db.competitions.find(c => c.id === competitionId);
    if (!comp) throw new Error('Axtardığınız məlumat tapılmadı.');
    if (comp.status !== 'TESDIQ_GOZLEYIR') {
      throw new Error('Bu status keçidi mümkün deyil');
    }

    // Four-eyes rule: approvedBy must differ from createdBy
    if (comp.createdBy === currentUser.id) {
      throw new Error('Dörd göz prinsipi: Müsabiqəni yaradan şəxs onu təsdiqləyə bilməz.');
    }

    comp.status = 'DERC_EDILIB';
    comp.approvedBy = currentUser.id;
    comp.approvedAt = new Date().toISOString();

    // Side effect: competition parcels become ACIQ
    const parcelCodes: string[] = [];
    for (const p of db.parcels) {
      if (p.competitionId === comp.id && p.status !== 'AYRILIB') {
        p.status = 'ACIQ';
        parcelCodes.push(p.code);
      }
    }

    // Outbound mock EKTIS call
    await mockEktis.sendCompetition(comp.number, parcelCodes, comp.applyDeadline);

    // Notify all sahibkar users
    for (const u of db.users) {
      if (u.role === 'SAHIBKAR') {
        db.addNotification(u.id, 'MUSABIQE_ELANI', `Yeni müsabiqə elan edildi: ${comp.name} (${comp.number})`, 'COMPETITION', comp.id);
      }
    }

    db.save();
    db.addAudit(currentUser.id, currentUser.role, 'MUSABIQE_TESDIQI', 'COMPETITION', comp.id, `${comp.number} müsabiqəsi təsdiqləndi və dərc edildi.`);
    return comp;
  },

  async returnCompetition(competitionId: string, comment: string): Promise<Competition> {
    if (!currentUser || currentUser.role !== 'TESDIQLEYICI') {
      throw new Error('Bu əməliyyat üçün icazəniz yoxdur.');
    }
    if (!comment || !comment.trim()) {
      throw new Error('Qaytarma səbəbini və şərhinizi qeyd edin.');
    }
    const comp = db.competitions.find(c => c.id === competitionId);
    if (!comp) throw new Error('Axtardığınız məlumat tapılmadı.');
    if (comp.status !== 'TESDIQ_GOZLEYIR') {
      throw new Error('Bu status keçidi mümkün deyil');
    }

    comp.status = 'QARALAMA';
    comp.returnComment = comment;
    db.save();
    db.addAudit(currentUser.id, currentUser.role, 'MUSABIQE_QAYTARILMASI', 'COMPETITION', comp.id, `${comp.number} qaytarıldı: ${comment}`);
    return comp;
  },

  async closeCompetition(competitionId: string): Promise<Competition> {
    if (!currentUser || (currentUser.role !== 'OPERATOR' && currentUser.role !== 'TESDIQLEYICI')) {
      throw new Error('Bu əməliyyat üçün icazəniz yoxdur.');
    }
    const comp = db.competitions.find(c => c.id === competitionId);
    if (!comp) throw new Error('Axtardığınız məlumat tapılmadı.');
    if (comp.status !== 'DERC_EDILIB') {
      throw new Error('Bu status keçidi mümkün deyil');
    }

    comp.status = 'BAGLANIB';
    for (const p of db.parcels) {
      if (p.competitionId === comp.id && p.status === 'ACIQ') {
        p.status = 'BAGLI';
      }
    }

    db.save();
    db.addAudit(currentUser.id, currentUser.role, 'MUSABIQE_BAGLANMASI', 'COMPETITION', comp.id, `${comp.number} müsabiqəsi bağlandı.`);
    return comp;
  },

  // Parcels & Suitability
  getParcels(filters?: {
    region?: string;
    activity?: string;
    minHa?: number;
    maxHa?: number;
    status?: string;
    competition?: string;
    crop?: string;
    weights?: Partial<ScoringWeights>;
  }): Array<Parcel & { suitability?: any; bestCrop?: Crop; bestScore?: number }> {
    let result = [...db.parcels];

    if (filters?.region) {
      result = result.filter(p => p.regionId === filters.region);
    }
    if (filters?.status) {
      result = result.filter(p => p.status === filters.status);
    }
    if (filters?.competition) {
      result = result.filter(p => p.competitionId === filters.competition);
    }
    if (filters?.minHa != null) {
      result = result.filter(p => p.areaHa >= (filters.minHa || 0));
    }
    if (filters?.maxHa != null) {
      result = result.filter(p => p.areaHa <= (filters.maxHa || 99999));
    }

    // Filter by activity
    if (filters?.activity && filters.activity !== 'BILMIREM') {
      const act = filters.activity;
      if (act === 'BAGCHILIQ') {
        result = result.filter(p => p.allowedUses.includes('MEYVE_BAGI') || p.allowedUses.includes('UZUMLUK'));
      } else if (act === 'EKINCILIK') {
        result = result.filter(p => p.allowedUses.includes('TAXIL') || p.allowedUses.includes('PAMBIQ'));
      } else if (act === 'HEYVANDARLIQ') {
        result = result.filter(p => p.allowedUses.includes('HEYVANDARLIQ'));
      } else if (act === 'ARICILIQ') {
        result = result.filter(p => p.allowedUses.includes('ARICILIQ'));
      }
    }

    const defaultCrop = db.crops.find(c => c.key === 'UZUM') || db.crops[0];
    const targetCrop = filters?.crop ? db.crops.find(c => c.key === filters.crop) || defaultCrop : null;

    const scored = result.map(p => {
      if (targetCrop) {
        const scoreRes = calculateSuitabilityScore(p, targetCrop, filters?.weights);
        return {
          ...p,
          suitability: scoreRes,
          bestCrop: targetCrop,
          bestScore: scoreRes.score ?? 0
        };
      } else {
        // Find top crop for this parcel
        let bestScore = -1;
        let bestCrop = defaultCrop;
        let bestSuit: any = null;

        for (const c of db.crops) {
          const s = calculateSuitabilityScore(p, c, filters?.weights);
          if (s.score !== null && s.score > bestScore) {
            bestScore = s.score;
            bestCrop = c;
            bestSuit = s;
          }
        }

        if (bestScore === -1) {
          bestSuit = calculateSuitabilityScore(p, defaultCrop, filters?.weights);
        }

        return {
          ...p,
          suitability: bestSuit,
          bestCrop,
          bestScore: bestScore >= 0 ? bestScore : 0
        };
      }
    });

    // In ranked public views, excluded parcels are filtered out (hidden from ranked lists, visible in ministry tables)
    const isMinistry = currentUser && (currentUser.role === 'OPERATOR' || currentUser.role === 'TESDIQLEYICI');
    if (!isMinistry) {
      return scored.filter(p => !p.suitability?.excluded).sort((a, b) => (b.bestScore || 0) - (a.bestScore || 0));
    }

    return scored.sort((a, b) => (b.bestScore || 0) - (a.bestScore || 0));
  },

  getParcelById(id: string): Parcel | undefined {
    return db.parcels.find(p => p.id === id);
  },

  async createParcel(parcelData: Omit<Parcel, 'id' | 'createdAt'>): Promise<Parcel> {
    if (!currentUser || (currentUser.role !== 'OPERATOR' && currentUser.role !== 'TESDIQLEYICI')) {
      throw new Error('Bu əməliyyat üçün icazəniz yoxdur.');
    }

    const newParcel: Parcel = {
      ...parcelData,
      id: 'pcl-' + Date.now(),
      status: 'BAGLI',
      createdAt: new Date().toISOString()
    };

    db.parcels.push(newParcel);
    db.save();
    db.addAudit(currentUser.id, currentUser.role, 'SAHE_YARADILMASI', 'PARCEL', newParcel.id, `${newParcel.code} nömrəli yeni sahə əlavə edildi.`);
    return newParcel;
  },

  async updateParcel(id: string, updates: Partial<Parcel>): Promise<Parcel> {
    if (!currentUser || (currentUser.role !== 'OPERATOR' && currentUser.role !== 'TESDIQLEYICI')) {
      throw new Error('Bu əməliyyat üçün icazəniz yoxdur.');
    }
    const p = db.parcels.find(x => x.id === id);
    if (!p) throw new Error('Axtardığınız məlumat tapılmadı.');

    Object.assign(p, updates);
    db.save();
    db.addAudit(currentUser.id, currentUser.role, 'SAHE_DEYISDIRILMESI', 'PARCEL', p.id, `${p.code} sahəsinin məlumatları yeniləndi.`);
    return p;
  },

  // Applications
  async createApplication(data: {
    competitionId: string;
    parcelId: string;
    intendedCrop: string;
    plannedInvestmentAzn: number;
    ownFundsAzn: number;
    expectedJobs: number;
    planText: string;
    startDate: string;
    isDraft: boolean;
    documents?: Array<{ kind: 'SEXSIYYET' | 'BIZNES_PLAN' | 'MALI_SENED' | 'DIGER'; fileName: string; mimeType: string; sizeBytes: number }>;
    location?: ApplicationLocation | null;
    durationMonths?: number | null;
  }): Promise<Application> {
    if (!currentUser || currentUser.role !== 'SAHIBKAR') {
      throw new Error('Bu əməliyyat üçün icazəniz yoxdur.');
    }

    const parcel = db.parcels.find(p => p.id === data.parcelId);
    if (!parcel) throw new Error('Axtardığınız sahə tapılmadı.');

    const comp = db.competitions.find(c => c.id === data.competitionId);
    if (!comp) throw new Error('Müsabiqə tapılmadı.');

    if (!data.isDraft) {
      const dm = Number(data.durationMonths);
      if (!Number.isInteger(dm) || dm < 1 || dm > 600) {
        throw new Error('İcra müddəti 1–600 ay aralığında olmalıdır.');
      }
      const loc = data.location;
      if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lon) || Math.abs(loc.lat) > 90 || Math.abs(loc.lon) > 180) {
        throw new Error('Torpağın koordinatlarını xəritədə göstərin və ya düzgün daxil edin.');
      }
      if (parcel.status !== 'ACIQ') {
        throw new Error('Bu sahə müraciət üçün açıq deyil.');
      }
      if (comp.status !== 'DERC_EDILIB') {
        throw new Error('Bu müsabiqə hazırda qəbul üçün açıq deyil.');
      }
      // Check deadline
      const deadline = new Date(comp.applyDeadline).getTime();
      if (deadline < Date.now()) {
        throw new Error('Müraciət müddəti bitib');
      }
      // Check active application for same parcel by user
      const existing = db.applications.find(
        a =>
          a.applicantId === currentUser!.id &&
          a.parcelId === data.parcelId &&
          !['QERAR_VERILIB', 'QARALAMA', 'LEGV_EDILIB'].includes(a.status)
      );
      if (existing) {
        throw new Error('Bu sahə üzrə artıq aktiv müraciətiniz mövcuddur.');
      }
    }

    const year = new Date().getFullYear();
    const seq = Math.floor(100000 + Math.random() * 900000);
    const appNumber = `QM-${year}-${seq}`;

    const newApp: Application = {
      id: 'app-' + Date.now(),
      number: appNumber,
      competitionId: data.competitionId,
      parcelId: data.parcelId,
      applicantId: currentUser.id,
      applicantSnapshot: {
        name: currentUser.fullName,
        maskedFin: maskFin(currentUser.fin),
        voen: currentUser.voen || null
      },
      intendedCrop: data.intendedCrop,
      plannedInvestmentAzn: data.plannedInvestmentAzn,
      ownFundsAzn: data.ownFundsAzn,
      expectedJobs: data.expectedJobs,
      planText: data.planText,
      startDate: data.startDate,
      status: data.isDraft ? 'QARALAMA' : 'QEBUL_EDILIB',
      outcome: null,
      proposedOutcome: null,
      proposedBy: null,
      proposalComment: null,
      operatorComment: null,
      ektisReference: null,
      isDraft: data.isDraft,
      location: data.location || null,
      durationMonths: data.durationMonths ?? null,
      selectedOfferId: null,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      documents: (data.documents || []).map(d => ({
        id: 'doc-' + Math.random().toString(36).substring(2, 9),
        applicationId: '',
        ...d,
        uploadedAt: new Date().toISOString()
      })),
      statusHistory: [
        {
          id: 'sh-' + Date.now(),
          applicationId: '',
          fromStatus: 'QARALAMA',
          toStatus: data.isDraft ? 'QARALAMA' : 'QEBUL_EDILIB',
          changedBy: currentUser.id,
          changedByRole: currentUser.role,
          comment: data.isDraft ? 'Qaralama yadda saxlanıldı' : 'Müraciət göndərildi',
          at: new Date().toISOString()
        }
      ]
    };

    if (!data.isDraft) {
      const ektisRes = await mockEktis.sendApplication(
        newApp.number,
        parcel.code,
        currentUser.voen || '1402345678',
        newApp.intendedCrop,
        newApp.plannedInvestmentAzn
      );
      newApp.ektisReference = ektisRes.ektisReference;
      db.addNotification(currentUser.id, 'MURACIET_STATUS', `${newApp.number} nömrəli müraciətiniz qəbul edildi və EKTİS-ə ötürüldü (simulyasiya).`, 'APPLICATION', newApp.id);
    }

    // A new draft or submission for the same parcel replaces the user's earlier draft
    db.applications = db.applications.filter(
      a => !(a.applicantId === currentUser!.id && a.parcelId === data.parcelId && a.status === 'QARALAMA')
    );
    db.applications.unshift(newApp);
    db.save();
    db.addAudit(currentUser.id, currentUser.role, 'MURACIET_GONDERILMESI', 'APPLICATION', newApp.id, `${newApp.number} nömrəli müraciət yaradıldı.`);
    return newApp;
  },

  getMyApplications(): Application[] {
    if (!currentUser) return [];
    return db.applications.filter(a => a.applicantId === currentUser!.id);
  },

  async cancelApplication(appId: string): Promise<Application> {
    if (!currentUser) throw new Error('Daxil olmamısınız.');
    const app = db.applications.find(a => a.id === appId);
    if (!app) throw new Error('Müraciət tapılmadı.');
    if (app.applicantId !== currentUser.id && currentUser.role !== 'OPERATOR' && currentUser.role !== 'TESDIQLEYICI') {
      throw new Error('Bu əməliyyat üçün icazəniz yoxdur.');
    }
    if (app.status === 'QERAR_VERILIB' || app.status === 'INVESTOR_SECILDI') {
      throw new Error('Yekun qərar verilmiş müraciət ləğv edilə bilməz.');
    }

    const prevStatus = app.status;
    app.status = 'LEGV_EDILIB';
    app.updatedAt = new Date().toISOString();
    app.statusHistory = app.statusHistory || [];
    app.statusHistory.push({
      id: 'sh-' + Date.now(),
      applicationId: app.id,
      fromStatus: prevStatus,
      toStatus: 'LEGV_EDILIB',
      changedBy: currentUser.id,
      changedByRole: currentUser.role,
      comment: 'Müraciət ərizəçi tərəfindən ləğv edildi.',
      at: new Date().toISOString()
    });

    db.save();
    db.addAudit(currentUser.id, currentUser.role, 'MURACIET_LEGVI', 'APPLICATION', app.id, `${app.number} nömrəli müraciət ləğv edildi.`);
    db.addNotification(app.applicantId, 'STATUS_YENILIK', `${app.number} nömrəli müraciətiniz ləğv edildi.`, 'APPLICATION', app.id);
    return app;
  },

  getSavedParcelIds(): string[] {
    if (!currentUser) return [];
    return getStorage<string[]>('saved_parcels_' + currentUser.id, []);
  },

  isParcelSaved(parcelId: string): boolean {
    return this.getSavedParcelIds().includes(parcelId);
  },

  toggleSavedParcel(parcelId: string): boolean {
    if (!currentUser) throw new Error('Sahəni yadda saxlamaq üçün daxil olun.');
    const list = this.getSavedParcelIds();
    let updated: string[];
    let isNowSaved = false;
    if (list.includes(parcelId)) {
      updated = list.filter(id => id !== parcelId);
    } else {
      updated = [...list, parcelId];
      isNowSaved = true;
    }
    setStorage('saved_parcels_' + currentUser.id, updated);
    return isNowSaved;
  },

  getAllApplications(filters?: { competition?: string; status?: string; parcel?: string; region?: string }): Application[] {
    if (!currentUser || (currentUser.role !== 'OPERATOR' && currentUser.role !== 'TESDIQLEYICI')) {
      throw new Error('Bu əməliyyat üçün icazəniz yoxdur.');
    }
    let res = [...db.applications].filter(a => !a.isDraft);

    if (filters?.competition) {
      res = res.filter(a => a.competitionId === filters.competition);
    }
    if (filters?.status) {
      res = res.filter(a => a.status === filters.status);
    }
    if (filters?.parcel) {
      res = res.filter(a => a.parcelId === filters.parcel);
    }
    if (filters?.region) {
      const pMap = new Map(db.parcels.map(p => [p.id, p.regionId]));
      res = res.filter(a => pMap.get(a.parcelId) === filters.region);
    }

    return res;
  },

  getApplicationById(id: string): Application | undefined {
    const app = db.applications.find(a => a.id === id);
    if (!app) return undefined;

    // Check permission
    if (!currentUser) return undefined;
    if (currentUser.role === 'INVESTOR') {
      throw new Error('İnvestorlar şəxsi müraciətlərə baxa bilməz.');
    }
    if (currentUser.role === 'SAHIBKAR' && app.applicantId !== currentUser.id) {
      throw new Error('Bu müraciətə baxış üçün icazəniz yoxdur.');
    }

    return app;
  },

  async updateApplicationStatus(id: string, toStatus: ApplicationStatus, comment?: string): Promise<Application> {
    if (!currentUser || currentUser.role !== 'OPERATOR') {
      throw new Error('Bu əməliyyat üçün icazəniz yoxdur.');
    }
    const app = db.applications.find(a => a.id === id);
    if (!app) throw new Error('Axtardığınız müraciət tapılmadı.');

    const from = app.status;

    // Validate valid transitions
    if (toStatus === 'BAXILIR') {
      if (from !== 'QEBUL_EDILIB' && from !== 'ELAVE_MELUMAT') {
        throw new Error('Bu status keçidi mümkün deyil');
      }
    } else if (toStatus === 'ELAVE_MELUMAT') {
      if (from !== 'BAXILIR') {
        throw new Error('Bu status keçidi mümkün deyil');
      }
      if (!comment || !comment.trim()) {
        throw new Error('Əlavə məlumat tələbi üçün şərh qeyd edilməlidir.');
      }
      app.operatorComment = comment;
    } else {
      throw new Error('Bu status keçidi mümkün deyil');
    }

    app.status = toStatus;
    app.updatedAt = new Date().toISOString();
    app.statusHistory = app.statusHistory || [];
    app.statusHistory.push({
      id: 'sh-' + Date.now(),
      applicationId: app.id,
      fromStatus: from,
      toStatus,
      changedBy: currentUser.id,
      changedByRole: currentUser.role,
      comment: comment || null,
      at: new Date().toISOString()
    });

    // Notify applicant
    const notifMsg = toStatus === 'ELAVE_MELUMAT'
      ? `${app.number} nömrəli müraciətiniz üzrə əlavə sənəd/məlumat tələb olunur: ${comment}`
      : `${app.number} nömrəli müraciətiniz 'Baxılır' statusuna keçirildi.`;
    db.addNotification(app.applicantId, 'STATUS_YENILIK', notifMsg, 'APPLICATION', app.id);

    db.save();
    db.addAudit(currentUser.id, currentUser.role, 'STATUS_DEYISMESI', 'APPLICATION', app.id, `${app.number} müraciəti ${from} -> ${toStatus} keçirildi.`);
    return app;
  },

  async provideInfo(id: string, newDocumentName: string, answerText?: string): Promise<Application> {
    if (!currentUser || currentUser.role !== 'SAHIBKAR') {
      throw new Error('Bu əməliyyat üçün icazəniz yoxdur.');
    }
    const app = db.applications.find(a => a.id === id);
    if (!app || app.applicantId !== currentUser.id) {
      throw new Error('Axtardığınız müraciət tapılmadı.');
    }
    if (app.status !== 'ELAVE_MELUMAT') {
      throw new Error('Bu müraciət əlavə sənəd qəbulu mərhələsində deyil.');
    }

    app.documents = app.documents || [];
    app.documents.push({
      id: 'doc-' + Date.now(),
      applicationId: app.id,
      kind: 'DIGER',
      fileName: newDocumentName,
      mimeType: 'application/pdf',
      sizeBytes: 1024 * 500,
      uploadedAt: new Date().toISOString()
    });

    const from = app.status;
    app.status = 'BAXILIR';
    app.operatorComment = null;
    app.updatedAt = new Date().toISOString();

    app.statusHistory = app.statusHistory || [];
    app.statusHistory.push({
      id: 'sh-' + Date.now(),
      applicationId: app.id,
      fromStatus: from,
      toStatus: 'BAXILIR',
      changedBy: currentUser.id,
      changedByRole: currentUser.role,
      comment: answerText ? `Əlavə sənəd yükləndi. Sahibkar cavabı: ${answerText}` : 'Əlavə sənəd yükləndi.',
      at: new Date().toISOString()
    });

    db.save();
    db.addAudit(currentUser.id, currentUser.role, 'ELAVE_SENED_GONDERILDI', 'APPLICATION', app.id, `${app.number} üçün əlavə sənəd təqdim edildi.`);
    return app;
  },

  async proposeDecision(id: string, outcome: Outcome, comment: string): Promise<Application> {
    if (!currentUser || currentUser.role !== 'OPERATOR') {
      throw new Error('Bu əməliyyat üçün icazəniz yoxdur.');
    }
    if (!comment || !comment.trim()) {
      throw new Error('Qərar təklifi üçün şərh yazılmalıdır.');
    }
    const app = db.applications.find(a => a.id === id);
    if (!app) throw new Error('Axtardığınız müraciət tapılmadı.');
    if (app.status !== 'BAXILIR') {
      throw new Error('Bu status keçidi mümkün deyil');
    }

    app.proposedOutcome = outcome;
    app.proposedBy = currentUser.id;
    app.proposalComment = comment;
    app.updatedAt = new Date().toISOString();

    db.save();
    db.addAudit(currentUser.id, currentUser.role, 'QERAR_TEKLIFI', 'APPLICATION', app.id, `${app.number} üçün ${outcome} təklif edildi: ${comment}`);
    return app;
  },

  async confirmDecision(id: string): Promise<Application> {
    if (!currentUser || currentUser.role !== 'TESDIQLEYICI') {
      throw new Error('Bu əməliyyat üçün icazəniz yoxdur.');
    }
    const app = db.applications.find(a => a.id === id);
    if (!app || !app.proposedOutcome) {
      throw new Error('Təsdiq üçün gözləyən təklif tapılmadı.');
    }
    // Four-eyes rule: confirmedBy must differ from proposedBy
    if (app.proposedBy === currentUser.id) {
      throw new Error('Dörd göz prinsipi: Qərar təklifini irəli sürən şəxs onu təsdiq edə bilməz.');
    }

    const from = app.status;
    const outcome = app.proposedOutcome;
    app.status = 'QERAR_VERILIB';
    app.outcome = outcome;
    app.updatedAt = new Date().toISOString();

    app.statusHistory = app.statusHistory || [];
    app.statusHistory.push({
      id: 'sh-' + Date.now(),
      applicationId: app.id,
      fromStatus: from,
      toStatus: 'QERAR_VERILIB',
      changedBy: currentUser.id,
      changedByRole: currentUser.role,
      comment: `Təsdiqçi tərəfindən qərar təsdiqləndi: ${outcome === 'TESDIQLENIB' ? 'Təsdiq edilib' : 'Rədd edilib'} (${app.proposalComment})`,
      at: new Date().toISOString()
    });

    // Mock EKTIS call
    await mockEktis.sendDecision(app.number, outcome, new Date().toISOString());

    // If approved:
    if (outcome === 'TESDIQLENIB') {
      // 1. Parcel becomes AYRILIB
      const p = db.parcels.find(x => x.id === app.parcelId);
      if (p) {
        p.status = 'AYRILIB';
      }

      // 2. Auto-reject other open applications for this parcel
      for (const other of db.applications) {
        if (other.id !== app.id && other.parcelId === app.parcelId && other.status !== 'QERAR_VERILIB') {
          const oldSt = other.status;
          other.status = 'QERAR_VERILIB';
          other.outcome = 'REDD_EDILIB';
          other.updatedAt = new Date().toISOString();
          other.statusHistory = other.statusHistory || [];
          other.statusHistory.push({
            id: 'sh-' + Date.now(),
            applicationId: other.id,
            fromStatus: oldSt,
            toStatus: 'QERAR_VERILIB',
            changedBy: currentUser.id,
            changedByRole: currentUser.role,
            comment: 'Bu sahə başqa müraciətçiyə ayrılıb',
            at: new Date().toISOString()
          });
          db.addNotification(other.applicantId, 'STATUS_YENILIK', `${other.number} nömrəli müraciətiniz üzrə qərar: Bu sahə başqa müraciətçiyə ayrılıb.`, 'APPLICATION', other.id);
        }
      }

      db.addNotification(app.applicantId, 'STATUS_YENILIK', `Təbriklər! ${app.number} nömrəli müraciətiniz təsdiqləndi və torpaq sahəsi ayrıldı. İndi layihənizi investorlara təqdim edə bilərsiniz.`, 'APPLICATION', app.id);
    } else {
      db.addNotification(app.applicantId, 'STATUS_YENILIK', `${app.number} nömrəli müraciətiniz rədd edildi. Müsabiqə müddəti bitməyibsə yenidən müraciət edə bilərsiniz.`, 'APPLICATION', app.id);
    }

    db.save();
    db.addAudit(currentUser.id, currentUser.role, 'QERAR_TESDIQI', 'APPLICATION', app.id, `${app.number} üçün qərar (${outcome}) təsdiqləndi.`);
    return app;
  },

  async returnProposal(id: string, comment: string): Promise<Application> {
    if (!currentUser || currentUser.role !== 'TESDIQLEYICI') {
      throw new Error('Bu əməliyyat üçün icazəniz yoxdur.');
    }
    if (!comment || !comment.trim()) {
      throw new Error('Qaytarma səbəbini qeyd edin.');
    }
    const app = db.applications.find(a => a.id === id);
    if (!app) throw new Error('Axtardığınız müraciət tapılmadı.');

    app.proposedOutcome = null;
    app.proposedBy = null;
    app.proposalComment = null;
    app.updatedAt = new Date().toISOString();

    app.statusHistory = app.statusHistory || [];
    app.statusHistory.push({
      id: 'sh-' + Date.now(),
      applicationId: app.id,
      fromStatus: app.status,
      toStatus: app.status,
      changedBy: currentUser.id,
      changedByRole: currentUser.role,
      comment: `Qərar təklifi yenidən baxılması üçün qaytarıldı: ${comment}`,
      at: new Date().toISOString()
    });

    db.save();
    db.addAudit(currentUser.id, currentUser.role, 'QERAR_QAYTARILMASI', 'APPLICATION', app.id, `${app.number} qərar təklifi qaytarıldı: ${comment}`);
    return app;
  },

  // Project Listings for Investors
  getListings(): ProjectListing[] {
    return db.projects.map(p => {
      const ints = db.investorInterests[p.id] || [];
      return {
        ...p,
        interestCount: ints.length,
        interestedByMe: currentUser ? ints.includes(currentUser.id) : false
      };
    });
  },

  getListingById(id: string): ProjectListing | undefined {
    const p = db.projects.find(x => x.id === id);
    if (!p) return undefined;
    const ints = db.investorInterests[p.id] || [];
    return {
      ...p,
      interestCount: ints.length,
      interestedByMe: currentUser ? ints.includes(currentUser.id) : false
    };
  },

  async createListing(data: {
    applicationId: string;
    parcelId: string;
    crop: string;
    requiredFundingAzn: number;
    expectedJobs: number;
    summary: string;
  }): Promise<ProjectListing> {
    if (!currentUser || currentUser.role !== 'SAHIBKAR') {
      throw new Error('Bu əməliyyat üçün icazəniz yoxdur.');
    }

    const app = db.applications.find(a => a.id === data.applicationId);
    if (!app || app.applicantId !== currentUser.id || app.outcome !== 'TESDIQLENIB') {
      throw new Error('Yalnız dövlət tərəfindən təsdiq edilmiş müraciətlər üçün investor layihəsi yaradıla bilər.');
    }

    if (db.projects.some(p => p.applicationId === data.applicationId)) {
      throw new Error('Bu layihə üçün artıq investor təqdimatı mövcuddur.');
    }

    const newListing: ProjectListing = {
      id: 'proj-' + Date.now(),
      applicationId: data.applicationId,
      parcelId: data.parcelId,
      entrepreneurId: currentUser.id,
      entrepreneurMasked: currentUser.fullName.split(' ').map(n => n.charAt(0) + '.').join(' '),
      crop: data.crop,
      requiredFundingAzn: data.requiredFundingAzn,
      expectedJobs: data.expectedJobs,
      summary: data.summary,
      visible: true,
      createdAt: new Date().toISOString()
    };

    db.projects.push(newListing);
    db.save();
    db.addAudit(currentUser.id, currentUser.role, 'LAYIHE_YARADILMASI', 'PROJECT', newListing.id, `İnvestorlar üçün ${newListing.id} layihəsi dərc edildi.`);
    return newListing;
  },

  async expressInterest(listingId: string): Promise<boolean> {
    if (!currentUser || currentUser.role !== 'INVESTOR') {
      throw new Error('Bu əməliyyat üçün icazəniz yoxdur.');
    }

    const listing = db.projects.find(p => p.id === listingId);
    if (!listing) throw new Error('Axtardığınız layihə tapılmadı.');

    const current = db.investorInterests[listingId] || [];
    if (current.includes(currentUser.id)) {
      throw new Error('Bu layihəyə artıq maraq bildirmisiniz.');
    }

    current.push(currentUser.id);
    db.investorInterests[listingId] = current;

    // Send notification to entrepreneur
    db.addNotification(
      listing.entrepreneurId,
      'INVESTOR_MARAQ',
      `İnvestor layihənizlə maraqlanır: ${listing.crop} layihəsi üzrə əməkdaşlıq təşəbbüsü daxil oldu.`,
      'PROJECT',
      listing.id
    );

    db.save();
    db.addAudit(currentUser.id, currentUser.role, 'MARAQ', 'PROJECT', listing.id, `İnvestor ${listing.id} layihəsinə maraq bildirdi.`);
    return true;
  },

  // Land-use zones (arable / hayfield / pasture) of a parcel
  getLandZones(parcelId: string): LandZone[] {
    return db.landZones[parcelId] || [];
  },

  // Investor offers
  getOffersForApplication(applicationId: string): InvestorOffer[] {
    if (!currentUser) return [];
    const app = db.applications.find(a => a.id === applicationId);
    if (!app) return [];
    const offers = db.offers.filter(o => o.applicationId === applicationId);
    if (currentUser.role === 'SAHIBKAR') {
      return app.applicantId === currentUser.id ? offers : [];
    }
    if (currentUser.role === 'INVESTOR') {
      return offers.filter(o => o.investorId === currentUser!.id);
    }
    return offers;
  },

  getMyOffers(): InvestorOffer[] {
    if (!currentUser || currentUser.role !== 'INVESTOR') return [];
    return db.offers
      .filter(o => o.investorId === currentUser!.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  // Offers are accepted only for approved applications that have not chosen an investor yet
  isAcceptingOffers(applicationId: string): boolean {
    const app = db.applications.find(a => a.id === applicationId);
    return Boolean(app && app.status === 'QERAR_VERILIB' && app.outcome === 'TESDIQLENIB');
  },

  async createOffer(data: {
    applicationId: string;
    amountAzn: number;
    model: OfferModel;
    ownerSharePct?: number | null;
    leaseFeeAznPerYear?: number | null;
    durationMonths: number;
    startDate?: string | null;
    plannedActivity: string;
    message: string;
    company: string;
    profile: string;
  }): Promise<InvestorOffer> {
    if (!currentUser || currentUser.role !== 'INVESTOR') {
      throw new Error('Bu əməliyyat üçün icazəniz yoxdur.');
    }
    const app = db.applications.find(a => a.id === data.applicationId);
    if (!app) throw new Error('Axtardığınız müraciət tapılmadı.');
    if (!this.isAcceptingOffers(app.id)) {
      throw new Error('Bu layihə üzrə təklif qəbulu bağlanıb.');
    }
    if (db.offers.some(o => o.applicationId === app.id && o.investorId === currentUser!.id && o.status === 'GOZLEMEDE')) {
      throw new Error('Bu layihəyə artıq gözləmədə olan təklifiniz var.');
    }
    if (!(data.amountAzn > 0)) throw new Error('İnvestisiya məbləğini daxil edin.');
    if (!Number.isInteger(data.durationMonths) || data.durationMonths < 1 || data.durationMonths > 600) {
      throw new Error('İcra müddəti 1–600 ay aralığında olmalıdır.');
    }
    if (data.model === 'ICARE') {
      if (!(Number(data.leaseFeeAznPerYear) > 0)) throw new Error('İllik icarə haqqını daxil edin.');
    } else {
      const pct = Number(data.ownerSharePct);
      if (!(pct > 0 && pct < 100)) throw new Error('Torpaq sahibinin gəlir payı 1–99% arasında olmalıdır.');
    }
    if (!data.plannedActivity.trim()) throw new Error('Planlaşdırılan fəaliyyəti qeyd edin.');

    const offer: InvestorOffer = {
      id: 'off-' + Date.now(),
      applicationId: app.id,
      investorId: currentUser.id,
      investorName: currentUser.fullName,
      company: data.company.trim() || currentUser.fullName,
      profile: data.profile.trim(),
      amountAzn: data.amountAzn,
      model: data.model,
      ownerSharePct: data.model === 'ICARE' ? null : Number(data.ownerSharePct),
      leaseFeeAznPerYear: data.model === 'ICARE' ? Number(data.leaseFeeAznPerYear) : null,
      durationMonths: data.durationMonths,
      startDate: data.startDate || null,
      plannedActivity: data.plannedActivity.trim(),
      message: data.message.trim(),
      status: 'GOZLEMEDE',
      createdAt: new Date().toISOString(),
      decidedAt: null
    };
    db.offers.push(offer);
    db.addNotification(
      app.applicantId,
      'INVESTOR_TEKLIFI',
      `${app.number} nömrəli müraciətinizə yeni investor təklifi daxil oldu: ${offer.company}, ${offer.amountAzn.toLocaleString('az-AZ')} ₼.`,
      'APPLICATION',
      app.id
    );
    db.save();
    db.addAudit(currentUser.id, currentUser.role, 'TEKLIF_GONDERILMESI', 'OFFER', offer.id, `${app.number} üzrə investor təklifi göndərildi.`);
    return offer;
  },

  async selectOffer(offerId: string): Promise<Application> {
    if (!currentUser || currentUser.role !== 'SAHIBKAR') {
      throw new Error('Bu əməliyyat üçün icazəniz yoxdur.');
    }
    const chosen = db.offers.find(o => o.id === offerId);
    if (!chosen) throw new Error('Təklif tapılmadı.');
    const app = db.applications.find(a => a.id === chosen.applicationId);
    if (!app || app.applicantId !== currentUser.id) {
      throw new Error('Bu müraciət üzrə icazəniz yoxdur.');
    }
    if (app.status !== 'QERAR_VERILIB' || app.outcome !== 'TESDIQLENIB') {
      throw new Error('Bu müraciət üzrə investor artıq seçilib və ya təklif qəbulu bağlıdır.');
    }
    if (chosen.status !== 'GOZLEMEDE') {
      throw new Error('Bu təklif artıq qiymətləndirilib.');
    }

    const now = new Date().toISOString();
    for (const o of db.offers) {
      if (o.applicationId !== app.id || o.status !== 'GOZLEMEDE') continue;
      const accepted = o.id === chosen.id;
      o.status = accepted ? 'QEBUL_EDILDI' : 'REDD_EDILDI';
      o.decidedAt = now;
      db.addNotification(
        o.investorId,
        'TEKLIF_NETICESI',
        accepted
          ? `Təbriklər! ${app.number} nömrəli layihə üzrə təklifiniz torpaq sahibi tərəfindən qəbul edildi.`
          : `${app.number} nömrəli layihə üzrə torpaq sahibi başqa investoru seçdi. Təklifiniz rədd edildi.`,
        'OFFER',
        o.id
      );
    }

    const from = app.status;
    app.status = 'INVESTOR_SECILDI';
    app.selectedOfferId = chosen.id;
    app.updatedAt = now;
    app.statusHistory = app.statusHistory || [];
    app.statusHistory.push({
      id: 'sh-' + Date.now(),
      applicationId: app.id,
      fromStatus: from,
      toStatus: 'INVESTOR_SECILDI',
      changedBy: currentUser.id,
      changedByRole: currentUser.role,
      comment: `İnvestor seçildi: ${chosen.company}. Yeni təklif qəbulu bağlandı.`,
      at: now
    });

    db.save();
    db.addAudit(currentUser.id, currentUser.role, 'INVESTOR_SECIMI', 'APPLICATION', app.id, `${app.number} üçün ${chosen.company} investor kimi seçildi.`);
    return app;
  },

  // Notifications
  getNotifications(): Notification[] {
    if (!currentUser) return [];
    return db.notifications.filter(n => n.userId === currentUser!.id);
  },

  markNotificationAsRead(id: string): void {
    const notif = db.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      db.save();
    }
  },

  markAllNotificationsAsRead(): void {
    if (!currentUser) return;
    for (const n of db.notifications) {
      if (n.userId === currentUser.id) {
        n.read = true;
      }
    }
    db.save();
  },

  // Statistics
  getStatistics() {
    const totalParcels = db.parcels.length;
    const allocatedParcels = db.parcels.filter(p => p.status === 'AYRILIB');
    const allocatedHa = allocatedParcels.reduce((sum, p) => sum + p.areaHa, 0);

    const openCompetitions = db.competitions.filter(c => c.status === 'DERC_EDILIB').length;
    const applicationsCount = db.applications.filter(a => !a.isDraft).length;

    // Status counts
    const statusCounts: Record<string, number> = {
      QEBUL_EDILIB: 0,
      BAXILIR: 0,
      ELAVE_MELUMAT: 0,
      QERAR_VERILIB: 0
    };
    for (const a of db.applications) {
      if (!a.isDraft && statusCounts[a.status] !== undefined) {
        statusCounts[a.status]++;
      }
    }

    // Allocated ha by region
    const allocatedByRegion: Record<string, number> = {};
    for (const r of db.regions) {
      allocatedByRegion[r.name] = 0;
    }
    for (const p of allocatedParcels) {
      const reg = db.regions.find(r => r.id === p.regionId);
      if (reg) {
        allocatedByRegion[reg.name] = (allocatedByRegion[reg.name] || 0) + p.areaHa;
      }
    }

    // Investor interests count
    let totalInterests = 0;
    for (const k in db.investorInterests) {
      totalInterests += db.investorInterests[k].length;
    }

    return {
      totalParcels,
      allocatedParcelsCount: allocatedParcels.length,
      allocatedHa,
      openCompetitions,
      applicationsCount,
      statusCounts,
      allocatedByRegion,
      totalInterests
    };
  },

  // Audit Logs
  getAuditLogs(): AuditLogEntry[] {
    if (!currentUser || (currentUser.role !== 'OPERATOR' && currentUser.role !== 'TESDIQLEYICI')) {
      throw new Error('Bu əməliyyat üçün icazəniz yoxdur.');
    }
    return db.auditLogs;
  },

  resetToDefault() {
    db.resetToDefault();
  }
};
