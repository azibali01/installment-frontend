/**
 * Format a number as currency with proper comma separators
 * @param value - The number to format
 * @param currency - Currency symbol (default: "PKR")
 * @param showDecimals - Whether to show decimal places (default: false)
 * @returns Formatted string like "PKR 1,234,567" or "PKR 1,234.56"
 */
export function formatCurrency(
  value: number | string | null | undefined,
  currency: string = "PKR",
  showDecimals: boolean = false
): string {
  if (value === null || value === undefined || value === "") {
    return `${currency} 0`;
  }

  const numValue = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return `${currency} 0`;
  }

  const options: Intl.NumberFormatOptions = {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  };

  return `${currency} ${numValue.toLocaleString("en-US", options)}`;
}

/**
 * Format a number with comma separators (without currency symbol)
 * @param value - The number to format
 * @param showDecimals - Whether to show decimal places (default: false)
 * @returns Formatted string like "1,234,567" or "1,234.56"
 */
export function formatNumber(
  value: number | string | null | undefined,
  showDecimals: boolean = false
): string {
  if (value === null || value === undefined || value === "") {
    return "0";
  }

  const numValue = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return "0";
  }

  const options: Intl.NumberFormatOptions = {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  };

  return numValue.toLocaleString("en-US", options);
}

