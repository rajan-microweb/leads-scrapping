-- ActionRuns: track per-row action execution (e.g. send_mail) for n8n webhook callbacks
CREATE TABLE IF NOT EXISTS "ActionRuns" (
  id TEXT PRIMARY KEY,
  "leadFileId" TEXT NOT NULL REFERENCES "LeadSheets"(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'send_mail',
  "rowIds" JSONB NOT NULL DEFAULT '[]',
  statuses JSONB NOT NULL DEFAULT '{}',
  "callbackToken" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "ActionRuns_leadFileId_id_idx" ON "ActionRuns"("leadFileId", id);
CREATE INDEX IF NOT EXISTS "ActionRuns_callbackToken_idx" ON "ActionRuns"("callbackToken");

-- RLS: users can only read/write their own runs
ALTER TABLE "ActionRuns" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ActionRuns_select_own"
  ON "ActionRuns"
  FOR SELECT
  USING (
    "leadFileId" IN (SELECT id FROM "LeadSheets" WHERE "userId" = auth.uid()::text)
  );

CREATE POLICY "ActionRuns_insert_own"
  ON "ActionRuns"
  FOR INSERT
  WITH CHECK (
    "leadFileId" IN (SELECT id FROM "LeadSheets" WHERE "userId" = auth.uid()::text)
  );

CREATE POLICY "ActionRuns_update_own"
  ON "ActionRuns"
  FOR UPDATE
  USING (
    "leadFileId" IN (SELECT id FROM "LeadSheets" WHERE "userId" = auth.uid()::text)
  );

-- Note: n8n callback updates ActionRuns via service role (bypasses RLS)
-- The callback endpoint uses supabaseAdmin, which bypasses RLS
