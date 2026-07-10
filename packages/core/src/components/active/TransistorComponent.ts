import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { interpPoint2 } from '../drawutils.js';
import { TransistorModel } from './TransistorModel.js';
import { escape } from '../../util/textEscape.js';

const VT = 0.025865;

/**
 * BJT Transistor (NPN/PNP) — Gummel-Poon / Ebers-Moll model.
 * Port of Java TransistorElm (dump type 't')
 *
 * Post layout (matching Java):
 *   0 = base   (at point1)
 *   1 = collector (perpendicular offset from point2)
 *   2 = emitter   (opposite perpendicular offset from point2)
 */
export class TransistorComponent extends CircuitComponent {
    pnp = 1; // 1 for NPN, -1 for PNP
    beta = 100;
    /** Name of shared TransistorModel (empty for default inline model) */
    modelName = '';
    /** Resolved TransistorModel instance */
    model: TransistorModel;

    private ic = 0;
    private ib = 0;
    private ie = 0;
    private lastVbe = 0;
    private lastVbc = 0;
    private subIterations = 0;

    // Drawing geometry (computed in setPoints)
    private coll: { x: number; y: number }[] = [];
    private emit: { x: number; y: number }[] = [];
    private base = { x: 0, y: 0 };
    private rectPoly: { npoints: number; xpoints: number[]; ypoints: number[] } = { npoints: 0, xpoints: [], ypoints: [] };
    private arrowPoly: { npoints: number; xpoints: number[]; ypoints: number[] } = { npoints: 0, xpoints: [], ypoints: [] };

    // Dot animation counters
    private curcountC = 0;
    private curcountE = 0;
    private curcountB = 0;

    // Voltage limiting threshold (from satCur)
    private vcrit: number;

    static readonly FLAG_FLIP = 1;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.noDiagonal = true;
        this.model = TransistorModel.getDefaultModel();
        this.vcrit = this.computeVcrit();
    }

    getDumpType(): number | string { return 't'; }
    getPostCount(): number { return 3; }
    nonLinear(): boolean { return true; }
    getVoltageSourceCount(): number { return 0; }

    /** Resolve model from modelName; called after construction and model changes */
    setup(): void {
        if (this.modelName) {
            this.model = TransistorModel.getModelWithNameOrCopy(this.modelName, this.model);
            this.modelName = this.model.name;
        } else {
            this.model = TransistorModel.getDefaultModel();
        }
        this.vcrit = this.computeVcrit();
    }

    private computeVcrit(): number {
        return VT * Math.log(VT / (Math.SQRT2 * this.model.satCur));
    }

    /** Emit model dump line when a named model is referenced */
    override dumpModel(): string | null {
        if (!this.modelName) return null;
        if (this.model.dumped) return null;
        this.model.dumped = true;
        return this.model.dump();
    }

    override dump(): string {
        return `${super.dump()} ${this.pnp} ${this.volts[0] - this.volts[1]} ${this.volts[0] - this.volts[2]} ${this.beta} ${escape(this.modelName || 'default')}`;
    }

    /** Post 0 = base = point1, post 1 = collector, post 2 = emitter */
    getPost(n: number): { x: number; y: number } {
        if (n === 0) return this.point1;
        if (n === 1) return this.coll[0];
        if (n === 2) return this.emit[0];
        return { x: 0, y: 0 };
    }

    handleDumpData(tokens: string[], start: number): void {
        // Format: pnp vbc vbe beta [modelName]
        const pi = (s: string) => { const v = parseInt(s); return isNaN(v) ? 1 : v; };
        const pf = (s: string) => { const v = parseFloat(s); return isNaN(v) ? 100 : v; };
        if (tokens.length > start) this.pnp = pi(tokens[start]);
        if (tokens.length > start + 3) this.beta = pf(tokens[start + 3]);
        if (tokens.length > start + 4) {
            this.modelName = tokens[start + 4];
        }
        this.setup();
    }

    isPNP(): boolean { return this.pnp === -1; }

    setPoints(): void {
        super.setPoints();
        const hs = 16;
        let dsign = this.dsign;
        if ((this.flags & TransistorComponent.FLAG_FLIP) !== 0) dsign = -dsign;
        const hs2 = hs * dsign * this.pnp;

        // Collector and emitter posts at the far end with perpendicular offset
        this.coll = new Array(2);
        this.emit = new Array(2);
        for (let i = 0; i < 2; i++) {
            this.coll[i] = { x: 0, y: 0 };
            this.emit[i] = { x: 0, y: 0 };
        }
        interpPoint2(this.point1, this.point2, this.coll[0], this.emit[0], 1, hs2);

        // Rectangle edges (base region)
        const rect = new Array(4);
        for (let i = 0; i < 4; i++) rect[i] = { x: 0, y: 0 };
        interpPoint2(this.point1, this.point2, rect[0], rect[1], 1 - 16 / this.dn, hs);
        interpPoint2(this.point1, this.point2, rect[2], rect[3], 1 - 13 / this.dn, hs);

        // Points where collector/emitter leads contact rectangle
        interpPoint2(this.point1, this.point2, this.coll[1], this.emit[1], 1 - 13 / this.dn, 6 * dsign * this.pnp);

        // Base lead contact point on rectangle
        this.interpPointFill(this.point1, this.point2, this.base, 1 - 16 / this.dn);

        // Rectangle polygon
        this.rectPoly = {
            npoints: 4,
            xpoints: [rect[0].x, rect[2].x, rect[3].x, rect[1].x],
            ypoints: [rect[0].y, rect[2].y, rect[3].y, rect[1].y],
        };

        // Arrow (on emitter)
        if (this.pnp === 1) {
            // NPN: arrow points outward from emitter
            this.arrowPoly = this.calcArrow(this.emit[1], this.emit[0], 8, 4);
        } else {
            // PNP: arrow points toward emitter
            const pt = this.interpPoint(this.point1, this.point2, 1 - 11 / this.dn);
            this.arrowPoly = this.calcArrow(this.emit[0], pt, 8, 4);
        }
    }

    updateCurcount(currentMult: number): void {
        // Override since we have separate current components
        let cadd = this.ic * currentMult;
        cadd %= 8;
        this.curcountC += cadd;
        cadd = this.ie * currentMult;
        cadd %= 8;
        this.curcountE += cadd;
        cadd = this.ib * currentMult;
        cadd %= 8;
        this.curcountB += cadd;
    }

    draw(g: Graphics): void {
        this.setBboxPts(this.point1, this.point2, 16);

        // Draw collector lead
        this.setVoltageColor(g, this.volts[1]);
        CircuitComponent.drawThickLine(g, this.coll[0], this.coll[1]);

        // Draw emitter lead
        this.setVoltageColor(g, this.volts[2]);
        CircuitComponent.drawThickLine(g, this.emit[0], this.emit[1]);

        // Draw arrow
        g.setColor('#C0C0C0');
        g.fillPolygon(this.arrowPoly.xpoints, this.arrowPoly.ypoints, this.arrowPoly.npoints);

        // Draw base lead
        this.setVoltageColor(g, this.volts[0]);
        CircuitComponent.drawThickLine(g, this.point1, this.base);

        // Current dots
        this.drawDots(g, this.base, this.point1, this.curcountB);
        this.drawDots(g, this.coll[1], this.coll[0], this.curcountC);
        this.drawDots(g, this.emit[1], this.emit[0], this.curcountE);

        // Draw base rectangle (filled)
        this.setVoltageColor(g, this.volts[0]);
        g.fillPolygon(this.rectPoly.xpoints, this.rectPoly.ypoints, this.rectPoly.npoints);

        // Pin labels
        if (this.needsHighlight() && this.dy === 0) {
            g.setColor('#FFFFFF');
            g.setFontSize(10);
            const ds = Math.sign(this.dx);
            g.drawString('B', this.base.x - 10 * ds, this.base.y - 5);
            g.drawString('C', this.coll[0].x - 3 + 9 * ds, this.coll[0].y + 4);
            g.drawString('E', this.emit[0].x - 3 + 9 * ds, this.emit[0].y + 4);
        }

        // Posts
        g.setColor('#FFFFFF');
        g.fillOval(this.point1.x - 3, this.point1.y - 3, 7, 7);
        g.fillOval(this.coll[0].x - 3, this.coll[0].y - 3, 7, 7);
        g.fillOval(this.emit[0].x - 3, this.emit[0].y - 3, 7, 7);
    }

    reset(): void {
        this.volts[0] = this.volts[1] = this.volts[2] = 0;
        this.lastVbc = this.lastVbe = this.curcountC = this.curcountE = this.curcountB = 0;
        this.ic = this.ib = this.ie = 0;
        this.subIterations = 0;
    }

    stamp(context: StampContext): void {
        context.stampNonLinear(this.nodes[0]);
        context.stampNonLinear(this.nodes[1]);
        context.stampNonLinear(this.nodes[2]);
    }

    stepFinished(): void {
        this.subIterations = 0;
    }

    // ---- Gummel-Poon / Ebers-Moll model ----
    // Ported from Java TransistorElm.doStep

    private limitStep(vnew: number, vold: number): number {
        if (vnew > this.vcrit && Math.abs(vnew - vold) > (VT + VT)) {
            if (vold > 0) {
                const arg = 1 + (vnew - vold) / VT;
                if (arg > 0) {
                    vnew = vold + VT * Math.log(arg);
                } else {
                    vnew = this.vcrit;
                }
            } else {
                vnew = VT * Math.log(vnew / VT);
            }
        }
        return vnew;
    }

    doStep(context: StampContext): void {
        let vbc = this.pnp * (this.volts[0] - this.volts[1]);
        let vbe = this.pnp * (this.volts[0] - this.volts[2]);

        if (Math.abs(vbc - this.lastVbc) > 0.01 || Math.abs(vbe - this.lastVbe) > 0.01) {
            context.setConverged(false);
        }

        let gmin = 1e-12;
        if (this.subIterations > 100) {
            gmin = Math.exp(-9 * Math.log(10) * (1 - this.subIterations / 300));
            if (gmin > 0.1) gmin = 0.1;
        }

        vbc = this.limitStep(vbc, this.lastVbc);
        vbe = this.limitStep(vbe, this.lastVbe);
        this.lastVbc = vbc;
        this.lastVbe = vbe;

        // Model parameters (matching Java TransistorElm.doStep)
        const csat = this.model.satCur;
        const oik = this.model.invRollOffF;
        const c2 = this.model.BEleakCur;
        const vte = this.model.leakBEemissionCoeff * VT;
        const oikr = this.model.invRollOffR;
        const c4 = this.model.BCleakCur;
        const vtc = this.model.leakBCemissionCoeff * VT;

        // Forward bias
        let vtn = VT * this.model.emissionCoeffF;
        let evbe = 0, cbe = 0, gbe = 0, cben = 0, gben = 0, evben = 0;
        if (vbe > -5 * vtn) {
            evbe = Math.exp(vbe / vtn);
            cbe = csat * (evbe - 1) + gmin * vbe;
            gbe = csat * evbe / vtn + gmin;
            if (c2 === 0) {
                cben = 0;
                gben = 0;
            } else {
                evben = Math.exp(vbe / vte);
                cben = c2 * (evben - 1);
                gben = c2 * evben / vte;
            }
        } else {
            gbe = -csat / vbe + gmin;
            cbe = gbe * vbe;
            gben = -c2 / vbe;
            cben = gben * vbe;
        }

        // Reverse bias
        vtn = VT * this.model.emissionCoeffR;
        let evbc = 0, cbc = 0, gbc = 0, cbcn = 0, gbcn = 0, evbcn = 0;
        if (vbc > -5 * vtn) {
            evbc = Math.exp(vbc / vtn);
            cbc = csat * (evbc - 1) + gmin * vbc;
            gbc = csat * evbc / vtn + gmin;
            if (c4 === 0) {
                cbcn = 0;
                gbcn = 0;
            } else {
                evbcn = Math.exp(vbc / vtc);
                cbcn = c4 * (evbcn - 1);
                gbcn = c4 * evbcn / vtc;
            }
        } else {
            gbc = -csat / vbc + gmin;
            cbc = gbc * vbc;
            gbcn = -c4 / vbc;
            cbcn = gbcn * vbc;
        }

        // Base charge modulation (Early effect + roll-off)
        const q1 = 1 / (1 - this.model.invEarlyVoltF * vbc - this.model.invEarlyVoltR * vbe);
        let qb = 0, dqbdve = 0, dqbdvc = 0;
        if (oik === 0 && oikr === 0) {
            qb = q1;
            dqbdve = q1 * qb * this.model.invEarlyVoltR;
            dqbdvc = q1 * qb * this.model.invEarlyVoltF;
        } else {
            const q2 = oik * cbe + oikr * cbc;
            const arg = Math.max(0, 1 + 4 * q2);
            const sqarg = arg !== 0 ? Math.sqrt(arg) : 1;
            qb = q1 * (1 + sqarg) / 2;
            dqbdve = q1 * (qb * this.model.invEarlyVoltR + oik * gbe / sqarg);
            dqbdvc = q1 * (qb * this.model.invEarlyVoltF + oikr * gbc / sqarg);
        }

        const cex = cbe;
        const gex = gbe;

        // Compute currents
        const cc = (cex - cbc) / qb - cbc / this.model.betaR - cbcn;
        const cb = cbe / this.beta + cben + cbc / this.model.betaR + cbcn;

        this.ic = this.pnp * cc;
        this.ib = this.pnp * cb;
        this.ie = this.pnp * (-cc - cb);

        // Conductances
        const gpi = gbe / this.beta + gben;
        const gmu = gbc / this.model.betaR + gbcn;
        const go = (gbc + (cex - cbc) * dqbdvc / qb) / qb;
        const gm = (gex - (cex - cbc) * dqbdve / qb) / qb - go;

        // Stamp matrix (matches Java layout)
        // Node 0 = base, 1 = collector, 2 = emitter
        context.stampMatrix(this.nodes[1], this.nodes[1], gmu + go);
        context.stampMatrix(this.nodes[1], this.nodes[0], -gmu + gm);
        context.stampMatrix(this.nodes[1], this.nodes[2], -gm - go);
        context.stampMatrix(this.nodes[0], this.nodes[0], gpi + gmu);
        context.stampMatrix(this.nodes[0], this.nodes[2], -gpi);
        context.stampMatrix(this.nodes[0], this.nodes[1], -gmu);
        context.stampMatrix(this.nodes[2], this.nodes[0], -gpi - gm);
        context.stampMatrix(this.nodes[2], this.nodes[1], -go);
        context.stampMatrix(this.nodes[2], this.nodes[2], gpi + gm + go);

        // Right side
        const ceqbe = this.pnp * (cc + cb - vbe * (gm + go + gpi) + vbc * go);
        const ceqbc = this.pnp * (-cc + vbe * (gm + go) - vbc * (gmu + go));

        context.stampRightSide(this.nodes[0], -ceqbe - ceqbc);
        context.stampRightSide(this.nodes[1], ceqbc);
        context.stampRightSide(this.nodes[2], ceqbe);

        this.subIterations++;
    }

    calculateCurrent(): void {
        // Currents already computed in doStep
        this.current = this.ic;
    }

    getCurrentIntoNode(n: number): number {
        if (n === 0) return -this.ib;
        if (n === 1) return -this.ic;
        return -this.ie;
    }

    getPower(): number {
        return (this.volts[0] - this.volts[2]) * this.ib + (this.volts[1] - this.volts[2]) * this.ic;
    }

    getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Beta/hFE', value: this.beta };
        if (n === 1) {
            const models = TransistorModel.getModelList();
            const idx = models.indexOf(this.model);
            return {
                name: 'Model',
                value: 0,
                choices: models.map(m => m.getDescription()),
                selectedIndex: Math.max(0, idx),
            };
        }
        if (n === 2) {
            return { name: 'Swap C/E', checkbox: true, checkboxState: (this.flags & TransistorComponent.FLAG_FLIP) !== 0 };
        }
        return null;
    }

    setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 0 && ei.value !== undefined) {
            this.beta = ei.value;
        }
        if (_n === 1 && ei.selectedIndex !== undefined) {
            const models = TransistorModel.getModelList();
            const newModel = models[ei.selectedIndex];
            if (newModel && newModel !== this.model) {
                this.model = newModel;
                this.modelName = this.model.name;
                this.vcrit = this.computeVcrit();
            }
        }
        if (_n === 2 && ei.checkboxState !== undefined) {
            if (ei.checkboxState) {
                this.flags |= TransistorComponent.FLAG_FLIP;
            } else {
                this.flags &= ~TransistorComponent.FLAG_FLIP;
            }
            this.setPoints();
        }
    }

    getInfo(): string[] {
        const vbc = this.volts[0] - this.volts[1];
        const vbe = this.volts[0] - this.volts[2];
        const vce = this.volts[1] - this.volts[2];
        let region = 'cutoff';
        if (vbc * this.pnp > 0.2) {
            region = vbe * this.pnp > 0.2 ? 'saturation' : 'reverse active';
        } else if (vbe * this.pnp > 0.2) {
            region = 'fwd active';
        }
        const modelLabel = this.modelName && this.modelName !== 'default' ? ` [${this.modelName}]` : '';
        return [
            `${this.isPNP() ? 'PNP' : 'NPN'} Transistor${modelLabel} (β=${this.beta})`,
            region,
            `Ic = ${this.ic.toExponential(2)} A`,
            `Ib = ${this.ib.toExponential(2)} A`,
            `Vbe = ${vbe.toFixed(3)} V`,
            `Vbc = ${vbc.toFixed(3)} V`,
            `Vce = ${vce.toFixed(3)} V`,
        ];
    }

    getShortcut(): number { return 't'.charCodeAt(0); }
}

export class NPNTransistorComponent extends TransistorComponent {
    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.pnp = ((args.flags ?? 0) & 1) !== 0 ? -1 : 1;
    }
}

export class PNPTransistorComponent extends TransistorComponent {
    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.pnp = -1;
    }
}

registerComponent('t'.charCodeAt(0), 'TransistorElm', TransistorComponent);
registerComponent('t'.charCodeAt(0), 'NTransistorElm', TransistorComponent);
registerComponent('t'.charCodeAt(0), 'PTransistorElm', TransistorComponent);
