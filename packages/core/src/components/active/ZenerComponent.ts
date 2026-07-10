import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { DiodeModel } from './DiodeModel.js';
import {
    setVoltageColor, drawThickLinePt, drawThickLineXY,
    interpPoint, interpPointPerp, interpPoint2, drawPost,
} from '../drawutils.js';

export class ZenerComponent extends CircuitComponent {
    model = new DiodeModel();
    private subIterations = 0;
    private breakdownVoltage = 5.6;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.model.breakdownVoltage = this.breakdownVoltage;
    }

    getDumpType(): number | string { return 'z'; }
    nonLinear(): boolean { return true; }

    stamp(context: StampContext): void {
        context.stampNonLinear(this.nodes[0]);
        context.stampNonLinear(this.nodes[1]);
    }

    doStep(context: StampContext): void {
        this.model.doStep(this.volts[0] - this.volts[1], context,
            this.nodes[0], this.nodes[1], this.subIterations);
        this.subIterations++;
    }

    stepFinished(): void {
        this.subIterations = 0;
    }

    calculateCurrent(): void {
        this.current = this.model.getCurrent(this.volts[0] - this.volts[1]);
    }

    getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Breakdown voltage (Vz)', value: this.breakdownVoltage };
        if (n === 1) return { name: 'Saturation current (Is)', value: this.model.saturationCurrent };
        return null;
    }

    setEditValue(_n: number, ei: EditInfo): void {
        if (ei.value !== undefined) {
            if (_n === 0) {
                this.breakdownVoltage = ei.value;
                this.model.breakdownVoltage = ei.value;
            }
            if (_n === 1) this.model.saturationCurrent = ei.value;
        }
    }

    getInfo(): string[] {
        return [`Zener diode`, `Vz = ${this.breakdownVoltage.toFixed(1)} V`,
            `Vd = ${this.getVoltageDiff().toFixed(3)} V`];
    }

    getShortcut(): number { return 'z'.charCodeAt(0); }

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

        // Cathode bar
        const bar = interpPoint(this.lead1, this.lead2, 0.65);
        setVoltageColor(g, this.volts[1], this);
        drawThickLineXY(g, bar.x, bar.y - hs, bar.x, bar.y + hs);

        // Zener "wings" on cathode
        const wing1 = interpPointPerp(this.lead1, this.lead2, 0.65, hs + 8);
        const wing2 = interpPointPerp(this.lead1, this.lead2, 0.65, -(hs + 8));
        setVoltageColor(g, this.volts[1], this);
        drawThickLineXY(g, bar.x, bar.y + hs, wing1.x, wing1.y);
        drawThickLineXY(g, bar.x, bar.y - hs, wing2.x, wing2.y);

        drawPost(g, this.point1);
        drawPost(g, this.point2);
    }
}

registerComponent('z'.charCodeAt(0), 'ZenerElm', ZenerComponent);
