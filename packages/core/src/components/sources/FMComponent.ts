import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { setVoltageColor, drawThickLinePt, drawThickCircle, drawDots, drawPost } from '../drawutils.js';

/** Frequency Modulated source */
export class FMComponent extends CircuitComponent {
    maxVoltage = 5;
    carrierfreq = 800;
    signalfreq = 40;
    deviation = 200;
    freqTimeZero = 0;
    lasttime = 0;
    funcx = 0;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.reset();
    }

    getDumpType(): number | string { return 201; }
    getPostCount(): number { return 1; }
    getVoltageSourceCount(): number { return 1; }

    override dump(): string {
        return super.dump() + ` ${this.carrierfreq} ${this.signalfreq} ${this.maxVoltage} ${this.deviation}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.carrierfreq = parseFloat(tokens[start]) || 800;
        if (tokens.length > start + 1) this.signalfreq = parseFloat(tokens[start + 1]) || 40;
        if (tokens.length > start + 2) this.maxVoltage = parseFloat(tokens[start + 2]) || 5;
        if (tokens.length > start + 3) this.deviation = parseFloat(tokens[start + 3]) || 200;
        this.reset();
    }

    override reset(): void {
        this.freqTimeZero = 0;
        this.lasttime = 0;
        this.funcx = 0;
        this.curcount = 0;
    }

    override stamp(context: StampContext): void {
        context.stampVoltageSource(0, this.nodes[0], this.voltSource);
    }

    override doStep(context: StampContext): void {
        context.updateVoltageSource(0, this.nodes[0], this.voltSource, this.getVoltage());
    }

    getVoltage(): number {
        const deltaT = this.simTime - this.lasttime;
        this.lasttime = this.simTime;
        const signalamplitude = Math.sin(2 * Math.PI * this.simTime * this.signalfreq);
        this.funcx += deltaT * (this.carrierfreq + signalamplitude * this.deviation);
        return Math.sin(2 * Math.PI * this.funcx) * this.maxVoltage;
    }

    override setPoints(): void {
        super.setPoints();
        const circleSize = 17;
        if (this.dn > 0) {
            const f = 1 - circleSize / this.dn;
            this.lead1 = {
                x: Math.floor(this.point1.x * (1 - f) + this.point2.x * f + 0.48),
                y: Math.floor(this.point1.y * (1 - f) + this.point2.y * f + 0.48),
            };
        }
    }

    override draw(g: Graphics): void {
        this.setBboxPts(this.point1, this.point2, 17);
        setVoltageColor(g, this.volts[0], this);
        drawThickLinePt(g, this.point1, this.lead1);

        const xc = this.point2.x;
        const yc = this.point2.y;
        const circleSize = 17;
        drawThickCircle(g, xc, yc, circleSize);
        this.adjustBbox(xc - circleSize, yc - circleSize, xc + circleSize, yc + circleSize);

        g.setColor(this.needsHighlight() ? '#00FFFF' : '#FFFFFF');
        g.setFontSize(12);
        g.textAlign('center');
        g.textBaseline('middle');
        g.drawString('FM', xc, yc);

        drawDots(g, this.point1, this.lead1, this.curcount);
        drawPost(g, this.point1);
    }

    override getVoltageDiff(): number { return this.volts[0]; }

    override getInfo(): string[] {
        return [
            'FM Source',
            `V = ${this.getVoltageDiff().toFixed(3)} V`,
            `cf = ${this.carrierfreq.toFixed(1)} Hz`,
            `sf = ${this.signalfreq.toFixed(1)} Hz`,
            `dev = ${this.deviation.toFixed(1)} Hz`,
        ];
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Max Voltage', value: this.maxVoltage, min: -20, max: 20 };
        if (n === 1) return { name: 'Carrier Frequency (Hz)', value: this.carrierfreq };
        if (n === 2) return { name: 'Signal Frequency (Hz)', value: this.signalfreq };
        if (n === 3) return { name: 'Deviation (Hz)', value: this.deviation };
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (ei.value !== undefined) {
            if (_n === 0) this.maxVoltage = ei.value;
            if (_n === 1) this.carrierfreq = ei.value;
            if (_n === 2) this.signalfreq = ei.value;
            if (_n === 3) this.deviation = ei.value;
        }
    }

    override getPower(): number { return -this.getVoltageDiff() * this.current; }
}

registerComponent(201, 'FMElm', FMComponent);
