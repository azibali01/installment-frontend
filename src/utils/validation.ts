import { isValidCNIC } from "./cnic"

export interface Guarantor {
  name: string
  relation: string
  phone: string
  cnic: string
  address: string
}

export interface ValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Validates guarantors based on reference presence
 * @param guarantors - Array of guarantor objects
 * @param hasReference - Whether a reference is provided
 * @returns Validation result with error message if invalid
 */
export function validateGuarantors(guarantors: Guarantor[], hasReference: boolean): ValidationResult {
  if (hasReference) {
    // If reference exists, validate guarantors only if provided
    for (const g of guarantors) {
      if (String(g.cnic || "").trim() && !isValidCNIC(String(g.cnic || ""))) {
        return {
          isValid: false,
          error: "Each guarantor CNIC must be 13 digits",
        }
      }
    }
    return { isValid: true }
  } else {
    // If no reference, at least one guarantor with CNIC is required
    let hasValidGuarantor = false
    for (const g of guarantors) {
      if (String(g.cnic || "").trim()) {
        if (!isValidCNIC(String(g.cnic || ""))) {
          return {
            isValid: false,
            error: "Each guarantor CNIC must be 13 digits",
          }
        }
        hasValidGuarantor = true
      }
    }
    if (!hasValidGuarantor) {
      return {
        isValid: false,
        error: "Either provide a reference OR at least one guarantor with valid CNIC",
      }
    }
    return { isValid: true }
  }
}

