-- Remove ActionRuns realtime broadcast (no longer used)
-- The run-action API no longer creates ActionRuns or uses callbacks

DROP TRIGGER IF EXISTS action_runs_broadcast_trigger ON "ActionRuns";
DROP FUNCTION IF EXISTS public.action_runs_broadcast();
