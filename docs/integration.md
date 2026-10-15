# EKTİS İnteqrasiya Sənədi (docs/integration.md)

Bu sənəd "Yurd" portalının Kənd Təsərrüfatı Nazirliyinin Elektron Kənd Təsərrüfatı İnformasiya Sistemi (EKTİS) ilə qarşılıqlı əlaqə mexanizmini təsvir edir.

### 1. Adapter və İnteqrasiya Rejimi
- Portala daxil edilmiş `EktisClient` interfeysi iki icra variantını dəstəkləyir:
  - `MockEktisClient`: Yerli simulyasiya API-si (`/mock-ektis/v1`), 150–400 ms süni gecikmə və real vaxt jurnal qeydiyyatı.
  - `RealEktisClient`: Nazirliyin rəsmi REST / SOAP Gateway servislərinə bağlanan real mübadilə qatı. Konfiqurasiya `ektis.mode=real` və `ektis.baseUrl` ilə aktivləşdirilir.
- Hər bir əməliyyat üçün `X-Correlation-Id` və `Idempotency-Key` başlıqları təmin edilir. EKTİS xidməti müvəqqəti əlçatmaz olduqda belə istifadəçinin portal daxilindəki əsas əməliyyatı bloklanmır, sistem jurnala xəta qeydi salır və operatora "Yenidən göndər" (Retry) imkanı verir.

### 2. Mübadilə Olunan Məlumatlar
1. **Sahibkarın və VÖEN-in verifikasiyası (`POST /entrepreneurs/verify`)**:
   - Göndərilən: 10 rəqəmli VÖEN.
   - Cavab: Hüquqi ad, qeydiyyat rayonu, status (Aktiv / Ləğv olunmuş), rəhbər şəxs.
2. **Müsabiqə bildirişi (`POST /competitions`)**:
   - Müsabiqə təsdiqlənib dərc edildikdə müsabiqə nömrəsi, daxil edilmiş torpaq sahələrinin kodları və son müraciət tarixi EKTİS vahid bazasına ötürülür.
3. **Müraciət qeydiyyatı (`POST /applications`)**:
   - Sahibkar müraciətini göndərdikdə unikal QM nömrəsi, VÖEN, nəzərdə tutulan bitki və investisiya məbləği EKTİS-ə qeyd edilir, qarşılığında `EKTIS-A-...` reyestr kodu qəbul olunur.
4. **Yekun qərar qeydiyyatı (`POST /decisions`)**:
   - Təsdiqləyici yekun qərarı təsdiq etdikdə (Təsdiq edilib / Rədd edilib) qərar EKTİS sisteminə ötürülür və torpaq reyestrində hüquqi status yenilənir.

### 3. Təhlükəsizlik və Rəsmi İcazələr
- Real inteqrasiyaya keçid üçün tələb olunanlar:
  - Kənd Təsərrüfatı Nazirliyi və İqtisadiyyat Nazirliyinin rəsmi razılığı;
  - Rəqəmsal İnkişaf və Nəqliyyat Nazirliyinin Dövlət İnformasiya Ehtiyatları və Sistemlərinin İnteqrasiya Şəbəkəsi (ASAN Bridge / EHİS);
  - "Simik" və ya ASAN İmza ilə gücləndirilmiş elektron imza sertifikatları;
  - VPN / mTLS təhlükəsizlik tuneli.
