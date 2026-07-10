import { CurrentComponent } from '../sources/CurrentComponent.js';
import type { Graphics, EditInfo } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { drawThickCircle, drawCenteredText, drawValues, drawPost } from '../drawutils.js';

/** OhmMeterElm — measures resistance between its terminals */
export class OhmMeterElm extends CurrentComponent {
    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.currentValue = 0.001; // 1 mA test current
    }

    getDumpType(): number | string {
        return 216;
    }

    override setPoints(): void {
        super.setPoints();
        this.calcLeads(26);
    }

    override draw(g: Graphics): void {
        const cr = 12;
        this.draw2Leads(g);
        this.setVoltageColor(g, (this.volts[0] + this.volts[1]) / 2);
        // setPowerColor is omitted — no power color concept in new architecture

        const midX = Math.floor((this.point1.x + this.point2.x) / 2);
        const midY = Math.floor((this.point1.y + this.point2.y) / 2);
        drawThickCircle(g, midX, midY, cr);

        // Draw Ω symbol
        g.setFontSize(14);
        g.textAlign('center');
        g.textBaseline('middle');
        g.setColor('#FFFFFF');
        g.drawString('Ω', midX, midY);

        this.setBbox(this.point1.x, this.point1.y, this.point2.x, this.point2.y);
        this.adjustBbox(midX - cr, midY - cr, midX + cr, midY + cr);

        this.drawDots(g, this.point1, this.point2, this.curcount);

        // Show resistance value
        if (this.current !== 0) {
            const r = this.getVoltageDiff() / this.current;
            const s = this.formatResistance(r);
            drawValues(g, s, cr, this.point1, this.point2);
        }

        this.drawPosts(g);
    }

    private drawPosts(g: Graphics): void {
        drawPost(g, this.point1);
        drawPost(g, this.point2);
    }

    override getInfo(): string[] {
        const info = ['ohmmeter'];
        if (this.current === 0) {
            info[1] = 'R = ∞';
        } else {
            const r = this.getVoltageDiff() / this.current;
            info[1] = `R = ${this.formatResistance(r)}`;
        }
        return info;
    }

    private formatResistance(r: number): string {
        if (r >= 1e6) return `${(r / 1e6).toFixed(2)} MΩ`;
        if (r >= 1e3) return `${(r / 1e3).toFixed(2)} kΩ`;
        return `${r.toFixed(2)} Ω`;
    }
}

registerComponent(216, 'OhmMeterElm', OhmMeterElm);
