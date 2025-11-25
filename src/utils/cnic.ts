export function cleanCNIC(input: string) {
    return String(input || "").replace(/\D/g, "");
}

export function formatCNIC(input: string) {
    const d = cleanCNIC(input);
    if (!d) return "";
    if (d.length <= 5) return d;
    if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
    return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

export function isValidCNIC(input: string) {
    const d = cleanCNIC(input);
    return d.length === 13;
}
