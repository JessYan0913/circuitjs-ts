import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { interpPoint, interpPointPerp, interpPoint2 } from '../drawutils.js';

/**
 * Ideal operational amplifier.
 * Port of Java OpAmpElm (dump type 'a')
 *
 * Post layout: 0 = inverting input (-), 1 = non-inverting input (+), 2 = output
 */
export class OpAmpComponent extends CircuitComponent {
    maxOut = 15;
    minOut = -15;
    gain = 100000;
    gbw = 1e6;

    private lastVd = 0;

    // Drawing geometry
    private opheight = 16;
    private opwidth = 26;
    private in1p: { x: number; y: number }[] = [];
    private in2p: { x: number; y: number }[] = [];
    private textp: { x: number; y: number }[] = [];
    private triangle: { npoints: number; xpoints: number[]; ypoints: number[] } = { npoints: 0, xpoints: [], ypoints: [] };

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.noDiagonal = true;
        this.flags |= 8; // FLAG_GAIN
    }

    getDumpType(): number | string { return 'a'; }
    nonLinear(): boolean { return true; }
    getPostCount(): number { return 3; }
    getVoltageSourceCount(): number { return 1; }

    getPost(n: number): { x: number; y: number } {
        if (n === 0) return this.in1p[0];
        if (n === 1) return this.in2p[0];
        return this.point2;
    }

    hasGroundConnection(n1: number): boolean {
        return n1 === 2;
    }

    getConnection(n1: number, n2: number): boolean {
        return false;
    }

    getVoltageDiff(): number {
        return this.volts[2] - this.volts[1];
    }

    getPower(): number {
        return this.volts[2] * this.current;
    }

    getCurrentIntoNode(n: number): number {
        if (n === 2) return -this.current;
        return 0;
    }

    stamp(context: StampContext): void {
        const vn = context.getVoltageSourceRow(this.voltSource); // 1-based
        context.stampNonLinear(vn);
        // Stamping at (node[2] row, vn col) in the MNA matrix
        context.stampMatrix(this.nodes[2], vn, 1);
    }

    doStep(context: StampContext): void {
        const vd = this.volts[1] - this.volts[0];
        if (Math.abs(this.lastVd - vd) > 0.1) {
            context.setConverged(false);
        } else if (this.volts[2] > this.maxOut + 0.1 || this.volts[2] < this.minOut - 0.1) {
            context.setConverged(false);
        }

        let x = 0;
        const vn = context.getVoltageSourceRow(this.voltSource); // 1-based
        let dx = 0;

        if (vd >= this.maxOut / this.gain && (this.lastVd >= 0)) {
            dx = 1e-4;
            x = this.maxOut - dx * this.maxOut / this.gain;
        } else if (vd <= this.minOut / this.gain && (this.lastVd <= 0)) {
            dx = 1e-4;
            x = this.minOut - dx * this.minOut / this.gain;
        } else {
            dx = this.gain;
        }

        // Stamp the Newton-Raphson linearization (matches Java exactly)
        // stampMatrix/addValue expect 1-based row/col
        context.stampMatrix(vn, this.nodes[0], dx);
        context.stampMatrix(vn, this.nodes[1], -dx);
        context.stampMatrix(vn, this.nodes[2], 1);
        context.stampRightSide(vn, x);

        this.lastVd = vd;
    }

    setPoints(): void {
        super.setPoints();
        this.calcLeads(this.opwidth * 2);

        const hs = this.opheight * this.dsign;
        const sw = (this.flags & 1) !== 0 ? -hs : hs; // FLAG_SWAP

        this.in1p = [
            interpPointPerp(this.point1, this.point2, 0, sw),
            interpPointPerp(this.lead1, this.lead2, 0, sw),
        ];
        this.in2p = [
            interpPointPerp(this.point1, this.point2, 0, -sw),
            interpPointPerp(this.lead1, this.lead2, 0, -sw),
        ];
        this.textp = [
            interpPointPerp(this.lead1, this.lead2, 0.2, sw),
            interpPointPerp(this.lead1, this.lead2, 0.2, -sw),
        ];
        const tris = [
            interpPointPerp(this.lead1, this.lead2, 0, sw * 2),
            interpPointPerp(this.lead1, this.lead2, 0, -sw * 2),
        ];
        this.triangle = {
            npoints: 3,
            xpoints: [tris[0].x, tris[1].x, this.lead2.x],
            ypoints: [tris[0].y, tris[1].y, this.lead2.y],
        };
    }

    draw(g: Graphics): void {
        this.setBboxPts(this.point1, this.point2, this.opheight * 2);

        this.setVoltageColor(g, this.volts[0]);
        CircuitComponent.drawThickLine(g, this.in1p[0], this.in1p[1]);
        this.setVoltageColor(g, this.volts[1]);
        CircuitComponent.drawThickLine(g, this.in2p[0], this.in2p[1]);
        this.setVoltageColor(g, this.volts[2]);
        CircuitComponent.drawThickLine(g, this.lead2, this.point2);

        g.setColor(this.needsHighlight() ? '#00FFFF' : '#C0C0C0');
        g.setLineWidth(2);
        g.drawPolygon(this.triangle.xpoints, this.triangle.ypoints, this.triangle.npoints);

        // Draw - and + labels
        g.setFontSize(14);
        g.textAlign('center');
        g.textBaseline('middle');
        g.setColor('#FFFFFF');
        g.drawString('-', this.textp[0].x, this.textp[0].y - 2);
        g.drawString('+', this.textp[1].x, this.textp[1].y);

        // Current dots on output
        this.drawDots(g, this.point2, this.lead2, this.curcount);

        // Posts
        g.setColor('#FFFFFF');
        g.fillOval(this.in1p[0].x - 3, this.in1p[0].y - 3, 7, 7);
        g.fillOval(this.in2p[0].x - 3, this.in2p[0].y - 3, 7, 7);
        g.fillOval(this.point2.x - 3, this.point2.y - 3, 7, 7);
    }

    getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Max Output (V)', value: this.maxOut, min: 1, max: 20 };
        if (n === 1) return { name: 'Min Output (V)', value: this.minOut, min: -20, max: 0 };
        if (n === 2) return { name: 'Gain', value: this.gain, min: 10, max: 1000000 };
        return null;
    }

    setEditValue(_n: number, ei: EditInfo): void {
        if (ei.value !== undefined) {
            if (_n === 0) this.maxOut = ei.value;
            if (_n === 1) this.minOut = ei.value;
            if (_n === 2 && ei.value > 0) this.gain = ei.value;
        }
    }

    getInfo(): string[] {
        const vo = Math.max(Math.min(this.volts[2], this.maxOut), this.minOut);
        return [
            'op-amp',
            `V+ = ${this.volts[1].toFixed(2)} V`,
            `V- = ${this.volts[0].toFixed(2)} V`,
            `Vout = ${vo.toFixed(2)} V`,
            `Iout = ${(-this.current).toExponential(2)} A`,
            `range = ${this.minOut.toFixed(1)} to ${this.maxOut.toFixed(1)} V`,
        ];
    }

    getShortcut(): number { return 'a'.charCodeAt(0); }
}

registerComponent('a'.charCodeAt(0), 'OpAmpElm', OpAmpComponent);
