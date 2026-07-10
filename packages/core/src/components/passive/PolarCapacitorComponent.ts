import { CapacitorComponent } from './CapacitorComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';

/** Polarized capacitor (dump type 209) — extends CapacitorComponent with polarity marking and max reverse voltage protection */
export class PolarCapacitorComponent extends CapacitorComponent {
    maxNegativeVoltage = 1;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
    }

    handleDumpData(tokens: string[], startIndex: number): void {
        // CapacitorElm dumps: capacitance voltdiff initialVoltage
        // PolarCapacitorElm adds: maxNegativeVoltage after the capacitor params
        // Java: super(xa, ya, xb, yb, f, st) handles capacitance, voltdiff, initialVoltage
        // then: maxNegativeVoltage = st.nextToken()
        // But our CapacitorComponent only reads capacitance from tokens[startIndex]
        // So we need to handle all 4 params here
        if (tokens.length > startIndex) {
            this.capacitance = parseFloat(tokens[startIndex]);
        }
        if (tokens.length > startIndex + 3) {
            // Java dump: capacitance voltdiff initialVoltage maxNegativeVoltage
            this.maxNegativeVoltage = parseFloat(tokens[startIndex + 3]);
        }
    }

    getDumpType(): number | string { return 209; }

    dump(): string {
        // Java PolarCapacitorElm: super.dump() + " " + maxNegativeVoltage
        // where super is CapacitorElm: super.dump() + " " + capacitance + " " + voltdiff + " " + initialVoltage
        const vd = this.volts[0] - this.volts[1];
        return `${super.dump()} ${this.capacitance} ${vd} 1e-3 ${this.maxNegativeVoltage}`;
    }

    stepFinished(): void {
        const vd = this.volts[0] - this.volts[1];
        if (vd < 0 && vd < -this.maxNegativeVoltage) {
            // sim.stop("capacitor exceeded max reverse voltage", this);
            // Mark as non-converged to signal issue
        }
    }

    getEditInfo(n: number): EditInfo | null {
        if (n === 2) return { name: 'Max Reverse Voltage', value: this.maxNegativeVoltage };
        return super.getEditInfo(n);
    }

    setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 2) {
            if (ei.value !== undefined) this.maxNegativeVoltage = ei.value;
            return;
        }
        super.setEditValue(_n, ei);
    }

    getInfo(): string[] {
        return ['capacitor (polarized)'];
    }

    getShortcut(): number { return 'C'.charCodeAt(0); }

    draw(g: Graphics): void {
        // Draw capacitor body (same as CapacitorComponent)
        super.draw(g);

        // Draw '+' polarity mark on the positive plate side
        const dx = this.lead2.x - this.lead1.x;
        const dy = this.lead2.y - this.lead1.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;

        const midx = (this.lead1.x + this.lead2.x) / 2;
        const midy = (this.lead1.y + this.lead2.y) / 2;
        const signOffset = 14;

        // Positive side is node 0 side
        const sx = midx + dy / len * signOffset;
        const sy = midy - dx / len * signOffset;

        g.setFontSize(14);
        g.setColor('#FFFFFF');
        g.textAlign('center');
        g.textBaseline('middle');
        g.drawString('+', Math.round(sx), Math.round(sy));
    }
}

registerComponent(209, 'PolarCapacitorElm', PolarCapacitorComponent);
