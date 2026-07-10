import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import {
    setVoltageColor, drawThickLinePt,
    drawPost,
} from '../drawutils.js';

/**
 * Crystal — RLC series resonance with parallel capacitance.
 * Port of Java CrystalElm (which uses CompositeElm with 4 sub-components).
 *
 * Equivalent circuit (matches Java CrystalElm's modelString):
 *   C0 (parallel) between pin 1 and pin 2
 *   C1 (series)   between pin 1 and internal node 2
 *   L  (series)   between internal node 2 and internal node 3
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

    // Companion model state
    private useTrapezoidal = true;

    // C0 companion
    private c0Conductance = 0;
    private c0CurSource = 0;
    private c0Current = 0;

    // C1 companion
    private c1Conductance = 0;
    private c1CurSource = 0;
    private c1Current = 0;

    // L companion
    private lResistance = 0;
    private lCurSource = 0;
    private lCurrent = 0;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
    }

    override getDumpType(): number | string { return 412; }

    override handleDumpData(tokens: string[], startIndex: number): void {
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
        this.c0Current = 0;
        this.c1Current = 0;
        this.lCurrent = 0;
        this.c0CurSource = 0;
        this.c1CurSource = 0;
        this.lCurSource = 0;
    }

    override stamp(context: StampContext): void {
        this.useTrapezoidal = context.integrationMethod !== 'backwardEuler';

        if (context.timeStep === 0) {
            // DC: capacitors open, inductor short (no stamps needed for ideal)
            // Resistor R provides DC path
            context.stampResistor(this.nodes[3], this.nodes[1], this.seriesResistance);
            return;
        }

        // === C0 (parallel) companion: G = C/dt ===
        if (this.useTrapezoidal) {
            this.c0Conductance = 2 * this.parallelCapacitance / context.timeStep;
        } else {
            this.c0Conductance = this.parallelCapacitance / context.timeStep;
        }
        context.stampConductance(this.nodes[0], this.nodes[1], this.c0Conductance);
        context.markRightSideChanging(this.nodes[0]);
        context.markRightSideChanging(this.nodes[1]);

        // === C1 (series) companion: G = C/dt ===
        if (this.useTrapezoidal) {
            this.c1Conductance = 2 * this.seriesCapacitance / context.timeStep;
        } else {
            this.c1Conductance = this.seriesCapacitance / context.timeStep;
        }
        context.stampConductance(this.nodes[0], this.nodes[2], this.c1Conductance);
        context.markRightSideChanging(this.nodes[0]);
        context.markRightSideChanging(this.nodes[2]);

        // === L companion: R = 2*L/dt (trapezoidal) or L/dt (backward euler) ===
        this.lResistance = this.useTrapezoidal
            ? 2 * this.inductance / context.timeStep
            : this.inductance / context.timeStep;
        context.stampResistor(this.nodes[2], this.nodes[3], this.lResistance);
        context.markRightSideChanging(this.nodes[2]);
        context.markRightSideChanging(this.nodes[3]);

        // === R (series) ===
        context.stampResistor(this.nodes[3], this.nodes[1], this.seriesResistance);
    }

    override startIteration(): void {
        // C0 companion current source (matches Java CapacitorElm trapezoidal)
        if (this.c0Conductance > 0) {
            const vd = this.volts[0] - this.volts[1];
            if (this.useTrapezoidal) {
                this.c0CurSource = -vd * this.c0Conductance - this.c0Current;
            } else {
                this.c0CurSource = -vd * this.c0Conductance;
            }
        }

        // C1 companion current source
        if (this.c1Conductance > 0) {
            const vd = this.volts[0] - this.volts[2];
            if (this.useTrapezoidal) {
                this.c1CurSource = -vd * this.c1Conductance - this.c1Current;
            } else {
                this.c1CurSource = -vd * this.c1Conductance;
            }
        }

        // L companion current source
        if (this.lResistance > 0) {
            const vd = this.volts[2] - this.volts[3];
            if (this.useTrapezoidal) {
                this.lCurSource = vd / this.lResistance + this.lCurrent;
            } else {
                this.lCurSource = this.lCurrent;
            }
        }
    }

    override doStep(context: StampContext): void {
        // C0 current source
        if (this.c0Conductance > 0) {
            context.stampCurrentSource(this.nodes[0], this.nodes[1], this.c0CurSource);
        }

        // C1 current source
        if (this.c1Conductance > 0) {
            context.stampCurrentSource(this.nodes[0], this.nodes[2], this.c1CurSource);
        }

        // L current source
        if (this.lResistance > 0) {
            context.stampCurrentSource(this.nodes[2], this.nodes[3], this.lCurSource);
        }
    }

    override calculateCurrent(): void {
        // C0 current
        if (this.c0Conductance > 0) {
            const vd = this.volts[0] - this.volts[1];
            this.c0Current = vd * this.c0Conductance + this.c0CurSource;
        }

        // C1 current
        if (this.c1Conductance > 0) {
            const vd = this.volts[0] - this.volts[2];
            this.c1Current = vd * this.c1Conductance + this.c1CurSource;
        }

        // L current (also the series branch current = total device current)
        if (this.lResistance > 0) {
            const vd = this.volts[2] - this.volts[3];
            this.lCurrent = vd / this.lResistance + this.lCurSource;
        }
        this.current = this.lCurrent;
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
