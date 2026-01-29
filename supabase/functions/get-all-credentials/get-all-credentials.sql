-- PostgreSQL Function: get_all_credentials
-- This function fetches complete user-related data in a single call
-- Designed to be consumed by n8n or other backend services
-- 
-- Usage:
-- SELECT get_all_credentials('user-id-here', false);
-- SELECT get_all_credentials('user-id-here', true); -- includes secrets

CREATE OR REPLACE FUNCTION get_all_credentials(
  p_user_id TEXT,
  p_include_secrets BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_personal JSONB;
  v_company JSONB;
  v_website_submissions JSONB;
  v_integrations JSONB;
  v_result JSONB;
  v_user_exists BOOLEAN;
BEGIN
  -- Validate input
  IF p_user_id IS NULL OR TRIM(p_user_id) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'userId is required and must be a non-empty string'
    );
  END IF;

  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM "User" WHERE id = TRIM(p_user_id)) INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Fetch personal details
  SELECT jsonb_build_object(
    'id', id,
    'name', name,
    'fullName', "fullName",
    'email', email,
    'phone', phone,
    'jobTitle', "jobTitle",
    'country', country,
    'timezone', timezone,
    'image', image,
    'avatarUrl', "avatarUrl",
    'role', role,
    'createdAt', "createdAt",
    'updatedAt', "updatedAt"
  )
  INTO v_personal
  FROM "User"
  WHERE id = TRIM(p_user_id);

  -- Fetch company details (most recent)
  SELECT jsonb_build_object(
    'id', id,
    'websiteName', "websiteName",
    'websiteUrl', "websiteUrl",
    'companyName', "companyName",
    'companyType', "companyType",
    'industryExpertise', "industryExpertise",
    'fullTechSummary', "fullTechSummary",
    'serviceCatalog', "serviceCatalog",
    'theHook', "theHook",
    'whatTheyDo', "whatTheyDo",
    'valueProposition', "valueProposition",
    'brandTone', "brandTone",
    'createdAt', "createdAt",
    'updatedAt', "updatedAt"
  )
  INTO v_company
  FROM my_company_info
  WHERE "userId" = TRIM(p_user_id)
  ORDER BY "createdAt" DESC
  LIMIT 1;

  -- Fetch website submissions (all, ordered by date)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'websiteName', "websiteName",
      'websiteUrl', "websiteUrl",
      'extractedData', "extractedData",
      'createdAt', "createdAt"
    )
    ORDER BY "createdAt" DESC
  ), '[]'::jsonb)
  INTO v_website_submissions
  FROM "WebsiteSubmission"
  WHERE "userId" = TRIM(p_user_id);

  -- Fetch integrations
  IF p_include_secrets THEN
    -- Include credentials
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', id,
        'platformName', "platformName",
        'isConnected', "isConnected",
        'credentials', credentials,
        'metadata', metadata,
        'createdAt', "createdAt",
        'updatedAt', "updatedAt"
      )
    ), '[]'::jsonb)
    INTO v_integrations
    FROM integrations
    WHERE "userId" = TRIM(p_user_id);
  ELSE
    -- Exclude credentials, only show hasCredentials flag
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', id,
        'platformName', "platformName",
        'isConnected', "isConnected",
        'hasCredentials', (
          credentials IS NOT NULL
          AND jsonb_typeof(credentials) = 'object'
          AND credentials != '{}'::jsonb
        ),
        'metadata', metadata,
        'createdAt', "createdAt",
        'updatedAt', "updatedAt"
      )
    ), '[]'::jsonb)
    INTO v_integrations
    FROM integrations
    WHERE "userId" = TRIM(p_user_id);
  END IF;

  -- Build final response
  v_result := jsonb_build_object(
    'success', true,
    'userId', TRIM(p_user_id),
    'data', jsonb_build_object(
      'personal', v_personal,
      'company', COALESCE(v_company, 'null'::jsonb),
      'websiteSubmissions', COALESCE(v_website_submissions, '[]'::jsonb),
      'integrations', COALESCE(v_integrations, '[]'::jsonb)
    )
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Return error in JSON format
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Internal server error',
      'message', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users (adjust as needed)
-- You may want to restrict this further based on your security requirements
GRANT EXECUTE ON FUNCTION get_all_credentials(TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_credentials(TEXT, BOOLEAN) TO service_role;

-- Example usage:
-- SELECT get_all_credentials('user-id-here', false);
-- SELECT get_all_credentials('user-id-here', true); -- includes secrets

-- To call from Supabase client or API:
-- You can create an API endpoint that calls this function, or use it directly in SQL queries
