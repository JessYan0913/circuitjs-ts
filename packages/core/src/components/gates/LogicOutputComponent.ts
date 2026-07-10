import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { setVoltageColor, drawThickLinePt, drawPost, interpPoint } from '../drawutils.js';

/** LogicOutput — displays high/low state with ternary/numeric modes and optional pulldown */
export class LogicOutputComponent extends CircuitComponent {
    static readonly FLAG_TERNARY = 1;
    static readonly FLAG_NUMERIC = 2;
    static readonly FLAG_PULLDOWN = 4;

    threshold = 2.5;
    private displayValue = 'L';

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.noDiagonal = true;
    }

    getDumpType(): number | string { return 'M'.charCodeAt(0); }
    getPostCount(): number { return 1; }

    isTernary(): boolean { return (this.flags & LogicOutputComponent.FLAG_TERNARY) !== 0; }
    isNumeric(): boolean { return (this.flags & (LogicOutputComponent.FLAG_TERNARY | LogicOutputComponent.FLAG_NUMERIC)) !== 0; }
    needsPullDown(): boolean { return (this.flags & LogicOutputComponent.FLAG_PULLDOWN) !== 0; }

    stamp(context: StampContext): void {
        if (this.needsPullDown()) {
            context.stampResistor(this.nodes[0], 0, 1e6);
        }
    }

    override setPoints(): void {
        super.setPoints();
        this.calcLeads(0);
    }

    draw(g: Graphics): void {
        // Determine display value
        let s: string;
        if (this.isTernary()) {
            if (this.volts[0] > 3.75) s = '2';
            else if (this.volts[0] > 1.25) s = '1';
            else s = '0';
        } else if (this.isNumeric()) {
            s = this.volts[0] < this.threshold ? '0' : '1';
        } else {
            s = this.volts[0] < this.threshold ? 'L' : 'H';
        }
        this.displayValue = s;

        setVoltageColor(g, this.volts[0], this);
        drawThickLinePt(g, this.point1, this.lead1);

        g.setColor('#CCCCCC');
        g.setFontSize(20);
        g.textAlign('center');
        g.textBaseline('middle');
        g.drawString(s, this.x2, this.y2);

        drawPost(g, this.point1);
    }

    getInfo(): string[] {
        return [
            'logic output',
            this.volts[0] < this.threshold ? 'low' : 'high',
            `V = ${this.volts[0].toFixed(2)} V`,
        ];
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Threshold', value: this.threshold };
        if (n === 1) {
            return { name: 'Current Required', checkbox: true, checkboxState: this.needsPullDown() };
        }
        if (n === 2) {
            return { name: 'Numeric', checkbox: true, checkboxState: this.isNumeric() };
        }
        if (n === 3) {
            return { name: 'Ternary', checkbox: true, checkboxState: this.isTernary() };
        }
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 0 && ei.value !== undefined) this.threshold = ei.value;
        if (_n === 1 && ei.checkboxState !== undefined) {
            if (ei.checkboxState) this.flags |= LogicOutputComponent.FLAG_PULLDOWN;
            else this.flags &= ~LogicOutputComponent.FLAG_PULLDOWN;
        }
        if (_n === 2 && ei.checkboxState !== undefined) {
            if (ei.checkboxState) this.flags |= LogicOutputComponent.FLAG_NUMERIC;
            else this.flags &= ~LogicOutputComponent.FLAG_NUMERIC;
        }
        if (_n === 3 && ei.checkboxState !== undefined) {
            if (ei.checkboxState) this.flags |= LogicOutputComponent.FLAG_TERNARY;
            else this.flags &= ~LogicOutputComponent.FLAG_TERNARY;
        }
    }

    override dump(): string {
        return super.dump() + ` ${this.threshold}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.threshold = parseFloat(tokens[start]) || 2.5;
    }
}

registerComponent('M'.charCodeAt(0), 'LogicOutputElm', LogicOutputComponent);
