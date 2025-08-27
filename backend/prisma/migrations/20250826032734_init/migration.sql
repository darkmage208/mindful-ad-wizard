-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('CLIENT', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "public"."Platform" AS ENUM ('META', 'GOOGLE', 'BOTH');

-- CreateEnum
CREATE TYPE "public"."CampaignStatus" AS ENUM ('DRAFT', 'PENDING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."CreativeType" AS ENUM ('IMAGE', 'VIDEO', 'CAROUSEL', 'TEXT');

-- CreateEnum
CREATE TYPE "public"."LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('CAMPAIGN_ALERT', 'LEAD_NOTIFICATION', 'SYSTEM_UPDATE', 'MARKETING_TIP', 'PERFORMANCE_REPORT');

-- CreateEnum
CREATE TYPE "public"."ApiService" AS ENUM ('OPENAI', 'META_ADS', 'GOOGLE_ADS', 'EMAIL');

-- CreateEnum
CREATE TYPE "public"."LogLevel" AS ENUM ('ERROR', 'WARN', 'INFO', 'DEBUG');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'CLIENT',
    "avatar" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "bio" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifyToken" TEXT,
    "resetToken" TEXT,
    "resetExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLogin" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."onboarding_data" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "averageTicket" DOUBLE PRECISION NOT NULL,
    "serviceType" TEXT NOT NULL,
    "businessGoals" TEXT[],
    "budget" DOUBLE PRECISION NOT NULL,
    "experience" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."campaigns" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" "public"."Platform" NOT NULL,
    "status" "public"."CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "budget" DOUBLE PRECISION NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "objectives" TEXT[],
    "metaCampaignId" TEXT,
    "googleCampaignId" TEXT,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leads" INTEGER NOT NULL DEFAULT 0,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "headlines" TEXT[],
    "descriptions" TEXT[],
    "keywords" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."creatives" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "type" "public"."CreativeType" NOT NULL,
    "headline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cta" TEXT NOT NULL,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."leads" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "source" TEXT NOT NULL,
    "status" "public"."LeadStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "value" DOUBLE PRECISION,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."landing_pages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "colors" JSONB NOT NULL,
    "content" JSONB NOT NULL,
    "contact" JSONB NOT NULL,
    "visits" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."api_keys" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "service" "public"."ApiService" NOT NULL,
    "keyName" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."system_logs" (
    "id" TEXT NOT NULL,
    "level" "public"."LogLevel" NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_data_userId_key" ON "public"."onboarding_data"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "landing_pages_url_key" ON "public"."landing_pages"("url");

-- AddForeignKey
ALTER TABLE "public"."onboarding_data" ADD CONSTRAINT "onboarding_data_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaigns" ADD CONSTRAINT "campaigns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."creatives" ADD CONSTRAINT "creatives_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leads" ADD CONSTRAINT "leads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leads" ADD CONSTRAINT "leads_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."landing_pages" ADD CONSTRAINT "landing_pages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."api_keys" ADD CONSTRAINT "api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
