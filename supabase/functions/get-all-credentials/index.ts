import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
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

    // Validate authorization - Authorization: Bearer <SUPABASE_ANON_KEY>
    const authHeader = req.headers.get("Authorization")
    
    // Get Supabase Anon Key from environment
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    
    if (!supabaseAnonKey) {
      console.error("SUPABASE_ANON_KEY is not set in environment")
      return new Response(
        JSON.stringify({ error: "Server configuration error: SUPABASE_ANON_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }
    
    // Extract Bearer token
    const bearerToken = authHeader?.startsWith("Bearer ") 
      ? authHeader.substring(7).trim() 
      : null
    
    // Validate: Authorization header with Bearer token matching Supabase Anon Key
    if (!bearerToken) {
      console.error("Authorization header with Bearer token is missing")
      return new Response(
        JSON.stringify({ error: "Unauthorized. Valid Authorization: Bearer header required." }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }
    
    if (bearerToken !== supabaseAnonKey) {
      console.error("Bearer token does not match SUPABASE_ANON_KEY")
      console.error("Expected length:", supabaseAnonKey.length)
      console.error("Received length:", bearerToken.length)
      console.error("First 20 chars of expected:", supabaseAnonKey.substring(0, 20))
      console.error("First 20 chars of received:", bearerToken.substring(0, 20))
      return new Response(
        JSON.stringify({ 
          error: "Unauthorized. Invalid authorization token.",
          hint: "Verify the Supabase Anon Key matches the one in your project settings"
        }),
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

    // Call the SQL function to get all credentials in a single database call
    const { data: result, error: rpcError } = await supabase.rpc(
      "get_all_credentials",
      {
        p_user_id: userId.trim(),
        p_include_secrets: includeSecrets,
      }
    )

    if (rpcError) {
      console.error("Error calling get_all_credentials function:", rpcError)
      return new Response(
        JSON.stringify({
          error: "Failed to fetch user data",
          message: rpcError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // The SQL function returns a JSONB object with the structure:
    // { success: boolean, userId: string, data: { personal, company, websiteSubmissions, integrations } }
    // or { success: false, error: string } on error
    if (!result || typeof result !== "object") {
      return new Response(
        JSON.stringify({ error: "Invalid response from database function" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Check if the SQL function returned an error
    if (result.success === false) {
      const statusCode = result.error === "User not found" ? 404 : 400
      return new Response(
        JSON.stringify({
          error: result.error || "Unknown error",
          message: result.message,
        }),
        {
          status: statusCode,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Return the response from the SQL function (already in the correct format)
    const response = result

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
