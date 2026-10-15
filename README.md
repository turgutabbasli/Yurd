# Yurd — Azad Edilmiş Ərazilərdə İnvestisiya Müsabiqələri Portalı (MVP)

> "Sahibkar ən uyğun torpağı tapır, müsabiqəyə onlayn müraciət edir və nəticəni izləyir; dövlət şəffaf qərar verir; investor təsdiqlənmiş layihəni görür."

---

## 1. Yurd Nədir?
"Yurd" Azərbaycan Respublikasının işğaldan azad edilmiş ərazilərində (Qarabağ və Şərqi Zəngəzur) kənd təsərrüfatı torpaqlarının investisiya müsabiqələri vasitəsilə icarəyə verilməsi prosesini rəqəmsallaşdıran, şəffaflığı və elmi aqroekoloji əsaslandırmanı təmin edən dövlət və biznes portalıdır.

Portala dörd əsas rol cəlb olunur:
- **Sahibkar**: Ən uyğun torpağı tapır, müsabiqələrə baxır, onlayn müraciət edir, statusu izləyir və təsdiq olunmuş layihəni investorlara təqdim edir.
- **İnvestor**: Yalnız dövlət tərəfindən rəsmən təsdiqlənmiş layihələri görür, torpaq profilini incələyir, AI məsləhətçidən soruşur və bir toxunuşla "Maraqlanıram" bildirir.
- **Nazirlik operatoru**: Sahələri qeydə alır, müsabiqələr tərtib edir, müraciətləri yoxlayır, əlavə sənəd istəyir və qərar təklif edir.
- **Nazirlik təsdiqləyicisi**: Dörd göz prinsipi ilə müsabiqələri təsdiqləyib dərc edir və qərarları təsdiqləyir (operator ilə təsdiqləyici eyni şəxs ola bilməz).

---

## 2. Texnologiyalar
- **Frontend / UI**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Leaflet (interaktiv poliqon xəritələri), Chart.js (aqrar statistika).
- **Backend və Xidmət Qatı**: Express / REST arxitekturası, `api.ts` tam funksional servis qatı, `node:test` əsaslı avtomatlaşdırılmış vahid testlər.
- **Süni İntellekt (AI Land Advisor)**: `@google/genai` (Gemini Flash) və aqroekoloji qaydalara əsaslanan dayanıqlı yerli alternativ sistem (fallback).
- **EKTİS Adapteri**: Kənd Təsərrüfatı Nazirliyinin Elektron Kənd Təsərrüfatı İnformasiya Sistemi simulyatoru, VÖEN yoxlanışı və real vaxt jurnalı.

---

## 3. Sınaq Girişi Hesabları (One-Click Test Accounts)
Giriş yalnız **"myGov ilə giriş"** (demo simulyasiya) üzərindən olur: Azərbaycan vətəndaşı FİN kod ilə, xarici vətəndaş pasport məlumatları ilə daxil olur. Rol seçilmir — hesabın özündən müəyyən edilir. Sınaq hesablarının FİN kodları komanda daxilində ayrıca paylaşılır (aşağıda maskalanmış formada):

| Rol (UI) | E-poçt | FİN (Maskalanmış) | Şəxs Növü / VÖEN | Əsas Məqsəd |
|---|---|---|---|---|
| **Sahibkar** | `sahibkar@yurd.local` | `5AB***D` | Fərdi sahibkar (1402345678) | Torpaq tapmaq, müraciət göndərmək, status izləmək, layihə vitrini |
| **İnvestor** | `investor@yurd.local` | `6JK***Y` | Şirkət (2001234567) | Təsdiqlənmiş layihələrə baxış, "Maraqlanıram" qeydiyyatı |
| **Nazirlik operatoru** | `operator@yurd.local` | `7MN***Z` | Fiziki şəxs | Sahə əlavə etmək, müsabiqə yaratmaq, müraciətlərə ilkin baxış |
| **Nazirlik təsdiqləyicisi** | `tesdiqleyici@yurd.local` | `8RT***Q` | Fiziki şəxs | Dörd göz prinsipi ilə müsabiqə dərci və yekun qərar təsdiqi |

---

## 4. Quraşdırma və İşə Salma
Tətbiq standart olaraq AI Studio konteynerində port 3000 üzərində işləyir:

```bash
# Asılılıqların quraşdırılması
npm install

# Testlərin icrası (Scoring alqoritmi, test vektorları, dörd göz və status keçidləri)
npx tsx --test src/scoring.test.ts
npx tsx --test src/transitions.test.ts

# İnkişaf serverinin işə salınması (Express + Vite, /api/chat endpoint-i daxil)
npm run dev

# İstehsal: build və işə salma
npm run build
npm start
```

Brauzerdə açın: `http://localhost:3000`

---

## 5. Mühit Dəyişənləri
- `GEMINI_API_KEY`: AI çatbot və torpaq məsləhətçisi üçün Google Gemini açarı (pulsuz: https://aistudio.google.com/apikey). Layihə qovluğunda `.env` faylına yazılır, yalnız serverdə (`server.ts`) oxunur və brauzerə göndərilmir. Əsas model `gemini-flash-latest`, limit dolanda avtomatik `gemini-flash-lite-latest`.
- `GROQ_API_KEY`, `OPENROUTER_API_KEY` (istəyə bağlı): Gemini cavab vermədikdə pulsuz ehtiyat provayderlər. Heç biri işləməsə istifadəçiyə "Hazırda cavab verə bilmirəm, bir az sonra yenidən cəhd edin." göstərilir; məsləhətçi isə yerli qayda mühərrikinə keçir.
- `JWT_SECRET`: İcazə və autentifikasiya tokenlərinin imzalanması üçün açar.
- `ektis.mode`: `mock` (simulyasiya rejimi) və ya `real` (rəsmi KTN şlüzü).

---

## 6. Məlumat Dürüstlüyü və Mənbələr
- **İqlim (Temperatur, Yağıntı)**: NASA POWER Climatology API (`Həqiqi`).
- **Torpaq profili (pH, Üzvi karbon, Azot, Gil, Qum)**: Bölgə üzrə aqrokimyəvi xəritələmə (`Nümunə məlumat`).
- **Mina statusu**: Təhlükəsizlik və hüquqi məsuliyyət baxımından simulyasiya kimi göstərilir (`Simulyasiya`).
- **Xəritə**: OpenStreetMap (`© OpenStreetMap töhfəçiləri`).
- **Dövlət prinsipi**: Bütün səhifələrdə xatırladılır: *"Seçim qaydası nazirlik tərəfindən müəyyən edilir."*
