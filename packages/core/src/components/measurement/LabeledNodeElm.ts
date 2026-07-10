import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, Graphics, Point, EditInfo } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { drawPost } from '../drawutils.js';

/** LabeledNodeElm — named circuit node with a text label */
export class LabeledNodeElm extends CircuitComponent {
    text = 'label';
    nodeNumber = 0;

    static readonly FLAG_INTERNAL = 1;
    static readonly FLAG_ESCAPE = 4;

    static nodeList: Map<string, number> = new Map();

    static resetNodeList(): void {
        LabeledNodeElm.nodeList.clear();
    }

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
    }

    getDumpType(): number | string {
        return 207;
    }

    override getPostCount(): number {
        return 1;
    }

    override getInternalNodeCount(): number {
        if (LabeledNodeElm.nodeList == null) return 0;
        const nn = LabeledNodeElm.nodeList.get(this.text);
        if (nn != null) {
            this.nodeNumber = nn;
            return 0;
        }
        return 1;
    }

    override getVoltageSourceCount(): number {
        return 1;
    }

    override isWire(): boolean {
        return true;
    }

    isInternal(): boolean {
        return (this.flags & LabeledNodeElm.FLAG_INTERNAL) !== 0;
    }

    override setNode(p: number, n: number): void {
        super.setNode(p, n);
        if (p === 1) {
            LabeledNodeElm.nodeList.set(this.text, n);
            this.nodeNumber = n;
        }
    }

    getConnectionNode(n: number): number {
        if (n === 0) return this.nodes[0];
        return this.nodeNumber;
    }

    getConnectionNodeCount(): number {
        return 2;
    }

    override setPoints(): void {
        super.setPoints();
        const circleSize = 17;
        const dn = Math.sqrt(
            (this.point2.x - this.point1.x) ** 2 +
            (this.point2.y - this.point1.y) ** 2
        );
        const f = 1 - circleSize / (dn || 1);
        this.lead1 = {
            x: Math.floor(this.point1.x * (1 - f) + this.point2.x * f + 0.48),
            y: Math.floor(this.point1.y * (1 - f) + this.point2.y * f + 0.48),
        };
    }

    override draw(g: Graphics): void {
        this.setVoltageColor(g, this.volts[0]);
        CircuitComponent.drawThickLine(g, this.point1, this.lead1);
        g.setColor(this.needsHighlight() ? '#00FFFF' : '#FFFFFF');
        this.drawCenteredText(g, this.text, this.x2, this.y2, true);

        // Draw dots
        this.drawDots(g, this.point1, this.lead1, this.curcount);

        const dn = Math.sqrt(
            (this.point2.x - this.point1.x) ** 2 +
            (this.point2.y - this.point1.y) ** 2
        );
        const ps2: Point = {
            x: Math.floor(this.point1.x * (1 - (1 + 11 / (dn || 1))) + this.point2.x * (1 + 11 / (dn || 1)) + 0.48),
            y: Math.floor(this.point1.y * (1 - (1 + 11 / (dn || 1))) + this.point2.y * (1 + 11 / (dn || 1)) + 0.48),
        };
        this.setBbox(this.point1.x, this.point1.y, ps2.x, ps2.y);
        this.adjustBbox(this.point1.x, this.point1.y, this.point1.x + 17, this.point1.y + 17);
        this.drawPosts(g);
    }

    private drawPosts(g: Graphics): void {
        drawPost(g, this.point1);
    }

    override stamp(context: StampContext): void {
        context.stampVoltageSource(this.nodeNumber, this.nodes[0], this.voltSource, 0);
    }

    override getVoltageDiff(): number {
        return this.volts[0];
    }

    override getCurrentIntoNode(n: number): number {
        return -this.current;
    }

    override setCurrent(_x: number, c: number): void {
        this.current = -c;
    }

    override getInfo(): string[] {
        return [
            this.text,
            `I = ${this.formatCurrent(this.current)}`,
            `V = ${this.formatVoltage(this.volts[0])}`,
        ];
    }

    private formatVoltage(v: number): string {
        if (Math.abs(v) < 1e-3) return `${(v * 1e3).toFixed(2)} mV`;
        return `${v.toFixed(2)} V`;
    }

    private formatCurrent(c: number): string {
        if (Math.abs(c) < 1e-6) return `${(c * 1e9).toFixed(2)} nA`;
        if (Math.abs(c) < 1e-3) return `${(c * 1e6).toFixed(2)} µA`;
        if (Math.abs(c) < 1) return `${(c * 1e3).toFixed(2)} mA`;
        return `${c.toFixed(2)} A`;
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Text', text: this.text };
        if (n === 1) return { name: 'Internal Node', checkbox: true, checkboxState: this.isInternal() };
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (ei.text !== undefined && _n === 0) {
            this.text = ei.text;
        }
        if (_n === 1 && ei.checkboxState !== undefined) {
            if (ei.checkboxState) this.flags |= LabeledNodeElm.FLAG_INTERNAL;
            else this.flags &= ~LabeledNodeElm.FLAG_INTERNAL;
        }
    }

    // For serialization compatibility — handle escape/unescape matching Java
    override dump(): string {
        this.flags |= LabeledNodeElm.FLAG_ESCAPE;
        const escaped = this.escapeText(this.text);
        return `${super.dump()} ${escaped}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if ((this.flags & LabeledNodeElm.FLAG_ESCAPE) === 0) {
            // Old-style dump: space-separated text
            this.text = tokens.slice(start).join(' ');
        } else {
            this.text = this.unescapeText(tokens[start] || '');
        }
    }

    private escapeText(s: string): string {
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

    private unescapeText(s: string): string {
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
}

registerComponent(207, 'LabeledNodeElm', LabeledNodeElm);
