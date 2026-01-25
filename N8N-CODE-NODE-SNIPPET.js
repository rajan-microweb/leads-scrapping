/**
 * n8n Code Node: Parse get-all-credentials Response
 * 
 * Place this code in a Code node AFTER your HTTP Request node
 * that calls the get-all-credentials Edge Function
 * 
 * This will extract and format all personal, company, and integration data
 * for easy use in subsequent workflow nodes.
 */

// Get the response from HTTP Request node
const response = $input.first().json;

// Validate response
if (!response.success) {
  throw new Error(`Failed to fetch credentials: ${response.error || 'Unknown error'}`);
}

// Extract data sections
const personal = response.data?.personal || {};
const company = response.data?.company || null;
const integrations = response.data?.integrations || [];
const websiteSubmissions = response.data?.websiteSubmissions || [];

// Helper function to safely get nested value
const safeGet = (obj, path, defaultValue = '') => {
  try {
    return path.split('.').reduce((o, p) => o?.[p], obj) || defaultValue;
  } catch {
    return defaultValue;
  }
};

// Format for easy access in subsequent nodes
return {
  json: {
    // ============================================
    // PERSONAL DETAILS
    // ============================================
    userId: personal.id || '',
    userName: personal.name || personal.fullName || 'Unknown',
    userFullName: personal.fullName || personal.name || '',
    userEmail: personal.email || '',
    userPhone: personal.phone || '',
    userJobTitle: personal.jobTitle || '',
    userCountry: personal.country || '',
    userTimezone: personal.timezone || '',
    userAvatar: personal.avatarUrl || personal.image || '',
    userRole: personal.role || 'CLIENT',
    
    // ============================================
    // COMPANY DETAILS
    // ============================================
    companyId: company?.id || '',
    companyName: company?.companyName || '',
    companyWebsite: company?.websiteUrl || company?.websiteName || '',
    companyType: company?.companyType || '',
    companyIndustry: safeGet(company, 'industryExpertise.industry', ''),
    companyTechSummary: company?.fullTechSummary || {},
    companyServices: company?.serviceCatalog || {},
    companyHook: company?.theHook || '',
    companyWhatTheyDo: company?.whatTheyDo || '',
    companyValueProposition: company?.valueProposition || '',
    companyBrandTone: company?.brandTone || {},
    
    // Company services as formatted string (for email prompts)
    companyServicesText: company?.serviceCatalog 
      ? Object.entries(company.serviceCatalog)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ')
      : '',
    
    // ============================================
    // INTEGRATION DETAILS
    // ============================================
    // Outlook integration
    hasOutlook: integrations.some(i => 
      i.platformName?.toLowerCase() === 'outlook' && i.isConnected
    ),
    outlookConnected: integrations.find(i => 
      i.platformName?.toLowerCase() === 'outlook'
    )?.isConnected || false,
    outlookId: integrations.find(i => 
      i.platformName?.toLowerCase() === 'outlook'
    )?.id || null,
    
    // All integrations summary
    allIntegrations: integrations.map(i => ({
      id: i.id,
      platform: i.platformName,
      connected: i.isConnected,
      hasCredentials: i.hasCredentials || false
    })),
    
    connectedIntegrations: integrations
      .filter(i => i.isConnected)
      .map(i => i.platformName),
    
    // Check if specific integration exists
    hasIntegration: (platformName) => {
      return integrations.some(i => 
        i.platformName?.toLowerCase() === platformName?.toLowerCase() && i.isConnected
      );
    },
    
    // ============================================
    // WEBSITE SUBMISSIONS
    // ============================================
    websiteSubmissionsCount: websiteSubmissions.length,
    latestWebsiteSubmission: websiteSubmissions[0] || null,
    
    // ============================================
    // FULL DATA (for advanced use cases)
    // ============================================
    fullPersonal: personal,
    fullCompany: company,
    fullIntegrations: integrations,
    fullWebsiteSubmissions: websiteSubmissions,
    
    // ============================================
    // FORMATTED DATA FOR EMAIL GENERATION
    // ============================================
    emailContext: {
      senderName: personal.fullName || personal.name || '',
      senderEmail: personal.email || '',
      senderCompany: company?.companyName || '',
      senderServices: company?.serviceCatalog || {},
      senderValueProp: company?.valueProposition || '',
      senderBrandTone: company?.brandTone || {}
    },
    
    // ============================================
    // VALIDATION FLAGS
    // ============================================
    hasPersonalData: !!personal.id,
    hasCompanyData: !!company?.id,
    hasIntegrations: integrations.length > 0,
    hasWebsiteSubmissions: websiteSubmissions.length > 0,
    isDataComplete: !!(personal.id && company?.id)
  }
};
