import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import {
    setVoltageColor, drawDots, drawPost, interpPointPerp,
} from '../drawutils.js';

/**
 * Memristor — charge-dependent resistor with memory.
 * Port of Java MemristorElm (dump type 'm').
 *
 * Resistance depends on the historical charge that has flowed through it,
 * modeled by the migration of the doped region boundary.
 */
export class MemristorComponent extends CircuitComponent {
    r_on = 100;
    r_off = 16000;
    dopeWidth = 0;
    totalWidth = 10e-9;  // meters
    mobility = 1e-10;     // m^2/(s·V)
    resistance = 100;
    private contextTimeStep = 1e-6;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.allocNodes();
        this.setPoints();
    }

    getDumpType(): number | string { return 'm'.charCodeAt(0); }

    override dump(): string {
        return super.dump() + ` ${this.r_on} ${this.r_off} ${this.dopeWidth} ${this.totalWidth} ${this.mobility} ${this.current}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.r_on = parseFloat(tokens[start]);
        if (tokens.length > start + 1) this.r_off = parseFloat(tokens[start + 1]);
        if (tokens.length > start + 2) this.dopeWidth = parseFloat(tokens[start + 2]);
        if (tokens.length > start + 3) this.totalWidth = parseFloat(tokens[start + 3]);
        if (tokens.length > start + 4) this.mobility = parseFloat(tokens[start + 4]);
        if (tokens.length > start + 5) this.current = parseFloat(tokens[start + 5]);
        this.resistance = 100;
        this.allocNodes();
        this.setPoints();
    }

    nonLinear(): boolean { return true; }

    stamp(context: StampContext): void {
        context.stampNonLinear(this.nodes[0]);
        context.stampNonLinear(this.nodes[1]);
    }

    doStep(context: StampContext): void {
        context.stampResistor(this.nodes[0], this.nodes[1], this.resistance);
        this.contextTimeStep = context.timeStep;
    }

    startIteration(): void {
        const wd = this.dopeWidth / this.totalWidth;
        this.dopeWidth += this.contextTimeStep * this.mobility * this.r_on * this.current / this.totalWidth;
        if (this.dopeWidth < 0) this.dopeWidth = 0;
        if (this.dopeWidth > this.totalWidth) this.dopeWidth = this.totalWidth;
        this.resistance = this.r_on * wd + this.r_off * (1 - wd);
    }

    calculateCurrent(): void {
        this.current = (this.volts[0] - this.volts[1]) / this.resistance;
    }

    override reset(): void {
        super.reset();
        this.dopeWidth = 0;
        this.resistance = 100;
    }

    setPoints(): void {
        super.setPoints();
        this.calcLeads(32);
    }

    getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Min Resistance (R_on, ohms)', value: this.r_on };
        if (n === 1) return { name: 'Max Resistance (R_off, ohms)', value: this.r_off };
        if (n === 2) return { name: 'Width of Doped Region (nm)', value: this.dopeWidth * 1e9 };
        if (n === 3) return { name: 'Total Width (nm)', value: this.totalWidth * 1e9 };
        if (n === 4) return { name: 'Mobility (μm²/(s·V))', value: this.mobility * 1e12 };
        return null;
    }

    setEditValue(_n: number, ei: EditInfo): void {
        if (ei.value === undefined) return;
        if (_n === 0) this.r_on = ei.value;
        if (_n === 1) this.r_off = ei.value;
        if (_n === 2) this.dopeWidth = ei.value * 1e-9;
        if (_n === 3) this.totalWidth = ei.value * 1e-9;
        if (_n === 4) this.mobility = ei.value * 1e-12;
    }

    getInfo(): string[] {
        const wd = this.totalWidth > 0 ? this.dopeWidth / this.totalWidth : 0;
        const r = this.resistance >= 1e6
            ? `${(this.resistance / 1e6).toFixed(2)} MΩ`
            : this.resistance >= 1e3
                ? `${(this.resistance / 1e3).toFixed(2)} kΩ`
                : `${this.resistance.toFixed(1)} Ω`;
        return [
            'memristor',
            `Vd = ${(this.volts[0] - this.volts[1]).toFixed(3)} V`,
            `I = ${this.current.toFixed(3)} A`,
            `R = ${r}`,
            `P = ${(this.getVoltageDiff() * this.current).toFixed(3)} W`,
            `wd = ${(wd * 100).toFixed(1)}%`,
        ];
    }

    getShortcut(): number { return 'm'.charCodeAt(0); }

    draw(g: Graphics): void {
        const segments = 6;
        let ox = 0;
        const v1 = this.volts[0];
        const v2 = this.volts[1];
        const wd = this.totalWidth > 0 ? this.dopeWidth / this.totalWidth : 0;
        const hs = 2 + Math.round(8 * (1 - wd));

        this.setBboxPts(this.point1, this.point2, hs);
        this.draw2Leads(g);
        this.setVoltageColor(g, (v1 + v2) / 2);

        const segf = 1 / segments;

        // Draw zigzag with variable height based on dopeWidth ratio
        this.calcLeads(32);
        for (let i = 0; i <= segments; i++) {
            const nx = (i & 1) === 0 ? 1 : -1;
            const effNx = i === segments ? 0 : nx;

            const v = v1 + (v2 - v1) * i / segments;
            setVoltageColor(g, v, this);

            const p1 = interpPointPerp(this.lead1, this.lead2, i * segf, hs * ox);
            const p2 = interpPointPerp(this.lead1, this.lead2, i * segf, hs * effNx);

            g.setLineWidth(3);
            g.drawLine(p1.x, p1.y, p2.x, p2.y);
            g.setLineWidth(1);

            if (i === segments) break;

            const pNext = interpPointPerp(this.lead1, this.lead2, (i + 1) * segf, hs * effNx);
            g.setLineWidth(3);
            g.drawLine(p2.x, p2.y, pNext.x, pNext.y);
            g.setLineWidth(1);

            ox = nx;
        }

        // Label
        this.drawValues(g, 'M', hs + 2);

        drawDots(g, this.point1, this.lead1, this.curcount);
        drawDots(g, this.lead2, this.point2, this.curcount);
        drawPost(g, this.point1);
        drawPost(g, this.point2);
    }
}

registerComponent('m'.charCodeAt(0), 'MemristorElm', MemristorComponent);
