export type Role = 'SAHIBKAR' | 'INVESTOR' | 'OPERATOR' | 'TESDIQLEYICI';
export type EntityType = 'FIZIKI_SEXS' | 'FERDI_SAHIBKAR' | 'SIRKET';
export type DeminingStatus = 'TEMIZLENIB' | 'GOZLEYIR' | 'MELUM_DEYIL';
export type ParcelStatus = 'ACIQ' | 'BAGLI' | 'AYRILIB';
export type CompetitionStatus = 'QARALAMA' | 'TESDIQ_GOZLEYIR' | 'DERC_EDILIB' | 'BAGLANIB';
export type ApplicationStatus = 'QARALAMA' | 'QEBUL_EDILIB' | 'BAXILIR' | 'ELAVE_MELUMAT' | 'QERAR_VERILIB' | 'LEGV_EDILIB' | 'INVESTOR_SECILDI';
export type Outcome = 'TESDIQLENIB' | 'REDD_EDILIB';
export type SourceBadge = 'HEQIQI' | 'TEXMINI' | 'SIMULYASIYA' | 'NUMUNE';
export type TrafficLight = 'YASIL' | 'SARI' | 'QIRMIZI';

export type AllowedUse = 'MEYVE_BAGI' | 'UZUMLUK' | 'TAXIL' | 'PAMBIQ' | 'HEYVANDARLIQ' | 'ARICILIQ' | 'DIGER';
export type ActivityKey = 'BAGCHILIQ' | 'EKINCILIK' | 'HEYVANDARLIQ' | 'ARICILIQ' | 'BILMIREM' | 'DIGER';

export interface User {
  id: string;
  email: string;
  password?: string;
  role: Role;
  fullName: string;
  entityType: EntityType;
  fin: string;
  voen?: string | null;
  phone: string;
  consentAt: string;
  createdAt: string;
  active: boolean;
  isTestAccount?: boolean;
  // Foreign citizens register with passport data instead of FİN / myGov
  isForeign?: boolean;
  citizenship?: string | null;
  passportNumber?: string | null;
  birthDate?: string | null;
  passportExpiry?: string | null;
}

export interface Region {
  id: string;
  name: string;
  centerLat: number;
  centerLon: number;
  description?: string;
}

export interface ParcelSoilData {
  ph: number;
  socGperKg: number;
  nGperKg: number;
  clayPct: number;
  sandPct: number;
  siltPct: number;
  cecCmolPerKg: number;
  salinityEc?: number | null;
  source: string;
  badge: 'Nümunə məlumat' | 'Həqiqi' | 'Təxmini' | 'Simulyasiya';
}

export interface ParcelClimateData {
  growSeasonMeanTempC: number;
  annualPrecipMm: number;
  solarMjM2Day: number;
  soilMoistureIndex: number;
  source: string;
  badge: 'Həqiqi' | 'Nümunə məlumat' | 'Təxmini' | 'Simulyasiya';
}

export interface ParcelReliefData {
  elevationM: number;
  slopeDeg: number;
  source: string;
  badge: 'Nümunə məlumat' | 'Həqiqi' | 'Təxmini' | 'Simulyasiya';
}

export interface ParcelDistancesData {
  nearestRoadKm: number;
  nearestWaterKm: number;
  nearestWaterName: string;
  source: string;
  badge: 'Nümunə məlumat' | 'Həqiqi' | 'Təxmini' | 'Simulyasiya';
}

export interface ParcelData {
  soil: ParcelSoilData;
  climate: ParcelClimateData;
  relief: ParcelReliefData;
  distances: ParcelDistancesData;
  ndvi?: Array<{ year: number; value: number }>;
  ndviSource?: string;
  ndviBadge?: 'Nümunə məlumat' | 'Həqiqi' | 'Təxmini' | 'Simulyasiya';
}

export interface Parcel {
  id: string;
  code: string;
  name: string;
  regionId: string;
  village: string;
  areaHa: number;
  geometry: string; // GeoJSON Polygon
  centroidLat: number;
  centroidLon: number;
  allowedUses: AllowedUse[];
  pricePerHaYearAzn: number;
  deminingStatus: DeminingStatus;
  status: ParcelStatus;
  competitionId?: string | null;
  data: ParcelData;
  createdAt: string;
}

export interface Crop {
  key: string;
  name: string;
  activity: string;
  ph: [number, number, number, number];
  temp: [number, number, number, number];
  precip: [number, number, number, number];
  slope: [number, number, number, number];
  elevation: [number, number, number, number];
  irrigated: 'yes' | 'no' | 'partly';
}

export interface Competition {
  id: string;
  number: string;
  name: string;
  directions: AllowedUse[];
  announceDate: string;
  applyStart: string;
  applyDeadline: string;
  leaseInitialYears: number;
  leaseExtensionYears: number;
  minProjectHa: number;
  participationFeeAzn: number;
  conditionsText: string;
  status: CompetitionStatus;
  createdBy: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  returnComment?: string | null;
  createdAt: string;
}

export interface ApplicationStatusHistory {
  id: string;
  applicationId: string;
  fromStatus: ApplicationStatus;
  toStatus: ApplicationStatus;
  changedBy: string;
  changedByRole: Role;
  comment?: string | null;
  at: string;
}

export interface ApplicationDocument {
  id: string;
  applicationId: string;
  kind: 'SEXSIYYET' | 'BIZNES_PLAN' | 'MALI_SENED' | 'DIGER';
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface Application {
  id: string;
  number: string;
  competitionId: string;
  parcelId: string;
  applicantId: string;
  applicantSnapshot: {
    name: string;
    maskedFin: string;
    voen?: string | null;
  };
  intendedCrop: string;
  plannedInvestmentAzn: number;
  ownFundsAzn: number;
  expectedJobs: number;
  planText: string;
  startDate: string;
  status: ApplicationStatus;
  outcome?: Outcome | null;
  proposedOutcome?: Outcome | null;
  proposedBy?: string | null;
  proposalComment?: string | null;
  operatorComment?: string | null;
  ektisReference?: string | null;
  isDraft: boolean;
  submittedAt: string;
  updatedAt: string;
  statusHistory?: ApplicationStatusHistory[];
  documents?: ApplicationDocument[];
  location?: ApplicationLocation | null;
  selectedOfferId?: string | null;
  durationMonths?: number | null; // execution period
}

// Land location marked by the applicant on the map
export interface ApplicationLocation {
  lat: number;
  lon: number;
  polygon?: Array<[number, number]> | null; // [lat, lon] vertices
  polygonAreaHa?: number | null;
}

export type OfferModel = 'ICARE' | 'GELIR_BOLGUSU' | 'BIRGE_MUESSISE';
export type OfferStatus = 'GOZLEMEDE' | 'QEBUL_EDILDI' | 'REDD_EDILDI';

// An investor's proposal for an approved application
export interface InvestorOffer {
  id: string;
  applicationId: string;
  investorId: string;
  investorName: string;
  company: string;
  profile: string;
  amountAzn: number;
  model: OfferModel;
  ownerSharePct?: number | null; // landowner's share of revenue (GELIR_BOLGUSU / BIRGE_MUESSISE)
  leaseFeeAznPerYear?: number | null; // annual lease fee paid to the landowner (ICARE)
  durationMonths: number; // execution period in months
  startDate?: string | null;
  durationYears?: number; // legacy field of offers stored before months were used
  plannedActivity: string;
  message: string;
  status: OfferStatus;
  createdAt: string;
  decidedAt?: string | null;
}

export interface ProjectListing {
  id: string;
  applicationId: string;
  parcelId: string;
  entrepreneurId: string;
  entrepreneurMasked: string;
  crop: string;
  requiredFundingAzn: number;
  expectedJobs: number;
  summary: string;
  visible: boolean;
  createdAt: string;
  interestCount?: number;
  interestedByMe?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  text: string;
  refType?: string;
  refId?: string;
  read: boolean;
  createdAt: string;
}

export interface EktisLogEntry {
  id: string;
  direction: 'GEDEN' | 'GELEN';
  endpoint: string;
  requestBody: any;
  responseBody: any;
  httpStatus: number;
  correlationId: string;
  success: boolean;
  at: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  role: Role;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  ip: string;
  at: string;
}

export interface CategoryBreakdown {
  key: string;
  label: string;
  weight: number;
  value: number; // 0..1
  light: TrafficLight;
  sentence: string;
  rawValues: string;
  source: string;
  badge: string;
}

export interface SuitabilityResult {
  score: number | null;
  excluded: boolean;
  exclusionReason?: string | null;
  trafficLight: TrafficLight | null;
  reasonSentence: string;
  breakdown: CategoryBreakdown[];
  cropKey: string;
  cropName: string;
}

// Land-use zone inside a parcel (arable / hayfield / pasture)
export type LandZoneType = 'EKIN' | 'BICENEK' | 'OTLAQ';
export interface LandZone {
  type: LandZoneType;
  areaHa: number;
  sharePct: number;
  polygon: Array<[number, number]>; // [lat, lon]
}
