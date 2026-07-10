import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { setVoltageColor, drawThickLinePt, drawPost } from '../drawutils.js';

/** LogicOutput — displays high/low state of a node */
export class LogicOutputComponent extends CircuitComponent {
    private readonly hs = 10;
    threshold = 2.5;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.noDiagonal = true;
    }

    getDumpType(): number | string { return 'M'.charCodeAt(0); }
    getPostCount(): number { return 1; }

    stamp(context: StampContext): void {
        // No loading — just measure
        context.stampResistor(this.nodes[0], 0, 1e10);
    }

    get value(): boolean {
        return this.volts[0] > this.threshold;
    }

    setPoints(): void {
        super.setPoints();
        this.calcLeads(0);
    }

    draw(g: Graphics): void {
        const v = this.volts[0];
        const on = this.value;
        setVoltageColor(g, v, this);
        drawThickLinePt(g, this.point1, this.lead1);

        g.setColor(on ? '#00FF00' : '#CC0000');
        g.fillRect(this.x - this.hs, this.y - this.hs, this.hs * 2, this.hs * 2);
        g.setColor('#FFFFFF');
        g.setLineWidth(1);
        g.drawRect(this.x - this.hs, this.y - this.hs, this.hs * 2, this.hs * 2);
        g.setFontSize(16);
        g.textAlign('center');
        g.textBaseline('middle');
        g.drawString(on ? '1' : '0', this.x, this.y);
        drawPost(g, this.point1);
    }

    getInfo(): string[] {
        return [`Logic Output: ${this.value ? '1' : '0'} (${this.volts[0].toFixed(2)} V)`];
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Threshold', value: this.threshold };
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (ei.value !== undefined) this.threshold = ei.value;
    }

    override dump(): string {
        return super.dump() + ` ${this.threshold}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.threshold = parseFloat(tokens[start]) || 2.5;
    }
}

registerComponent('M'.charCodeAt(0), 'LogicOutputElm', LogicOutputComponent);
