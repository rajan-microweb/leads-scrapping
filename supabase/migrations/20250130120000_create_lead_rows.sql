-- LeadFile: one row per uploaded leads file (may already exist in DB; create if not)
CREATE TABLE IF NOT EXISTS "LeadFile" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "uploadedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "signatureId" TEXT
);

-- LeadRow: rows extracted from each lead file (Business Emails, Website URLs, etc.)
CREATE TABLE "LeadRow" (
  id TEXT PRIMARY KEY,
  "leadFileId" TEXT NOT NULL REFERENCES "LeadFile"(id) ON DELETE CASCADE,
  "rowIndex" INTEGER NOT NULL,
  "businessEmail" TEXT,
  "websiteUrl" TEXT
);

CREATE INDEX IF NOT EXISTS "LeadRow_leadFileId_idx" ON "LeadRow"("leadFileId");

-- RLS: LeadRow accessible only when the parent LeadFile belongs to the user
-- (App uses service role server-side, so RLS is bypassed there; this secures direct Supabase client access.)
ALTER TABLE "LeadRow" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "LeadRow_select_own"
  ON "LeadRow"
  FOR SELECT
  USING (
    "leadFileId" IN (SELECT id FROM "LeadFile" WHERE "userId" = auth.uid()::text)
  );

CREATE POLICY "LeadRow_insert_own"
  ON "LeadRow"
  FOR INSERT
  WITH CHECK (
    "leadFileId" IN (SELECT id FROM "LeadFile" WHERE "userId" = auth.uid()::text)
  );

CREATE POLICY "LeadRow_update_own"
  ON "LeadRow"
  FOR UPDATE
  USING (
    "leadFileId" IN (SELECT id FROM "LeadFile" WHERE "userId" = auth.uid()::text)
  );

CREATE POLICY "LeadRow_delete_own"
  ON "LeadRow"
  FOR DELETE
  USING (
    "leadFileId" IN (SELECT id FROM "LeadFile" WHERE "userId" = auth.uid()::text)
  );
