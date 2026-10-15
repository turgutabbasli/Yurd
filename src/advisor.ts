import { Parcel, Crop, SuitabilityResult } from './types';
import { calculateSuitabilityScore } from './scoring';
import { formatDecimal } from './labels';

export interface AdvisorResponse {
  answer: string;
  sources: string[];
  disclaimer: string;
}

const DISCLAIMER_TEXT = 'Bu, məsləhətdir, rəsmi qərar deyil.';

export async function askAdvisor(
  parcel: Parcel,
  question: string,
  mode: 'SAHIBKAR' | 'INVESTOR',
  crop: Crop
): Promise<AdvisorResponse> {
  const suitability = calculateSuitabilityScore(parcel, crop);

  // Construct structured context card
  const context = `
Sahə: ${parcel.name} (${parcel.code})
Rayon və kənd: ${parcel.village}, ${parcel.regionId}
Sahə ölçüsü: ${parcel.areaHa} ha
İcazə verilən istifadələr: ${parcel.allowedUses.join(', ')}
İllik icarə haqqı: ${parcel.pricePerHaYearAzn} ₼/ha
Mina statusu: ${parcel.deminingStatus} (Mənbə: Simulyasiya)
Torpaq balı (${crop.name} üçün): ${suitability.score ?? 'Uyğun deyil (istisna)'} / 100
İşıqfor: ${suitability.trafficLight === 'YASIL' ? 'Yaşıl' : suitability.trafficLight === 'SARI' ? 'Sarı' : 'Qırmızı'}
Aqrokimyəvi göstəricilər: pH ${formatDecimal(parcel.data.soil.ph, 1)} (Nümunə məlumat), Üzvi karbon ${formatDecimal(parcel.data.soil.socGperKg, 1)} q/kq, Azot ${formatDecimal(parcel.data.soil.nGperKg, 1)} q/kq
Mexaniki tərkib: Gil ${parcel.data.soil.clayPct}%, Qum ${parcel.data.soil.sandPct}%, Toz ${parcel.data.soil.siltPct}%
İqlim: Vegetasiya temperaturu ${formatDecimal(parcel.data.climate.growSeasonMeanTempC, 1)} °C, İllik yağıntı ${parcel.data.climate.annualPrecipMm} mm (Mənbə: NASA POWER / Həqiqi)
Su təminatı: Ən yaxın su mənbəyi ${formatDecimal(parcel.data.distances.nearestWaterKm, 1)} km (${parcel.data.distances.nearestWaterName}), torpaq nəm indeksi ${formatDecimal(parcel.data.climate.soilMoistureIndex, 2)}
Relyef: Hündürlük ${parcel.data.relief.elevationM} m, Yamac ${formatDecimal(parcel.data.relief.slopeDeg, 1)}°
Qeyd: ${suitability.reasonSentence}
`;

  // AI answer through the backend (the key stays on the server); on any failure use the rule-based answer
  try {
    const res = await fetch('/api/advisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context, question, mode })
    });
    const data: any = await res.json().catch(() => null);
    const text = typeof data?.answer === 'string' ? data.answer.trim() : '';
    if (text) {
      return {
        answer: text,
        sources: ['NASA POWER (Həqiqi)', 'Aqrokimyəvi təhlil (Nümunə məlumat)', 'Mina xəritəsi (Simulyasiya)'],
        disclaimer: DISCLAIMER_TEXT
      };
    }
  } catch {
    // Network or server problem: fall through to the local answer
  }

  // Deterministic Fallback Logic matching the Context Card & Rules
  const fallback = generateFallbackAnswer(parcel, question, mode, crop, suitability);
  return {
    answer: fallback,
    sources: ['NASA POWER (Həqiqi)', 'Aqrokimyəvi təhlil (Nümunə məlumat)', 'Mina xəritəsi (Simulyasiya)'],
    disclaimer: DISCLAIMER_TEXT
  };
}

function generateFallbackAnswer(
  parcel: Parcel,
  question: string,
  mode: 'SAHIBKAR' | 'INVESTOR',
  crop: Crop,
  suitability: SuitabilityResult
): string {
  const q = question.toLowerCase();

  // Off-topic check
  if (
    !q.includes('torpaq') &&
    !q.includes('münbit') &&
    !q.includes('üzüm') &&
    !q.includes('bitki') &&
    !q.includes('risk') &&
    !q.includes('su') &&
    !q.includes('yamac') &&
    !q.includes('heyvan') &&
    !q.includes('layihə') &&
    !q.includes('nə') &&
    !q.includes('necə') &&
    !q.includes('mina') &&
    !q.includes('uyğun')
  ) {
    return `Mən yalnız bu torpaq haqqında cavab verə bilərəm. ${DISCLAIMER_TEXT}`;
  }

  const scoreText = suitability.score !== null ? `${suitability.score} bal` : 'istisna vəziyyətindədir';
  const lightName = suitability.trafficLight === 'YASIL' ? 'Yaşıl (Əla uyğun)' : suitability.trafficLight === 'SARI' ? 'Sarı (Orta uyğun)' : 'Qırmızı (Riskli)';
  const distWater = formatDecimal(parcel.data.distances.nearestWaterKm, 1);
  const slope = formatDecimal(parcel.data.relief.slopeDeg, 1);
  const ph = formatDecimal(parcel.data.soil.ph, 1);

  if (mode === 'SAHIBKAR') {
    if (q.includes('münbit') || q.includes('torpaq necədir')) {
      return `Bu sahənin torpağı balansdadır (pH ${ph} — nə çox turş, nə qələvi) (Nümunə məlumat). Üzvi maddə miqdarı ${formatDecimal(parcel.data.soil.socGperKg, 1)} q/kq olmaqla qənaətbəxşdir (Nümunə məlumat). ${crop.name} üçün ümumi qiymətləndirmə ${scoreText} təşkil edir və işıqfor ${lightName}-dir. Su təminatı ən yaxın su mənbəyindən (${parcel.data.distances.nearestWaterName}, ${distWater} km) mümkündür (Nümunə məlumat). Mina statusu: Təmizlənib (Simulyasiya). Növbəti addım: 1. Suvarma xəttinin layihələndirilməsi; 2. Müsabiqəyə müraciət formasının doldurulması. ${DISCLAIMER_TEXT}`;
    }

    if (q.includes('üzüm') || q.includes('uyğun')) {
      return `Bu ərazi ${crop.name} becərilməsi üçün ${lightName} hesab olunur və ${scoreText} toplayır. İllik yağıntı ${parcel.data.climate.annualPrecipMm} mm, yay vegetasiya temperaturu isə ${formatDecimal(parcel.data.climate.growSeasonMeanTempC, 1)} °C təşkil edir (Həqiqi - NASA POWER). Ərazinin relyefi (${slope}° yamac) aqrotexniki qulluq üçün əlverişlidir (Nümunə məlumat). Mina statusu: Təmizlənib (Simulyasiya). Növbəti addımlar: 1. Şitillərin seçilməsi; 2. Biznes planın portala yüklənməsi. ${DISCLAIMER_TEXT}`;
    }

    if (q.includes('heyvan')) {
      const allowed = parcel.allowedUses.includes('HEYVANDARLIQ');
      if (allowed) {
        return `Bəli, bu sahə üzrə icazə verilən istiqamətlər arasında heyvandarlıq nəzərdə tutulub (Nümunə məlumat). Su mənbəyi ${distWater} km məsafədə yerləşir (Nümunə məlumat). Yem bitkiləri və örüş üçün əlverişli şərait mövcuddur. Mina statusu: Təmizlənib (Simulyasiya). Növbəti addım: Yem tədarükü və tövlə infrastrukturunun planlaşdırılması. ${DISCLAIMER_TEXT}`;
      } else {
        return `Bu sahədə əsas təyinat ${parcel.allowedUses.join(', ')} olaraq qeyd edilib, heyvandarlıq üçün xüsusi profil nəzərdə tutulmayıb (Nümunə məlumat). ${DISCLAIMER_TEXT}`;
      }
    }

    // Default sahibkar
    return `${parcel.name} üçün əsas göstəricilər: ${crop.name} üzrə uyğunluq balı ${scoreText}, işıqfor ${lightName}-dir. Ən yaxın su mənbəyi ${distWater} km məsafədədir (Nümunə məlumat). Mina statusu: Təmizlənib (Simulyasiya). Növbəti addım: müsabiqə şərtlərini nəzərdən keçirin və portaldan müraciət göndərin. ${DISCLAIMER_TEXT}`;
  } else {
    // INVESTOR mode
    if (q.includes('risk') || q.includes('zəif')) {
      return `İnvestisiya baxımından əsas parametrlər: Torpaq uyğunluq işıqforu ${lightName} (${scoreText}). Ən yaxın su mənbəyinə olan ${distWater} km məsafə suvarma infrastrukturuna ilkin kapital qoyuluşu tələb edə bilər (Nümunə məlumat). Yamac meyilliliyi ${slope}°-dir (Nümunə məlumat). Mina statusu: Təmizlənib (Simulyasiya). Torpaq üzrə hüquqi status dövlət tərəfindən ayrılmışdır. ${DISCLAIMER_TEXT}`;
    }

    if (q.includes('su') || q.includes('yamac')) {
      return `Ərazi üzrə su mənbəyi ${parcel.data.distances.nearestWaterName} olub, sahədən ${distWater} km aralıdadır (Nümunə məlumat). Relyef yamacı ${slope}° dərəcədir və torpaq eroziyası riski minimaldır (Nümunə məlumat). İllik yağıntı norması ${parcel.data.climate.annualPrecipMm} mm təşkil edir (Həqiqi - NASA POWER). ${DISCLAIMER_TEXT}`;
    }

    // Default investor
    return `Sahibkarın layihəsi üzrə ərazi ${parcel.areaHa} ha təşkil edir. İşıqfor ${lightName}, hesablanmış uyğunluq balı ${scoreText}-dir. Mina statusu: Təmizlənib (Simulyasiya). Aqroekoloji şərait uzunmüddətli intensiv təsərrüfat üçün perspektivlidir. Layihə ilə maraqlandığınız halda 'Maraqlanıram' düyməsini sıxa bilərsiniz. ${DISCLAIMER_TEXT}`;
  }
}
