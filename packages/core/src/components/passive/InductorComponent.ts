import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import {
    setVoltageColor, drawThickLinePt, drawCoil,
    drawValues, drawDots, drawPost,
} from '../drawutils.js';

export class InductorComponent extends CircuitComponent {
    inductance = 1e-3;
    compResistance = 0;
    curSourceValue = 0;
    /** Matches Java Inductor.FLAG_BACK_EULER: true when using trapezoidal integration */
    private useTrapezoidal = true;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
    }

    handleDumpData(tokens: string[], startIndex: number): void {
        if (tokens.length > startIndex) {
            this.inductance = parseFloat(tokens[startIndex]);
        }
    }

    getDumpType(): number | string { return 'l'; }

    stamp(context: StampContext): void {
        if (context.timeStep === 0) {
            context.stampVoltageSource(this.nodes[0], this.nodes[1], this.voltSource, 0);
            return;
        }
        // Companion model: trapezoidal or backward Euler (Norton equivalent)
        this.useTrapezoidal = context.integrationMethod !== 'backwardEuler';
        if (this.useTrapezoidal) {
            this.compResistance = 2 * this.inductance / context.timeStep;
        } else {
            this.compResistance = this.inductance / context.timeStep;
        }
        context.stampResistor(this.nodes[0], this.nodes[1], this.compResistance);
        context.markRightSideChanging(this.nodes[0]);
        context.markRightSideChanging(this.nodes[1]);
    }

    startIteration(): void {
        if (this.compResistance > 0) {
            const vd = this.volts[0] - this.volts[1];
            if (this.useTrapezoidal) {
                this.curSourceValue = vd / this.compResistance + this.current;
            } else {
                // Backward Euler: just the previous current (matches Java Inductor)
                this.curSourceValue = this.current;
            }
        }
    }

    doStep(context: StampContext): void {
        if (this.compResistance > 0) {
            context.stampCurrentSource(this.nodes[0], this.nodes[1], this.curSourceValue);
        }
    }

    calculateCurrent(): void {
        if (this.compResistance > 0) {
            const vd = this.volts[0] - this.volts[1];
            this.current = vd / this.compResistance + this.curSourceValue;
        }
    }

    getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Inductance', value: this.inductance };
        return null;
    }

    setEditValue(_n: number, ei: EditInfo): void {
        if (ei.value !== undefined) this.inductance = ei.value;
    }

    getInfo(): string[] {
        return [`Inductor: ${this.inductance} H`];
    }

    getShortcut(): number { return 'l'.charCodeAt(0); }

    draw(g: Graphics): void {
        const v1 = this.volts[0];
        const v2 = this.volts[1];
        this.calcLeads(16);

        // Voltage-colored leads
        setVoltageColor(g, v1, this);
        drawThickLinePt(g, this.point1, this.lead1);
        setVoltageColor(g, v2, this);
        drawThickLinePt(g, this.lead2, this.point2);

        // Coil body
        drawCoil(g, 8, this.lead1, this.lead2, v1, v2);

        const val = this.inductance >= 1
            ? `${this.inductance}H`
            : this.inductance >= 1e-3
                ? `${(this.inductance * 1000).toFixed(1)}mH`
                : `${(this.inductance * 1e6).toFixed(0)}uH`;
        drawValues(g, val, 10, this.point1, this.point2);

        drawDots(g, this.point1, this.lead1, this.curcount);
        drawDots(g, this.lead2, this.point2, -this.curcount);
        drawPost(g, this.point1);
        drawPost(g, this.point2);
    }
}

registerComponent('l'.charCodeAt(0), 'InductorElm', InductorComponent);
