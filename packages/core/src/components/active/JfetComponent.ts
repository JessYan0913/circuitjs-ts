import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { DiodeModel } from './DiodeModel.js';
import { interpPoint, interpPoint2 } from '../drawutils.js';

/**
 * JFET (N-Channel / P-Channel).
 * Port of Java JfetElm (dump type 'j')
 * Extends MOSFET's Shichman-Hodges model with gate diode.
 */
export class JfetComponent extends CircuitComponent {
    pnp = 1; // +1 for N-Channel, -1 for P-Channel

    thresholdVoltage = -4;  // Vt (negative for N-JFET)
    beta = 0.00125;         // transconductance

    private diode = new DiodeModel();
    private gateCurrent = 0;

    // MOSFET-like internals
    private lastv1 = 0;
    private lastv2 = 0;
    private lastv0 = 0;
    private ids = 0;
    private gm = 0;
    mode = 0;

    // Drawing
    private src: { x: number; y: number }[] = [];
    private drn: { x: number; y: number }[] = [];
    private gatePt = { x: 0, y: 0 };
    private arrowPoly: { npoints: number; xpoints: number[]; ypoints: number[] } = { npoints: 0, xpoints: [], ypoints: [] };
    private gatePoly: { npoints: number; xpoints: number[]; ypoints: number[] } = { npoints: 0, xpoints: [], ypoints: [] };

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.noDiagonal = true;
    }

    getDumpType(): number | string { return 'j'; }
    nonLinear(): boolean { return true; }
    getPostCount(): number { return 3; }

    getPost(n: number): { x: number; y: number } {
        if (n === 0) return this.point1;
        if (n === 1) return this.src[0];
        if (n === 2) return this.drn[0];
        return { x: 0, y: 0 };
    }

    isPNP(): boolean { return this.pnp === -1; }

    handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.thresholdVoltage = parseFloat(tokens[start]) || -4;
        if (tokens.length > start + 1) this.beta = parseFloat(tokens[start + 1]) || 0.00125;
    }

    reset(): void {
        this.lastv1 = this.lastv2 = this.lastv0 = 0;
        for (let i = 0; i < this.volts.length; i++) this.volts[i] = 0;
        this.curcount = 0;
        this.diode.reset();
        this.gateCurrent = 0;
    }

    // ----- Stamping -----
    stamp(context: StampContext): void {
        context.stampNonLinear(this.nodes[1]);
        context.stampNonLinear(this.nodes[2]);

        // Gate diode
        if (this.pnp < 0) {
            // P-JFET: diode from source (1) to gate (0)
            context.stampNonLinear(this.nodes[0]);
        } else {
            // N-JFET: diode from gate (0) to source (1)
            context.stampNonLinear(this.nodes[0]);
        }
    }

    doStep(context: StampContext): void {
        // Convergence and voltage limit (from Mosfet.calculate)
        let vs = [this.volts[0], this.volts[1], this.volts[2]];
        if (vs[1] > this.lastv1 + 0.5) vs[1] = this.lastv1 + 0.5;
        if (vs[1] < this.lastv1 - 0.5) vs[1] = this.lastv1 - 0.5;
        if (vs[2] > this.lastv2 + 0.5) vs[2] = this.lastv2 + 0.5;
        if (vs[2] < this.lastv2 - 0.5) vs[2] = this.lastv2 - 0.5;

        if (Math.abs(this.lastv1 - vs[1]) > 0.01 ||
            Math.abs(this.lastv2 - vs[2]) > 0.01 ||
            Math.abs(this.lastv0 - vs[0]) > 0.01) {
            context.setConverged(false);
        }
        this.lastv0 = vs[0];
        this.lastv1 = vs[1];
        this.lastv2 = vs[2];

        let source = 1;
        let drain = 2;

        if (this.pnp * vs[1] > this.pnp * vs[2]) {
            source = 2;
            drain = 1;
        }

        const vgs = vs[0] - vs[source];
        const vds = vs[drain] - vs[source];
        const pnpVgs = vgs * this.pnp;
        const pnpVds = vds * this.pnp;

        this.ids = 0;
        this.gm = 0;
        let Gds = 0;

        if (pnpVgs < this.thresholdVoltage) {
            // Should be all zero, but that causes singular matrix
            Gds = 1e-8;
            this.ids = pnpVds * Gds;
            this.mode = 0;
        } else if (pnpVds < pnpVgs - this.thresholdVoltage) {
            // Linear
            this.ids = this.beta * ((pnpVgs - this.thresholdVoltage) * pnpVds - pnpVds * pnpVds * 0.5);
            this.gm = this.beta * pnpVds;
            Gds = this.beta * (pnpVgs - pnpVds - this.thresholdVoltage);
            this.mode = 1;
        } else {
            // Saturation
            this.gm = this.beta * (pnpVgs - this.thresholdVoltage);
            Gds = 1e-8;
            this.ids = 0.5 * this.beta * (pnpVgs - this.thresholdVoltage) * (pnpVgs - this.thresholdVoltage) +
                (pnpVds - (pnpVgs - this.thresholdVoltage)) * Gds;
            this.mode = 2;
        }

        // Gate diode
        this.diode.doStep(this.pnp * (vs[0] - vs[1]), context, this.nodes[0], this.nodes[1], 0);
        this.gateCurrent = this.pnp * this.diode.getCurrent(this.pnp * (vs[0] - vs[1]));

        const ids0 = this.ids;
        if ((source === 2 && this.pnp === 1) || (source === 1 && this.pnp === -1)) {
            this.ids = -this.ids;
        }

        const rs = -this.pnp * ids0 + Gds * vds + this.gm * vgs;

        context.stampMatrix(this.nodes[drain], this.nodes[drain], Gds);
        context.stampMatrix(this.nodes[drain], this.nodes[source], -Gds - this.gm);
        context.stampMatrix(this.nodes[drain], this.nodes[0], this.gm);

        context.stampMatrix(this.nodes[source], this.nodes[drain], -Gds);
        context.stampMatrix(this.nodes[source], this.nodes[source], Gds + this.gm);
        context.stampMatrix(this.nodes[source], this.nodes[0], -this.gm);

        context.stampRightSide(this.nodes[drain], rs);
        context.stampRightSide(this.nodes[source], -rs);
    }

    calculateCurrent(): void {
        this.gateCurrent = this.pnp * this.diode.getCurrent(this.pnp * (this.volts[0] - this.volts[1]));
    }

    getCurrent(): number { return this.ids; }

    getCurrentIntoNode(n: number): number {
        if (n === 0) return -this.gateCurrent;
        if (n === 1) return this.gateCurrent + this.ids;
        return -this.ids;
    }

    getConnection(n1: number, n2: number): boolean {
        return true;
    }

    // ----- Drawing -----
    setPoints(): void {
        super.setPoints();
        const hs = 16;
        const hs2 = hs * this.dsign;

        this.src = new Array(3);
        this.drn = new Array(3);
        for (let i = 0; i < 3; i++) {
            this.src[i] = { x: 0, y: 0 };
            this.drn[i] = { x: 0, y: 0 };
        }

        interpPoint2(this.point1, this.point2, this.src[0], this.drn[0], 1, -hs2);
        interpPoint2(this.point1, this.point2, this.src[1], this.drn[1], 1, -hs2 / 2);
        interpPoint2(this.point1, this.point2, this.src[2], this.drn[2], 1 - 10 / this.dn, -hs2 / 2);

        this.gatePt = interpPoint(this.point1, this.point2, 1 - 14 / this.dn);

        // Gate polygon (vertical bar)
        const ra = new Array(4);
        for (let i = 0; i < 4; i++) ra[i] = { x: 0, y: 0 };
        interpPoint2(this.point1, this.point2, ra[0], ra[1], 1 - 13 / this.dn, hs);
        interpPoint2(this.point1, this.point2, ra[2], ra[3], 1 - 10 / this.dn, hs);
        this.gatePoly = {
            npoints: 4,
            xpoints: [ra[0].x, ra[1].x, ra[3].x, ra[2].x],
            ypoints: [ra[0].y, ra[1].y, ra[3].y, ra[2].y],
        };

        if (this.pnp === -1) {
            const x = interpPoint(this.gatePt, this.point1, 18 / this.dn);
            this.arrowPoly = this.calcArrow(this.gatePt, x, 8, 3);
        } else {
            this.arrowPoly = this.calcArrow(this.point1, this.gatePt, 8, 3);
        }
    }

    draw(g: Graphics): void {
        const hs = 16;
        this.setBboxPts(this.point1, this.point2, hs);

        // Source
        this.setVoltageColor(g, this.volts[1]);
        CircuitComponent.drawThickLine(g, this.src[0], this.src[1]);
        CircuitComponent.drawThickLine(g, this.src[1], this.src[2]);

        // Drain
        this.setVoltageColor(g, this.volts[2]);
        CircuitComponent.drawThickLine(g, this.drn[0], this.drn[1]);
        CircuitComponent.drawThickLine(g, this.drn[1], this.drn[2]);

        // Gate
        this.setVoltageColor(g, this.volts[0]);
        CircuitComponent.drawThickLine(g, this.point1, this.gatePt);

        // Arrow
        CircuitComponent.fillPolygon(g, this.arrowPoly);

        // Gate bar
        CircuitComponent.fillPolygon(g, this.gatePoly);

        // Current dots
        this.drawDots(g, this.src[0], this.src[1], this.curcount);
        this.drawDots(g, this.src[1], this.src[2], this.curcount + 8);
        this.drawDots(g, this.drn[0], this.drn[1], -this.curcount);
        this.drawDots(g, this.drn[1], this.drn[2], -(this.curcount + 8));
        this.drawDots(g, this.point1, this.gatePt, 0);

        // Posts
        g.setColor('#FFFFFF');
        g.fillOval(this.point1.x - 3, this.point1.y - 3, 7, 7);
        g.fillOval(this.src[0].x - 3, this.src[0].y - 3, 7, 7);
        g.fillOval(this.drn[0].x - 3, this.drn[0].y - 3, 7, 7);
    }

    getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Threshold Voltage (Vt)', value: this.pnp * this.thresholdVoltage, min: -10, max: 0 };
        if (n === 1) return { name: 'Beta', value: this.beta, min: 0.0001, max: 1 };
        return null;
    }

    setEditValue(_n: number, ei: EditInfo): void {
        if (ei.value !== undefined) {
            if (_n === 0) this.thresholdVoltage = this.pnp * ei.value;
            if (_n === 1 && ei.value > 0) this.beta = ei.value;
        }
    }

    getInfo(): string[] {
        const prefix = this.pnp === -1 ? 'P' : 'N';
        return [
            `${prefix}-JFET (Vt=${(this.pnp * this.thresholdVoltage).toFixed(2)})`,
            `Ids = ${this.ids.toExponential(2)} A`,
            `Vgs = ${(this.volts[0] - this.volts[1]).toFixed(3)} V`,
            `Vds = ${(this.volts[2] - this.volts[1]).toFixed(3)} V`,
            this.mode === 0 ? 'off' : this.mode === 1 ? 'linear' : 'saturation',
        ];
    }
}

export class NJfetComponent extends JfetComponent {
    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.pnp = 1;
    }
}

export class PJfetComponent extends JfetComponent {
    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.pnp = -1;
    }
}

registerComponent('j'.charCodeAt(0), 'JfetElm', JfetComponent);
registerComponent('j'.charCodeAt(0), 'NJfetElm', JfetComponent);
registerComponent('j'.charCodeAt(0), 'PJfetElm', JfetComponent);
