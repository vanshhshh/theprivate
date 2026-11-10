-- CreateEnum
CREATE TYPE "AirportKind" AS ENUM ('LARGE_AIRPORT', 'MEDIUM_AIRPORT', 'SMALL_AIRPORT', 'HELIPORT', 'SEAPLANE_BASE', 'BALLOONPORT', 'CLOSED');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('SUPER_ADMIN', 'OPERATIONS', 'SUPPLY', 'SALES_DESK', 'DATA_STEWARD', 'SUPPORT');

-- CreateEnum
CREATE TYPE "OperatorLifecycle" AS ENUM ('DISCOVERED', 'CLAIMED', 'IN_REVIEW', 'VERIFIED', 'AGREEMENT_SIGNED', 'ACTIVE', 'SUSPENDED', 'REJECTED', 'EXCLUDED');

-- CreateEnum
CREATE TYPE "AviationAuthority" AS ENUM ('DGCA', 'GCAA', 'CAAS', 'EASA_MEMBER', 'FAA', 'OTHER');

-- CreateEnum
CREATE TYPE "AuthorizationNumberStatus" AS ENUM ('VALID', 'MALFORMED', 'MISSING');

-- CreateEnum
CREATE TYPE "ContactKind" AS ENUM ('REGULATORY', 'COMPANY', 'DECISION_MAKER', 'CHARTER_SALES', 'OPERATIONS', 'BILLING');

-- CreateEnum
CREATE TYPE "DataConfidence" AS ENUM ('AUTHORITY', 'VERIFIED_PUBLIC', 'OPERATOR_PROVIDED', 'RESEARCH', 'UNVERIFIED');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'MANAGER', 'DISPATCHER', 'VIEWER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('SUBMITTED', 'NEEDS_INFO', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "VerificationCheckType" AS ENUM ('AUTHORITY_CERTIFICATE', 'COMPANY_REGISTRATION', 'INSURANCE', 'TAX_REGISTRATION', 'BANK_DETAILS', 'SIGNATORY_IDENTITY', 'SAFETY_AUDIT');

-- CreateEnum
CREATE TYPE "VerificationCheckStatus" AS ENUM ('PENDING', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AgreementStatus" AS ENUM ('DRAFT', 'SENT', 'SIGNED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('AUTHORITY_CERTIFICATE', 'INSURANCE', 'COMPANY_REGISTRATION', 'AGREEMENT', 'AIRCRAFT_REGISTRATION', 'AIRWORTHINESS', 'AIRCRAFT_PHOTO', 'SALE_LISTING_PHOTO', 'SALE_LISTING_DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "AirframeClass" AS ENUM ('FIXED_WING', 'ROTARY_WING', 'BALLOON');

-- CreateEnum
CREATE TYPE "AircraftCategory" AS ENUM ('PISTON', 'TURBOPROP', 'LIGHT_JET', 'MIDSIZE_JET', 'SUPER_MIDSIZE_JET', 'HEAVY_JET', 'ULTRA_LONG_RANGE_JET', 'VIP_AIRLINER', 'AIRLINER', 'HELICOPTER_SINGLE', 'HELICOPTER_TWIN', 'BALLOON', 'GLIDER');

-- CreateEnum
CREATE TYPE "EvidenceLevel" AS ENUM ('AUTHORITY_REGISTRY', 'OPERATOR_PUBLISHED_CURRENT', 'FLIGHT_TRACKING_RECENT', 'PUBLIC_RECORD_UNCONFIRMED', 'MANAGED_NOT_CHARTER', 'NEEDS_OPERATOR_CONFIRMATION', 'PUBLIC_MODEL_RECORD', 'OPERATOR_CONFIRMED', 'PLATFORM_VERIFIED');

-- CreateEnum
CREATE TYPE "AircraftReviewStatus" AS ENUM ('IMPORTED_UNREVIEWED', 'DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AircraftOperationalStatus" AS ENUM ('UNKNOWN', 'ACTIVE', 'MAINTENANCE', 'INACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "TypeResolution" AS ENUM ('MATCHED', 'AMBIGUOUS', 'UNMATCHED', 'CONFLICT', 'ADMIN_SET');

-- CreateEnum
CREATE TYPE "AvailabilityKind" AS ENUM ('AVAILABLE', 'BLOCKED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "TripType" AS ENUM ('ONE_WAY', 'RETURN', 'MULTI_LEG');

-- CreateEnum
CREATE TYPE "RfqStatus" AS ENUM ('SUBMITTED', 'MATCHING', 'AWAITING_QUOTES', 'QUOTES_AVAILABLE', 'ACCEPTED', 'BOOKED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RecipientStatus" AS ENUM ('SENT', 'VIEWED', 'DECLINED', 'QUOTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('SUBMITTED', 'REVISED', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING_OPERATOR_CONFIRMATION', 'CONFIRMED', 'PAYMENT_PENDING', 'PAID', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'AUTHORIZED', 'SETTLED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "EmptyLegStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'WITHDRAWN', 'EXPIRED', 'SOLD');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'FORWARDED', 'RESPONDED', 'CONVERTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SaleListingStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'NEEDS_INFO', 'APPROVED', 'PUBLISHED', 'REJECTED', 'SOLD', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "SellerType" AS ENUM ('OWNER', 'OPERATOR', 'BROKER');

-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'LISTED', 'CLOSED_WON', 'CLOSED_LOST');

-- CreateEnum
CREATE TYPE "BuyerEnquiryType" AS ENUM ('GENERAL', 'REQUEST_INFO', 'PURCHASE_INTEREST', 'VIEWING');

-- CreateEnum
CREATE TYPE "DeliveryChannel" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'SKIPPED_NOT_CONFIGURED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'DEAD');

-- CreateEnum
CREATE TYPE "ImportMode" AS ENUM ('DRY_RUN', 'APPLY');

-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "ConflictStatus" AS ENUM ('OPEN', 'AUTO_RESOLVED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'CONFIRMED_SAME', 'CONFIRMED_DISTINCT');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'SYSTEM', 'IMPORT', 'WEBHOOK');

-- CreateTable
CREATE TABLE "Country" (
    "code" CHAR(2) NOT NULL,
    "name" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "dialCode" TEXT,
    "isLaunchMarket" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Airport" (
    "id" TEXT NOT NULL,
    "icao" VARCHAR(4),
    "iata" VARCHAR(3),
    "localCode" TEXT,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "countryCode" CHAR(2) NOT NULL,
    "regionId" TEXT,
    "kind" "AirportKind" NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "elevationFt" INTEGER,
    "timezone" TEXT,
    "longestRunwayFt" INTEGER,
    "hasScheduledService" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "searchText" TEXT NOT NULL,
    "sourceRef" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Airport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "phone" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en-IN',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),
    "disabledAt" TIMESTAMPTZ(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ(3),
    "refreshTokenExpiresAt" TIMESTAMPTZ(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffRoleAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "grantedById" TEXT,
    "grantedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(3),

    CONSTRAINT "StaffRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT,
    "homeAirportId" TEXT,
    "preferredCurrency" CHAR(3) NOT NULL DEFAULT 'INR',
    "preferredCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CustomerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operator" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "lifecycle" "OperatorLifecycle" NOT NULL DEFAULT 'DISCOVERED',
    "lifecycleChangedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPubliclyListed" BOOLEAN NOT NULL DEFAULT false,
    "website" TEXT,
    "linkedinUrl" TEXT,
    "instagramHandle" TEXT,
    "headquartersAddress" TEXT,
    "baseDescription" TEXT,
    "publicDescription" TEXT,
    "researchRelevance" TEXT,
    "researchCharterActivity" TEXT,
    "researchOperatorKind" TEXT,
    "dataQualityFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatorAlias" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "matchKey" TEXT NOT NULL,
    "source" TEXT,

    CONSTRAINT "OperatorAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatorAuthorization" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "authority" "AviationAuthority" NOT NULL,
    "certificateType" TEXT NOT NULL,
    "numberRaw" TEXT,
    "numberNormalized" TEXT,
    "numberStatus" "AuthorizationNumberStatus" NOT NULL,
    "validFrom" DATE,
    "validUntil" DATE,
    "validUntilRaw" TEXT,
    "scope" TEXT,
    "verifiedAt" TIMESTAMPTZ(3),
    "verifiedById" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "OperatorAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatorContact" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "externalKey" TEXT,
    "kind" "ContactKind" NOT NULL,
    "name" TEXT,
    "title" TEXT,
    "emails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "phones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "unparsedPhones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourceUrl" TEXT,
    "note" TEXT,
    "confidence" "DataConfidence" NOT NULL,
    "doNotContact" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "OperatorContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatorMembership" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "OperatorMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatorClaim" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT,
    "userId" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'SUBMITTED',
    "proposedName" TEXT,
    "proposedCountry" CHAR(2),
    "claimantRole" TEXT NOT NULL,
    "workEmail" TEXT NOT NULL,
    "workPhone" TEXT,
    "authorityNumber" TEXT,
    "message" TEXT,
    "reviewerId" TEXT,
    "decisionNote" TEXT,
    "decidedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "OperatorClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationCheck" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "type" "VerificationCheckType" NOT NULL,
    "status" "VerificationCheckStatus" NOT NULL DEFAULT 'PENDING',
    "documentId" TEXT,
    "expiresAt" DATE,
    "reviewerId" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "VerificationCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agreement" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "AgreementStatus" NOT NULL DEFAULT 'DRAFT',
    "commissionBps" INTEGER NOT NULL,
    "minimumFee" DECIMAL(14,2),
    "currency" CHAR(3) NOT NULL,
    "effectiveFrom" DATE,
    "effectiveUntil" DATE,
    "signedAt" TIMESTAMPTZ(3),
    "documentId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Agreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatorDocument" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "label" TEXT,

    CONSTRAINT "OperatorDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AircraftType" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "category" "AircraftCategory" NOT NULL,
    "airframeClass" "AirframeClass" NOT NULL,
    "typicalSeats" INTEGER,
    "rangeNm" INTEGER,
    "cruiseKtas" INTEGER,
    "baggageCuFt" DECIMAL(6,1),
    "cabinHeightIn" DECIMAL(5,1),
    "specsSource" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AircraftType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aircraft" (
    "id" TEXT NOT NULL,
    "registration" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "aircraftTypeId" TEXT,
    "modelRaw" TEXT,
    "typeResolution" "TypeResolution" NOT NULL,
    "typeFamilyHint" TEXT,
    "airframeClass" "AirframeClass",
    "serialNumber" TEXT,
    "yearOfManufacture" INTEGER,
    "seats" INTEGER,
    "seatsRaw" TEXT,
    "isCargo" BOOLEAN NOT NULL DEFAULT false,
    "isAerialWork" BOOLEAN NOT NULL DEFAULT false,
    "homeBaseAirportId" TEXT,
    "evidenceLevel" "EvidenceLevel" NOT NULL,
    "sourceStatusRaw" TEXT,
    "usageRaw" TEXT,
    "sourceUrl" TEXT,
    "sourceNote" TEXT,
    "attributionUncertain" BOOLEAN NOT NULL DEFAULT false,
    "dataQualityFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reviewStatus" "AircraftReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "operationalStatus" "AircraftOperationalStatus" NOT NULL DEFAULT 'UNKNOWN',
    "charterEligible" BOOLEAN NOT NULL DEFAULT false,
    "publicDescription" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Aircraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetEvidence" (
    "id" TEXT NOT NULL,
    "externalKey" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "aircraftTypeId" TEXT,
    "modelRaw" TEXT NOT NULL,
    "typeResolution" "TypeResolution" NOT NULL,
    "seats" INTEGER,
    "reportedCount" INTEGER,
    "usageRaw" TEXT,
    "evidenceLevel" "EvidenceLevel" NOT NULL,
    "sourceStatusRaw" TEXT,
    "sourceUrl" TEXT,
    "sourceType" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "FleetEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AircraftImage" (
    "id" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AircraftImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AircraftAvailability" (
    "id" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "kind" "AvailabilityKind" NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "baseAirportId" TEXT,
    "note" TEXT,
    "confirmedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AircraftAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "aircraftId" TEXT,
    "currency" CHAR(3) NOT NULL,
    "hourlyRate" DECIMAL(14,2) NOT NULL,
    "minimumBillableHours" DECIMAL(4,2) NOT NULL DEFAULT 1,
    "positioningHourlyRate" DECIMAL(14,2),
    "overnightFee" DECIMAL(14,2),
    "validFrom" DATE NOT NULL,
    "validUntil" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rfq" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tripType" "TripType" NOT NULL,
    "passengers" INTEGER NOT NULL,
    "categoryPreference" "AircraftCategory",
    "requirements" TEXT,
    "petsOnBoard" BOOLEAN NOT NULL DEFAULT false,
    "status" "RfqStatus" NOT NULL DEFAULT 'SUBMITTED',
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT,
    "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "cancelledAt" TIMESTAMPTZ(3),
    "cancelReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Rfq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfqLeg" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "fromAirportId" TEXT NOT NULL,
    "toAirportId" TEXT NOT NULL,
    "departureDate" DATE NOT NULL,
    "departureTimeLocal" TEXT,
    "departureAtUtc" TIMESTAMPTZ(3),
    "flexibilityHours" INTEGER NOT NULL DEFAULT 0,
    "passengers" INTEGER NOT NULL,

    CONSTRAINT "RfqLeg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfqRecipient" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "status" "RecipientStatus" NOT NULL DEFAULT 'SENT',
    "matchReason" TEXT NOT NULL,
    "declineReason" TEXT,
    "sentAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMPTZ(3),

    CONSTRAINT "RfqRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'SUBMITTED',
    "currentRevision" INTEGER NOT NULL DEFAULT 1,
    "validUntil" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteRevision" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "operatorPrice" DECIMAL(14,2) NOT NULL,
    "platformFee" DECIMAL(14,2) NOT NULL,
    "taxes" DECIMAL(14,2) NOT NULL,
    "customerPrice" DECIMAL(14,2) NOT NULL,
    "inclusions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "exclusions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "terms" TEXT,
    "validUntil" TIMESTAMPTZ(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "quoteRevisionId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING_OPERATOR_CONFIRMATION',
    "currency" CHAR(3) NOT NULL,
    "customerTotal" DECIMAL(14,2) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "cancelledAt" TIMESTAMPTZ(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingLeg" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "fromAirportId" TEXT NOT NULL,
    "toAirportId" TEXT NOT NULL,
    "departureDate" DATE NOT NULL,
    "departureTimeLocal" TEXT,
    "departureAtUtc" TIMESTAMPTZ(3),
    "passengers" INTEGER NOT NULL,

    CONSTRAINT "BookingLeg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingEvent" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fromStatus" "BookingStatus",
    "toStatus" "BookingStatus" NOT NULL,
    "actorUserId" TEXT,
    "actorType" "ActorType" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "evidenceNote" TEXT,
    "settledAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmptyLegListing" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "fromAirportId" TEXT NOT NULL,
    "toAirportId" TEXT NOT NULL,
    "windowStartUtc" TIMESTAMPTZ(3) NOT NULL,
    "windowEndUtc" TIMESTAMPTZ(3) NOT NULL,
    "seatsAvailable" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "customerPrice" DECIMAL(14,2),
    "operatorPrice" DECIMAL(14,2),
    "status" "EmptyLegStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMPTZ(3),
    "validUntil" TIMESTAMPTZ(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "EmptyLegListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmptyLegEnquiry" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passengers" INTEGER NOT NULL,
    "message" TEXT,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "EmptyLegEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleListing" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sellerUserId" TEXT NOT NULL,
    "sellerType" "SellerType" NOT NULL,
    "status" "SaleListingStatus" NOT NULL DEFAULT 'DRAFT',
    "category" "AircraftCategory" NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "yearOfManufacture" INTEGER NOT NULL,
    "registration" TEXT,
    "serialNumber" TEXT,
    "totalTimeHours" INTEGER,
    "landings" INTEGER,
    "locationText" TEXT NOT NULL,
    "locationCountry" CHAR(2),
    "currency" CHAR(3) NOT NULL,
    "askingPrice" DECIMAL(14,2),
    "priceOnRequest" BOOLEAN NOT NULL DEFAULT false,
    "headline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "publishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "SaleListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleListingMedia" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "caption" TEXT,

    CONSTRAINT "SaleListingMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerLead" (
    "id" TEXT NOT NULL,
    "listingId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "stage" "LeadStage" NOT NULL DEFAULT 'NEW',
    "ownerStaffId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SellerLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerEnquiry" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "BuyerEnquiryType" NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BuyerEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingReviewEvent" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "fromStatus" "SaleListingStatus",
    "toStatus" "SaleListingStatus" NOT NULL,
    "actorUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingReviewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "readAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "channel" "DeliveryChannel" NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "providerRef" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "runAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lockedAt" TIMESTAMPTZ(3),
    "lastError" TEXT,
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "country" CHAR(2),
    "description" TEXT NOT NULL,
    "asOf" DATE,
    "latestSha256" CHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "mode" "ImportMode" NOT NULL,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'RUNNING',
    "planHash" CHAR(64) NOT NULL,
    "sourceHashes" JSONB NOT NULL,
    "summary" JSONB,
    "error" TEXT,
    "initiatedBy" TEXT NOT NULL,
    "userId" TEXT,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ(3),

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceRecord" (
    "id" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "sheet" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "contentHash" CHAR(32) NOT NULL,
    "raw" JSONB NOT NULL,
    "firstBatchId" TEXT NOT NULL,
    "lastSeenBatchId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SourceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalIdentifier" (
    "id" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldObservation" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "sourceCode" TEXT NOT NULL,
    "sheet" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "fieldGroup" TEXT NOT NULL,
    "confidence" "DataConfidence" NOT NULL,
    "batchId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportChange" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataConflict" (
    "id" TEXT NOT NULL,
    "conflictKey" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityKey" TEXT NOT NULL,
    "entityId" TEXT,
    "field" TEXT NOT NULL,
    "values" JSONB NOT NULL,
    "status" "ConflictStatus" NOT NULL,
    "chosenValue" JSONB,
    "reason" TEXT NOT NULL,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMPTZ(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DataConflict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchCandidate" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "leftKey" TEXT NOT NULL,
    "rightKey" TEXT NOT NULL,
    "score" DECIMAL(4,2) NOT NULL,
    "reasons" TEXT[],
    "recommendation" TEXT NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMPTZ(3),
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MatchCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthorityRegistryEntry" (
    "id" TEXT NOT NULL,
    "externalKey" TEXT NOT NULL,
    "authority" "AviationAuthority" NOT NULL,
    "organizationName" TEXT NOT NULL,
    "approvalNumberRaw" TEXT NOT NULL,
    "approvalNumber" TEXT,
    "organizationType" TEXT,
    "issueDate" DATE,
    "expiryDate" DATE,
    "country" TEXT,
    "operatorId" TEXT,
    "sourceCode" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AuthorityRegistryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceSource" (
    "id" TEXT NOT NULL,
    "externalKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "organization" TEXT,
    "sourceType" TEXT,
    "asOf" TEXT,
    "url" TEXT,
    "usage" TEXT,
    "sourceCode" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "EvidenceSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "_DocumentToOperatorClaim" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DocumentToOperatorClaim_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Region_countryCode_code_key" ON "Region"("countryCode", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Airport_icao_key" ON "Airport"("icao");

-- CreateIndex
CREATE INDEX "Airport_iata_idx" ON "Airport"("iata");

-- CreateIndex
CREATE INDEX "Airport_countryCode_kind_idx" ON "Airport"("countryCode", "kind");

-- CreateIndex
CREATE INDEX "Airport_searchText_idx" ON "Airport"("searchText");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE INDEX "StaffRoleAssignment_userId_revokedAt_idx" ON "StaffRoleAssignment"("userId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProfile_userId_key" ON "CustomerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Operator_slug_key" ON "Operator"("slug");

-- CreateIndex
CREATE INDEX "Operator_countryCode_lifecycle_idx" ON "Operator"("countryCode", "lifecycle");

-- CreateIndex
CREATE INDEX "Operator_lifecycle_isPubliclyListed_idx" ON "Operator"("lifecycle", "isPubliclyListed");

-- CreateIndex
CREATE INDEX "Operator_legalName_idx" ON "Operator"("legalName");

-- CreateIndex
CREATE INDEX "OperatorAlias_matchKey_idx" ON "OperatorAlias"("matchKey");

-- CreateIndex
CREATE UNIQUE INDEX "OperatorAlias_operatorId_alias_key" ON "OperatorAlias"("operatorId", "alias");

-- CreateIndex
CREATE INDEX "OperatorAuthorization_authority_numberNormalized_idx" ON "OperatorAuthorization"("authority", "numberNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "OperatorAuthorization_operatorId_authority_certificateType_key" ON "OperatorAuthorization"("operatorId", "authority", "certificateType");

-- CreateIndex
CREATE UNIQUE INDEX "OperatorContact_externalKey_key" ON "OperatorContact"("externalKey");

-- CreateIndex
CREATE INDEX "OperatorContact_operatorId_kind_idx" ON "OperatorContact"("operatorId", "kind");

-- CreateIndex
CREATE INDEX "OperatorMembership_userId_status_idx" ON "OperatorMembership"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OperatorMembership_operatorId_userId_key" ON "OperatorMembership"("operatorId", "userId");

-- CreateIndex
CREATE INDEX "OperatorClaim_status_createdAt_idx" ON "OperatorClaim"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OperatorClaim_operatorId_idx" ON "OperatorClaim"("operatorId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationCheck_operatorId_type_key" ON "VerificationCheck"("operatorId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Agreement_operatorId_version_key" ON "Agreement"("operatorId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Document_storageKey_key" ON "Document"("storageKey");

-- CreateIndex
CREATE INDEX "Document_sha256_idx" ON "Document"("sha256");

-- CreateIndex
CREATE UNIQUE INDEX "OperatorDocument_operatorId_documentId_key" ON "OperatorDocument"("operatorId", "documentId");

-- CreateIndex
CREATE UNIQUE INDEX "AircraftType_key_key" ON "AircraftType"("key");

-- CreateIndex
CREATE INDEX "AircraftType_category_idx" ON "AircraftType"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Aircraft_registration_key" ON "Aircraft"("registration");

-- CreateIndex
CREATE INDEX "Aircraft_operatorId_reviewStatus_idx" ON "Aircraft"("operatorId", "reviewStatus");

-- CreateIndex
CREATE INDEX "Aircraft_charterEligible_reviewStatus_operationalStatus_idx" ON "Aircraft"("charterEligible", "reviewStatus", "operationalStatus");

-- CreateIndex
CREATE INDEX "Aircraft_aircraftTypeId_idx" ON "Aircraft"("aircraftTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "FleetEvidence_externalKey_key" ON "FleetEvidence"("externalKey");

-- CreateIndex
CREATE INDEX "FleetEvidence_operatorId_idx" ON "FleetEvidence"("operatorId");

-- CreateIndex
CREATE INDEX "AircraftImage_aircraftId_sortOrder_idx" ON "AircraftImage"("aircraftId", "sortOrder");

-- CreateIndex
CREATE INDEX "AircraftAvailability_aircraftId_startsAt_endsAt_idx" ON "AircraftAvailability"("aircraftId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "AircraftAvailability_kind_startsAt_idx" ON "AircraftAvailability"("kind", "startsAt");

-- CreateIndex
CREATE INDEX "PricingRule_operatorId_isActive_idx" ON "PricingRule"("operatorId", "isActive");

-- CreateIndex
CREATE INDEX "PricingRule_aircraftId_isActive_idx" ON "PricingRule"("aircraftId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Rfq_reference_key" ON "Rfq"("reference");

-- CreateIndex
CREATE INDEX "Rfq_customerId_status_idx" ON "Rfq"("customerId", "status");

-- CreateIndex
CREATE INDEX "Rfq_status_submittedAt_idx" ON "Rfq"("status", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RfqLeg_rfqId_sequence_key" ON "RfqLeg"("rfqId", "sequence");

-- CreateIndex
CREATE INDEX "RfqRecipient_operatorId_status_idx" ON "RfqRecipient"("operatorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RfqRecipient_rfqId_operatorId_key" ON "RfqRecipient"("rfqId", "operatorId");

-- CreateIndex
CREATE INDEX "Quote_rfqId_status_idx" ON "Quote"("rfqId", "status");

-- CreateIndex
CREATE INDEX "Quote_operatorId_status_idx" ON "Quote"("operatorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_rfqId_operatorId_aircraftId_key" ON "Quote"("rfqId", "operatorId", "aircraftId");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteRevision_quoteId_revision_key" ON "QuoteRevision"("quoteId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_reference_key" ON "Booking"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_rfqId_key" ON "Booking"("rfqId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_quoteId_key" ON "Booking"("quoteId");

-- CreateIndex
CREATE INDEX "Booking_customerId_status_idx" ON "Booking"("customerId", "status");

-- CreateIndex
CREATE INDEX "Booking_operatorId_status_idx" ON "Booking"("operatorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BookingLeg_bookingId_sequence_key" ON "BookingLeg"("bookingId", "sequence");

-- CreateIndex
CREATE INDEX "BookingEvent_bookingId_createdAt_idx" ON "BookingEvent"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_provider_providerRef_key" ON "Payment"("provider", "providerRef");

-- CreateIndex
CREATE INDEX "EmptyLegListing_status_windowStartUtc_idx" ON "EmptyLegListing"("status", "windowStartUtc");

-- CreateIndex
CREATE INDEX "EmptyLegListing_fromAirportId_toAirportId_status_idx" ON "EmptyLegListing"("fromAirportId", "toAirportId", "status");

-- CreateIndex
CREATE INDEX "EmptyLegEnquiry_listingId_status_idx" ON "EmptyLegEnquiry"("listingId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SaleListing_slug_key" ON "SaleListing"("slug");

-- CreateIndex
CREATE INDEX "SaleListing_status_publishedAt_idx" ON "SaleListing"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "SaleListing_category_status_idx" ON "SaleListing"("category", "status");

-- CreateIndex
CREATE INDEX "SaleListingMedia_listingId_sortOrder_idx" ON "SaleListingMedia"("listingId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SellerLead_listingId_key" ON "SellerLead"("listingId");

-- CreateIndex
CREATE INDEX "BuyerEnquiry_listingId_status_idx" ON "BuyerEnquiry"("listingId", "status");

-- CreateIndex
CREATE INDEX "ListingReviewEvent_listingId_createdAt_idx" ON "ListingReviewEvent"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationDelivery_status_createdAt_idx" ON "NotificationDelivery"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Job_dedupeKey_key" ON "Job"("dedupeKey");

-- CreateIndex
CREATE INDEX "Job_status_runAt_idx" ON "Job"("status", "runAt");

-- CreateIndex
CREATE UNIQUE INDEX "DataSource_code_key" ON "DataSource"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SourceRecord_dataSourceId_sheet_rowNumber_key" ON "SourceRecord"("dataSourceId", "sheet", "rowNumber");

-- CreateIndex
CREATE INDEX "ExternalIdentifier_entityType_entityId_idx" ON "ExternalIdentifier"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalIdentifier_namespace_value_key" ON "ExternalIdentifier"("namespace", "value");

-- CreateIndex
CREATE INDEX "FieldObservation_entityType_entityId_idx" ON "FieldObservation"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldObservation_entityType_entityId_field_sourceCode_sheet_key" ON "FieldObservation"("entityType", "entityId", "field", "sourceCode", "sheet", "rowNumber");

-- CreateIndex
CREATE INDEX "ImportChange_batchId_idx" ON "ImportChange"("batchId");

-- CreateIndex
CREATE INDEX "ImportChange_entityType_entityId_idx" ON "ImportChange"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "DataConflict_conflictKey_key" ON "DataConflict"("conflictKey");

-- CreateIndex
CREATE INDEX "DataConflict_status_entityType_idx" ON "DataConflict"("status", "entityType");

-- CreateIndex
CREATE INDEX "MatchCandidate_status_idx" ON "MatchCandidate"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MatchCandidate_entityType_leftKey_rightKey_key" ON "MatchCandidate"("entityType", "leftKey", "rightKey");

-- CreateIndex
CREATE UNIQUE INDEX "AuthorityRegistryEntry_externalKey_key" ON "AuthorityRegistryEntry"("externalKey");

-- CreateIndex
CREATE INDEX "AuthorityRegistryEntry_authority_approvalNumber_idx" ON "AuthorityRegistryEntry"("authority", "approvalNumber");

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceSource_externalKey_key" ON "EvidenceSource"("externalKey");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_createdAt_idx" ON "AuditEvent"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_actorUserId_createdAt_idx" ON "AuditEvent"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_action_createdAt_idx" ON "AuditEvent"("action", "createdAt");

-- CreateIndex
CREATE INDEX "_DocumentToOperatorClaim_B_index" ON "_DocumentToOperatorClaim"("B");

-- AddForeignKey
ALTER TABLE "Region" ADD CONSTRAINT "Region_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "Country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Airport" ADD CONSTRAINT "Airport_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "Country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Airport" ADD CONSTRAINT "Airport_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRoleAssignment" ADD CONSTRAINT "StaffRoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRoleAssignment" ADD CONSTRAINT "StaffRoleAssignment_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operator" ADD CONSTRAINT "Operator_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "Country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorAlias" ADD CONSTRAINT "OperatorAlias_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorAuthorization" ADD CONSTRAINT "OperatorAuthorization_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorContact" ADD CONSTRAINT "OperatorContact_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorMembership" ADD CONSTRAINT "OperatorMembership_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorMembership" ADD CONSTRAINT "OperatorMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorClaim" ADD CONSTRAINT "OperatorClaim_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorClaim" ADD CONSTRAINT "OperatorClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorClaim" ADD CONSTRAINT "OperatorClaim_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationCheck" ADD CONSTRAINT "VerificationCheck_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationCheck" ADD CONSTRAINT "VerificationCheck_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationCheck" ADD CONSTRAINT "VerificationCheck_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorDocument" ADD CONSTRAINT "OperatorDocument_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorDocument" ADD CONSTRAINT "OperatorDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aircraft" ADD CONSTRAINT "Aircraft_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aircraft" ADD CONSTRAINT "Aircraft_aircraftTypeId_fkey" FOREIGN KEY ("aircraftTypeId") REFERENCES "AircraftType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aircraft" ADD CONSTRAINT "Aircraft_homeBaseAirportId_fkey" FOREIGN KEY ("homeBaseAirportId") REFERENCES "Airport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetEvidence" ADD CONSTRAINT "FleetEvidence_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetEvidence" ADD CONSTRAINT "FleetEvidence_aircraftTypeId_fkey" FOREIGN KEY ("aircraftTypeId") REFERENCES "AircraftType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AircraftImage" ADD CONSTRAINT "AircraftImage_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AircraftImage" ADD CONSTRAINT "AircraftImage_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AircraftAvailability" ADD CONSTRAINT "AircraftAvailability_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AircraftAvailability" ADD CONSTRAINT "AircraftAvailability_baseAirportId_fkey" FOREIGN KEY ("baseAirportId") REFERENCES "Airport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rfq" ADD CONSTRAINT "Rfq_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqLeg" ADD CONSTRAINT "RfqLeg_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqLeg" ADD CONSTRAINT "RfqLeg_fromAirportId_fkey" FOREIGN KEY ("fromAirportId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqLeg" ADD CONSTRAINT "RfqLeg_toAirportId_fkey" FOREIGN KEY ("toAirportId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqRecipient" ADD CONSTRAINT "RfqRecipient_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqRecipient" ADD CONSTRAINT "RfqRecipient_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRevision" ADD CONSTRAINT "QuoteRevision_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRevision" ADD CONSTRAINT "QuoteRevision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_quoteRevisionId_fkey" FOREIGN KEY ("quoteRevisionId") REFERENCES "QuoteRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingLeg" ADD CONSTRAINT "BookingLeg_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingLeg" ADD CONSTRAINT "BookingLeg_fromAirportId_fkey" FOREIGN KEY ("fromAirportId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingLeg" ADD CONSTRAINT "BookingLeg_toAirportId_fkey" FOREIGN KEY ("toAirportId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingEvent" ADD CONSTRAINT "BookingEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmptyLegListing" ADD CONSTRAINT "EmptyLegListing_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmptyLegListing" ADD CONSTRAINT "EmptyLegListing_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmptyLegListing" ADD CONSTRAINT "EmptyLegListing_fromAirportId_fkey" FOREIGN KEY ("fromAirportId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmptyLegListing" ADD CONSTRAINT "EmptyLegListing_toAirportId_fkey" FOREIGN KEY ("toAirportId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmptyLegEnquiry" ADD CONSTRAINT "EmptyLegEnquiry_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "EmptyLegListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmptyLegEnquiry" ADD CONSTRAINT "EmptyLegEnquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleListing" ADD CONSTRAINT "SaleListing_sellerUserId_fkey" FOREIGN KEY ("sellerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleListingMedia" ADD CONSTRAINT "SaleListingMedia_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "SaleListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleListingMedia" ADD CONSTRAINT "SaleListingMedia_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerLead" ADD CONSTRAINT "SellerLead_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "SaleListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerEnquiry" ADD CONSTRAINT "BuyerEnquiry_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "SaleListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerEnquiry" ADD CONSTRAINT "BuyerEnquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingReviewEvent" ADD CONSTRAINT "ListingReviewEvent_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "SaleListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceRecord" ADD CONSTRAINT "SourceRecord_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceRecord" ADD CONSTRAINT "SourceRecord_firstBatchId_fkey" FOREIGN KEY ("firstBatchId") REFERENCES "ImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldObservation" ADD CONSTRAINT "FieldObservation_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportChange" ADD CONSTRAINT "ImportChange_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataConflict" ADD CONSTRAINT "DataConflict_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchCandidate" ADD CONSTRAINT "MatchCandidate_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorityRegistryEntry" ADD CONSTRAINT "AuthorityRegistryEntry_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentToOperatorClaim" ADD CONSTRAINT "_DocumentToOperatorClaim_A_fkey" FOREIGN KEY ("A") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentToOperatorClaim" ADD CONSTRAINT "_DocumentToOperatorClaim_B_fkey" FOREIGN KEY ("B") REFERENCES "OperatorClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
