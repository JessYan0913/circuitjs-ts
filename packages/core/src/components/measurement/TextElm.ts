import { GraphicElm } from '../base/GraphicElm.js';
import type { Graphics, EditInfo } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { escape as escapeText, unescape as unescapeText } from '../../util/textEscape.js';

/**
 * TextElm — text annotation on the circuit canvas (non-electrical).
 * Uses shared textEscape utility matching Java CustomLogicModel format.
 */
export class TextElm extends GraphicElm {
    text = 'hello';
    lines: string[] = ['hello'];
    size = 24;

    static readonly FLAG_CENTER = 1;
    static readonly FLAG_BAR = 2;
    static readonly FLAG_ESCAPE = 4;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
    }

    getDumpType(): number | string {
        return 'x';
    }

    override handleDumpData(tokens: string[], start: number): void {
        this.size = parseInt(tokens[start]) || 24;
        if ((this.flags & TextElm.FLAG_ESCAPE) === 0) {
            // Old-style dump (no escape flag): read remaining tokens, join with space
            this.text = tokens.slice(start + 1).join(' ');
            // Replace %2b/%2B with + (legacy encoding)
            this.text = this.text.replace(/%2[bB]/g, '+');
        } else {
            // New-style dump: first token after size is the encoded text
            this.text = unescapeText(tokens[start + 1] || '');
        }
        this.split();
    }

    override dump(): string {
        this.flags |= TextElm.FLAG_ESCAPE;
        return `${super.dump()} ${this.size} ${escapeText(this.text)}`;
    }

    split(): void {
        const parts: string[] = [];
        let current = '';
        for (let i = 0; i < this.text.length; i++) {
            const c = this.text.charAt(i);
            if (c === '\\' && i + 1 < this.text.length) {
                const next = this.text.charAt(i + 1);
                if (next === 'n') {
                    parts.push(current);
                    current = '';
                    i++;
                    continue;
                }
            }
            current += c;
        }
        parts.push(current);
        this.lines = parts;
    }

    override drag(xx: number, yy: number): void {
        this.x = xx;
        this.y = yy;
        this.x2 = xx + 16;
        this.y2 = yy;
    }

    override draw(g: Graphics): void {
        g.save();
        g.setFont('SansSerif', this.size);
        g.setColor(this.needsHighlight() ? '#00FFFF' : '#C0C0C0');

        let maxw = 0;
        for (const line of this.lines) {
            const w = g.measureWidth(line);
            if (w > maxw) maxw = w;
        }

        let cury = this.y;
        this.setBbox(this.x, this.y, this.x, this.y);

        for (const line of this.lines) {
            const sw = g.measureWidth(line);
            const isCentered = (this.flags & TextElm.FLAG_CENTER) !== 0;
            const drawX = isCentered ? this.x - sw / 2 : this.x;

            g.drawString(line, drawX, cury);

            if ((this.flags & TextElm.FLAG_BAR) !== 0) {
                const by = cury - this.size;
                g.drawLine(drawX, by, drawX + sw - 1, by);
            }

            this.adjustBbox(drawX, cury - this.size, drawX + sw, cury + 3);
            cury += this.size + 3;
        }

        const bb = this.getBoundingBox();
        this.x2 = bb.x + bb.width;
        this.y2 = bb.y + bb.height;
        g.restore();
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Text', text: this.text };
        if (n === 1) return { name: 'Size', value: this.size, min: 5, max: 100 };
        if (n === 2) return { name: 'Center', checkbox: true, checkboxState: (this.flags & TextElm.FLAG_CENTER) !== 0 };
        if (n === 3) return { name: 'Draw Bar On Top', checkbox: true, checkboxState: (this.flags & TextElm.FLAG_BAR) !== 0 };
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (ei.text !== undefined && _n === 0) {
            this.text = ei.text;
            this.split();
        }
        if (ei.value !== undefined && _n === 1) {
            this.size = ei.value;
        }
        if (_n === 2 && ei.checkboxState !== undefined) {
            if (ei.checkboxState) this.flags |= TextElm.FLAG_CENTER;
            else this.flags &= ~TextElm.FLAG_CENTER;
        }
        if (_n === 3 && ei.checkboxState !== undefined) {
            if (ei.checkboxState) this.flags |= TextElm.FLAG_BAR;
            else this.flags &= ~TextElm.FLAG_BAR;
        }
    }

    override isCenteredText(): boolean {
        return (this.flags & TextElm.FLAG_CENTER) !== 0;
    }

    override getInfo(): string[] {
        return [this.text];
    }

    override getShortcut(): number {
        return 't'.charCodeAt(0);
    }
}

registerComponent('x'.charCodeAt(0), 'TextElm', TextElm);
