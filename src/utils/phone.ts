export function cleanPhone(input: string) {
    return String(input || "").replace(/\D/g, "");
}

export function formatPhone(input: string) {
    const d = cleanPhone(input);
    if (!d) return "";
    
    // Pakistani phone number formats:
    // 10 digits: 0300-1234567 (03XX-XXXXXXX)
    // 11 digits: 03001234567 (03XX-XXXXXXX)
    // With country code: 923001234567 (92-300-1234567)
    
    if (d.length <= 4) return d;
    if (d.length <= 11) {
        // Format as 03XX-XXXXXXX
        return `${d.slice(0, 4)}-${d.slice(4)}`;
    }
    // For numbers with country code: 92-300-1234567
    if (d.startsWith("92") && d.length === 12) {
        return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
    }
    // Default: just add dash after 4 digits
    return `${d.slice(0, 4)}-${d.slice(4)}`;
}

export function isValidPhone(input: string) {
    const d = cleanPhone(input);
    // Pakistani phone numbers are typically 10-11 digits (without country code)
    // or 12 digits (with country code 92)
    return d.length >= 10 && d.length <= 12;
}

