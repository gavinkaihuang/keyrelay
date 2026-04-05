-- CreateTable
CREATE TABLE "keys" (
    "id" UUID NOT NULL,
    "platform" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "secret_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT '1970-01-01 00:00:00+00'::timestamptz,
    "cooling_until" TIMESTAMP(3),
    "fail_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_logs" (
    "id" UUID NOT NULL,
    "key_id" UUID NOT NULL,
    "project_name" TEXT NOT NULL,
    "request_status" TEXT NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "keys_last_used_at_idx" ON "keys"("last_used_at");

-- CreateIndex
CREATE INDEX "usage_logs_key_id_idx" ON "usage_logs"("key_id");

-- AddForeignKey
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_key_id_fkey" FOREIGN KEY ("key_id") REFERENCES "keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
