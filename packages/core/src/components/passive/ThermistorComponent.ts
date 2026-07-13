import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics, Adjustable } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { setVoltageColor, drawPost, drawDots } from '../drawutils.js';

/**
 * NTC Thermistor — temperature-dependent resistor.
 * Port of Java ThermistorNTCElm (dump type 350).
 * Resistance decreases as temperature increases (Negative Temperature Coefficient).
 */
export class ThermistorComponent extends CircuitComponent implements Adjustable {
    r25 = 10000;
    r50 = 3605;
    minTempr = -40;
    maxTempr = 150;
    sliderText = 'Temperature';
    sliderValue = 34;

    position = 0.34;
    temperature = 25;
    resistance = 10000;

    private readonly t0 = 273.15;
    private readonly t25 = 298.15;
    private b25100 = 3932;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.allocNodes();
        this.recalcThermistor();
        this.setPoints();
    }

    getDumpType(): number | string { return 350; }

    // Adjustable interface
    getSliderValue(): number {
        return this.sliderValue / 100;
    }

    setSliderValue(val: number): void {
        this.sliderValue = Math.max(0, Math.min(100, Math.round(val * 100)));
        this.position = this.sliderValue * 0.0099 + 0.005;
        this.recalcThermistor();
    }

    override dump(): string {
        const encodedText = this.sliderText.replace(/\+/g, '%2B');
        return super.dump() + ` ${this.r25} ${this.r50} ${this.minTempr} ${this.maxTempr} ${this.position} ${encodedText}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.r25 = parseFloat(tokens[start]);
        if (tokens.length > start + 1) this.r50 = parseFloat(tokens[start + 1]);
        if (tokens.length > start + 2) this.minTempr = parseFloat(tokens[start + 2]);
        if (tokens.length > start + 3) this.maxTempr = parseFloat(tokens[start + 3]);
        if (tokens.length > start + 4) {
            this.position = parseFloat(tokens[start + 4]);
            this.sliderValue = Math.round(this.position * 100);
        }
        if (tokens.length > start + 5) {
            let text = tokens.slice(start + 5).join(' ');
            text = text.replace(/%2[bB]/g, '+');
            this.sliderText = text;
        }
        this.allocNodes();
        this.recalcThermistor();
        this.setPoints();
    }

    private recalcThermistor(): void {
        this.b25100 = this.calcB25100();
        this.temperature = this.temprFromSliderPos();
        this.resistance = this.calcResistance(this.temperature);
    }

    private calcB25100(): number {
        const k1 = this.t0 + 25;
        const k2 = this.t0 + 50;
        return (Math.log(this.r25) - Math.log(this.r50)) / ((1 / k1) - (1 / k2));
    }

    private temprFromSliderPos(): number {
        return Math.round(this.position * (this.maxTempr - this.minTempr) + this.minTempr);
    }

    private calcResistance(tempr: number): number {
        const inv = (1 / (tempr + this.t0)) - (1 / this.t25);
        return Math.round(this.r25 * Math.exp(this.b25100 * inv));
    }

    stamp(context: StampContext): void {
        this.recalcThermistor();
        context.stampResistor(this.nodes[0], this.nodes[1], this.resistance);
    }

    calculateCurrent(): void {
        this.current = (this.volts[0] - this.volts[1]) / this.resistance;
    }

    setPoints(): void {
        super.setPoints();
        this.calcLeads(32);
        this.position = this.sliderValue * 0.0099 + 0.005;
        this.recalcThermistor();
    }

    getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'R at 25°C', value: this.r25, min: this.r50 + 100, max: 100000 };
        if (n === 1) return { name: 'R at 50°C', value: this.r50, min: 100, max: this.r25 - 100 };
        if (n === 2) return { name: 'Slider min temp (°C)', value: this.minTempr };
        if (n === 3) return { name: 'Slider max temp (°C)', value: this.maxTempr };
        if (n === 4) return { name: 'Slider Text', text: this.sliderText };
        return null;
    }

    setEditValue(_n: number, ei: EditInfo): void {
        if (ei.value !== undefined) {
            if (_n === 0) this.r25 = ei.value;
            if (_n === 1) this.r50 = ei.value;
            if (_n === 2) this.minTempr = ei.value;
            if (_n === 3) this.maxTempr = ei.value;
        }
        if (ei.text !== undefined && _n === 4) {
            this.sliderText = ei.text;
        }
        this.recalcThermistor();
    }

    getInfo(): string[] {
        return [
            'thermistor',
            `I = ${this.current.toFixed(3)} A`,
            `Vd = ${(this.volts[0] - this.volts[1]).toFixed(3)} V`,
            `R = ${this.getResistanceText()}`,
            `P = ${(this.getVoltageDiff() * this.current).toFixed(3)} W`,
            `T = ${this.temperature}°C`,
        ];
    }

    private getResistanceText(): string {
        const r = this.resistance;
        if (r >= 1e6) return `${(r / 1e6).toFixed(2)} MΩ`;
        if (r >= 1e3) return `${(r / 1e3).toFixed(2)} kΩ`;
        return `${r.toFixed(1)} Ω`;
    }

    getShortcut(): number { return 0; }

    draw(g: Graphics): void {
        const hs = 6;
        const v1 = this.volts[0];
        const v2 = this.volts[1];

        this.setBboxPts(this.point1, this.point2, hs);
        this.draw2Leads(g);
        this.setVoltageColor(g, (v1 + v2) / 2);

        const len = Math.sqrt(
            (this.lead2.x - this.lead1.x) ** 2 + (this.lead2.y - this.lead1.y) ** 2,
        );
        if (len === 0) return;

        g.save();
        const ctx = g.getContext();
        ctx.save();
        ctx.lineWidth = 3;

        // Transform to local coords
        ctx.translate(this.lead1.x, this.lead1.y);
        ctx.rotate(Math.atan2(this.lead2.y - this.lead1.y, this.lead2.x - this.lead1.x));

        // Voltage gradient
        const c1 = this.getVoltageColor(v1);
        const c2 = this.getVoltageColor(v2);
        const grad = ctx.createLinearGradient(0, 0, len, 0);
        grad.addColorStop(0, c1);
        grad.addColorStop(1, c2);
        ctx.strokeStyle = grad;

        // Zigzag resistor body
        if (true) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            for (let i = 0; i < 4; i++) {
                ctx.lineTo((1 + 4 * i) * len / 16, hs);
                ctx.lineTo((3 + 4 * i) * len / 16, -hs);
            }
            ctx.lineTo(len, 0);
            ctx.stroke();
        }

        // Thermistor symbol: diagonal line with -t label
        ctx.beginPath();
        ctx.moveTo(-hs, hs * 2);
        ctx.lineTo(hs, hs * 2);
        ctx.lineTo(len, -hs * 2);
        ctx.stroke();

        ctx.restore();
        g.restore();

        // Value display
        this.drawValues(g, `${this.temperature}°C=${this.getResistanceText()}`, hs);

        drawDots(g, this.point1, this.lead1, this.curcount);
        drawDots(g, this.lead2, this.point2, this.curcount);
        drawPost(g, this.point1);
        drawPost(g, this.point2);
    }
}

registerComponent(350, 'ThermistorNTCElm', ThermistorComponent);
