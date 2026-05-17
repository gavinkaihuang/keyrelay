-- 1) Create platforms table
CREATE TABLE "platforms" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "icon" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "platforms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platforms_name_key" ON "platforms"("name");
CREATE INDEX "platforms_created_at_idx" ON "platforms"("created_at");

-- 2) Add nullable platform_id to keys first for backfill
ALTER TABLE "keys" ADD COLUMN "platform_id" UUID;

-- 3) Backfill platforms from existing keys.platform values
INSERT INTO "platforms" ("name")
SELECT DISTINCT TRIM("platform") AS "name"
FROM "keys"
WHERE "platform" IS NOT NULL
  AND TRIM("platform") <> ''
ON CONFLICT ("name") DO NOTHING;

-- 4) Backfill keys.platform_id by joining on platform name
UPDATE "keys" k
SET "platform_id" = p."id"
FROM "platforms" p
WHERE p."name" = TRIM(k."platform");

-- 5) Enforce integrity and add FK/index
ALTER TABLE "keys"
  ALTER COLUMN "platform_id" SET NOT NULL;

CREATE INDEX "keys_platform_id_idx" ON "keys"("platform_id");

ALTER TABLE "keys"
  ADD CONSTRAINT "keys_platform_id_fkey"
  FOREIGN KEY ("platform_id") REFERENCES "platforms"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6) Drop legacy column
ALTER TABLE "keys" DROP COLUMN "platform";
