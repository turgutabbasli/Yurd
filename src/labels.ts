export const LABELS = {
  // Əsas düymələr və naviqasiya
  login: 'Daxil ol',
  logout: 'Çıxış',
  register: 'Qeydiyyat',
  testLoginStrip: 'Sınaq girişi',
  next: 'Növbəti',
  back: 'Geri',
  save: 'Yadda saxla',
  cancel: 'Ləğv et',
  close: 'Bağla',
  submitApplication: 'Müraciəti göndər',
  apply: 'Müraciət et',
  compare: 'Müqayisə et',
  addToCompare: 'Müqayisəyə əlavə et',
  details: 'Ətraflı',
  loading: 'Yüklənir…',
  errorGeneral: 'Xəta baş verdi. Bir az sonra yenidən cəhd et.',
  retry: 'Yenidən cəhd et',
  emptyList: 'Hələ heç nə yoxdur.',
  forbidden: 'Bu əməliyyat üçün icazəniz yoxdur.',
  notFound: 'Axtardığınız məlumat tapılmadı.',
  invalidTransition: 'Bu status keçidi mümkün deyil',
  deadlinePassed: 'Müraciət müddəti bitib',
  rateLimitError: 'Çox sayda uğursuz cəhd. Bir dəqiqə sonra yenidən yoxlayın.',
  
  // Tənzimləmə və seçimlər
  fixedMinistryNotice: 'Seçim qaydası nazirlik tərəfindən müəyyən edilir.',
  
  // İşıqfor
  trafficLight: {
    YASIL: 'Əla uyğun',
    SARI: 'Orta uyğun',
    QIRMIZI: 'Riskli'
  },

  // Sahə statusları
  parcelStatus: {
    ACIQ: 'Müraciətə açıq',
    BAGLI: 'Müraciət qəbulu bağlıdır',
    AYRILIB: 'Torpaq ayrılıb'
  },

  // Mina statusları
  demining: {
    TEMIZLENIB: 'Təmizlənib',
    GOZLEYIR: 'Gözləyir',
    MELUM_DEYIL: 'Məlum deyil'
  },

  // Mənbə nişanları
  badges: {
    HEQIQI: 'Həqiqi',
    TEXMINI: 'Təxmini',
    SIMULYASIYA: 'Simulyasiya',
    NUMUNE: 'Nümunə məlumat'
  },

  // Fəaliyyət istiqamətləri
  activities: {
    BAGCHILIQ: 'Bağçılıq',
    EKINCILIK: 'Əkinçilik',
    HEYVANDARLIQ: 'Heyvandarlıq',
    ARICILIQ: 'Arıçılıq',
    DIGER: 'Digər',
    BILMIREM: 'Bilmirəm, sistem məsləhət versin'
  },

  // İcazə verilən istifadələr
  allowedUses: {
    MEYVE_BAGI: 'Meyvə bağı',
    UZUMLUK: 'Üzümlük',
    TAXIL: 'Taxılçılıq',
    PAMBIQ: 'Pambıqçılıq',
    HEYVANDARLIQ: 'Heyvandarlıq',
    ARICILIQ: 'Arıçılıq',
    DIGER: 'Digər'
  },

  // Rollar
  roles: {
    SAHIBKAR: 'Sahibkar',
    INVESTOR: 'İnvestor',
    OPERATOR: 'Nazirlik operatoru',
    TESDIQLEYICI: 'Nazirlik təsdiqləyicisi'
  },

  // Şəxs növləri
  entityTypes: {
    FIZIKI_SEXS: 'Fiziki şəxs',
    FERDI_SAHIBKAR: 'Fərdi sahibkar',
    SIRKET: 'Şirkət'
  },

  // Müsabiqə statusları
  competitionStatus: {
    QARALAMA: 'Qaralama',
    TESDIQ_GOZLEYIR: 'Təsdiq gözləyir',
    DERC_EDILIB: 'Dərc edilib',
    BAGLANIB: 'Qəbul bağlanıb'
  },

  // Müraciət statusları
  applicationStatus: {
    QARALAMA: 'Qaralama',
    QEBUL_EDILIB: 'Qəbul edilib',
    BAXILIR: 'Baxılır',
    ELAVE_MELUMAT: 'Əlavə məlumat tələb olunur',
    QERAR_VERILIB: 'Qərar verilib',
    LEGV_EDILIB: 'Ləğv edilib',
    INVESTOR_SECILDI: 'İnvestor seçildi'
  },

  // İnvestor təklifləri
  offerModels: {
    ICARE: 'İcarə',
    GELIR_BOLGUSU: 'Gəlir bölgüsü',
    BIRGE_MUESSISE: 'Birgə müəssisə'
  },
  offerStatus: {
    GOZLEMEDE: 'Gözləmədə',
    QEBUL_EDILDI: 'Qəbul edildi',
    REDD_EDILDI: 'Rədd edildi'
  },

  // Qərarlar
  outcomes: {
    TESDIQLENIB: 'Təsdiq edilib',
    REDD_EDILIB: 'Rədd edilib'
  },

  // Nazirlik əməliyyatları
  ministryActions: {
    moveToReview: 'Baxılır-a keçir',
    requestInfo: 'Əlavə məlumat istə',
    proposeApproval: 'Təsdiq etməyi təklif et',
    proposeRejection: 'Rədd etməyi təklif et',
    confirm: 'Təsdiqlə',
    returnProposal: 'Qaytar',
    submitForApproval: 'Təsdiqə göndər',
    approveAndPublish: 'Təsdiqlə və dərc et',
    closeCompetition: 'Qəbulu bağla'
  },

  // İnvestor
  investor: {
    interested: 'Maraqlanıram',
    alreadyInterested: 'Maraq bildirilib',
    toastSent: 'Sahibkara bildiriş göndərildi'
  },

  // Bildirişlər və filtrlər
  notifications: 'Bildirişlər',
  markAllRead: 'Hamısını oxunmuş et',
  filters: 'Filtrlər',
  resetFilter: 'Filtri sıfırla',
  mapView: 'Xəritə',
  listView: 'Siyahı',

  // Sənəd növləri
  documentKinds: {
    SEXSIYYET: 'Şəxsiyyət vəsiqəsi / qeydiyyat şəhadətnaməsi',
    BIZNES_PLAN: 'Biznes plan',
    MALI_SENED: 'Maliyyə sənədi',
    DIGER: 'Digər sənəd'
  },

  // Qiymətləndirmə kateqoriyaları
  scoringCategories: {
    chemistry: 'Torpaq kimyası',
    structure: 'Torpaq quruluşu',
    climate: 'İqlim',
    water: 'Su',
    relief: 'Relyef',
    cover: 'Ərazi örtüyü'
  }
};

/**
 * Məbləğ formatı: 25 000 ₼
 */
export function formatMoney(amount: number): string {
  if (isNaN(amount)) return '0 ₼';
  const parts = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${parts} ₼`;
}

/**
 * Sahə formatı: 42 ha
 */
export function formatArea(ha: number): string {
  if (isNaN(ha)) return '0 ha';
  const val = ha % 1 === 0 ? ha.toString() : ha.toString().replace('.', ',');
  return `${val} ha`;
}

/**
 * Ədəd və kəmiyyət formatı vergüllə: 6,8
 */
export function formatDecimal(val: number, decimals: number = 1): string {
  if (isNaN(val)) return '0';
  return val.toFixed(decimals).replace('.', ',');
}

/**
 * Tarix formatı: "15 oktyabr 2026"
 */
export function formatDateAz(dateStr: string | Date): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const months = [
    'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
    'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'
  ];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Gün sayı və geri sayım formatı: "12 gün qalıb"
 */
export function formatCountdown(deadlineStr: string): string {
  if (!deadlineStr) return '';
  const deadline = new Date(deadlineStr).getTime();
  const now = Date.now();
  const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) {
    return 'Müraciət müddəti bitib';
  }
  return `${diffDays} gün qalıb`;
}

/**
 * FİN maskalanması: 5AB***D
 */
export function maskFin(fin: string): string {
  if (!fin || fin.length < 5) return fin || '';
  return `${fin.slice(0, 3)}***${fin.slice(-1)}`;
}

/**
 * İcra müddəti: 50 → "4 il 2 ay", 12 → "1 il", 7 → "7 ay"
 */
export function formatMonthsAsYears(months: number): string {
  if (!Number.isFinite(months) || months <= 0) return '';
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} ay`;
  if (m === 0) return `${y} il`;
  return `${y} il ${m} ay`;
}

/**
 * Cədvəl və kartlar üçün: "50 ay (4 il 2 ay)", "7 ay"
 */
export function formatDurationMonths(months: number | null | undefined): string {
  if (!months || months <= 0) return '—';
  if (months < 12) return `${months} ay`;
  return `${months} ay (${formatMonthsAsYears(months)})`;
}

/**
 * Başlama tarixinə ay əlavə edib "Dekabr 2030" formatında qaytarır
 */
export function formatEndMonth(startDate: string, months: number): string {
  const d = new Date(startDate);
  if (isNaN(d.getTime()) || !months || months <= 0) return '';
  const end = new Date(d.getFullYear(), d.getMonth() + months, d.getDate());
  const names = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
  return `${names[end.getMonth()]} ${end.getFullYear()}`;
}

// Torpağın istifadə zonaları
export const LAND_ZONES: Record<'EKIN' | 'BICENEK' | 'OTLAQ', { name: string; fill: string; stroke: string }> = {
  EKIN: { name: 'Əkin sahəsi', fill: '#E0B43A', stroke: '#A67C12' },
  BICENEK: { name: 'Biçənək sahəsi', fill: '#9BD15F', stroke: '#5E9A2A' },
  OTLAQ: { name: 'Otlaq sahəsi', fill: '#2E7D32', stroke: '#1B5E20' }
};
