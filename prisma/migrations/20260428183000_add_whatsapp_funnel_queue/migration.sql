CREATE TABLE IF NOT EXISTS "whatsapp_funnel_messages" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "phone" TEXT NOT NULL,
  "stage" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'text',
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "lastError" TEXT,
  "dedupeKey" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "whatsapp_funnel_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_funnel_messages_dedupeKey_key"
  ON "whatsapp_funnel_messages" ("dedupeKey");

CREATE INDEX IF NOT EXISTS "whatsapp_funnel_messages_status_scheduledFor_idx"
  ON "whatsapp_funnel_messages" ("status", "scheduledFor");

CREATE INDEX IF NOT EXISTS "whatsapp_funnel_messages_userId_stage_idx"
  ON "whatsapp_funnel_messages" ("userId", "stage");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'whatsapp_funnel_messages'
      AND constraint_name = 'whatsapp_funnel_messages_userId_fkey'
  ) THEN
    ALTER TABLE "whatsapp_funnel_messages"
      ADD CONSTRAINT "whatsapp_funnel_messages_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
