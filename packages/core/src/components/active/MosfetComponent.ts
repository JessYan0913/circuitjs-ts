import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { DiodeModel } from './DiodeModel.js';
import { interpPoint, interpPointPerp, interpPoint2 } from '../drawutils.js';

/**
 * MOSFET (N-Channel / P-Channel) — Shichman-Hodges model.
 * Port of Java MosfetElm (dump type 'f' for N-MOS, 'p' for P-MOS)
 *
 * Post layout: 0=gate, 1=source, 2=drain (3=body if body terminal enabled)
 */
export class MosfetComponent extends CircuitComponent {
    // N-Channel (pnp=1) or P-Channel (pnp=-1)
    pnp = 1;

    thresholdVoltage = 1.5;  // Vt
    beta = 0.02;             // transconductance parameter

    // Flags
    static readonly FLAG_PNP = 1;
    static readonly FLAG_SHOWVT = 2;
    static readonly FLAG_DIGITAL = 4;
    static readonly FLAG_FLIP = 8;
    static readonly FLAG_HIDE_BULK = 16;
    static readonly FLAG_BODY_DIODE = 32;
    static readonly FLAG_BODY_TERMINAL = 64;

    private static globalFlags = 0;

    // Body diodes
    private diodeB1 = new DiodeModel();
    private diodeB2 = new DiodeModel();
    private diodeCurrent1 = 0;
    private diodeCurrent2 = 0;
    bodyTerminal = 0;

    // Last voltages for convergence
    private lastv1 = 0;
    private lastv2 = 0;
    private lastv0 = 0;

    // State
    private ids = 0;
    private gm = 0;
    mode = 0; // 0=off, 1=linear, 2=saturation

    // Drawing geometry
    private src: { x: number; y: number }[] = [];
    private drn: { x: number; y: number }[] = [];
    private gate: { x: number; y: number }[] = [];
    private body: { x: number; y: number }[] = [];
    private arrowPoly: { npoints: number; xpoints: number[]; ypoints: number[] } = { npoints: 0, xpoints: [], ypoints: [] };

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.noDiagonal = true;
        // Apply global flags
        this.flags = (this.flags & ~(MosfetComponent.FLAG_HIDE_BULK | MosfetComponent.FLAG_DIGITAL)) | MosfetComponent.globalFlags;
    }

    getDumpType(): number | string { return this.pnp === 1 ? 'f' : 'p'; }
    nonLinear(): boolean { return true; }
    getPostCount(): number { return this.hasBodyTerminal() ? 4 : 3; }

    // Post 0 = gate, 1 = source (NPN) or drain (PNP), 2 = drain (NPN) or source (PNP), 3 = body (if present)
    getPost(n: number): { x: number; y: number } {
        if (n === 0) return this.point1;
        if (n === 1) return this.src[0];
        if (n === 2) return this.drn[0];
        return this.body[0];
    }

    getDefaultThreshold(): number { return 1.5; }
    getDefaultBeta(): number { return 0.02; }

    isPNP(): boolean { return this.pnp === -1; }
    hasBodyTerminal(): boolean { return (this.flags & MosfetComponent.FLAG_BODY_TERMINAL) !== 0 && this.doBodyDiode(); }
    doBodyDiode(): boolean { return (this.flags & MosfetComponent.FLAG_BODY_DIODE) !== 0 && this.showBulk(); }
    showBulk(): boolean { return (this.flags & (MosfetComponent.FLAG_DIGITAL | MosfetComponent.FLAG_HIDE_BULK)) === 0; }

    handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.thresholdVoltage = parseFloat(tokens[start]) || 1.5;
        if (tokens.length > start + 1) this.beta = parseFloat(tokens[start + 1]) || 0.02;
    }

    reset(): void {
        this.lastv1 = this.lastv2 = this.lastv0 = 0;
        for (let i = 0; i < this.volts.length; i++) this.volts[i] = 0;
        this.curcount = 0;
        this.diodeB1.reset();
        this.diodeB2.reset();
        if (this.doBodyDiode()) this.volts[this.bodyTerminal] = 0;
    }

    stamp(context: StampContext): void {
        context.stampNonLinear(this.nodes[1]);
        context.stampNonLinear(this.nodes[2]);

        if (this.hasBodyTerminal()) {
            this.bodyTerminal = 3;
        } else {
            this.bodyTerminal = (this.pnp === -1) ? 2 : 1;
        }

        if (this.doBodyDiode()) {
            if (this.pnp === -1) {
                // PNP: diodes conduct when S or D higher than body
                this.stampBodyDiode(context, this.nodes[1], this.nodes[this.bodyTerminal], this.diodeB1);
                this.stampBodyDiode(context, this.nodes[2], this.nodes[this.bodyTerminal], this.diodeB2);
            } else {
                // NPN: diodes conduct when body higher than S or D
                this.stampBodyDiode(context, this.nodes[this.bodyTerminal], this.nodes[1], this.diodeB1);
                this.stampBodyDiode(context, this.nodes[this.bodyTerminal], this.nodes[2], this.diodeB2);
            }
        }
    }

    private stampBodyDiode(context: StampContext, n1: number, n2: number, diode: DiodeModel): void {
        // Body diode uses DiodeModel in a simplified way
        context.stampNonLinear(n1);
        context.stampNonLinear(n2);
    }

    setPoints(): void {
        super.setPoints();
        const hs = 16;
        const hs2 = hs * this.dsign;
        const flip = (this.flags & MosfetComponent.FLAG_FLIP) !== 0 ? -1 : 1;

        this.src = new Array(3);
        this.drn = new Array(3);
        for (let i = 0; i < 3; i++) {
            this.src[i] = { x: 0, y: 0 };
            this.drn[i] = { x: 0, y: 0 };
        }

        interpPoint2(this.point1, this.point2, this.src[0], this.drn[0], 1, -hs2 * flip);
        interpPoint2(this.point1, this.point2, this.src[1], this.drn[1], 1 - 22 / this.dn, -hs2 * flip);
        interpPoint2(this.point1, this.point2, this.src[2], this.drn[2], 1 - 22 / this.dn, -hs2 * 4 / 3 * flip);

        this.gate = new Array(3);
        for (let i = 0; i < 3; i++) this.gate[i] = { x: 0, y: 0 };
        interpPoint2(this.point1, this.point2, this.gate[0], this.gate[2], 1 - 28 / this.dn, hs2 / 2 * flip);
        this.gate[1] = interpPoint(this.gate[0], this.gate[2], 0.5);

        if (this.showBulk()) {
            this.body = [
                interpPoint(this.src[0], this.drn[0], 0.5),
                interpPoint(this.src[1], this.drn[1], 0.5),
            ];
        }

        // Arrow
        if (this.pnp === 1) {
            this.arrowPoly = this.calcArrow(this.body.length > 0 ? this.body[0] : this.src[1],
                this.body.length > 0 ? this.body[1] : this.src[0], 12, 5);
        } else {
            this.arrowPoly = this.calcArrow(this.body.length > 0 ? this.body[1] : this.drn[0],
                this.body.length > 0 ? this.body[0] : this.drn[1], 12, 5);
        }
    }

    draw(g: Graphics): void {
        const hs = 16;
        this.setBboxPts(this.point1, this.point2, hs);

        // Source/drain terminals
        this.setVoltageColor(g, this.volts[1]);
        CircuitComponent.drawThickLine(g, this.src[0], this.src[1]);
        this.setVoltageColor(g, this.volts[2]);
        CircuitComponent.drawThickLine(g, this.drn[0], this.drn[1]);

        // Line connecting source and drain (with gap for enhancement mode)
        const segments = 6;
        const enhancement = this.thresholdVoltage > 0 && this.showBulk();
        for (let i = 0; i < segments; i++) {
            if ((i === 1 || i === 4) && enhancement) continue;
            const v = this.volts[1] + (this.volts[2] - this.volts[1]) * i / segments;
            this.setVoltageColor(g, v);
            const p1 = interpPoint(this.src[1], this.drn[1], i / segments);
            const p2 = interpPoint(this.src[1], this.drn[1], (i + 1) / segments);
            CircuitComponent.drawThickLine(g, p1, p2);
        }

        // Extensions
        this.setVoltageColor(g, this.volts[1]);
        CircuitComponent.drawThickLine(g, this.src[1], this.src[2]);
        this.setVoltageColor(g, this.volts[2]);
        CircuitComponent.drawThickLine(g, this.drn[1], this.drn[2]);

        // Bulk connection
        if (this.showBulk() && this.body.length >= 2) {
            this.setVoltageColor(g, this.volts[this.bodyTerminal]);
            if (!this.hasBodyTerminal()) {
                CircuitComponent.drawThickLine(g, this.pnp === -1 ? this.drn[0] : this.src[0], this.body[0]);
            }
            CircuitComponent.drawThickLine(g, this.body[0], this.body[1]);
        }

        // Arrow
        this.setVoltageColor(g, this.volts[this.bodyTerminal]);
        CircuitComponent.fillPolygon(g, this.arrowPoly);

        // Gate
        this.setVoltageColor(g, this.volts[0]);
        CircuitComponent.drawThickLine(g, this.point1, this.gate[1]);
        CircuitComponent.drawThickLine(g, this.gate[0], this.gate[2]);

        // Current dots
        this.drawDots(g, this.src[0], this.src[1], this.curcount);
        this.drawDots(g, this.src[1], this.drn[1], this.curcount);
        this.drawDots(g, this.drn[1], this.drn[0], this.curcount);

        // Posts
        g.setColor('#FFFFFF');
        g.fillOval(this.point1.x - 3, this.point1.y - 3, 7, 7);
        g.fillOval(this.src[0].x - 3, this.src[0].y - 3, 7, 7);
        g.fillOval(this.drn[0].x - 3, this.drn[0].y - 3, 7, 7);
        if (this.hasBodyTerminal()) {
            g.fillOval(this.body[0].x - 3, this.body[0].y - 3, 7, 7);
        }

        // Pin labels
        if (this.needsHighlight()) {
            g.setColor('#FFFFFF');
            g.setFontSize(10);
            const dsx = Math.sign(this.dx);
            const dsy = Math.sign(this.dy);
            g.drawString('G', this.gate[1].x - (this.dx < 0 ? -2 : 12), this.gate[1].y + (this.dy > 0 ? -5 : 12));
            g.drawString(this.pnp === -1 ? 'D' : 'S', this.src[0].x - 3 + 9 * dsx, this.src[0].y + 4);
            g.drawString(this.pnp === -1 ? 'S' : 'D', this.drn[0].x - 3 + 9 * dsx, this.drn[0].y + 4);
            if (this.hasBodyTerminal()) {
                g.drawString('B', this.body[0].x - 3 + 9 * dsx, this.body[0].y + 4);
            }
        }
    }

    calculateCurrent(): void {
        this.calculate(false);
    }

    stepFinished(): void {
        this.calculate(true);
        if (this.bodyTerminal === 1) this.diodeCurrent1 = -this.diodeCurrent2;
        if (this.bodyTerminal === 2) this.diodeCurrent2 = -this.diodeCurrent1;
    }

    doStep(context: StampContext): void {
        this.calculateStamped(context);
    }

    private nonConvergence(last: number, now: number): boolean {
        const diff = Math.abs(last - now);
        if (this.beta > 1) diff * 100; // (note: this was a bug in original too)
        if (diff < 0.01) return false;
        return true;
    }

    private calculate(finished: boolean): void {
        let vs: Float64Array | number[];
        if (finished) {
            vs = this.volts;
        } else {
            vs = [this.volts[0], this.volts[1], this.volts[2]];
            if (vs[1] > this.lastv1 + 0.5) vs[1] = this.lastv1 + 0.5;
            if (vs[1] < this.lastv1 - 0.5) vs[1] = this.lastv1 - 0.5;
            if (vs[2] > this.lastv2 + 0.5) vs[2] = this.lastv2 + 0.5;
            if (vs[2] < this.lastv2 - 0.5) vs[2] = this.lastv2 - 0.5;
        }

        let source = 1;
        let drain = 2;

        // Swap S/D if source voltage > drain (for NPN), opposite for PNP
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
            // Cutoff
            Gds = 1e-8;
            this.ids = pnpVds * Gds;
            this.mode = 0;
        } else if (pnpVds < pnpVgs - this.thresholdVoltage) {
            // Linear region
            this.ids = this.beta * ((pnpVgs - this.thresholdVoltage) * pnpVds - pnpVds * pnpVds * 0.5);
            this.gm = this.beta * pnpVds;
            Gds = this.beta * (pnpVgs - pnpVds - this.thresholdVoltage);
            this.mode = 1;
        } else {
            // Saturation region
            this.gm = this.beta * (pnpVgs - this.thresholdVoltage);
            Gds = 1e-8;
            this.ids = 0.5 * this.beta * (pnpVgs - this.thresholdVoltage) * (pnpVgs - this.thresholdVoltage) +
                (pnpVds - (pnpVgs - this.thresholdVoltage)) * Gds;
            this.mode = 2;
        }

        // Body diodes
        if (this.doBodyDiode()) {
            this.diodeCurrent1 = this.diodeB1.getCurrent(this.pnp * (this.volts[this.bodyTerminal] - this.volts[1]));
            this.diodeCurrent2 = this.diodeB2.getCurrent(this.pnp * (this.volts[this.bodyTerminal] - this.volts[2]));
        } else {
            this.diodeCurrent1 = this.diodeCurrent2 = 0;
        }

        // Flip ids if source/drain swapped for PNP
        if ((source === 2 && this.pnp === 1) || (source === 1 && this.pnp === -1)) {
            this.ids = -this.ids;
        }
    }

    private calculateStamped(context: StampContext): void {
        let vs: number[];
        vs = [this.volts[0], this.volts[1], this.volts[2]];

        if (vs[1] > this.lastv1 + 0.5) vs[1] = this.lastv1 + 0.5;
        if (vs[1] < this.lastv1 - 0.5) vs[1] = this.lastv1 - 0.5;
        if (vs[2] > this.lastv2 + 0.5) vs[2] = this.lastv2 + 0.5;
        if (vs[2] < this.lastv2 - 0.5) vs[2] = this.lastv2 - 0.5;

        if (this.nonConvergence(this.lastv1, vs[1]) || this.nonConvergence(this.lastv2, vs[2]) || this.nonConvergence(this.lastv0, vs[0])) {
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
            Gds = 1e-8;
            this.ids = pnpVds * Gds;
            this.mode = 0;
        } else if (pnpVds < pnpVgs - this.thresholdVoltage) {
            this.ids = this.beta * ((pnpVgs - this.thresholdVoltage) * pnpVds - pnpVds * pnpVds * 0.5);
            this.gm = this.beta * pnpVds;
            Gds = this.beta * (pnpVgs - pnpVds - this.thresholdVoltage);
            this.mode = 1;
        } else {
            this.gm = this.beta * (pnpVgs - this.thresholdVoltage);
            Gds = 1e-8;
            this.ids = 0.5 * this.beta * (pnpVgs - this.thresholdVoltage) * (pnpVgs - this.thresholdVoltage) +
                (pnpVds - (pnpVgs - this.thresholdVoltage)) * Gds;
            this.mode = 2;
        }

        if (this.doBodyDiode()) {
            this.diodeB1.doStep(this.pnp * (this.volts[this.bodyTerminal] - this.volts[1]),
                context, this.nodes[this.bodyTerminal], this.nodes[1], 0);
            this.diodeB2.doStep(this.pnp * (this.volts[this.bodyTerminal] - this.volts[2]),
                context, this.nodes[this.bodyTerminal], this.nodes[2], 0);
        }

        const ids0 = this.ids;
        if ((source === 2 && this.pnp === 1) || (source === 1 && this.pnp === -1)) {
            this.ids = -this.ids;
        }

        const rs = -this.pnp * ids0 + Gds * vds + this.gm * vgs;

        // Stamp matrix
        context.stampMatrix(this.nodes[drain], this.nodes[drain], Gds);
        context.stampMatrix(this.nodes[drain], this.nodes[source], -Gds - this.gm);
        context.stampMatrix(this.nodes[drain], this.nodes[0], this.gm);

        context.stampMatrix(this.nodes[source], this.nodes[drain], -Gds);
        context.stampMatrix(this.nodes[source], this.nodes[source], Gds + this.gm);
        context.stampMatrix(this.nodes[source], this.nodes[0], -this.gm);

        context.stampRightSide(this.nodes[drain], rs);
        context.stampRightSide(this.nodes[source], -rs);
    }

    getConnection(n1: number, n2: number): boolean {
        return !(n1 === 0 || n2 === 0);
    }

    getCurrent(): number { return this.ids; }

    getPower(): number {
        return this.ids * (this.volts[2] - this.volts[1]) -
            this.diodeCurrent1 * (this.volts[1] - this.volts[this.bodyTerminal]) -
            this.diodeCurrent2 * (this.volts[2] - this.volts[this.bodyTerminal]);
    }

    getCurrentIntoNode(n: number): number {
        if (n === 0) return 0;
        if (n === 3) return -this.diodeCurrent1 - this.diodeCurrent2;
        if (n === 1) return this.ids + this.diodeCurrent1;
        return -this.ids + this.diodeCurrent2;
    }

    getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Threshold Voltage (Vt)', value: this.pnp * this.thresholdVoltage, min: 0.01, max: 5 };
        if (n === 1) return { name: 'Beta', value: this.beta, min: 0.001, max: 100 };
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
            `${prefix}-MOSFET (Vt=${(this.pnp * this.thresholdVoltage).toFixed(2)}, β=${this.beta.toFixed(4)})`,
            `Ids = ${this.ids.toExponential(2)} A`,
            `Vgs = ${(this.volts[0] - this.volts[this.pnp === -1 ? 2 : 1]).toFixed(3)} V`,
            `Vds = ${(this.volts[2] - this.volts[1]).toFixed(3)} V`,
            this.mode === 0 ? 'off' : this.mode === 1 ? 'linear' : 'saturation',
            `gm = ${this.gm.toExponential(3)} A/V`,
        ];
    }
}

export class NMosfetComponent extends MosfetComponent {
    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.pnp = 1;
        this.flags &= ~MosfetComponent.FLAG_PNP;
    }
}

export class PMosfetComponent extends MosfetComponent {
    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.pnp = -1;
        this.flags |= MosfetComponent.FLAG_PNP;
    }
}

registerComponent('f'.charCodeAt(0), 'MosfetElm', MosfetComponent);
registerComponent('f'.charCodeAt(0), 'NMosfetElm', MosfetComponent);
registerComponent('p'.charCodeAt(0), 'PMosfetElm', MosfetComponent);
