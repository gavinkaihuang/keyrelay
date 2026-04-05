ALTER TABLE "keys"
ADD COLUMN "key_preview" TEXT NOT NULL DEFAULT '',
ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "keys"
SET "key_preview" = CASE
    WHEN length("secret_key") <= 8 THEN "secret_key"
    ELSE left("secret_key", 3) || '-...' || right("secret_key", 4)
END;

CREATE INDEX "keys_created_at_idx" ON "keys"("created_at");