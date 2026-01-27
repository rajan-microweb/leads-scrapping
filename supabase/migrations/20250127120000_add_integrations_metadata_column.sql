-- Add optional metadata JSONB column to integrations for non-secret integration data
-- (e.g. accountId, email, scopes). Keeps credentials strictly for secrets.
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS metadata JSONB;
