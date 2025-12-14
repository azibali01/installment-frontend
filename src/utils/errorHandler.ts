/**
 * Frontend error handling utilities with user-friendly messages
 */

export interface ApiError {
  error: string
  code?: string
  details?: any
  stack?: string
}

/**
 * User-friendly error message mappings (English only)
 */
const USER_FRIENDLY_MESSAGES: Record<string, string> = {
  // Network errors
  "Network Error": "Unable to connect to server. Please check if the backend is running and accessible.",
  "timeout": "Request timed out. The server may be slow or unreachable. Please try again.",
  "ECONNREFUSED": "Unable to connect to server. Please check if the backend is running and the URL is correct.",
  "ERR_NETWORK": "Network error. Unable to reach the server. Please check your connection and backend URL.",
  "ENOTFOUND": "Server not found. Please verify the backend URL is correct.",
  "ETIMEDOUT": "Request timed out. The server may be slow or unreachable.",
  "ECONNABORTED": "Connection aborted. Please try again.",
  
  // HTTP status codes
  "401": "You are not logged in. Please login again.",
  "403": "You don't have permission for this action.",
  "404": "Resource not found.",
  "409": "This resource already exists.",
  "422": "Invalid data. Please check your input.",
  "429": "Too many requests. Please wait a moment and try again.",
  "500": "Server error. Please try again later.",
  
  // Rate limiting messages
  "Too many requests": "Too many requests. Please wait a moment and try again.",
  "too many requests": "Too many requests. Please wait a moment and try again.",
  
  // Authentication errors
  "Invalid credentials": "Invalid email or password. Please check your credentials and try again.",
  "Invalid email or password": "Invalid email or password. Please check your credentials and try again.",
  "invalid credentials": "Invalid email or password. Please check your credentials and try again.",
  
  // Common validation errors
  "customerId is required": "Please select a customer.",
  "productId is required": "Please select a product.",
  "downPayment must be >= 0": "Please enter a valid down payment.",
  "numberOfMonths must be > 0": "Please enter a valid number of months.",
  "cnic is required": "CNIC is required.",
  "cnic must be 13 digits": "CNIC must be 13 digits.",
  "phone must be a valid phone number": "Please enter a valid phone number.",
  "name is required": "Name is required.",
  "address is required": "Address is required.",
  "email": "Please enter a valid email.",
  "password": "Password must be at least 6 characters.",
  
  // Installment specific
  "Installment plan not found": "Installment plan not found.",
  "Installment ID": "This Installment ID already exists.",
  "Two guarantors are required": "Two guarantors are required.",
  "guarantor CNIC is required": "Guarantor CNIC is required.",
  "guarantor CNIC must be 13 digits": "Guarantor CNIC must be 13 digits.",
  "Either provide a reference OR at least one guarantor": "Please provide either a reference or guarantor CNIC.",
  "Provided installment schedule does not match": "Installment schedule does not match.",
  
  // Payment errors
  "Payment not found": "Payment not found.",
  "Installment month not found": "This month is not in the installment plan.",
  "Duplicate suppressed": "This payment is already recorded.",
  
  // Customer errors
  "Customer not found": "Customer not found.",
  "Customer already exists": "This customer already exists.",
  
  // Product errors
  "Product not found": "Product not found.",
  
  // Generic
  "Failed to fetch": "Failed to load data. Please try again.",
  "Failed to create": "Failed to create. Please check your data.",
  "Failed to update": "Failed to update. Please check your data.",
  "Failed to delete": "Failed to delete. Please try again.",
  "Validation error": "Invalid data. Please check all fields.",
  "Unauthorized": "You are not logged in.",
  "Forbidden": "You don't have permission.",
  "Internal Server Error": "Server error. Please try again later.",
}

/**
 * Get HTTP status code from error
 */
function getStatusCode(error: unknown): number | undefined {
  if (error && typeof error === "object" && "response" in error) {
    const axiosError = error as any
    return axiosError.response?.status
  }
  return undefined
}

/**
 * Extract error message from API error response
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return getUserFriendlyMessage(error)
  }

  if (error && typeof error === "object") {
    // Axios error
    if ("response" in error) {
      const axiosError = error as any
      const status = axiosError.response?.status
      const data = axiosError.response?.data
      
      // Check status code first
      if (status && USER_FRIENDLY_MESSAGES[String(status)]) {
        return USER_FRIENDLY_MESSAGES[String(status)]
      }
      
      // Check error message
      if (data?.error) {
        return getUserFriendlyMessage(data.error)
      }
      if (data?.message) {
        return getUserFriendlyMessage(data.message)
      }
      
      // Check validation errors
      if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        const firstError = data.errors[0]
        const errorMsg = firstError?.msg || firstError?.message || "Validation error"
        return getUserFriendlyMessage(errorMsg)
      }
      
      // Fallback to status text
      const statusText = axiosError.response?.statusText
      if (statusText) {
        return getUserFriendlyMessage(statusText)
      }
      
      return "Request failed. Please try again."
    }

    // Network errors (no response) - check for common network error codes
    const axiosError = error as any
    if (axiosError.code) {
      if (axiosError.code === "ECONNREFUSED" || axiosError.code === "ERR_NETWORK" || axiosError.code === "ENOTFOUND") {
        return "Unable to connect to server. Please check if the backend is running and the URL is correct."
      }
      if (axiosError.code === "ETIMEDOUT" || axiosError.code === "ECONNABORTED") {
        return "Request timed out. The server may be slow or unreachable. Please try again."
      }
    }

    // Standard Error object
    if ("message" in error) {
      const errorMessage = (error as Error).message
      // Check for network-related error messages
      if (errorMessage.includes("Network Error") || errorMessage.includes("Failed to fetch") || errorMessage.includes("ERR_NETWORK")) {
        return "Unable to connect to server. Please check if the backend is running and accessible."
      }
      return getUserFriendlyMessage(errorMessage)
    }
  }

  return "An error occurred. Please try again."
}

/**
 * Convert technical error to user-friendly message (English)
 */
function getUserFriendlyMessage(message: string): string {
  if (!message) return "An error occurred."
  
  const lowerMessage = message.toLowerCase()
  
  // Check for exact matches
  if (USER_FRIENDLY_MESSAGES[message]) {
    return USER_FRIENDLY_MESSAGES[message]
  }
  
  // Check for partial matches
  for (const [key, value] of Object.entries(USER_FRIENDLY_MESSAGES)) {
    if (lowerMessage.includes(key.toLowerCase())) {
      return value
    }
  }
  
  // Check for common patterns
  if (lowerMessage.includes("invalid credentials") || lowerMessage.includes("invalid email") || lowerMessage.includes("invalid password")) {
    return "Invalid email or password. Please check your credentials and try again."
  }
  if (lowerMessage.includes("not found")) {
    return "Resource not found."
  }
  if (lowerMessage.includes("already exists") || lowerMessage.includes("duplicate")) {
    return "This resource already exists."
  }
  if (lowerMessage.includes("required")) {
    return "Required fields are missing."
  }
  if (lowerMessage.includes("invalid")) {
    return "Invalid data. Please check your input."
  }
  if (lowerMessage.includes("permission") || lowerMessage.includes("forbidden")) {
    return "You don't have permission for this action."
  }
  if (lowerMessage.includes("unauthorized") || lowerMessage.includes("401")) {
    return "You are not logged in. Please login again."
  }
  
  // Return original message if no match found (might already be user-friendly)
  return message
}

/**
 * Extract error code from API error response
 */
export function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "response" in error) {
    const axiosError = error as any
    return axiosError.response?.data?.code
  }
  return undefined
}

/**
 * Check if error is a specific type
 */
export function isErrorType(error: unknown, code: string): boolean {
  return getErrorCode(error) === code
}

/**
 * Handle API errors consistently with user-friendly messages (English)
 */
export function handleApiError(error: unknown, defaultMessage: string = "An error occurred. Please try again."): string {
  const message = getErrorMessage(error)
  return message || getUserFriendlyMessage(defaultMessage)
}

/**
 * Get user-friendly error message for specific context (English)
 */
export function getContextualErrorMessage(
  error: unknown,
  context: "create" | "update" | "delete" | "fetch" | "login" | "payment"
): string {
  const baseMessage = getErrorMessage(error)
  
  const contextMessages: Record<string, string> = {
    create: "Failed to create",
    update: "Failed to update",
    delete: "Failed to delete",
    fetch: "Failed to load data",
    login: "Login failed",
    payment: "Failed to record payment",
  }
  
  // If we have a specific error, use it; otherwise use contextual default
  if (baseMessage && baseMessage !== "An error occurred.") {
    return baseMessage
  }
  
  return `${contextMessages[context] || "Operation"} failed. Please try again.`
}

