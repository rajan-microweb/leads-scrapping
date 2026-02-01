-- ActionRuns realtime broadcast trigger
-- Broadcasts status updates to Supabase Realtime when ActionRuns is updated
-- Topic: action-run:{id} so the frontend can subscribe per job

-- Create the broadcast function
CREATE OR REPLACE FUNCTION public.action_runs_broadcast()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  row_ids jsonb;
  statuses_json jsonb;
  rid text;
  st text;
  all_done boolean := true;
BEGIN
  row_ids := NEW."rowIds";
  statuses_json := NEW.statuses;
  
  -- Check if all rows have terminal status (completed or failed)
  FOR rid IN SELECT jsonb_array_elements_text(row_ids)
  LOOP
    st := statuses_json ->> rid;
    IF st IS NULL OR st NOT IN ('completed', 'failed') THEN
      all_done := false;
      EXIT;
    END IF;
  END LOOP;
  
  -- Broadcast the updated statuses to the channel
  -- Topic: action-run:{jobId}
  -- Event: status
  -- Public: false (public channel, unguessable topic name via cuid)
  PERFORM realtime.send(
    jsonb_build_object('statuses', statuses_json, 'isComplete', all_done),
    'status',
    'action-run:' || NEW.id,
    false
  );
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS action_runs_broadcast_trigger ON "ActionRuns";

CREATE TRIGGER action_runs_broadcast_trigger
AFTER UPDATE ON "ActionRuns"
FOR EACH ROW
EXECUTE FUNCTION action_runs_broadcast();

-- Note: realtime.send() is a Supabase Realtime function.
-- If not available in your Supabase plan, the fallback is to broadcast from the API.
