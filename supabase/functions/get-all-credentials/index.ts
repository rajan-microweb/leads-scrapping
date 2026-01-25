import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-api-key, content-type",
}

interface RequestBody {
  userId: string
  includeSecrets?: boolean
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // Get Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase configuration" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Validate authorization - only x-api-key header with N8N_SECRET
    const xApiKey = req.headers.get("x-api-key")
    
    // Debug: Log all headers (remove in production if needed)
    const allHeaders: Record<string, string> = {}
    req.headers.forEach((value, key) => {
      allHeaders[key] = key.toLowerCase().includes('key') || key.toLowerCase().includes('auth') ? '[REDACTED]' : value
    })
    console.log("Received headers:", Object.keys(allHeaders))
    
    // Get N8N secret from environment (stored in Supabase secrets)
    const n8nSecret = Deno.env.get("N8N_SECRET")
    
    if (!n8nSecret) {
      console.error("N8N_SECRET is not set in environment")
      return new Response(
        JSON.stringify({ error: "Server configuration error: N8N_SECRET not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }
    
    // Validate: only x-api-key header with N8N_SECRET
    if (!xApiKey) {
      console.error("x-api-key header is missing")
      return new Response(
        JSON.stringify({ 
          error: "Unauthorized. Valid x-api-key header required.",
          receivedHeaders: Object.keys(allHeaders)
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }
    
    if (xApiKey !== n8nSecret) {
      console.error("x-api-key value does not match N8N_SECRET")
      return new Response(
        JSON.stringify({ error: "Unauthorized. Invalid x-api-key value." }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Parse request body
    let body: RequestBody
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const { userId, includeSecrets = false } = body

    // Validate userId
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      return new Response(
        JSON.stringify({ error: "userId is required and must be a non-empty string" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Fetch personal details
    const { data: personal, error: personalError } = await supabase
      .from("User")
      .select(
        'id, name, "fullName", email, phone, "jobTitle", country, timezone, image, "avatarUrl", role, "createdAt", "updatedAt"'
      )
      .eq("id", userId.trim())
      .single()

    if (personalError || !personal) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Fetch company details (from my_company_info table)
    const { data: company, error: companyError } = await supabase
      .from("my_company_info")
      .select("*")
      .eq("userId", userId.trim())
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (companyError) {
      console.error("Error fetching company info:", companyError)
      // Continue without company data rather than failing
    }

    // Fetch website submissions (company intelligence data)
    const { data: websiteSubmissions, error: websiteError } = await supabase
      .from("WebsiteSubmission")
      .select("id, websiteName, websiteUrl, extractedData, createdAt")
      .eq("userId", userId.trim())
      .order("createdAt", { ascending: false })

    if (websiteError) {
      console.error("Error fetching website submissions:", websiteError)
      // Continue without website submissions
    }

    // Fetch integration details
    const { data: integrations, error: integrationsError } = await supabase
      .from("integrations")
      .select('id, "platformName", "isConnected", "createdAt", "updatedAt", credentials')
      .eq("userId", userId.trim())

    if (integrationsError) {
      console.error("Error fetching integrations:", integrationsError)
      // Continue without integrations
    }

    // Process integrations - exclude sensitive credentials unless explicitly requested
    const processedIntegrations = (integrations || []).map((integration) => {
      const { credentials, ...rest } = integration
      
      if (includeSecrets) {
        return {
          ...rest,
          credentials,
        }
      } else {
        // Return only platform name and connection status, exclude credentials
        return {
          ...rest,
          hasCredentials: !!credentials && Object.keys(credentials).length > 0,
        }
      }
    })

    // Structure the response
    const response = {
      success: true,
      userId: userId.trim(),
      data: {
        personal: {
          id: personal.id,
          name: personal.name,
          fullName: personal.fullName,
          email: personal.email,
          phone: personal.phone,
          jobTitle: personal.jobTitle,
          country: personal.country,
          timezone: personal.timezone,
          image: personal.image,
          avatarUrl: personal.avatarUrl,
          role: personal.role,
          createdAt: personal.createdAt,
          updatedAt: personal.updatedAt,
        },
        company: company
          ? {
              id: company.id,
              websiteName: company.websiteName,
              websiteUrl: company.websiteUrl,
              companyName: company.companyName,
              companyType: company.companyType,
              industryExpertise: company.industryExpertise,
              fullTechSummary: company.fullTechSummary,
              serviceCatalog: company.serviceCatalog,
              theHook: company.theHook,
              whatTheyDo: company.whatTheyDo,
              valueProposition: company.valueProposition,
              brandTone: company.brandTone,
              createdAt: company.createdAt,
              updatedAt: company.updatedAt,
            }
          : null,
        websiteSubmissions: (websiteSubmissions || []).map((submission) => ({
          id: submission.id,
          websiteName: submission.websiteName,
          websiteUrl: submission.websiteUrl,
          extractedData: submission.extractedData,
          createdAt: submission.createdAt,
        })),
        integrations: processedIntegrations,
      },
    }

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("get-all-credentials error:", error)
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
