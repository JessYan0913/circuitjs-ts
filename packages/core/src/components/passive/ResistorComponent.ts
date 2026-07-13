import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics, Point } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import {
    interpPointPerpOut, setVoltageColor, drawThickLinePt,
    drawValues, drawDots, drawPost, distance,
} from '../drawutils.js';

export class ResistorComponent extends CircuitComponent {
    resistance = 1000;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        if (args.flags !== undefined) this.resistance = args.flags;
    }

    getDumpType(): number | string { return 'r'; }

    stamp(context: StampContext): void {
        context.stampResistor(this.nodes[0], this.nodes[1], this.resistance);
    }

    handleDumpData(tokens: string[], startIndex: number): void {
        if (tokens.length > startIndex) {
            this.resistance = parseFloat(tokens[startIndex]);
        }
    }

    calculateCurrent(): void {
        this.current = (this.volts[0] - this.volts[1]) / this.resistance;
    }

    getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Resistance', value: this.resistance };
        return null;
    }

    setEditValue(_n: number, ei: EditInfo): void {
        if (ei.value !== undefined) this.resistance = ei.value;
    }

    getInfo(): string[] {
        const val = this.resistance >= 1000
            ? `${(this.resistance / 1000).toFixed(1)} kΩ`
            : `${this.resistance} Ω`;
        return [`Resistor: ${val}`];
    }

    getShortcut(): number { return 'r'.charCodeAt(0); }

    draw(g: Graphics): void {
        const hs = 8;
        const v1 = this.volts[0];
        const v2 = this.volts[1];
        const segs = 32;
        this.calcLeads(segs);

        // Voltage-colored leads
        setVoltageColor(g, v1, this);
        drawThickLinePt(g, this.point1, this.lead1);
        setVoltageColor(g, v2, this);
        drawThickLinePt(g, this.lead2, this.point2);

        // Zigzag body between leads (matching Java's exact pattern)
        const len = distance(this.lead1, this.lead2);
        const pts: Point[] = [];
        pts.push({ x: this.lead1.x, y: this.lead1.y });
        for (let i = 0; i < 4; i++) {
            const p1: Point = { x: 0, y: 0 };
            const p2: Point = { x: 0, y: 0 };
            interpPointPerpOut(this.lead1, this.lead2, p1, (1 + 4 * i) / 16, hs);
            interpPointPerpOut(this.lead1, this.lead2, p2, (3 + 4 * i) / 16, -hs);
            pts.push(p1);
            pts.push(p2);
        }
        pts.push({ x: this.lead2.x, y: this.lead2.y });
        g.setLineWidth(3);
        setVoltageColor(g, (v1 + v2) / 2);
        g.drawPolyline(pts.map(p => p.x), pts.map(p => p.y), pts.length);
        g.setLineWidth(1);

        // Values
        const val = this.resistance >= 1000
            ? `${(this.resistance / 1000).toFixed(1)}k`
            : `${this.resistance}`;
        drawValues(g, val, hs + 2, this.point1, this.point2);

        // Posts and current dots
        drawDots(g, this.point1, this.lead1, this.curcount);
        drawDots(g, this.lead2, this.point2, this.curcount);
        drawPost(g, this.point1);
        drawPost(g, this.point2);
    }
}

registerComponent('r'.charCodeAt(0), 'ResistorElm', ResistorComponent);
