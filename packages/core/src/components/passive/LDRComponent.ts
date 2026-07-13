import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics, Adjustable } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { setVoltageColor, drawPost, drawDots } from '../drawutils.js';

/**
 * Light Dependent Resistor (Photoresistor) — illuminance-dependent resistor.
 * Port of Java LDRElm (dump type 374).
 * Resistance decreases as light intensity increases.
 */
export class LDRComponent extends CircuitComponent implements Adjustable {
    minLux = 0.1;
    maxLux = 10000;
    sliderText = 'Light Brightness';
    sliderValue = 34;

    position = 0.34;
    lux = 850;
    resistance = 10000;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.allocNodes();
        this.recalcLDR();
        this.setPoints();
    }

    getDumpType(): number | string { return 374; }

    // Adjustable interface
    getSliderValue(): number {
        return this.sliderValue / 100;
    }

    setSliderValue(val: number): void {
        this.sliderValue = Math.max(0, Math.min(100, Math.round(val * 100)));
        this.position = this.sliderValue * 0.0099 + 0.005;
        this.recalcLDR();
    }

    override dump(): string {
        const encodedText = this.sliderText.replace(/\+/g, '%2B');
        return super.dump() + ` ${this.position} ${encodedText}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) {
            this.position = parseFloat(tokens[start]);
            this.sliderValue = Math.round(this.position * 100);
        }
        if (tokens.length > start + 1) {
            let text = tokens.slice(start + 1).join(' ');
            text = text.replace(/%2[bB]/g, '+');
            this.sliderText = text;
        }
        this.allocNodes();
        this.recalcLDR();
        this.setPoints();
    }

    private recalcLDR(): void {
        this.lux = this.luxFromSliderPos();
        this.resistance = this.calcResistance(this.lux);
    }

    private luxFromSliderPos(): number {
        return this.maxLux * this.position + this.minLux;
    }

    private calcResistance(lux: number): number {
        return Math.round((this.maxLux - lux + 1) * 10);
    }

    stamp(context: StampContext): void {
        this.recalcLDR();
        context.stampResistor(this.nodes[0], this.nodes[1], this.resistance);
    }

    calculateCurrent(): void {
        this.current = (this.volts[0] - this.volts[1]) / this.resistance;
    }

    setPoints(): void {
        super.setPoints();
        this.calcLeads(32);
        this.position = this.sliderValue * 0.0099 + 0.005;
        this.recalcLDR();
    }

    getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Slider Text', text: this.sliderText };
        return null;
    }

    setEditValue(_n: number, ei: EditInfo): void {
        if (ei.text !== undefined && _n === 0) {
            this.sliderText = ei.text;
        }
        this.recalcLDR();
    }

    getInfo(): string[] {
        return [
            'photoresistor',
            `I = ${this.current.toFixed(3)} A`,
            `Vd = ${(this.volts[0] - this.volts[1]).toFixed(3)} V`,
            `R = ${this.getResistanceText()}`,
            `P = ${(this.getVoltageDiff() * this.current).toFixed(3)} W`,
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
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let i = 0; i < 4; i++) {
            ctx.lineTo((1 + 4 * i) * len / 16, hs);
            ctx.lineTo((3 + 4 * i) * len / 16, -hs);
        }
        ctx.lineTo(len, 0);
        ctx.stroke();

        // LDR symbol: two arrows pointing toward the resistor (light)
        ctx.beginPath();
        // Upper arrow
        ctx.moveTo(-8, 26);
        ctx.lineTo(8, 12);
        ctx.moveTo(2, 12);
        ctx.lineTo(8, 12);
        ctx.lineTo(8, 18);
        // Lower arrow
        ctx.moveTo(12, 26);
        ctx.lineTo(26, 12);
        ctx.moveTo(20, 12);
        ctx.lineTo(26, 12);
        ctx.lineTo(26, 18);
        ctx.stroke();

        ctx.restore();
        g.restore();

        // Value display
        this.drawValues(g, `${this.getResistanceText()}`, hs);

        drawDots(g, this.point1, this.lead1, this.curcount);
        drawDots(g, this.lead2, this.point2, this.curcount);
        drawPost(g, this.point1);
        drawPost(g, this.point2);
    }
}

registerComponent(374, 'LDRElm', LDRComponent);
