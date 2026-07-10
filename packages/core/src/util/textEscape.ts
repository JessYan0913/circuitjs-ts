/**
 * Java-compatible text escaping for circuit serialization.
 * Matches CustomLogicModel.escape()/unescape() in the original Falstad code.
 *
 * | Raw | Escaped |
 * |-----|---------|
 * | `\` | `\\`    |
 * | `\n`| `\n`    |
 * | ` ` | `\s`    |
 * | `+` | `\p`    |
 * | `=` | `\q`    |
 * | `#` | `\h`    |
 * | `&` | `\a`    |
 * | `\r`| `\r`    |
 * | ''  | `\0`    |
 */

export function escape(s: string): string {
    if (s.length === 0) return '\\0';
    return s
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/ /g, '\\s')
        .replace(/\+/g, '\\p')
        .replace(/=/g, '\\q')
        .replace(/#/g, '\\h')
        .replace(/&/g, '\\a')
        .replace(/\r/g, '\\r');
}

export function unescape(s: string): string {
    if (s === '\\0') return '';
    let result = '';
    for (let i = 0; i < s.length; i++) {
        if (s.charAt(i) === '\\' && i + 1 < s.length) {
            const c = s.charAt(i + 1);
            switch (c) {
                case 'n': result += '\n'; i++; break;
                case 'r': result += '\r'; i++; break;
                case 's': result += ' '; i++; break;
                case 'p': result += '+'; i++; break;
                case 'q': result += '='; i++; break;
                case 'h': result += '#'; i++; break;
                case 'a': result += '&'; i++; break;
                case '\\': result += '\\'; i++; break;
                default: result += '\\'; break;
            }
        } else {
            result += s.charAt(i);
        }
    }
    return result;
}
