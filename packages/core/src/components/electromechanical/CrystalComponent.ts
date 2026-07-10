import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import {
    setVoltageColor, drawThickLinePt, drawThickLineXY,
    drawPost, drawValues, drawCenteredText,
} from '../drawutils.js';

/**
 * Crystal — RLC series resonance with parallel capacitance.
 * Implements the classic crystal equivalent circuit without CompositeElm.
 *
 * Equivalent circuit:
 *   C0 (parallel) between pin 1 and pin 2
 *   C1 (series)   between pin 1 and internal node 2
 *   L  (series)   between internal node 2 and internal node 3 (inductor companion)
 *   R  (series)   between internal node 3 and pin 2
 *
 * Node assignment:
 *   0 = external pin 1
 *   1 = external pin 2
 *   2 = internal: C1-L junction
 *   3 = internal: L-R junction
 */
export class CrystalComponent extends CircuitComponent {
    parallelCapacitance = 28.7e-12;  // C0 (pF)
    seriesCapacitance = 0.1e-12;     // C1 (fF)
    inductance = 2.5e-3;             // L (mH)
    seriesResistance = 6.4;           // R (ohm)

    // Inductor companion model for L
    private compResistance = 0;
    private curSourceValue = 0;
    private useTrapezoidal = true;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
    }

    override getDumpType(): number | string { return 412; }

    override handleDumpData(tokens: string[], startIndex: number): void {
        // Parameters are stored in the composite sub-components in Java.
        // For simplicity, we dump/load them directly.
        if (tokens.length > startIndex) this.parallelCapacitance = parseFloat(tokens[startIndex]);
        if (tokens.length > startIndex + 1) this.seriesCapacitance = parseFloat(tokens[startIndex + 1]);
        if (tokens.length > startIndex + 2) this.inductance = parseFloat(tokens[startIndex + 2]);
        if (tokens.length > startIndex + 3) this.seriesResistance = parseFloat(tokens[startIndex + 3]);
    }

    override dump(): string {
        return super.dump() + ` ${this.parallelCapacitance} ${this.seriesCapacitance} ${this.inductance} ${this.seriesResistance}`;
    }

    override getInternalNodeCount(): number { return 2; }

    override reset(): void {
        super.reset();
        this.curSourceValue = 0;
    }

    override stamp(context: StampContext): void {
        // Parallel capacitor C0 between nodes[0] and nodes[1]
        if (context.timeStep === 0) {
            context.stampVoltageSource(this.nodes[0], this.nodes[1], this.voltSource, 0);
        } else {
            // Companion model for C0
            const c0Val = this.parallelCapacitance / context.timeStep;
            context.stampConductance(this.nodes[0], this.nodes[1], c0Val);
            context.markRightSideChanging(this.nodes[0]);
            context.markRightSideChanging(this.nodes[1]);
        }

        // Series capacitor C1 between nodes[0] and nodes[2]
        if (context.timeStep > 0) {
            const c1Val = this.seriesCapacitance / context.timeStep;
            context.stampConductance(this.nodes[0], this.nodes[2], c1Val);
            context.markRightSideChanging(this.nodes[0]);
            context.markRightSideChanging(this.nodes[2]);
        }

        // Inductor L companion model between nodes[2] and nodes[3]
        if (context.timeStep === 0) {
            // Use voltage source for DC
        } else {
            this.useTrapezoidal = context.integrationMethod !== 'backwardEuler';
            this.compResistance = this.useTrapezoidal
                ? 2 * this.inductance / context.timeStep
                : this.inductance / context.timeStep;
            context.stampResistor(this.nodes[2], this.nodes[3], this.compResistance);
            context.markRightSideChanging(this.nodes[2]);
            context.markRightSideChanging(this.nodes[3]);
        }

        // Series resistor R between nodes[3] and nodes[1]
        context.stampResistor(this.nodes[3], this.nodes[1], this.seriesResistance);
    }

    override startIteration(): void {
        // Inductor companion current source
        if (this.compResistance > 0) {
            const vd = this.volts[2] - this.volts[3];
            if (this.useTrapezoidal) {
                this.curSourceValue = vd / this.compResistance + this.current;
            } else {
                this.curSourceValue = this.current;
            }
        }
    }

    override doStep(context: StampContext): void {
        // Inductor current source
        if (this.compResistance > 0) {
            context.stampCurrentSource(this.nodes[2], this.nodes[3], this.curSourceValue);
        }

        // Parallel capacitor C0 companion current source
        if (context.timeStep > 0) {
            const c0Val = this.parallelCapacitance / context.timeStep;
            context.stampCurrentSource(this.nodes[0], this.nodes[1], -c0Val * this.volts[0] - this.volts[1]);

            // Series capacitor C1 companion current source
            const c1Val = this.seriesCapacitance / context.timeStep;
            context.stampCurrentSource(this.nodes[0], this.nodes[2], -c1Val * (this.volts[0] - this.volts[2]));
        }
    }

    override calculateCurrent(): void {
        // Current through the series branch
        const vd = this.volts[2] - this.volts[3];
        if (this.compResistance > 0) {
            this.current = vd / this.compResistance + this.curSourceValue;
        }
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Parallel Capacitance (F)', value: this.parallelCapacitance, min: 1e-15, max: 1e-6 };
        if (n === 1) return { name: 'Series Capacitance (F)', value: this.seriesCapacitance, min: 1e-15, max: 1e-6 };
        if (n === 2) return { name: 'Inductance (H)', value: this.inductance, min: 1e-9, max: 1 };
        if (n === 3) return { name: 'Resistance (Ω)', value: this.seriesResistance, min: 0.01, max: 1000 };
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (ei.value === undefined) return;
        if (_n === 0) this.parallelCapacitance = ei.value;
        if (_n === 1) this.seriesCapacitance = ei.value;
        if (_n === 2) this.inductance = ei.value;
        if (_n === 3) this.seriesResistance = ei.value;
    }

    override getInfo(): string[] {
        // Calculate series resonant frequency
        const f0 = 1 / (2 * Math.PI * Math.sqrt(this.inductance * this.seriesCapacitance));
        const f0MHz = f0 / 1e6;
        return [
            'crystal',
            `Fs = ${f0MHz.toFixed(3)} MHz`,
            `C0 = ${(this.parallelCapacitance * 1e12).toFixed(2)} pF`,
            `C1 = ${(this.seriesCapacitance * 1e15).toFixed(2)} fF`,
            `L = ${(this.inductance * 1e3).toFixed(2)} mH`,
            `R = ${this.seriesResistance} Ω`,
        ];
    }

    override draw(g: Graphics): void {
        const v1 = this.volts[0];
        const v2 = this.volts[1];
        this.calcLeads(32);

        setVoltageColor(g, v1, this);
        drawThickLinePt(g, this.point1, this.lead1);
        setVoltageColor(g, v2, this);
        drawThickLinePt(g, this.lead2, this.point2);

        // Crystal symbol: rectangle with internal markings
        const cx = (this.lead1.x + this.lead2.x) / 2;
        const cy = (this.lead1.y + this.lead2.y) / 2;
        const w = 20;
        const h = 12;

        g.setLineWidth(2);
        g.setColor(this.needsHighlight() ? '#00FFFF' : '#808080');
        g.drawRect(cx - w, cy - h, w * 2, h * 2);

        // Internal crystal symbol
        g.setLineWidth(1);
        g.drawLine(cx - 8, cy - h + 2, cx - 4, cy + h - 2);
        g.drawLine(cx - 4, cy - h + 2, cx, cy + h - 2);
        g.drawLine(cx, cy - h + 2, cx + 4, cy + h - 2);
        g.drawLine(cx + 4, cy - h + 2, cx + 8, cy + h - 2);

        g.setLineWidth(1);
        drawPost(g, this.point1);
        drawPost(g, this.point2);
    }
}

registerComponent(412, 'CrystalElm', CrystalComponent);
