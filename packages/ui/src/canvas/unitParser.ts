/**
 * Unit parsing and formatting utilities for the EditDialog.
 * Matches the original Java CirSim.parseUnits / unitString behavior.
 */

/** SI suffix multipliers */
const SUFFIX_MULTIPLIERS: Record<string, number> = {
    'f': 1e-15,
    'p': 1e-12,
    'n': 1e-9,
    'u': 1e-6,
    'μ': 1e-6,
    'm': 1e-3,
    'k': 1e3,
    'M': 1e6,
    'G': 1e9,
    'g': 1e9,
};

const SUFFIX_ORDER = ['G', 'M', 'k', '', 'm', 'u', 'n', 'p', 'f'];

/**
 * Parse a user-entered string value, handling SI suffixes and shorthand notation.
 * Examples: "2k2" → 2200, "1.5M" → 1500000, "4u7" → 0.0000047, "10" → 10
 * Also handles "meg" → 1e6, and RMS suffix "rms" → multiply by sqrt(2)
 *
 * Matches Java CirSim.parseUnits() behavior.
 */
export function parseUnitValue(input: string): number {
    let s = input.trim();

    if (!s) return 0;

    // Handle "meg" / "Meg" suffix (old Java convention)
    s = s.replace(/([Mm][Ee][Gg])\s*$/, 'M');

    // Handle RMS suffix: trailing "rms" → multiply by sqrt(2)
    let rmsMult = 1;
    const rmsMatch = s.match(/^(.*)\s*[rR][mM][sS]\s*$/);
    if (rmsMatch) {
        s = rmsMatch[1].trim();
        rmsMult = 1.4142135623730951;
    }

    // Handle shorthand notation: digits suffix digits → digits.digits suffix
    // Java: s.replaceAll("([0-9]+)([pPnNuUmMkKgG])([0-9]+)", "$1.$3$2")
    // e.g. "2k2" → "2.2k", "4u7" → "4.7u"
    // NOTE: each digit group is [0-9]+ (digits only, no dots), matching Java exactly
    s = s.replace(/^([0-9]+)([pPnNuUmMkKgG])([0-9]+)$/, (_, num, suffix, decimal) => {
        return `${num}.${decimal}${suffix}`;
    });

    // Extract numeric part and optional suffix
    const match = s.match(/^([-+]?[\d.]+(?:[eE][-+]?\d+)?)\s*([pPnNuUmMkKgGμ]?)/);
    if (!match) return (parseFloat(s) || 0) * rmsMult;

    const value = parseFloat(match[1]);
    const suffix = match[2];

    if (!suffix) return value * rmsMult;

    const mult = SUFFIX_MULTIPLIERS[suffix];
    if (mult !== undefined) {
        return value * mult * rmsMult;
    }

    return value * rmsMult;
}

/**
 * Format a numeric value for display with appropriate SI prefix.
 * e.g. 1000 → "1 k", 0.001 → "1 m", 1000000 → "1 M"
 *
 * If unitSuffix is provided, it's appended after the SI prefix.
 */
export function formatUnitValue(value: number, unitSuffix?: string): string {
    if (value === 0) return `0${unitSuffix ? ' ' + unitSuffix : ''}`;

    const abs = Math.abs(value);

    if (abs >= 1e9) return `${(value / 1e9).toFixed(4)} G${unitSuffix ?? ''}`;
    if (abs >= 1e6) return `${(value / 1e6).toFixed(4)} M${unitSuffix ?? ''}`;
    if (abs >= 1e3) return `${(value / 1e3).toFixed(4)} k${unitSuffix ?? ''}`;
    if (abs >= 1) return `${value.toFixed(6)} ${unitSuffix ?? ''}`.trim();
    if (abs >= 1e-3) return `${(value * 1e3).toFixed(4)} m${unitSuffix ?? ''}`;
    if (abs >= 1e-6) return `${(value * 1e6).toFixed(4)} μ${unitSuffix ?? ''}`;
    if (abs >= 1e-9) return `${(value * 1e9).toFixed(4)} n${unitSuffix ?? ''}`;
    return `${(value * 1e12).toFixed(4)} p${unitSuffix ?? ''}`;
}

/**
 * Determine the unit suffix string based on the edit info name.
 */
export function getUnitSuffix(name: string, dimensionless?: boolean): string {
    if (dimensionless) return '';

    const lower = name.toLowerCase();
    if (lower.includes('resistance') || lower.includes('ohm') || lower.includes('pot')) return 'Ω';
    if (lower.includes('capac')) return 'F';
    if (lower.includes('induct')) return 'H';
    if (lower.includes('voltage') || lower.includes('volt')) return 'V';
    if (lower.includes('current')) return 'A';
    if (lower.includes('freq')) return 'Hz';
    if (lower.includes('time') || lower.includes('delay') || lower.includes('period')) return 's';
    if (lower.includes('gain')) return '';
    if (lower.includes('beta')) return '';

    return '';
}

/**
 * Format a numeric edit value into a display string using unit scaling.
 */
export function formatEditValue(value: number, name: string, dimensionless?: boolean): string {
    const suffix = getUnitSuffix(name, dimensionless);
    if (!suffix) return String(value);
    return formatUnitValue(value, suffix);
}
