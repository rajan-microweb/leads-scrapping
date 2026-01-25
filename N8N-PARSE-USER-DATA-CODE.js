/**
 * n8n Code Node: Parse User Data from HTTP Request3
 * 
 * Place this node AFTER "HTTP Request3" and BEFORE "Basic LLM Chain"
 * 
 * This node:
 * 1. Parses the response from get-all-credentials Edge Function
 * 2. Extracts personal, company, and integration data
 * 3. Merges it with company intelligence data from previous nodes
 * 4. Formats it for easy use in email generation prompt
 */

// Get the response from HTTP Request3
const response = $input.first().json;

// Validate response
if (!response.success) {
  throw new Error(`Failed to fetch user credentials: ${response.error || 'Unknown error'}`);
}

// Extract data sections
const personal = response.data?.personal || {};
const company = response.data?.company || null;
const integrations = response.data?.integrations || [];

// Get company intelligence from previous node (if available)
let companyIntelligence = {};
try {
  const prevNode = $('Converting into Structured Output').first();
  if (prevNode && prevNode.json) {
    companyIntelligence = prevNode.json.company_intelligence || {};
  }
} catch (e) {
  // If previous node data not available, continue with empty object
  console.log('Previous node data not available, continuing...');
}

// Helper function to safely get nested value
const safeGet = (obj, path, defaultValue = '') => {
  try {
    return path.split('.').reduce((o, p) => o?.[p], obj) || defaultValue;
  } catch {
    return defaultValue;
  }
};

// Format company services as readable text
const formatServices = (serviceCatalog) => {
  if (!serviceCatalog || typeof serviceCatalog !== 'object') {
    return '';
  }
  return Object.entries(serviceCatalog)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
};

// Return merged data structure
return {
  json: {
    // ============================================
    // COMPANY INTELLIGENCE (from website scraping)
    // ============================================
    company_intelligence: companyIntelligence,

    // ============================================
    // USER'S PERSONAL DETAILS
    // ============================================
    user_id: personal.id || '',
    user_name: personal.name || personal.fullName || '',
    user_fullName: personal.fullName || personal.name || '',
    user_email: personal.email || '',
    user_phone: personal.phone || '',
    user_jobTitle: personal.jobTitle || '',
    user_country: personal.country || '',
    user_timezone: personal.timezone || '',
    user_avatar: personal.avatarUrl || personal.image || '',
    user_role: personal.role || 'CLIENT',

    // ============================================
    // USER'S COMPANY DETAILS
    // ============================================
    user_company_id: company?.id || '',
    user_company_name: company?.companyName || '',
    user_company_website: company?.websiteUrl || company?.websiteName || '',
    user_company_type: company?.companyType || '',
    user_company_industry: safeGet(company, 'industryExpertise.industry', ''),
    user_company_whatTheyDo: company?.whatTheyDo || '',
    user_company_serviceCatalog: company?.serviceCatalog || {},
    user_company_servicesText: formatServices(company?.serviceCatalog),
    user_company_hook: company?.theHook || '',
    user_company_valueProposition: company?.valueProposition || '',
    user_company_brandTone: company?.brandTone || {},
    user_company_techSummary: company?.fullTechSummary || {},

    // ============================================
    // INTEGRATION DETAILS
    // ============================================
    has_outlook: integrations.some(i =>
      i.platformName?.toLowerCase() === 'outlook' && i.isConnected
    ),
    outlook_connected: integrations.find(i =>
      i.platformName?.toLowerCase() === 'outlook'
    )?.isConnected || false,
    all_integrations: integrations.map(i => ({
      platform: i.platformName,
      connected: i.isConnected,
      hasCredentials: i.hasCredentials || false
    })),

    // ============================================
    // FULL DATA (for advanced use cases)
    // ============================================
    user_personal_full: personal,
    user_company_full: company,
    user_integrations_full: integrations,

    // ============================================
    // VALIDATION FLAGS
    // ============================================
    has_personal_data: !!personal.id,
    has_company_data: !!company?.id,
    has_integrations: integrations.length > 0,
    is_data_complete: !!(personal.id && company?.id)
  }
};
