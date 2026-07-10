import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics, Point } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import {
    setVoltageColor, drawThickLinePt,
    drawPost, drawDots, drawValues,
} from '../drawutils.js';

/**
 * Transformer — mutual inductance with 4 terminals.
 * Port of Java TransformerElm.
 *
 * Node arrangement:
 *   0 = primary+    1 = secondary+
 *   2 = primary-    3 = secondary-
 */
export class TransformerComponent extends CircuitComponent {
    inductance = 4;        // primary inductance (Henries)
    ratio = 1;             // turns ratio (secondary/primary)
    couplingCoef = 0.999;  // coupling coefficient K
    width = 32;

    coilCurrent: number[] = [0, 0];
    coilCurCount: number[] = [0, 0];

    // Companion model coefficients
    private a1 = 0;
    private a2 = 0;
    private a3 = 0;
    private a4 = 0;
    curSourceValue1 = 0;
    curSourceValue2 = 0;
    private useTrapezoidal = true;
    private voltSource1 = -1;
    private voltSource2 = -1;

    ptEnds: Point[] = [];

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.noDiagonal = true;
    }

    override getDumpType(): number | string { return 'T'; }

    override handleDumpData(tokens: string[], startIndex: number): void {
        if (tokens.length > startIndex) {
            this.inductance = parseFloat(tokens[startIndex]);
        }
        if (tokens.length > startIndex + 1) {
            this.ratio = parseFloat(tokens[startIndex + 1]);
        }
        if (tokens.length > startIndex + 2) {
            this.coilCurrent[0] = parseFloat(tokens[startIndex + 2]);
        }
        if (tokens.length > startIndex + 3) {
            this.coilCurrent[1] = parseFloat(tokens[startIndex + 3]);
        }
        if (tokens.length > startIndex + 4) {
            this.couplingCoef = parseFloat(tokens[startIndex + 4]);
        }
    }

    override dump(): string {
        return super.dump() + ` ${this.inductance} ${this.ratio} ${this.coilCurrent[0]} ${this.coilCurrent[1]} ${this.couplingCoef}`;
    }

    override getPostCount(): number { return 4; }

    override getPost(n: number): Point {
        return this.ptEnds[n];
    }

    override reset(): void {
        for (let i = 0; i < this.volts.length; i++) this.volts[i] = 0;
        this.coilCurCount[0] = 0;
        this.coilCurCount[1] = 0;
        this.coilCurrent[0] = 0;
        this.coilCurrent[1] = 0;
    }

    override setPoints(): void {
        super.setPoints();
        const hs = this.width / 2;
        const pt2 = this.point2;
        const pt1 = this.point1;

        // Create 4 posts for the transformer
        this.ptEnds = [
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 },
        ];
        // Primary side (posts 0, 2)
        this.ptEnds[0] = interpPoint(pt1, pt2, 0, -hs);
        this.ptEnds[2] = interpPoint(pt1, pt2, 0, hs);
        // Secondary side (posts 1, 3)
        this.ptEnds[1] = interpPoint(pt1, pt2, 1, -hs);
        this.ptEnds[3] = interpPoint(pt1, pt2, 1, hs);
    }

    override stamp(context: StampContext): void {
        if (context.timeStep === 0) {
            // DC operating point — stamp voltage sources
            context.stampVoltageSource(this.nodes[0], this.nodes[2], this.voltSource1, 0);
            context.stampVoltageSource(this.nodes[1], this.nodes[3], this.voltSource2, 0);
            return;
        }

        this.useTrapezoidal = context.integrationMethod !== 'backwardEuler';

        const l1 = this.inductance;
        const l2 = this.inductance * this.ratio * this.ratio;
        const m = this.couplingCoef * Math.sqrt(l1 * l2);

        // Impedance matrix: [l1, m; m, l2]
        const det = l1 * l2 - m * m;
        if (Math.abs(det) < 1e-30) return;

        // Inverse of impedance matrix * timeStep
        const ts = this.useTrapezoidal ? context.timeStep / 2 : context.timeStep;
        this.a1 = (l2 / det) * ts;
        this.a2 = (-m / det) * ts;
        this.a3 = (-m / det) * ts;
        this.a4 = (l1 / det) * ts;

        // Stamp conductances and VCCS
        context.stampConductance(this.nodes[0], this.nodes[2], this.a1);
        context.stampVCCurrentSource(this.nodes[0], this.nodes[2], this.nodes[1], this.nodes[3], this.a2);
        context.stampVCCurrentSource(this.nodes[1], this.nodes[3], this.nodes[0], this.nodes[2], this.a3);
        context.stampConductance(this.nodes[1], this.nodes[3], this.a4);

        context.markRightSideChanging(this.nodes[0]);
        context.markRightSideChanging(this.nodes[2]);
        context.markRightSideChanging(this.nodes[1]);
        context.markRightSideChanging(this.nodes[3]);
    }

    override startIteration(): void {
        if (this.a1 === 0) return;

        const vd1 = this.volts[0] - this.volts[2];
        const vd2 = this.volts[1] - this.volts[3];

        if (this.useTrapezoidal) {
            this.curSourceValue1 = vd1 * this.a1 + vd2 * this.a2 + this.coilCurrent[0];
            this.curSourceValue2 = vd1 * this.a3 + vd2 * this.a4 + this.coilCurrent[1];
        } else {
            this.curSourceValue1 = this.coilCurrent[0];
            this.curSourceValue2 = this.coilCurrent[1];
        }
    }

    override doStep(context: StampContext): void {
        if (this.a1 === 0) return;

        context.stampCurrentSource(this.nodes[0], this.nodes[2], this.curSourceValue1);
        context.stampCurrentSource(this.nodes[1], this.nodes[3], this.curSourceValue2);
    }

    override calculateCurrent(): void {
        if (this.a1 === 0) return;

        const vd1 = this.volts[0] - this.volts[2];
        const vd2 = this.volts[1] - this.volts[3];

        this.coilCurrent[0] = vd1 * this.a1 + vd2 * this.a2 + this.curSourceValue1;
        this.coilCurrent[1] = vd1 * this.a3 + vd2 * this.a4 + this.curSourceValue2;
    }

    override getCurrentIntoNode(n: number): number {
        if (n < 2) return -this.coilCurrent[n];
        return this.coilCurrent[n - 2];
    }

    override setVoltageSource(n: number, v: number): void {
        if (n === 0) this.voltSource1 = v;
        else this.voltSource2 = v;
    }

    override getVoltageSourceCount(): number { return 2; }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Primary Inductance (H)', value: this.inductance, min: 0.001, max: 1000 };
        if (n === 1) return { name: 'Turns Ratio (N2/N1)', value: this.ratio, min: 0.001, max: 1000 };
        if (n === 2) return { name: 'Coupling Coefficient', value: this.couplingCoef, min: 0, max: 0.999999 };
        if (n === 3) return { name: 'Trapezoidal Approximation', checkbox: true, checkboxState: this.useTrapezoidal };
        if (n === 4) return { name: 'Swap Secondary Polarity', checkbox: true, checkboxState: (this.flags & 4) !== 0 };
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (ei.value !== undefined) {
            if (_n === 0) this.inductance = ei.value;
            if (_n === 1) this.ratio = ei.value;
            if (_n === 2) this.couplingCoef = ei.value;
        }
        if (_n === 3 && ei.checkboxState !== undefined) {
            this.useTrapezoidal = ei.checkboxState;
        }
        if (_n === 4) {
            if (ei.checkboxState !== undefined) {
                if (ei.checkboxState) this.flags |= 4;
                else this.flags &= ~4;
            }
        }
    }

    override getInfo(): string[] {
        const vd1 = this.volts[0] - this.volts[2];
        const vd2 = this.volts[1] - this.volts[3];
        return [
            'transformer',
            `L = ${this.inductance} H`,
            `Ratio = 1:${this.ratio}`,
            `Vd1 = ${vd1.toFixed(3)} V`,
            `Vd2 = ${vd2.toFixed(3)} V`,
            `I1 = ${(this.coilCurrent[0] * 1000).toFixed(2)} mA`,
            `I2 = ${(this.coilCurrent[1] * 1000).toFixed(2)} mA`,
        ];
    }

    override getShortcut(): number { return 'T'.charCodeAt(0); }

    getConnection(n1: number, _n2: number): boolean {
        if (n1 === 0 || n1 === 2) return (_n2 === 0 || _n2 === 2);
        if (n1 === 1 || n1 === 3) return (_n2 === 1 || _n2 === 3);
        return false;
    }

    override draw(g: Graphics): void {
        const v1 = this.volts[0];
        const v2 = this.volts[1];
        const hs = this.width / 2;

        this.calcLeads(this.width);

        // Draw primary coil (left side)
        setVoltageColor(g, v1, this);
        drawThickLinePt(g, this.point1, interpPoint(this.point1, this.point2, 0, -hs));

        // Draw secondary coil (right side)
        setVoltageColor(g, v2, this);
        drawThickLinePt(g, this.point2, interpPoint(this.point1, this.point2, 1, -hs));

        // Coil symbols
        const midX = (this.point1.x + this.point2.x) / 2;
        const midY = (this.point1.y + this.point2.y) / 2;

        g.setColor(this.needsHighlight() ? '#00FFFF' : '#808080');
        g.setLineWidth(2);

        // Primary coil curve
        const coils = 4;
        const coilW = hs * 0.6;
        for (let i = 0; i < coils; i++) {
            const frac = (i + 0.5) / coils;
            const x = this.point1.x + (midX - this.point1.x) * frac * 2;
            const y1 = midY - coilW;
            const y2 = midY + coilW;
            g.drawLine(x, y1, x, y2);
        }

        // Secondary coil curve
        for (let i = 0; i < coils; i++) {
            const frac = (i + 0.5) / coils;
            const x = midX + (this.point2.x - midX) * frac * 2;
            const y1 = midY - coilW;
            const y2 = midY + coilW;
            g.drawLine(x, y1, x, y2);
        }

        // Core (vertical lines between coils)
        g.setLineWidth(1);
        g.setColor('#808080');
        const coreX1 = this.point1.x + (midX - this.point1.x) * 0.7;
        const coreX2 = midX + (this.point2.x - midX) * 0.7;
        g.drawLine(coreX1, midY - hs, coreX1, midY + hs);
        g.drawLine(coreX2, midY - hs, coreX2, midY + hs);

        // Voltage dots
        drawDots(g, this.point1, interpPoint(this.point1, this.point2, 0, -hs), this.coilCurCount[0]);
        drawDots(g, this.point2, interpPoint(this.point1, this.point2, 1, -hs), this.coilCurCount[1]);

        // Posts
        for (let i = 0; i < 4; i++) {
            drawPost(g, this.ptEnds[i]);
        }

        const val = `${this.inductance}H 1:${this.ratio}`;
        drawValues(g, val, 10, this.point1, this.point2);
    }
}

function interpPoint(a: Point, b: Point, f: number, perpOffset = 0): Point {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const px = a.x * (1 - f) + b.x * f;
    const py = a.y * (1 - f) + b.y * f;
    if (perpOffset !== 0 && len > 0) {
        const nx = -dy / len;
        const ny = dx / len;
        return { x: Math.round(px + nx * perpOffset), y: Math.round(py + ny * perpOffset) };
    }
    return { x: Math.round(px), y: Math.round(py) };
}

registerComponent('T'.charCodeAt(0), 'TransformerElm', TransformerComponent);
