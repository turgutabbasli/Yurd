# Qərarlar və Fərziyyələr (docs/assumptions.md)

Bu sənəddə "Yurd" portalının arxitekturası, mühit məhdudiyyətləri və tətbiq olunmuş texniki seçimlər qeyd olunmuşdur.

### 1. Texnoloji Mühit və İcra Modeli (Fallback tətbiqi)
- AI Studio mühitində Java/Maven mövcud olmadığı üçün texniki tapşırığın 4-cü bölməsində ("Fallback (only if your environment cannot run Java)") qeyd edilən model tam tətbiq edilmişdir.
- Eyni REST arxitekturası, JPA data modellərinə tam uyğun strukturlar, dörd göz (four-eyes) yoxlamaları, EKTİS mübadilə jurnalı və status maşınları TypeScript/Express və in-app `api.ts` xidmət qatı ilə qurulmuşdur.
- Məlumatların davamlılığı `localStorage` və brauzer keşində saxlanılır və yenidən yükləmələrdən sonra itmir. `H2 / PostgreSQL` keçidi üçün backend interfeysləri (`EktisClient`, `LlmClient`, `ScoringService`) hazır saxlanılmışdır.

### 2. Dil Qaydası
- Bütün görünən istifadəçi interfeysi mətnləri, bildirişlər, xətalar, statuslar, etiketlər və cədvəl başlıqları 100% Azərbaycan dilindədir (bax: `src/labels.ts`).
- Heç bir ingilis sözü və ya xam status kodu (məsələn, `QEBUL_EDILIB`, `SAHIBKAR`) istifadəçiyə göstərilmir.
- Rəqəmlər və formatlar: `25 000 ₼`, `42 ha`, `6,8`, `15 oktyabr 2026`.

### 3. Dörd Göz Prinsipi (Four-Eyes Rule)
- Müsabiqə: Operator müsabiqəni yaradır və "Təsdiqə göndər" düyməsini sıxır. Operator üçün təsdiqləmə düyməsi göstərilmir və API səviyyəsində qadağan edilir (`approvedBy != createdBy`). Təsdiqləyici müsabiqəni təsdiq edib dərc edir və ya şərh yazaraq qaytarır.
- Müraciət qərarı: Operator baxış keçirir, əlavə sənəd tələb edə bilir və yekunda qərar təklif edir ("Təsdiq etməyi təklif et" / "Rədd etməyi təklif et"). Təsdiqləyici bu təklifi təsdiqləyir və ya qaytarır. Təklif verən ilə təsdiqləyən eyni şəxs ola bilməz.

### 4. Məlumat Dürüstlüyü və Mənbə Nişanları
- Mina təmizlənməsi statusu real ANAMA inteqrasiyası olmadığı üçün hər yerdə açıq şəkildə `Simulyasiya` olaraq nişanlanır.
- EKTİS əməliyyatları (VÖEN yoxlanışı, müsabiqə və müraciət ötürülməsi) `Simulyasiya` nişanı daşıyır.
- İqlim göstəriciləri NASA POWER metodologiyasına əsaslandığı üçün `Həqiqi` (və ya regional tipik göstərici kimi `Nümunə məlumat`), torpaq və relyef isə `Nümunə məlumat` olaraq göstərilir.
- Hər bir torpaq səhifəsində dövlət qərarı prinsipi vurğulanır: *"Seçim qaydası nazirlik tərəfindən müəyyən edilir."*
