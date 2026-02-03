-- Rename LeadsData.leadFileId to leadSheetId

-- 1. Rename column
ALTER TABLE "LeadsData" RENAME COLUMN "leadFileId" TO "leadSheetId";

-- 2. Drop old index and create new one
DROP INDEX IF EXISTS "LeadsData_leadFileId_idx";
CREATE INDEX IF NOT EXISTS "LeadsData_leadSheetId_idx" ON "LeadsData"("leadSheetId");

-- 3. Recreate RLS policies to use new column name
DROP POLICY IF EXISTS "LeadsData_select_own" ON "LeadsData";
DROP POLICY IF EXISTS "LeadsData_insert_own" ON "LeadsData";
DROP POLICY IF EXISTS "LeadsData_update_own" ON "LeadsData";
DROP POLICY IF EXISTS "LeadsData_delete_own" ON "LeadsData";

CREATE POLICY "LeadsData_select_own"
  ON "LeadsData"
  FOR SELECT
  USING (
    "leadSheetId" IN (SELECT id FROM "LeadSheets" WHERE "userId" = auth.uid()::text)
  );

CREATE POLICY "LeadsData_insert_own"
  ON "LeadsData"
  FOR INSERT
  WITH CHECK (
    "leadSheetId" IN (SELECT id FROM "LeadSheets" WHERE "userId" = auth.uid()::text)
  );

CREATE POLICY "LeadsData_update_own"
  ON "LeadsData"
  FOR UPDATE
  USING (
    "leadSheetId" IN (SELECT id FROM "LeadSheets" WHERE "userId" = auth.uid()::text)
  );

CREATE POLICY "LeadsData_delete_own"
  ON "LeadsData"
  FOR DELETE
  USING (
    "leadSheetId" IN (SELECT id FROM "LeadSheets" WHERE "userId" = auth.uid()::text)
  );
