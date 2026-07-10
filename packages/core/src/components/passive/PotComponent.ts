import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics, Point, Adjustable } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import {
    setVoltageColor, drawDots, drawPost, interpPoint,
    interpPointPerp, interpPoint2,
} from '../drawutils.js';

export class PotComponent extends CircuitComponent implements Adjustable {
    maxResistance = 1000;
    position = 0.5;
    resistance1 = 500;
    resistance2 = 500;
    sliderText = 'Resistance';
    sliderValue = 50;

    // Wiper position calculations
    post3: Point = { x: 0, y: 0 };
    corner2: Point = { x: 0, y: 0 };
    arrowPoint: Point = { x: 0, y: 0 };
    midpoint: Point = { x: 0, y: 0 };
    arrow1: Point = { x: 0, y: 0 };
    arrow2: Point = { x: 0, y: 0 };
    ps3: Point = { x: 0, y: 0 };
    ps4: Point = { x: 0, y: 0 };

    // Three currents for three-terminal device
    current1 = 0;
    current2 = 0;
    current3 = 0;
    curcount1 = 0;
    curcount2 = 0;
    curcount3 = 0;

    readonly FLAG_SHOW_VALUES = 1;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.flags = this.FLAG_SHOW_VALUES;
        this.noDiagonal = true;
        this.allocNodes();
        this.setPoints();
    }

    getDumpType(): number | string { return 174; }

    getPostCount(): number { return 3; }

    getPost(n: number): Point {
        if (n === 0) return this.point1;
        if (n === 1) return this.point2;
        return this.post3;
    }

    getCurrentIntoNode(n: number): number {
        if (n === 0) return -this.current1;
        if (n === 1) return -this.current2;
        return -this.current3;
    }

    // Adjustable interface
    getSliderValue(): number {
        return this.sliderValue / 100;
    }

    setSliderValue(val: number): void {
        this.sliderValue = Math.max(0, Math.min(100, Math.round(val * 100)));
        this.position = Math.max(0.005, Math.min(0.995, this.sliderValue / 100));
    }

    override dump(): string {
        const encodedText = this.sliderText.replace(/\+/g, '%2B');
        return super.dump() + ` ${this.maxResistance} ${this.position} ${encodedText}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.maxResistance = parseFloat(tokens[start]);
        if (tokens.length > start + 1) {
            this.position = parseFloat(tokens[start + 1]);
            this.sliderValue = Math.round(this.position * 100);
        }
        if (tokens.length > start + 2) {
            let text = tokens.slice(start + 2).join(' ');
            text = text.replace(/%2[bB]/g, '+');
            this.sliderText = text;
        }
        this.allocNodes();
        this.setPoints();
    }

    stamp(context: StampContext): void {
        this.resistance1 = this.maxResistance * this.position;
        this.resistance2 = this.maxResistance * (1 - this.position);
        context.stampResistor(this.nodes[0], this.nodes[2], this.resistance1);
        context.stampResistor(this.nodes[2], this.nodes[1], this.resistance2);
    }

    calculateCurrent(): void {
        if (this.resistance1 === 0 || this.resistance2 === 0) return;
        this.current1 = (this.volts[0] - this.volts[2]) / this.resistance1;
        this.current2 = (this.volts[1] - this.volts[2]) / this.resistance2;
        this.current3 = -this.current1 - this.current2;
    }

    override updateCurcount(currentMult: number): void {
        let cadd = this.current1 * currentMult;
        cadd %= 8;
        this.curcount1 += cadd;
        cadd = this.current2 * currentMult;
        cadd %= 8;
        this.curcount2 += cadd;
        cadd = this.current3 * currentMult;
        cadd %= 8;
        this.curcount3 += cadd;
    }

    override reset(): void {
        super.reset();
        this.curcount1 = 0;
        this.curcount2 = 0;
        this.curcount3 = 0;
    }

    setPoints(): void {
        super.setPoints();
        const bodyLen = 32;
        this.calcLeads(bodyLen);

        // Compute position from slider value
        this.position = Math.max(0.005, Math.min(0.995, this.sliderValue / 100));

        // Perpendicular offset for wiper
        const offset = this.dpx1 * 20 * this.dsign;

        // Wiper post position (midpoint with perpendicular offset)
        this.post3 = interpPoint(this.point1, this.point2, 0.5);
        this.post3.x += Math.round(offset);
        this.post3.y += Math.round(this.dpy1 * 20 * this.dsign);

        // Position along the body for wiper connection
        const soff = (this.position - 0.5) * bodyLen;
        const soffFrac = 0.5 + soff / this.dn;

        this.corner2 = interpPointPerp(this.lead1, this.lead2, soffFrac, offset);
        this.arrowPoint = interpPointPerp(this.lead1, this.lead2, soffFrac, offset * 0.4);
        this.midpoint = interpPoint(this.lead1, this.lead2, soffFrac);

        // Arrow head
        const clen = Math.abs(offset) - 8;
        const frac = (clen - 8) / clen;
        interpPoint2(this.corner2, this.arrowPoint, this.arrow1, this.arrow2, frac, 8);
    }

    getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Resistance (ohms)', value: this.maxResistance };
        if (n === 1) return { name: 'Slider Text', text: this.sliderText };
        if (n === 2) return { name: 'Show Values', checkbox: true, checkboxState: (this.flags & this.FLAG_SHOW_VALUES) !== 0 };
        return null;
    }

    setEditValue(_n: number, ei: EditInfo): void {
        if (ei.value !== undefined) {
            if (_n === 0) this.maxResistance = ei.value;
        }
        if (ei.text !== undefined && _n === 1) {
            this.sliderText = ei.text;
        }
        if (ei.checkboxState !== undefined && _n === 2) {
            if (ei.checkboxState) this.flags |= this.FLAG_SHOW_VALUES;
            else this.flags &= ~this.FLAG_SHOW_VALUES;
        }
    }

    getInfo(): string[] {
        return [
            'potentiometer',
            `Vd = ${(this.volts[0] - this.volts[1]).toFixed(3)} V`,
            `R1 = ${this.getUnitText(this.resistance1, 'Ω')}`,
            `R2 = ${this.getUnitText(this.resistance2, 'Ω')}`,
            `I1 = ${this.current1.toFixed(3)} A`,
            `I2 = ${this.current2.toFixed(3)} A`,
        ];
    }

    private getUnitText(val: number, unit: string): string {
        if (val >= 1e6) return `${(val / 1e6).toFixed(2)} M${unit}`;
        if (val >= 1e3) return `${(val / 1e3).toFixed(2)} k${unit}`;
        return `${val.toFixed(1)} ${unit}`;
    }

    draw(g: Graphics): void {
        const segments = 16;
        let ox = 0;
        const hs = 8;
        const v1 = this.volts[0];
        const v2 = this.volts[1];
        const v3 = this.volts[2];
        this.setBboxPts(this.point1, this.point2, hs);
        this.draw2Leads(g);
        this.setVoltageColor(g, (v1 + v2) / 2);

        const segf = 1 / segments;
        const divide = Math.round(segments * this.position);

        // Draw zigzag resistor body
        for (let i = 0; i < segments; i++) {
            let nx = 0;
            switch (i & 3) {
                case 0: nx = 1; break;
                case 2: nx = -1; break;
                default: nx = 0; break;
            }
            let v = v1 + (v3 - v1) * i / divide;
            if (i >= divide) {
                v = v3 + (v2 - v3) * (i - divide) / (segments - divide);
            }
            setVoltageColor(g, v, this);
            const p1 = interpPointPerp(this.lead1, this.lead2, i * segf, hs * ox);
            const p2 = interpPointPerp(this.lead1, this.lead2, (i + 1) * segf, hs * nx);
            g.setLineWidth(3);
            g.drawLine(p1.x, p1.y, p2.x, p2.y);
            g.setLineWidth(1);
            ox = nx;
        }

        // Draw wiper
        setVoltageColor(g, v3, this);
        g.setLineWidth(3);
        g.drawLine(this.post3.x, this.post3.y, this.corner2.x, this.corner2.y);
        g.drawLine(this.corner2.x, this.corner2.y, this.arrowPoint.x, this.arrowPoint.y);
        g.drawLine(this.arrow1.x, this.arrow1.y, this.arrowPoint.x, this.arrowPoint.y);
        g.drawLine(this.arrow2.x, this.arrow2.y, this.arrowPoint.x, this.arrowPoint.y);
        g.setLineWidth(1);

        // Current dots
        drawDots(g, this.point1, this.midpoint, this.curcount1);
        drawDots(g, this.point2, this.midpoint, this.curcount2);
        drawDots(g, this.post3, this.corner2, this.curcount3);
        drawDots(g, this.corner2, this.midpoint, this.curcount3 + distance(this.post3, this.corner2));

        // Posts
        drawPost(g, this.point1);
        drawPost(g, this.point2);
        drawPost(g, this.post3);

        // Show values near arrow (like Java: R1 on one side, R2 on the other)
        if (this.resistance1 > 0 && (this.flags & this.FLAG_SHOW_VALUES) !== 0) {
            const isVertical = this.lead1.x === this.lead2.x;
            const isReverseX = this.post3.y < this.lead1.y && this.lead1.x !== this.lead2.x;
            const isReverseY = this.post3.x < this.lead1.x && this.lead1.x === this.lead2.x;
            const rev = (this.lead1.x === this.lead2.x && this.lead1.y < this.lead2.y) ||
                        (this.lead1.y === this.lead2.y && this.lead1.x > this.lead2.x);

            const s1 = this.getUnitText(rev ? this.resistance2 : this.resistance1, 'Ω');
            const s2 = this.getUnitText(rev ? this.resistance1 : this.resistance2, 'Ω');

            g.setFontSize(12);
            g.setColor('#FFFFFF');
            const ya = 6;
            const w1 = g.measureWidth(s1);
            const w2 = g.measureWidth(s2);

            if (isVertical) {
                // R1 (top side)
                g.drawString(s1,
                    !isReverseY ? this.arrowPoint.x + 2 : this.arrowPoint.x - 2 - w1,
                    Math.max(this.arrow1.y, this.arrow2.y) + 5 + ya);
                // R2 (bottom side)
                g.drawString(s2,
                    !isReverseY ? this.arrowPoint.x + 2 : this.arrowPoint.x - 2 - w2,
                    Math.min(this.arrow1.y, this.arrow2.y) - 3);
            } else {
                // R1 (left side)
                g.drawString(s1,
                    Math.min(this.arrow1.x, this.arrow2.x) - 2 - w1,
                    !isReverseX ? this.arrowPoint.y + 4 + ya : this.arrowPoint.y - 4);
                // R2 (right side)
                g.drawString(s2,
                    Math.max(this.arrow1.x, this.arrow2.x) + 2,
                    !isReverseX ? this.arrowPoint.y + 4 + ya : this.arrowPoint.y - 4);
            }
        }
    }
}

function distance(p1: Point, p2: Point): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

registerComponent(174, 'PotElm', PotComponent);
