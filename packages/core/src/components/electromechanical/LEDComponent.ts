import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { DiodeModel } from '../active/DiodeModel.js';
import {
    setVoltageColor, drawThickLinePt, drawThickLineXY,
    interpPoint, interpPointPerpOut, drawPost, drawCenteredText,
} from '../drawutils.js';

/** LED component — extends diode with forward drop ~2.1V and RGB color control */
export class LEDComponent extends CircuitComponent {
    private model = new DiodeModel();
    fwdrop = 2.1024259;
    colorR = 1;
    colorG = 0;
    colorB = 0;
    maxBrightnessCurrent = 0.01;
    private subIterations = 0;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.setupFwdrop();
    }

    override getDumpType(): number | string { return 162; }
    override nonLinear(): boolean { return true; }

    override handleDumpData(tokens: string[], startIndex: number): void {
        if (tokens.length > startIndex) {
            this.fwdrop = parseFloat(tokens[startIndex]);
        }
        if (tokens.length > startIndex + 1) {
            this.colorR = parseFloat(tokens[startIndex + 1]);
        }
        if (tokens.length > startIndex + 2) {
            this.colorG = parseFloat(tokens[startIndex + 2]);
        }
        if (tokens.length > startIndex + 3) {
            this.colorB = parseFloat(tokens[startIndex + 3]);
        }
        if (tokens.length > startIndex + 4) {
            this.maxBrightnessCurrent = parseFloat(tokens[startIndex + 4]);
        }
        this.setupFwdrop();
    }

    override dump(): string {
        return super.dump() + ` ${this.fwdrop} ${this.colorR} ${this.colorG} ${this.colorB} ${this.maxBrightnessCurrent}`;
    }

    /** Compute saturationCurrent from fwdrop at ~1mA */
    private setupFwdrop(): void {
        if (this.fwdrop > 0) {
            const vt = 0.025865;
            const vscale = this.model.emissionCoefficient * vt;
            // I = Is * (exp(Vf/vscale) - 1) => Is = I / (exp(Vf/vscale) - 1)
            this.model.saturationCurrent = 0.001 / (Math.exp(this.fwdrop / vscale) - 1);
        }
    }

    override stamp(context: StampContext): void {
        context.stampNonLinear(this.nodes[0]);
        context.stampNonLinear(this.nodes[1]);
    }

    override doStep(context: StampContext): void {
        this.model.doStep(this.volts[0] - this.volts[1], context,
            this.nodes[0], this.nodes[1], this.subIterations);
        this.subIterations++;
    }

    override stepFinished(): void {
        this.subIterations = 0;
    }

    override calculateCurrent(): void {
        this.current = this.model.getCurrent(this.volts[0] - this.volts[1]);
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Forward Voltage (V)', value: this.fwdrop, min: 0.5, max: 5 };
        if (n === 1) return { name: 'Red (0-1)', value: this.colorR, min: 0, max: 1 };
        if (n === 2) return { name: 'Green (0-1)', value: this.colorG, min: 0, max: 1 };
        if (n === 3) return { name: 'Blue (0-1)', value: this.colorB, min: 0, max: 1 };
        if (n === 4) return { name: 'Max Brightness Current (A)', value: this.maxBrightnessCurrent, min: 0.001, max: 1 };
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (ei.value === undefined) return;
        if (_n === 0) { this.fwdrop = ei.value; this.setupFwdrop(); }
        if (_n === 1) this.colorR = ei.value;
        if (_n === 2) this.colorG = ei.value;
        if (_n === 3) this.colorB = ei.value;
        if (_n === 4) this.maxBrightnessCurrent = ei.value;
    }

    override getInfo(): string[] {
        const arr: string[] = [];
        arr[0] = 'LED';
        arr[1] = `Vd = ${this.getVoltageDiff().toFixed(3)} V`;
        arr[2] = `I = ${(this.current * 1000).toFixed(2)} mA`;
        return arr;
    }

    // No shortcut to avoid conflict with Inductor (also 'l')

    override draw(g: Graphics): void {
        const hs = 12;
        const v1 = this.volts[0];
        const v2 = this.volts[1];
        this.calcLeads(24);

        setVoltageColor(g, v1, this);
        drawThickLinePt(g, this.point1, this.lead1);
        setVoltageColor(g, v2, this);
        drawThickLinePt(g, this.lead2, this.point2);

        // Triangle (arrow) - filled
        const triBase = interpPoint(this.lead1, this.lead2, 0.2);
        const triTip = interpPoint(this.lead1, this.lead2, 0.55);
        const p1 = { x: 0, y: 0 };
        const p2 = { x: 0, y: 0 };
        interpPointPerpOut(this.lead1, this.lead2, p1, 0.2, hs);
        interpPointPerpOut(this.lead1, this.lead2, p2, 0.2, -hs);

        // LED color fill - brightness proportional to current
        const brightness = Math.min(1, Math.abs(this.current) / this.maxBrightnessCurrent);
        const r = Math.round(this.colorR * 255 * brightness);
        const g_ = Math.round(this.colorG * 255 * brightness);
        const b = Math.round(this.colorB * 255 * brightness);
        const ledColor = `rgb(${r},${g_},${b})`;

        g.setColor(ledColor);
        g.fillPolygon(
            [triBase.x, triTip.x, triBase.x],
            [p1.y, triTip.y, p2.y],
            3,
        );

        // Triangle outline
        // Triangle outline
        g.setColor('#808080');
        g.setLineWidth(2);
        g.drawPolyline(
            [triBase.x, triTip.x, triBase.x],
            [p1.y, triTip.y, p2.y],
            3,
        );

        // Cathode bar
        const bar = interpPoint(this.lead1, this.lead2, 0.7);
        setVoltageColor(g, v2, this);
        drawThickLineXY(g, bar.x, bar.y + hs, bar.x, bar.y - hs);

        // Light rays
        const rayY = bar.y + hs + 6;
        const rayX = bar.x;
        g.setColor('#FFFF00');
        g.setLineWidth(1);
        g.drawLine(rayX - 4, rayY, rayX - 8, rayY + 4);
        g.drawLine(rayX, rayY, rayX, rayY + 6);
        g.drawLine(rayX + 4, rayY, rayX + 8, rayY + 4);

        g.setLineWidth(1);
        drawPost(g, this.point1);
        drawPost(g, this.point2);
    }
}

registerComponent(162, 'LEDElm', LEDComponent);
