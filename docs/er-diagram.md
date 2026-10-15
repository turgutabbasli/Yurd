# Yurd Portalı — Varlıq-Əlaqə Diaqramı (ER-Diagram)

```mermaid
erDiagram
    USER ||--o{ APPLICATION : "müraciət edir"
    USER ||--o{ NOTIFICATION : "alır"
    USER ||--o{ AUDIT_LOG : "icra edir"
    USER ||--o{ PROJECT_LISTING : "sahibkar kimi təqdim edir"
    USER ||--o{ INVESTOR_INTEREST : "investor kimi maraqlanır"
    USER ||--o{ COMPETITION : "operator yaradır / təsdiqçi təsdiqləyir"

    REGION ||--o{ PARCEL : "əhatə edir"

    PARCEL ||--o{ APPLICATION : "sahə üzrə müraciət"
    PARCEL ||--o| PROJECT_LISTING : "layihə sahəsi"
    PARCEL }o--o| COMPETITION : "müsabiqəyə daxildir"

    COMPETITION ||--o{ APPLICATION : "müsabiqə müraciətləri"
    COMPETITION ||--o{ COMPETITION_PARCEL : "əlaqələndirir"
    PARCEL ||--o{ COMPETITION_PARCEL : "daxil edilir"

    APPLICATION ||--o{ APPLICATION_STATUS_HISTORY : "tarixçə saxlayır"
    APPLICATION ||--o{ DOCUMENT : "sənədlər əlavə edilir"
    APPLICATION ||--o| PROJECT_LISTING : "təsdiqlənmiş layihəyə çevrilir"

    PROJECT_LISTING ||--o{ INVESTOR_INTEREST : "maraq qeydiyyatı"

    USER {
        string id PK
        string email UK
        string passwordHash
        string role "SAHIBKAR | INVESTOR | OPERATOR | TESDIQLEYICI"
        string fullName
        string entityType "FIZIKI_SEXS | FERDI_SAHIBKAR | SIRKET"
        string fin "7 simvol, maskalanır: 5AB***D"
        string voen "10 rəqəm, nullable"
        string phone
        datetime consentAt
        datetime createdAt
        boolean active
        boolean isTestAccount
    }

    REGION {
        string id PK
        string name "Füzuli, Cəbrayıl, Zəngilan, Qubadlı, Ağdam, Kəlbəcər, Laçın"
        float centerLat
        float centerLon
        string description
    }

    PARCEL {
        string id PK
        string code UK "FZL-014, CBR-003..."
        string name
        string regionId FK
        string village
        float areaHa
        string geometry "GeoJSON Polygon"
        float centroidLat
        float centroidLon
        string allowedUses "MEYVE_BAGI, UZUMLUK, TAXIL, HEYVANDARLIQ, ARICILIQ..."
        float pricePerHaYearAzn
        string deminingStatus "TEMIZLENIB | GOZLEYIR | MELUM_DEYIL"
        string status "ACIQ | BAGLI | AYRILIB"
        string competitionId FK
        json data "soil, climate, relief, distances, ndvi"
        datetime createdAt
    }

    COMPETITION {
        string id PK
        string number UK "II-2026, III-2026, IV-2026"
        string name
        string directions
        datetime announceDate
        datetime applyStart
        datetime applyDeadline
        int leaseInitialYears "5"
        int leaseExtensionYears "44"
        float minProjectHa "20"
        float participationFeeAzn "50 (Nümunə məlumat)"
        string conditionsText
        string status "QARALAMA | TESDIQ_GOZLEYIR | DERC_EDILIB | BAGLANIB"
        string createdBy FK "OPERATOR"
        string approvedBy FK "TESDIQLEYICI (createdBy != approvedBy)"
        datetime approvedAt
        string returnComment
        datetime createdAt
    }

    APPLICATION {
        string id PK
        string number UK "QM-2026-######"
        string competitionId FK
        string parcelId FK
        string applicantId FK
        json applicantSnapshot "name, maskedFin, voen"
        string intendedCrop "UZUM, BUGDA, PAMBIQ..."
        float plannedInvestmentAzn
        float ownFundsAzn
        int expectedJobs
        string planText "max 1500 simvol"
        date startDate
        string status "QARALAMA | QEBUL_EDILIB | BAXILIR | ELAVE_MELUMAT | QERAR_VERILIB"
        string outcome "TESDIQLENIB | REDD_EDILIB"
        string proposedOutcome
        string proposedBy FK
        string proposalComment
        string ektisReference "EKTIS-A-2026-######"
        boolean isDraft
        datetime submittedAt
        datetime updatedAt
    }

    DOCUMENT {
        string id PK
        string applicationId FK
        string kind "SEXSIYYET | BIZNES_PLAN | MALI_SENED | DIGER"
        string fileName
        string mimeType "PDF / JPG / PNG"
        int sizeBytes "max 10MB"
        string sha256
        datetime uploadedAt
    }

    APPLICATION_STATUS_HISTORY {
        string id PK
        string applicationId FK
        string fromStatus
        string toStatus
        string changedBy FK
        string changedByRole
        string comment
        datetime at
    }

    PROJECT_LISTING {
        string id PK
        string applicationId FK UK
        string parcelId FK UK
        string entrepreneurId FK
        string crop
        float requiredFundingAzn
        int expectedJobs
        string summary
        boolean visible
        datetime createdAt
    }

    INVESTOR_INTEREST {
        string id PK
        string listingId FK
        string investorId FK
        datetime createdAt
    }

    EKTIS_LOG {
        string id PK
        string direction "GEDEN | GELEN"
        string endpoint
        json requestBody
        json responseBody
        int httpStatus
        string correlationId
        boolean success
        datetime at
    }

    AUDIT_LOG {
        string id PK
        string userId FK
        string role
        string action "GIRIS, SAHE_YARADILMASI, MUSABIQE_TESDIQI..."
        string entityType
        string entityId
        string details
        string ip
        datetime at
    }

    NOTIFICATION {
        string id PK
        string userId FK
        string type
        string text
        string refType
        string refId
        boolean read
        datetime createdAt
    }
```
