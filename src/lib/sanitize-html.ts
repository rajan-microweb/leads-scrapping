/**
 * Sanitizes HTML content for safe storage in the database.
 * Basic sanitization that removes dangerous content while preserving formatting.
 * This is a simpler implementation that avoids dependency issues with isomorphic-dompurify.
 * 
 * @param html - The HTML string to sanitize
 * @returns The sanitized HTML string, or empty string if input is invalid
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== "string") {
    return ""
  }

  let sanitized = html

  // Remove script tags and their content (case insensitive)
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
  
  // Remove event handlers (onclick, onerror, onload, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "")
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, "")
  
  // Remove dangerous tags
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
  sanitized = sanitized.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
  sanitized = sanitized.replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, "")
  
  // Remove javascript: and dangerous data: URLs from href and src attributes
  sanitized = sanitized.replace(/(href|src)\s*=\s*["']?\s*javascript:/gi, "$1=\"#\"")
  sanitized = sanitized.replace(/(href|src)\s*=\s*["']?\s*data:text\/html/gi, "$1=\"#\"")
  
  // Remove any remaining javascript: protocol references
  sanitized = sanitized.replace(/javascript:/gi, "")
  
  // Return the sanitized HTML
  // If sanitization resulted in empty string, return empty (don't return original as fallback)
  return sanitized.trim()
}
