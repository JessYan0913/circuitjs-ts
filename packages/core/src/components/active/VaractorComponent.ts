import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { DiodeModel } from './DiodeModel.js';
import {
    setVoltageColor, drawThickLinePt, drawThickLineXY,
    interpPoint, interpPointPerp, interpPoint2, drawPost,
} from '../drawutils.js';

/**
 * Varactor diode — variable capacitance diode.
 * Port of Java VaractorElm (dump type 176)
 *
 * Post layout: 0 = anode, 1 = cathode, 2 = internal (for capacitor)
 */
export class VaractorComponent extends CircuitComponent {
    model = new DiodeModel();
    baseCapacitance = 4e-12; // capacitance at 0V bias
    private capvoltdiff = 0;
    private capacitance = 0;
    private compResistance = 0;
    private voltSourceValue = 0;
    private subIterations = 0;
    private capCurrent = 0;

    getDumpType(): number | string { return 176; }
    nonLinear(): boolean { return true; }
    getPostCount(): number { return 3; } // anode(0), cathode(1), internal(2)
    getInternalNodeCount(): number { return 1; }
    getVoltageSourceCount(): number { return 1; }

    stamp(context: StampContext): void {
        // Diode from anode (0) to internal node (2)
        context.stampNonLinear(this.nodes[0]);
        context.stampNonLinear(this.nodes[2]);
        context.stampNonLinear(this.nodes[1]);

        // Voltage source for capacitor model (series with internal node)
        context.stampVoltageSource(this.nodes[0], this.nodes[2], this.voltSource);
        context.stampNonLinear(this.nodes[2]);
    }

    startIteration(): void {
        // Capacitor companion model using trapezoidal approximation
        // C(V) = C0 / sqrt(1 - Vd/Vbi) for reverse bias
        const c0 = this.baseCapacitance;
        if (this.capvoltdiff > 0) {
            this.capacitance = c0;
        } else {
            // Use ~0.8V as built-in potential
            const vbi = 0.8;
            const denom = 1 - this.capvoltdiff / vbi;
            this.capacitance = denom > 0.1 ? c0 / Math.sqrt(denom) : c0 * 3;
        }
        this.compResistance = 0; // will be set in doStep after timestep known
    }

    doStep(context: StampContext): void {
        // Diode companion model
        this.model.doStep(this.volts[0] - this.volts[2], context,
            this.nodes[0], this.nodes[2], this.subIterations);
        this.subIterations++;

        // Capacitor companion model
        this.compResistance = context.timeStep / (2 * this.capacitance);
        this.voltSourceValue = -this.capvoltdiff - this.capCurrent * this.compResistance;

        context.stampResistor(this.nodes[2], this.nodes[1], this.compResistance);
        context.updateVoltageSource(this.nodes[0], this.nodes[2], this.voltSource, this.voltSourceValue);
    }

    stepFinished(): void {
        this.subIterations = 0;
    }

    setNodeVoltage(n: number, c: number): void {
        super.setNodeVoltage(n, c);
        this.capvoltdiff = this.volts[0] - this.volts[1];
    }

    calculateCurrent(): void {
        // Diode current through internal node
        const vd = this.volts[0] - this.volts[2];
        this.current = this.model.getCurrent(vd) + this.capCurrent;
    }

    setCurrent(vn: number, c: number): void {
        this.capCurrent = c;
    }

    reset(): void {
        super.reset();
        this.capvoltdiff = 0;
        this.capCurrent = 0;
        this.model.reset();
    }

    getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Saturation current (Is)', value: this.model.saturationCurrent };
        if (n === 1) return { name: 'Capacitance @ 0V (F)', value: this.baseCapacitance };
        return null;
    }

    setEditValue(_n: number, ei: EditInfo): void {
        if (ei.value !== undefined) {
            if (_n === 0) this.model.saturationCurrent = ei.value;
            if (_n === 1) this.baseCapacitance = ei.value;
        }
    }

    getInfo(): string[] {
        return [`Varactor`, `C = ${this.capacitance.toExponential(2)} F`,
            `Vd = ${this.getVoltageDiff().toFixed(3)} V`];
    }

    draw(g: Graphics): void {
        const hs = 12;
        this.calcLeads(24);
        setVoltageColor(g, this.volts[0], this);
        drawThickLinePt(g, this.point1, this.lead1);
        setVoltageColor(g, this.volts[1], this);
        drawThickLinePt(g, this.lead2, this.point2);

        // Triangle (arrow) - filled
        const triBase = interpPoint(this.lead1, this.lead2, 0.35);
        const triTip = interpPoint(this.lead1, this.lead2, 0.55);
        const p1 = interpPointPerp(this.lead1, this.lead2, 0.35, hs);
        const p2 = interpPointPerp(this.lead1, this.lead2, 0.35, -hs);

        g.setLineWidth(2);
        setVoltageColor(g, this.volts[0], this);
        g.fillPolygon(
            [triBase.x, triTip.x, triBase.x],
            [p1.y, triTip.y, p2.y],
            3,
        );

        // Capacitor plates instead of cathode bar
        const plateF = 0.6;
        const plate1a = interpPointPerp(this.lead1, this.lead2, plateF, hs);
        const plate1b = interpPointPerp(this.lead1, this.lead2, plateF, -hs);
        const plate2a = interpPointPerp(this.lead1, this.lead2, 1.0, hs);
        const plate2b = interpPointPerp(this.lead1, this.lead2, 1.0, -hs);

        setVoltageColor(g, this.volts[0], this);
        drawThickLineXY(g, plate1a.x, plate1a.y, plate1b.x, plate1b.y);
        setVoltageColor(g, this.volts[1], this);
        drawThickLineXY(g, plate2a.x, plate2a.y, plate2b.x, plate2b.y);

        drawPost(g, this.point1);
        drawPost(g, this.point2);
    }
}

registerComponent(176, 'VaractorElm', VaractorComponent);
