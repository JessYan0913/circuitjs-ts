import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics, Point } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import {
    setVoltageColor, drawThickLinePt,
    drawPost, drawDots, drawValues,
} from '../drawutils.js';

/**
 * Center-tapped transformer — 5 terminals.
 * Port of Java TappedTransformerElm.
 *
 * Node arrangement:
 *   0 = primary+    1 = primary-
 *   2 = secondary top
 *   3 = secondary tap (center)
 *   4 = secondary bottom
 *
 * 3 coils: primary (0-1), secondary upper (2-3), secondary lower (3-4)
 */
export class TappedTransformerComponent extends CircuitComponent {
    inductance = 4;
    ratio = 1;
    couplingCoef = 0.99;
    width = 32;

    coilCurrent: number[] = [0, 0, 0];       // 3 coil currents
    coilCurCount: number[] = [0, 0, 0];
    curSourceValue: number[] = [0, 0, 0];
    private a: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0]; // 3x3 matrix
    private useTrapezoidal = true;
    ptEnds: Point[] = [];

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.noDiagonal = true;
    }

    override getDumpType(): number | string { return 169; }

    override handleDumpData(tokens: string[], startIndex: number): void {
        if (tokens.length > startIndex) this.inductance = parseFloat(tokens[startIndex]);
        if (tokens.length > startIndex + 1) this.ratio = parseFloat(tokens[startIndex + 1]);
        if (tokens.length > startIndex + 2) this.coilCurrent[0] = parseFloat(tokens[startIndex + 2]);
        if (tokens.length > startIndex + 3) this.coilCurrent[1] = parseFloat(tokens[startIndex + 3]);
        if (tokens.length > startIndex + 4) this.coilCurrent[2] = parseFloat(tokens[startIndex + 4]);
        if (tokens.length > startIndex + 5) this.couplingCoef = parseFloat(tokens[startIndex + 5]);
    }

    override dump(): string {
        return super.dump() + ` ${this.inductance} ${this.ratio} ${this.coilCurrent[0]} ${this.coilCurrent[1]} ${this.coilCurrent[2]} ${this.couplingCoef}`;
    }

    override getPostCount(): number { return 5; }

    override getPost(n: number): Point {
        return this.ptEnds[n];
    }

    override reset(): void {
        for (let i = 0; i < this.volts.length; i++) this.volts[i] = 0;
        this.coilCurCount = [0, 0, 0];
        this.coilCurrent = [0, 0, 0];
    }

    override setPoints(): void {
        super.setPoints();
        const hs = this.width / 2;
        const pt1 = this.point1;
        const pt2 = this.point2;

        this.ptEnds = [
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 },
        ];

        // Primary (left side): top=0, bottom=1
        this.ptEnds[0] = interpPoint(pt1, pt2, 0, -hs);
        this.ptEnds[1] = interpPoint(pt1, pt2, 0, hs);
        // Secondary (right side): top=2, center=3, bottom=4
        this.ptEnds[2] = interpPoint(pt1, pt2, 1, -hs);
        this.ptEnds[3] = interpPoint(pt1, pt2, 1, 0);
        this.ptEnds[4] = interpPoint(pt1, pt2, 1, hs);
    }

    override stamp(context: StampContext): void {
        if (context.timeStep === 0) {
            context.stampVoltageSource(this.nodes[0], this.nodes[1], this.voltSource, 0);
            return;
        }

        this.useTrapezoidal = context.integrationMethod !== 'backwardEuler';

        // 3x3 impedance matrix
        const l1 = this.inductance;
        const l2 = this.inductance * this.ratio * this.ratio / 4; // half winding
        const m1 = this.couplingCoef * Math.sqrt(l1 * l2);   // mutual between primary and each half
        const m2 = this.couplingCoef * l2 * 0.999;            // mutual between the two halves (tight)

        // Matrix: [l1,  m1, m1; m1, l2, m2; m1, m2, l2]
        const L11 = l1;
        const L12 = m1;
        const L13 = m1;
        const L22 = l2;
        const L23 = m2;
        const L33 = l2;

        const det = L11 * (L22 * L33 - L23 * L23)
                  - L12 * (L12 * L33 - L23 * L13)
                  + L13 * (L12 * L23 - L22 * L13);

        if (Math.abs(det) < 1e-30) return;

        const ts = this.useTrapezoidal ? context.timeStep / 2 : context.timeStep;
        const tsOverDet = ts / det;

        // Inverse matrix coefficients
        // a[0..8] = inverse(L) * ts
        this.a[0] = (L22 * L33 - L23 * L23) * tsOverDet;
        this.a[1] = -(L12 * L33 - L13 * L23) * tsOverDet;
        this.a[2] = (L12 * L23 - L13 * L22) * tsOverDet;
        this.a[3] = this.a[1]; // symmetric
        this.a[4] = (L11 * L33 - L13 * L13) * tsOverDet;
        this.a[5] = -(L11 * L23 - L12 * L13) * tsOverDet;
        this.a[6] = this.a[2]; // symmetric
        this.a[7] = this.a[5]; // symmetric
        this.a[8] = (L11 * L22 - L12 * L12) * tsOverDet;

        // Stamp conductances (diagonals)
        context.stampConductance(this.nodes[0], this.nodes[1], this.a[0]);
        context.stampConductance(this.nodes[2], this.nodes[3], this.a[4]);
        context.stampConductance(this.nodes[3], this.nodes[4], this.a[8]);

        // Stamp VCCS (off-diagonals)
        // Coil 0 (primary) controlled by coil 1 (upper secondary)
        context.stampVCCurrentSource(this.nodes[0], this.nodes[1], this.nodes[2], this.nodes[3], this.a[1]);
        // Coil 0 (primary) controlled by coil 2 (lower secondary)
        context.stampVCCurrentSource(this.nodes[0], this.nodes[1], this.nodes[3], this.nodes[4], this.a[2]);
        // Coil 1 controlled by coil 0
        context.stampVCCurrentSource(this.nodes[2], this.nodes[3], this.nodes[0], this.nodes[1], this.a[3]);
        // Coil 1 controlled by coil 2
        context.stampVCCurrentSource(this.nodes[2], this.nodes[3], this.nodes[3], this.nodes[4], this.a[5]);
        // Coil 2 controlled by coil 0
        context.stampVCCurrentSource(this.nodes[3], this.nodes[4], this.nodes[0], this.nodes[1], this.a[6]);
        // Coil 2 controlled by coil 1
        context.stampVCCurrentSource(this.nodes[3], this.nodes[4], this.nodes[2], this.nodes[3], this.a[7]);

        // Mark RHS changing
        context.markRightSideChanging(this.nodes[0]);
        context.markRightSideChanging(this.nodes[1]);
        context.markRightSideChanging(this.nodes[2]);
        context.markRightSideChanging(this.nodes[3]);
        context.markRightSideChanging(this.nodes[4]);
    }

    override startIteration(): void {
        if (this.a[0] === 0) return;

        const vd = [
            this.volts[0] - this.volts[1],
            this.volts[2] - this.volts[3],
            this.volts[3] - this.volts[4],
        ];

        // Pre-compute voltdiff sums for VCCS contributions
        const a = this.a;
        for (let i = 0; i < 3; i++) {
            if (this.useTrapezoidal) {
                this.curSourceValue[i] = this.coilCurrent[i]
                    + vd[0] * a[i * 3 + 0]
                    + vd[1] * a[i * 3 + 1]
                    + vd[2] * a[i * 3 + 2];
            } else {
                this.curSourceValue[i] = this.coilCurrent[i];
            }
        }
    }

    override doStep(context: StampContext): void {
        if (this.a[0] === 0) return;

        // Stamp current sources for each coil
        context.stampCurrentSource(this.nodes[0], this.nodes[1], this.curSourceValue[0]);
        context.stampCurrentSource(this.nodes[2], this.nodes[3], this.curSourceValue[1]);
        context.stampCurrentSource(this.nodes[3], this.nodes[4], this.curSourceValue[2]);
    }

    override calculateCurrent(): void {
        if (this.a[0] === 0) return;

        const vd = [
            this.volts[0] - this.volts[1],
            this.volts[2] - this.volts[3],
            this.volts[3] - this.volts[4],
        ];

        const a = this.a;
        for (let i = 0; i < 3; i++) {
            this.coilCurrent[i] = this.curSourceValue[i]
                + vd[0] * a[i * 3 + 0]
                + vd[1] * a[i * 3 + 1]
                + vd[2] * a[i * 3 + 2];
        }
    }

    getCurrentIntoNode(n: number): number {
        switch (n) {
            case 0: return -this.coilCurrent[0];
            case 1: return this.coilCurrent[0];
            case 2: return -this.coilCurrent[1];
            case 3: return this.coilCurrent[1] - this.coilCurrent[2];
            case 4: return this.coilCurrent[2];
            default: return 0;
        }
    }

    override getVoltageSourceCount(): number { return 1; }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Primary Inductance (H)', value: this.inductance, min: 0.001, max: 1000 };
        if (n === 1) return { name: 'Turns Ratio (N2/N1)', value: this.ratio, min: 0.001, max: 1000 };
        if (n === 2) return { name: 'Coupling Coefficient', value: this.couplingCoef, min: 0, max: 0.999999 };
        if (n === 3) return { name: 'Trapezoidal Approximation', checkbox: true, checkboxState: this.useTrapezoidal };
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
    }

    override getInfo(): string[] {
        const vd1 = this.volts[0] - this.volts[1];
        const vd2 = this.volts[2] - this.volts[4];
        return [
            'transformer (tapped)',
            `L = ${this.inductance} H`,
            `Ratio = 1:${this.ratio}`,
            `Vd1 = ${vd1.toFixed(3)} V`,
            `Vd2 = ${vd2.toFixed(3)} V`,
        ];
    }

    getConnection(n1: number, _n2: number): boolean {
        // Primary coil: (0,1)
        if ((n1 === 0 || n1 === 1) && (_n2 === 0 || _n2 === 1)) return true;
        // Secondary coil: (2,3), (3,4), (2,4) all connected
        if (n1 >= 2 && n1 <= 4 && _n2 >= 2 && _n2 <= 4) return true;
        return false;
    }

    override draw(g: Graphics): void {
        const hs = this.width / 2;
        this.calcLeads(this.width);

        // Draw primary coil
        setVoltageColor(g, this.volts[0], this);
        drawThickLinePt(g, this.point1, this.ptEnds[0]);

        // Draw secondary connections
        setVoltageColor(g, this.volts[2], this);
        drawThickLinePt(g, this.point2, this.ptEnds[2]);
        setVoltageColor(g, this.volts[3], this);
        drawThickLinePt(g, this.ptEnds[3], this.ptEnds[3]); // tap point

        // Coil symbols
        const midX = (this.point1.x + this.point2.x) / 2;
        const midY = (this.point1.y + this.point2.y) / 2;

        g.setColor(this.needsHighlight() ? '#00FFFF' : '#808080');
        g.setLineWidth(2);

        // Primary coil curves
        const coils = 3;
        const coilW = hs * 0.5;
        for (let i = 0; i < coils; i++) {
            const frac = (i + 0.5) / coils;
            const x = this.point1.x + (midX - this.point1.x) * frac * 2;
            g.drawLine(x, midY - coilW, x, midY + coilW);
        }

        // Secondary upper coils
        for (let i = 0; i < coils; i++) {
            const frac = (i + 0.5) / coils;
            const x = midX + (this.point2.x - midX) * frac * 2;
            g.drawLine(x, midY - hs * 0.5, x, midY - 2);
        }

        // Secondary lower coils
        for (let i = 0; i < coils; i++) {
            const frac = (i + 0.5) / coils;
            const x = midX + (this.point2.x - midX) * frac * 2;
            g.drawLine(x, midY + 2, x, midY + hs * 0.5);
        }

        // Core lines
        g.setLineWidth(1);
        g.setColor('#808080');
        const coreX1 = this.point1.x + (midX - this.point1.x) * 0.7;
        const coreX2 = midX + (this.point2.x - midX) * 0.7;
        g.drawLine(coreX1, midY - hs, coreX1, midY + hs);
        g.drawLine(coreX2, midY - hs, coreX2, midY + hs);

        // Current dots
        drawDots(g, this.point1, this.ptEnds[0], this.coilCurCount[0]);
        drawDots(g, this.point2, this.ptEnds[2], this.coilCurCount[1]);

        // Posts
        for (let i = 0; i < 5; i++) {
            drawPost(g, this.ptEnds[i]);
        }

        drawValues(g, `${this.inductance}H 1:${this.ratio}`, 10, this.point1, this.point2);
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

registerComponent(169, 'TappedTransformerElm', TappedTransformerComponent);
