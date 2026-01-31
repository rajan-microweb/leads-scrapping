-- Rename LeadFile table and columns to LeadSheets / sheetName
-- Preserves existing data; RLS policies updated to reference new table name

-- 1. Rename table
ALTER TABLE "LeadFile" RENAME TO "LeadSheets";

-- 2. Rename column
ALTER TABLE "LeadSheets" RENAME COLUMN "fileName" TO "sheetName";

-- 3. Add optional sourceFileExtension for Type column (CSV, XLS, XLSX)
ALTER TABLE "LeadSheets" ADD COLUMN IF NOT EXISTS "sourceFileExtension" TEXT;

-- 4. Update RLS policies on LeadRow to reference LeadSheets
DROP POLICY IF EXISTS "LeadRow_select_own" ON "LeadRow";
DROP POLICY IF EXISTS "LeadRow_insert_own" ON "LeadRow";
DROP POLICY IF EXISTS "LeadRow_update_own" ON "LeadRow";
DROP POLICY IF EXISTS "LeadRow_delete_own" ON "LeadRow";

CREATE POLICY "LeadRow_select_own"
  ON "LeadRow"
  FOR SELECT
  USING (
    "leadFileId" IN (SELECT id FROM "LeadSheets" WHERE "userId" = auth.uid()::text)
  );

CREATE POLICY "LeadRow_insert_own"
  ON "LeadRow"
  FOR INSERT
  WITH CHECK (
    "leadFileId" IN (SELECT id FROM "LeadSheets" WHERE "userId" = auth.uid()::text)
  );

CREATE POLICY "LeadRow_update_own"
  ON "LeadRow"
  FOR UPDATE
  USING (
    "leadFileId" IN (SELECT id FROM "LeadSheets" WHERE "userId" = auth.uid()::text)
  );

CREATE POLICY "LeadRow_delete_own"
  ON "LeadRow"
  FOR DELETE
  USING (
    "leadFileId" IN (SELECT id FROM "LeadSheets" WHERE "userId" = auth.uid()::text)
  );
