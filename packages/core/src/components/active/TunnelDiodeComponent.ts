import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import {
    setVoltageColor, drawThickLinePt, drawThickLineXY,
    interpPoint, interpPointPerp, interpPoint2, drawPost,
} from '../drawutils.js';

/**
 * Tunnel diode — exhibits negative differential resistance (N-shaped I-V curve).
 * Port of Java TunnelDiodeElm (dump type 175)
 */
export class TunnelDiodeComponent extends CircuitComponent {
    private lastVoltage = 0;
    private subIterations = 0;

    getDumpType(): number | string { return 175; }
    nonLinear(): boolean { return true; }

    stamp(context: StampContext): void {
        context.stampNonLinear(this.nodes[0]);
        context.stampNonLinear(this.nodes[1]);
    }

    // Tunnel diode parameters (from Java)
    private readonly pvp = 0.1;
    private readonly pip = 4.7e-3;
    private readonly pvv = 0.37;
    private readonly pvt = 0.026;
    private readonly pvpp = 0.525;
    private readonly piv = 370e-6;

    private limitStep(vnew: number, vold: number): number {
        if (vnew > vold + 1) return vold + 1;
        if (vnew < vold - 1) return vold - 1;
        return vnew;
    }

    doStep(context: StampContext): void {
        let vd = this.volts[0] - this.volts[1];
        if (Math.abs(vd - this.lastVoltage) > 0.01) {
            context.setConverged(false);
        }
        vd = this.limitStep(vd, this.lastVoltage);
        this.lastVoltage = vd;

        // I-V: Tunnel diode characteristic
        const i0 = this.piv * Math.exp(-this.pvv);
        const expTerm = Math.exp(Math.min(vd / this.pvt, 100));
        const exp1 = Math.exp(1 - vd / this.pvp);

        const i = this.pip * Math.exp(-this.pvpp / this.pvt) * (expTerm - 1) +
            this.pip * (vd / this.pvp) * exp1 +
            this.piv * Math.exp(vd - this.pvv) - i0;

        // Conductance (derivative)
        const geq = this.pip * Math.exp(-this.pvpp / this.pvt) * expTerm / this.pvt +
            this.pip * exp1 / this.pvp -
            exp1 * this.pip * vd / (this.pvp * this.pvp) +
            Math.exp(vd - this.pvv) * this.piv;

        const nc = i - geq * vd;
        context.stampConductance(this.nodes[0], this.nodes[1], geq);
        context.stampCurrentSource(this.nodes[0], this.nodes[1], nc);
    }

    calculateCurrent(): void {
        const vd = this.volts[0] - this.volts[1];
        const i0 = this.piv * Math.exp(-this.pvv);
        const expTerm = Math.exp(Math.min(vd / this.pvt, 100));
        const exp1 = Math.exp(1 - vd / this.pvp);

        this.current = this.pip * Math.exp(-this.pvpp / this.pvt) * (expTerm - 1) +
            this.pip * (vd / this.pvp) * exp1 +
            this.piv * Math.exp(vd - this.pvv) - i0;
    }

    getInfo(): string[] {
        return [`Tunnel diode`, `I = ${this.current.toExponential(2)} A`,
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
        const triTip = interpPoint(this.lead1, this.lead2, 0.6);
        const p1 = interpPointPerp(this.lead1, this.lead2, 0.35, hs);
        const p2 = interpPointPerp(this.lead1, this.lead2, 0.35, -hs);

        g.setLineWidth(2);
        setVoltageColor(g, this.volts[0], this);
        g.fillPolygon(
            [triBase.x, triTip.x, triBase.x],
            [p1.y, triTip.y, p2.y],
            3,
        );

        // Cathode with double lines (tunnel diode symbol)
        const bar = interpPoint(this.lead1, this.lead2, 0.65);
        const bar2 = interpPoint(this.lead1, this.lead2, 0.72);
        setVoltageColor(g, this.volts[1], this);
        drawThickLineXY(g, bar.x, bar.y - hs, bar.x, bar.y + hs);
        drawThickLineXY(g, bar2.x, bar2.y - hs, bar2.x, bar2.y + hs);

        drawPost(g, this.point1);
        drawPost(g, this.point2);
    }
}

registerComponent(175, 'TunnelDiodeElm', TunnelDiodeComponent);
