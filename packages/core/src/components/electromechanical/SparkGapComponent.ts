import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import {
    setVoltageColor, drawThickLinePt,
    drawPost, drawValues,
} from '../drawutils.js';

/**
 * Spark Gap — breakdown conduction device.
 * Port of Java SparkGapElm.
 */
export class SparkGapComponent extends CircuitComponent {
    onResistance = 1e3;
    offResistance = 1e9;
    breakdown = 1e3;     // breakdown voltage
    holdCurrent = 0.001; // holding current
    state = false;       // true = conducting

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
    }

    override getDumpType(): number | string { return 187; }

    override handleDumpData(tokens: string[], startIndex: number): void {
        if (tokens.length > startIndex) this.onResistance = parseFloat(tokens[startIndex]);
        if (tokens.length > startIndex + 1) this.offResistance = parseFloat(tokens[startIndex + 1]);
        if (tokens.length > startIndex + 2) this.breakdown = parseFloat(tokens[startIndex + 2]);
        if (tokens.length > startIndex + 3) this.holdCurrent = parseFloat(tokens[startIndex + 3]);
    }

    override dump(): string {
        return super.dump() + ` ${this.onResistance} ${this.offResistance} ${this.breakdown} ${this.holdCurrent}`;
    }

    override nonLinear(): boolean { return true; }

    override reset(): void {
        this.state = false;
        super.reset();
    }

    override stamp(context: StampContext): void {
        context.stampNonLinear(this.nodes[0]);
        context.stampNonLinear(this.nodes[1]);
    }

    override startIteration(): void {
        const vd = this.getVoltageDiff();
        if (Math.abs(this.current) < this.holdCurrent) {
            this.state = false;
        }
        if (Math.abs(vd) > this.breakdown) {
            this.state = true;
        }
    }

    override doStep(context: StampContext): void {
        const resistance = this.state ? this.onResistance : this.offResistance;
        context.stampResistor(this.nodes[0], this.nodes[1], resistance);
    }

    override calculateCurrent(): void {
        const vd = this.getVoltageDiff();
        const r = this.state ? this.onResistance : this.offResistance;
        this.current = r > 0 ? vd / r : 0;
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'On Resistance (Ω)', value: this.onResistance, min: 0.1, max: 1e6 };
        if (n === 1) return { name: 'Off Resistance (Ω)', value: this.offResistance, min: 1e3, max: 1e12 };
        if (n === 2) return { name: 'Breakdown Voltage (V)', value: this.breakdown, min: 1, max: 100000 };
        if (n === 3) return { name: 'Holding Current (A)', value: this.holdCurrent, min: 1e-6, max: 1 };
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (ei.value === undefined) return;
        if (_n === 0) this.onResistance = ei.value;
        if (_n === 1) this.offResistance = ei.value;
        if (_n === 2) this.breakdown = ei.value;
        if (_n === 3) this.holdCurrent = ei.value;
    }

    override getInfo(): string[] {
        const vd = this.getVoltageDiff();
        return [
            'spark gap',
            `V = ${vd.toFixed(1)} V`,
            `I = ${(this.current * 1000).toFixed(2)} mA`,
            this.state ? 'State = on' : 'State = off',
            `Ron = ${this.onResistance} Ω`,
            `Roff = ${this.offResistance.toExponential(0)} Ω`,
            `Vbreak = ${this.breakdown} V`,
        ];
    }

    override draw(g: Graphics): void {
        const hs = 12;
        const v1 = this.volts[0];
        const v2 = this.volts[1];
        this.calcLeads(28);

        setVoltageColor(g, v1, this);
        drawThickLinePt(g, this.point1, this.lead1);
        setVoltageColor(g, v2, this);
        drawThickLinePt(g, this.lead2, this.point2);

        // Spark gap symbol: two rounded electrodes with a gap
        const cx = (this.lead1.x + this.lead2.x) / 2;
        const cy = (this.lead1.y + this.lead2.y) / 2;
        const gap = 10;

        g.setLineWidth(3);
        g.setColor(this.needsHighlight() ? '#00FFFF' : '#808080');

        // Left electrode (rounded)
        g.drawOval(this.lead1.x, cy - 3, 5, 6);
        // Right electrode (rounded)
        g.drawOval(this.lead2.x - 5, cy - 3, 5, 6);

        // Spark lines when conducting
        if (this.state) {
            g.setColor('#00AAFF');
            g.setLineWidth(1);
            g.drawLine(cx - 3, cy - 4, cx + 3, cy - 1);
            g.drawLine(cx - 3, cy + 1, cx + 3, cy + 4);
            g.drawLine(cx - 1, cy - 5, cx + 1, cy + 5);
        }

        g.setLineWidth(1);
        drawPost(g, this.point1);
        drawPost(g, this.point2);
    }
}

registerComponent(187, 'SparkGapElm', SparkGapComponent);
