ALTER TABLE "quizzes"
  ADD COLUMN IF NOT EXISTS "audience" TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS "cadence" TEXT NOT NULL DEFAULT 'monthly';

CREATE INDEX IF NOT EXISTS "quizzes_audience_cadence_isActive_startDate_endDate_idx"
  ON "quizzes" ("audience", "cadence", "isActive", "startDate", "endDate");
