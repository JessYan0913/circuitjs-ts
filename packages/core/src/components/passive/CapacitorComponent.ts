import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import {
    setVoltageColor, drawThickLinePt, drawThickLineXY,
    drawValues, drawDots, drawPost,
} from '../drawutils.js';

export class CapacitorComponent extends CircuitComponent {
    capacitance = 1e-6;
    compResistance = 0;
    curSourceValue = 0;
    /** Matches Java FLAG_BACK_EULER: true when using trapezoidal integration */
    private useTrapezoidal = true;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
    }

    handleDumpData(tokens: string[], startIndex: number): void {
        if (tokens.length > startIndex) {
            this.capacitance = parseFloat(tokens[startIndex]);
        }
    }

    getDumpType(): number | string { return 'c'; }

    stamp(context: StampContext): void {
        if (context.timeStep === 0) {
            context.stampResistor(this.nodes[0], this.nodes[1], 1e8);
            return;
        }
        // Companion model: trapezoidal or backward Euler (Norton equivalent)
        this.useTrapezoidal = context.integrationMethod !== 'backwardEuler';
        if (this.useTrapezoidal) {
            this.compResistance = context.timeStep / (2 * this.capacitance);
        } else {
            this.compResistance = context.timeStep / this.capacitance;
        }
        context.stampResistor(this.nodes[0], this.nodes[1], this.compResistance);
        context.markRightSideChanging(this.nodes[0]);
        context.markRightSideChanging(this.nodes[1]);
    }

    startIteration(): void {
        if (this.compResistance > 0) {
            const vd = this.volts[0] - this.volts[1];
            if (this.useTrapezoidal) {
                this.curSourceValue = -vd / this.compResistance - this.current;
            } else {
                // Backward Euler: no current term (matches Java CapacitorElm)
                this.curSourceValue = -vd / this.compResistance;
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
        if (n === 0) return { name: 'Capacitance', value: this.capacitance };
        return null;
    }

    setEditValue(_n: number, ei: EditInfo): void {
        if (ei.value !== undefined) this.capacitance = ei.value;
    }

    getInfo(): string[] {
        return [`Capacitor: ${this.capacitance} F`];
    }

    getShortcut(): number { return 'c'.charCodeAt(0); }

    draw(g: Graphics): void {
        const hs = 12;
        this.calcLeads(32);

        // First lead and plate
        setVoltageColor(g, this.volts[0], this);
        drawThickLinePt(g, this.point1, this.lead1);
        const dx = this.lead2.x - this.lead1.x;
        const dy = this.lead2.y - this.lead1.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / len * hs;
        const ny = dx / len * hs;
        const mid1x = (this.lead1.x + this.lead2.x) / 2;
        const mid1y = (this.lead1.y + this.lead2.y) / 2;
        const plate1x = this.lead1.x + dx * 0.45;
        const plate1y = this.lead1.y + dy * 0.45;
        drawThickLineXY(g, plate1x + nx, plate1y + ny, plate1x - nx, plate1y - ny);

        // Second lead and plate
        setVoltageColor(g, this.volts[1], this);
        drawThickLinePt(g, this.lead2, this.point2);
        const plate2x = this.lead1.x + dx * 0.55;
        const plate2y = this.lead1.y + dy * 0.55;
        drawThickLineXY(g, plate2x + nx, plate2y + ny, plate2x - nx, plate2y - ny);

        const val = this.capacitance >= 1e-3
            ? `${(this.capacitance * 1000).toFixed(1)}mF`
            : this.capacitance >= 1e-6
                ? `${(this.capacitance * 1e6).toFixed(0)}uF`
                : `${(this.capacitance * 1e9).toFixed(0)}nF`;
        drawValues(g, val, hs, this.point1, this.point2);

        drawDots(g, this.point1, this.lead1, this.curcount);
        drawDots(g, this.lead2, this.point2, -this.curcount);
        drawPost(g, this.point1);
        drawPost(g, this.point2);
    }
}

registerComponent('c'.charCodeAt(0), 'CapacitorElm', CapacitorComponent);
