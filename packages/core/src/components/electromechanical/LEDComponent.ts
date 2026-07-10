import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { DiodeModel } from '../active/DiodeModel.js';
import {
    setVoltageColor, drawThickLinePt,
    drawPost, drawDots,
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

    /** Compute saturationCurrent from fwdrop at ~1mA (matches Java DiodeModel.getModelWithParameters) */
    private setupFwdrop(): void {
        if (this.fwdrop > 0) {
            const vt = 0.025865;
            const vscale = this.model.emissionCoefficient * vt;
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

    override draw(g: Graphics): void {
        const cr = 12;
        const v1 = this.volts[0];
        const v2 = this.volts[1];
        this.calcLeads(24);

        // Compute center of the LED
        const ledCenter = {
            x: (this.lead1.x + this.lead2.x) / 2,
            y: (this.lead1.y + this.lead2.y) / 2,
        };

        setVoltageColor(g, v1, this);
        drawThickLinePt(g, this.point1, this.lead1);
        setVoltageColor(g, v2, this);
        drawThickLinePt(g, this.lead2, this.point2);

        // LED body: circle with RGB fill proportional to current/brightness (matches Java)
        g.setColor('#808080');
        g.setLineWidth(2);
        g.drawOval(ledCenter.x - cr, ledCenter.y - cr, cr * 2, cr * 2);

        // Brightness: use log scale (matches Java: w = 255*(1+.2*log(w)), clamped [0,255])
        let w = Math.abs(this.current) / this.maxBrightnessCurrent;
        if (w > 0) {
            w = 255 * (1 + 0.2 * Math.log(w));
        }
        if (w > 255) w = 255;
        if (w < 0) w = 0;

        const r = Math.round(this.colorR * w);
        const g_ = Math.round(this.colorG * w);
        const b = Math.round(this.colorB * w);
        g.setColor(`rgb(${r},${g_},${b})`);
        g.fillOval(ledCenter.x - cr + 2, ledCenter.y - cr + 2, (cr - 2) * 2, (cr - 2) * 2);

        this.setBboxPts(this.point1, this.point2, cr);

        // Current dots
        this.updateCurcount(0);
        drawDots(g, this.point1, this.lead1, this.curcount);
        drawDots(g, this.point2, this.lead2, -this.curcount);

        drawPost(g, this.point1);
        drawPost(g, this.point2);
    }
}

registerComponent(162, 'LEDElm', LEDComponent);
