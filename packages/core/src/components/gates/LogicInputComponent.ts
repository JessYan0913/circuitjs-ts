import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { setVoltageColor, drawThickLinePt, drawPost, interpPoint } from '../drawutils.js';

/** LogicInput — clickable toggle with ternary/numeric modes (matches Java LogicInputElm) */
export class LogicInputComponent extends CircuitComponent {
    static readonly FLAG_TERNARY = 1;
    static readonly FLAG_NUMERIC = 2;

    hiV = 5;
    loV = 0;
    position = 0; // 0=low, 1=high, (2=mid for ternary)
    posCount = 2;
    momentary = false;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.noDiagonal = true;
    }

    getDumpType(): number | string { return 'L'.charCodeAt(0); }
    getPostCount(): number { return 1; }
    getVoltageSourceCount(): number { return 1; }

    isTernary(): boolean { return (this.flags & LogicInputComponent.FLAG_TERNARY) !== 0; }
    isNumeric(): boolean { return (this.flags & (LogicInputComponent.FLAG_TERNARY | LogicInputComponent.FLAG_NUMERIC)) !== 0; }

    stamp(context: StampContext): void {
        const v = this.position === 0 ? this.loV : (this.position === 2 ? 2.5 : this.hiV);
        context.stampVoltageSource(0, this.nodes[0], this.voltSource, v);
    }

    doStep(context: StampContext): void {
        const v = this.position === 0 ? this.loV : (this.position === 2 ? 2.5 : this.hiV);
        context.updateVoltageSource(0, this.nodes[0], this.voltSource, v);
    }

    hasGroundConnection(n1: number): boolean { return true; }
    getCurrentIntoNode(n: number): number { return this.current; }

    /** Toggle to next position */
    toggle(): void {
        this.position = (this.position + 1) % this.posCount;
    }

    override setPoints(): void {
        super.setPoints();
        this.calcLeads(0);
    }

    draw(g: Graphics): void {
        const s = this.isNumeric() ? String(this.position) : (this.position === 0 ? 'L' : 'H');
        setVoltageColor(g, this.volts[0], this);
        drawThickLinePt(g, this.point1, this.lead1);

        g.setColor(this.needsHighlight() ? '#00FFFF' : '#FFFFFF');
        g.setFontSize(20);
        g.textAlign('center');
        g.textBaseline('middle');
        g.drawString(s, this.x2, this.y2);

        drawPost(g, this.point1);
    }

    getInfo(): string[] {
        return [
            'logic input',
            this.position === 0 ? 'low' : (this.position === 2 ? 'mid' : 'high'),
            `(${this.volts[0].toFixed(2)} V)`,
            `I = ${this.current.toFixed(3)} A`,
        ];
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) {
            return { name: 'Momentary Switch', checkbox: true, checkboxState: this.momentary };
        }
        if (n === 1) return { name: 'High Voltage', value: this.hiV };
        if (n === 2) return { name: 'Low Voltage', value: this.loV };
        if (n === 3) {
            return { name: 'Numeric', checkbox: true, checkboxState: this.isNumeric() };
        }
        if (n === 4) {
            return { name: 'Ternary', checkbox: true, checkboxState: this.isTernary() };
        }
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 0 && ei.checkboxState !== undefined) this.momentary = ei.checkboxState;
        if (_n === 1 && ei.value !== undefined) this.hiV = ei.value;
        if (_n === 2 && ei.value !== undefined) this.loV = ei.value;
        if (_n === 3 && ei.checkboxState !== undefined) {
            if (ei.checkboxState) this.flags |= LogicInputComponent.FLAG_NUMERIC;
            else this.flags &= ~LogicInputComponent.FLAG_NUMERIC;
        }
        if (_n === 4 && ei.checkboxState !== undefined) {
            if (ei.checkboxState) {
                this.flags |= LogicInputComponent.FLAG_TERNARY;
                this.posCount = 3;
            } else {
                this.flags &= ~LogicInputComponent.FLAG_TERNARY;
                this.posCount = 2;
            }
            if (this.position >= this.posCount) this.position = 0;
        }
    }

    override dump(): string {
        return super.dump() + ` ${this.hiV} ${this.loV}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.hiV = parseFloat(tokens[start]) || 5;
        if (tokens.length > start + 1) this.loV = parseFloat(tokens[start + 1]) || 0;
    }
}

registerComponent('L'.charCodeAt(0), 'LogicInputElm', LogicInputComponent);
