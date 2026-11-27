-- CreateEnum
CREATE TYPE "WifiSecurity" AS ENUM ('WPA', 'WEP', 'NOPASS');

-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('LOGO', 'LOGO_WHITE', 'BANNER', 'MENU_PDF');

-- CreateEnum
CREATE TYPE "MenuLanguage" AS ENUM ('pl', 'en', 'ru');

-- CreateTable
CREATE TABLE "venue_settings" (
    "venue_id" UUID NOT NULL,
    "address" TEXT,
    "map_url" TEXT,
    "logo_asset_id" UUID,
    "logo_white_asset_id" UUID,
    "banner_asset_id" UUID,
    "theme_preset" TEXT NOT NULL DEFAULT 'sweeto',
    "font" TEXT,
    "wifi_ssid" TEXT,
    "wifi_security" "WifiSecurity",
    "wifi_password_encrypted" TEXT,
    "wifi_hidden" BOOLEAN NOT NULL DEFAULT false,
    "review_url" TEXT,
    "menu_pdf_pl_asset_id" UUID,
    "menu_pdf_en_asset_id" UUID,
    "menu_pdf_ru_asset_id" UUID,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_by_id" UUID,

    CONSTRAINT "venue_settings_pkey" PRIMARY KEY ("venue_id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL,
    "venue_id" UUID NOT NULL,
    "kind" "AssetKind" NOT NULL,
    "storage_path" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "language" "MenuLanguage",
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assets_storage_path_key" ON "assets"("storage_path");

-- CreateIndex
CREATE INDEX "assets_venue_id_kind_idx" ON "assets"("venue_id", "kind");

-- AddForeignKey
ALTER TABLE "venue_settings" ADD CONSTRAINT "venue_settings_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_settings" ADD CONSTRAINT "venue_settings_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- No access for Supabase Data API roles.
ALTER TABLE "venue_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assets" ENABLE ROW LEVEL SECURITY;
