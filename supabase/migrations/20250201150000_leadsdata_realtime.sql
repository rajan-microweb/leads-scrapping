-- Enable Supabase Realtime for LeadsData so the UI can subscribe to emailStatus updates
-- (e.g. when n8n / update-leads edge function sets emailStatus to 'Sent')

-- 1. Add LeadsData to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE "LeadsData";

-- 2. So UPDATE payloads include the full new row (e.g. emailStatus)
ALTER TABLE "LeadsData" REPLICA IDENTITY FULL;
