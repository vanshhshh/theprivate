-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('READY', 'PREVIEWED', 'TEST_SENT', 'APPROVED', 'QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'BOUNCED', 'OPENED', 'CLAIMED', 'EXPIRED', 'REVOKED', 'UNSUBSCRIBED', 'FAILED');

-- CreateEnum
CREATE TYPE "InvitationCampaignStatus" AS ENUM ('DRAFT', 'APPROVED', 'SENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SuppressionReason" AS ENUM ('UNSUBSCRIBED', 'HARD_BOUNCE', 'COMPLAINT', 'MANUAL');

-- CreateEnum
CREATE TYPE "OnboardingPaymentStatus" AS ENUM ('PAYMENT_PENDING', 'PAYMENT_PROCESSING', 'PAID', 'PAYMENT_FAILED', 'PAYMENT_CANCELLED', 'REFUND_PENDING', 'REFUNDED', 'PAYMENT_REVERSED');

-- CreateTable
CREATE TABLE "InvitationCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "InvitationCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMPTZ(3),
    "approvedCount" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "InvitationCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatorInvitation" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT,
    "operatorId" TEXT NOT NULL,
    "contactId" TEXT,
    "email" TEXT NOT NULL,
    "recipientName" TEXT,
    "tokenHash" TEXT,
    "status" "InvitationStatus" NOT NULL DEFAULT 'READY',
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMPTZ(3),
    "sentAt" TIMESTAMPTZ(3),
    "firstVisitedAt" TIMESTAMPTZ(3),
    "claimedAt" TIMESTAMPTZ(3),
    "claimedByUserId" TEXT,
    "claimId" TEXT,
    "revokedAt" TIMESTAMPTZ(3),
    "sendAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "providerMessageId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "OperatorInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvitationEvent" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorUserId" TEXT,
    "detail" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSuppression" (
    "email" TEXT NOT NULL,
    "reason" "SuppressionReason" NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailSuppression_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "OnboardingPayment" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "status" "OnboardingPaymentStatus" NOT NULL DEFAULT 'PAYMENT_PENDING',
    "provider" TEXT NOT NULL,
    "providerOrderId" TEXT,
    "providerPaymentId" TEXT,
    "checkoutUrl" TEXT,
    "feeMinor" INTEGER NOT NULL,
    "taxMinor" INTEGER NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "taxLabel" TEXT,
    "taxRateBps" INTEGER,
    "refundPolicy" TEXT,
    "receiptNumber" TEXT,
    "paidAt" TIMESTAMPTZ(3),
    "failureReason" TEXT,
    "refundedMinor" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "OnboardingPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingPaymentEvent" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "providerEventId" TEXT,
    "actorUserId" TEXT,
    "detail" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingPaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvitationCampaign_status_createdAt_idx" ON "InvitationCampaign"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OperatorInvitation_tokenHash_key" ON "OperatorInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "OperatorInvitation_operatorId_status_idx" ON "OperatorInvitation"("operatorId", "status");

-- CreateIndex
CREATE INDEX "OperatorInvitation_email_idx" ON "OperatorInvitation"("email");

-- CreateIndex
CREATE INDEX "OperatorInvitation_campaignId_status_idx" ON "OperatorInvitation"("campaignId", "status");

-- CreateIndex
CREATE INDEX "InvitationEvent_invitationId_createdAt_idx" ON "InvitationEvent"("invitationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingPayment_receiptNumber_key" ON "OnboardingPayment"("receiptNumber");

-- CreateIndex
CREATE INDEX "OnboardingPayment_operatorId_status_idx" ON "OnboardingPayment"("operatorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingPayment_provider_providerOrderId_key" ON "OnboardingPayment"("provider", "providerOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingPaymentEvent_providerEventId_key" ON "OnboardingPaymentEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "OnboardingPaymentEvent_paymentId_createdAt_idx" ON "OnboardingPaymentEvent"("paymentId", "createdAt");

-- AddForeignKey
ALTER TABLE "OperatorInvitation" ADD CONSTRAINT "OperatorInvitation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "InvitationCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorInvitation" ADD CONSTRAINT "OperatorInvitation_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationEvent" ADD CONSTRAINT "InvitationEvent_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "OperatorInvitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingPayment" ADD CONSTRAINT "OnboardingPayment_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingPaymentEvent" ADD CONSTRAINT "OnboardingPaymentEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "OnboardingPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
