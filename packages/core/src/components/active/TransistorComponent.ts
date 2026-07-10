import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { COLOR_TRANSISTOR } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { interpPoint, interpPointPerp } from '../drawutils.js';

const VT = 0.025865;

/** Simple Ebers-Moll BJT model (NPN) */
export class TransistorComponent extends CircuitComponent {
    beta = 100;       // Forward current gain
    saturationCurrent = 1e-14; // Is

    private lastVBE = 0;
    private lastVBC = 0;

    getDumpType(): number | string { return 't'; }
    getPostCount(): number { return 3; }
    nonLinear(): boolean { return true; }

    /** NPN vs PNP */
    isPNP = false;

    getVoltageSourceCount(): number { return 0; }

    handleDumpData(tokens: string[], start: number): void {
        // Format: pnp vbc vbe beta modelName
        if (tokens.length > start) this.isPNP = parseInt(tokens[start]) !== 0;
        if (tokens.length > start + 3) this.beta = parseFloat(tokens[start + 3]) || 100;
    }

    stamp(context: StampContext): void {
        context.stampNonLinear(this.nodes[0]);
        context.stampNonLinear(this.nodes[1]);
        context.stampNonLinear(this.nodes[2]);
    }

    doStep(context: StampContext): void {
        // Node order: 0=base, 1=collector, 2=emitter
        let vbe = this.volts[0] - this.volts[2];
        let vbc = this.volts[0] - this.volts[1];
        let vce = this.volts[1] - this.volts[2];

        if (this.isPNP) {
            vbe = -vbe;
            vbc = -vbc;
            vce = -vce;
        }

        // Convergence check
        if (Math.abs(vbe - this.lastVBE) > 0.01 || Math.abs(vbc - this.lastVBC) > 0.01) {
            context.setConverged(false);
        }

        // Limit voltage changes (simplified SPICE-style limiting)
        vbe = this.limitStep(vbe, this.lastVBE);
        vbc = this.limitStep(vbc, this.lastVBC);
        this.lastVBE = vbe;
        this.lastVBC = vbc;

        // Ebers-Moll: compute currents
        const nvt = 1.0 * VT;
        const expBE = Math.exp(Math.min(vbe / nvt, 100));
        const expBC = Math.exp(Math.min(vbc / nvt, 100));

        // Forward and reverse currents
        const ifwd = this.saturationCurrent * (expBE - 1);
        const irev = this.saturationCurrent * (expBC - 1);

        const alphaF = this.beta / (this.beta + 1);
        const alphaR = 0.5; // reverse beta ~ 1

        // Terminal currents
        const ic = alphaF * ifwd - irev;
        const ie = -ifwd + alphaR * irev;
        const ib = -(ic + ie);

        // Conductances (derivatives for Newton)
        const gBE = this.saturationCurrent * expBE / nvt;
        const gBC = this.saturationCurrent * expBC / nvt;

        // Norton equivalent: stamp as conductance + current source
        // Base-emitter: gBE between base and emitter
        context.stampConductance(this.nodes[0], this.nodes[2], gBE);
        // Base-collector: gBC between base and collector
        context.stampConductance(this.nodes[0], this.nodes[1], gBC);

        // Controlled current sources
        // ic = alphaF * ifwd → depends on VBE → gm = alphaF * gBE
        const gm = alphaF * gBE;
        const go = gBC; // output conductance

        // Collector current: depends on VBE (gm) and VCE (go)
        // Stamping as VCCS: Ic += gm*Vbe + go*Vce
        // gm*Vbe = gm*(Vb - Ve)
        context.stampVCCurrentSource(
            this.nodes[1], this.nodes[2], // output: collector to emitter
            this.nodes[0], this.nodes[2], // control: base to emitter
            gm,
        );

        // Norton correction: subtract the linearized portion
        const icLinear = gm * vbe + go * vce;
        const icCorrection = ic - icLinear;
        context.stampCurrentSource(this.nodes[1], this.nodes[2], icCorrection);

        // Base current correction
        const ibLinear = gBE * vbe + gBC * vbc;
        const ibCorrection = ib - ibLinear;
        context.stampCurrentSource(this.nodes[0], this.nodes[2], ibCorrection);
    }

    private limitStep(vnew: number, vold: number): number {
        const maxStep = 3 * VT; // ~78mV
        if (vnew > vold + maxStep) return vold + maxStep;
        if (vnew < vold - maxStep) return vold - maxStep;
        return vnew;
    }

    calculateCurrent(): void {
        // Collector current
        const vbe = this.volts[0] - this.volts[2];
        const vbc = this.volts[0] - this.volts[1];
        const nvt = 1.0 * VT;
        const ifwd = this.saturationCurrent * (Math.exp(Math.min(vbe / nvt, 100)) - 1);
        const irev = this.saturationCurrent * (Math.exp(Math.min(vbc / nvt, 100)) - 1);
        const alphaF = this.beta / (this.beta + 1);
        this.current = alphaF * ifwd - irev;
        if (this.isPNP) this.current = -this.current;
    }

    draw(g: Graphics): void {
        // BJT: circle with emitter arrow
        const mid = interpPoint(this.point1, this.point2, 0.5);
        const r = 14;
        g.setLineWidth(2);
        g.setColor(COLOR_TRANSISTOR);
        g.drawOval(mid.x, mid.y, r, r);
        const label = this.isPNP ? 'Q_PNP' : 'Q_NPN';
        g.setFontSize(9);
        g.textAlign('center');
        g.textBaseline('middle');
        g.drawString(label, mid.x, mid.y);
    }

    getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Beta (forward gain)', value: this.beta };
        return null;
    }

    setEditValue(_n: number, ei: EditInfo): void {
        if (ei.value !== undefined && _n === 0) this.beta = ei.value;
    }

    getInfo(): string[] {
        return [`${this.isPNP ? 'PNP' : 'NPN'} Transistor`, `beta=${this.beta}`];
    }

    getShortcut(): number { return 't'.charCodeAt(0); }
}

export class NPNTransistorComponent extends TransistorComponent {
    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.isPNP = ((args.flags ?? 0) & 1) !== 0; // flag bit 0 = PNP
    }
}

export class PNPTransistorComponent extends TransistorComponent {
    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.isPNP = true;
    }
}

// Type 't' creates a generic transistor (reads flags for NPN/PNP)
// named creates use the appropriate subclass for menu default behavior
registerComponent('t'.charCodeAt(0), 'TransistorElm', TransistorComponent);
registerComponent('t'.charCodeAt(0), 'NTransistorElm', TransistorComponent);
registerComponent('t'.charCodeAt(0), 'PTransistorElm', TransistorComponent);
