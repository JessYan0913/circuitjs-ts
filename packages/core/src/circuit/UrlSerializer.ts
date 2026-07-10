/**
 * URL Serializer — compress/decompress circuit data for sharing via URLs.
 *
 * Uses lz-string for compression (matching Falstad's ExportAsUrlDialog).
 * Format: Appends compressed circuit as URL hash fragment (or ?ctz= param).
 */
import LZString from 'lz-string';

/**
 * Compress a circuit dump string to a URL-safe base64 string.
 * Matches Java: LZString.compressToEncodedURIComponent(dump)
 */
export function compressCircuit(dump: string): string {
    return LZString.compressToEncodedURIComponent(dump);
}

/**
 * Decompress a URL-safe base64 string back to circuit dump text.
 * Matches Java: LZString.decompressFromEncodedURIComponent(compressed)
 */
export function decompressCircuit(compressed: string): string | null {
    return LZString.decompressFromEncodedURIComponent(compressed);
}

/**
 * Create a shareable URL with the circuit data compressed in the hash fragment.
 * Format: <base>#<compressed>
 */
export function circuitToShareUrl(dump: string, baseUrl?: string): string {
    const compressed = compressCircuit(dump);
    const base = baseUrl ?? (typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '');
    return `${base}#${compressed}`;
}

/**
 * Extract and decompress circuit data from a URL hash fragment.
 * Supports both #fragment format and ?ctz= query parameter format.
 *
 * Returns the decompressed circuit text, or null if no circuit data found.
 */
export function extractCircuitFromUrl(url: string): string | null {
    // Try ?ctz= query parameter first (Falstad format)
    const ctzMatch = url.match(/[?&]ctz=([^&]+)/);
    if (ctzMatch) {
        const decompressed = decompressCircuit(ctzMatch[1]);
        if (decompressed) return decompressed;
    }

    // Try legacy ?cct= query parameter (URL-encoded circuit text)
    const cctMatch = url.match(/[?&]cct=([^&]+)/);
    if (cctMatch) {
        let text = decodeURIComponent(cctMatch[1]);
        text = text.replace(/%24/g, '$'); // replace encoded $ back
        return text;
    }

    // Try hash fragment (our default format)
    const hashMatch = url.match(/#(.+)/);
    if (hashMatch && hashMatch[1].length > 0) {
        const decompressed = decompressCircuit(hashMatch[1]);
        if (decompressed) return decompressed;
    }

    return null;
}

/**
 * Check if a URL contains compressed circuit data.
 */
export function urlHasCircuit(url: string): boolean {
    return /[?&]ctz=/.test(url) || /[?&]cct=/.test(url) || /#.{10,}/.test(url);
}
