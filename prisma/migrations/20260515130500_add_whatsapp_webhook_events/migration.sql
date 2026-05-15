CREATE TABLE IF NOT EXISTS "whatsapp_webhook_events" (
  "dedupe_key" TEXT PRIMARY KEY,
  "remote_jid" TEXT NOT NULL,
  "participant" TEXT,
  "message_id" TEXT,
  "event" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "whatsapp_webhook_events_created_at_idx"
ON "whatsapp_webhook_events" ("created_at");
