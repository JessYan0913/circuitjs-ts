import type { StampContext } from '@circuitjs/shared';
import { escape } from '../../util/textEscape.js';

const VT = 0.025865; // Thermal voltage at 300K (matches Java)

/**
 * Diode companion model — Newton-Raphson linearization.
 * Port of the Java Diode class + DiodeModel parameters.
 *
 * This handles both regular diodes and Zener breakdown using the same
 * exponential approach as SPICE.  When breakdownVoltage > 0, the reverse
 * bias region uses a second exponential to model Zener / avalanche breakdown.
 */
export class DiodeModel {
    /** Static registry of named diode models (keyed by name) */
    static readonly modelMap = new Map<string, DiodeModel>();

    saturationCurrent = 1e-14; // Is (leakage)
    emissionCoefficient = 1.0; // N
    breakdownVoltage = 0;      // Zener breakdown voltage (0 = none)
    seriesResistance = 0;      // Series resistance
    forwardCurrent = 0;        // Forward current at 1V (persisted in dump)
    flags = 0;                 // Model flags (matches Java DiodeModel.flags)

    /** Model name (empty for inline/default models) */
    name = '';
    /** Whether this model has been dumped in the current dumpCircuit pass */
    dumped = false;
    /** Whether this is a built-in model (not user-defined) */
    builtIn = false;

    /** Reset dumped flags for all models (called at start of dumpCircuit) */
    static clearDumpedFlags(): void {
        for (const model of DiodeModel.modelMap.values()) {
            model.dumped = false;
        }
    }

    /** Look up a model by name in the registry */
    static getModelWithName(name: string): DiodeModel | undefined {
        return DiodeModel.modelMap.get(name);
    }

    /** Get or create a model by name, using fallback as template */
    static getModelWithNameOrCreate(name: string, fallback: DiodeModel): DiodeModel {
        let model = DiodeModel.modelMap.get(name);
        if (!model) {
            model = fallback;
            model.name = name;
            model.dumped = false;
            model.builtIn = false;
            DiodeModel.modelMap.set(name, model);
        }
        return model;
    }

    /** Serialize this model as a "34" dump line (matching Java DiodeModel.dump) */
    dump(): string {
        return `34 ${escape(this.name)} ${this.flags} ${this.saturationCurrent} ${this.seriesResistance} ${this.emissionCoefficient} ${this.breakdownVoltage} ${this.forwardCurrent}`;
    }

    /** Parse a "34" model line and store in the registry */
    static undumpModel(tokens: string[], startIndex: number): DiodeModel | null {
        if (tokens.length < startIndex + 6) return null;
        const name = tokens[startIndex]; // already unescaped by tokenizer
        const model = new DiodeModel();
        model.name = name;
        model.dumped = true;
        const pf = (s: string, def: number) => { const v = parseFloat(s); return isNaN(v) ? def : v; };
        model.flags = isNaN(parseInt(tokens[startIndex + 1])) ? 0 : parseInt(tokens[startIndex + 1]);
        model.saturationCurrent = pf(tokens[startIndex + 2], 1e-14);
        model.seriesResistance = pf(tokens[startIndex + 3], 0);
        model.emissionCoefficient = pf(tokens[startIndex + 4], 1.0);
        model.breakdownVoltage = pf(tokens[startIndex + 5], 0);
        if (tokens.length > startIndex + 6) {
            model.forwardCurrent = pf(tokens[startIndex + 6], 0);
        }
        DiodeModel.modelMap.set(name, model);
        return model;
    }

    private lastVoltage = 0;

    // Derived from emissionCoefficient and breakdownVoltage
    private _vscale = 0;
    private _vdcoef = 0;
    private _vcrit = 0;
    // Zener-specific: offset for breakdown exponential, critical voltage
    private _zoffset = 0;
    private _vzcrit = 0;
    private _needsRecalc = true;

    private recalc(): void {
        this._vscale = this.emissionCoefficient * VT;
        this._vdcoef = 1 / this._vscale;
        this._vcrit = this._vscale * Math.log(this._vscale / (Math.SQRT2 * this.saturationCurrent));
        // Calculate Zener offset to give 5mA at breakdownVoltage (matches Java)
        if (this.breakdownVoltage > 0) {
            const i = -0.005;
            this._zoffset = this.breakdownVoltage - Math.log(-(1 + i / this.saturationCurrent)) / (1 / VT);
        } else {
            this._zoffset = 0;
        }
        this._vzcrit = VT * Math.log(VT / (Math.SQRT2 * this.saturationCurrent));
        this._needsRecalc = false;
    }

    private ensureRecalc(): void {
        if (this._needsRecalc) this.recalc();
    }

    get vscale(): number { this.ensureRecalc(); return this._vscale; }
    get vdcoef(): number { this.ensureRecalc(); return this._vdcoef; }
    get vcrit(): number { this.ensureRecalc(); return this._vcrit; }

    reset(): void {
        this.lastVoltage = 0;
    }

    /**
     * Limit voltage change per iteration (matches Java Diode.limitStep).
     * Handles both forward-bias (vcrit) and Zener-breakdown (vzcrit) limiting.
     */
    private limitStep(vnew: number, vold: number): number {
        if (vnew > this.vcrit && Math.abs(vnew - vold) > (this._vscale + this._vscale)) {
            if (vold > 0) {
                const arg = 1 + (vnew - vold) / this._vscale;
                if (arg > 0) {
                    vnew = vold + this._vscale * Math.log(arg);
                } else {
                    vnew = this.vcrit;
                }
            } else {
                vnew = this._vscale * Math.log(vnew / this._vscale);
            }
        } else if (vnew < 0 && this._zoffset !== 0) {
            // For Zener breakdown, translate the values and use steeper exponential
            let vn = -vnew - this._zoffset;
            const vo = -vold - this._zoffset;
            if (vn > this._vzcrit && Math.abs(vn - vo) > (VT + VT)) {
                if (vo > 0) {
                    const arg = 1 + (vn - vo) / VT;
                    if (arg > 0) {
                        vn = vo + VT * Math.log(arg);
                    } else {
                        vn = this._vzcrit;
                    }
                } else {
                    vn = VT * Math.log(vn / VT);
                }
            }
            vnew = -(vn + this._zoffset);
        }
        return vnew;
    }

    /** Stamp the linearized diode model */
    doStep(vd: number, context: StampContext, n1: number, n2: number, subIterations: number): void {
        this.ensureRecalc();
        // Convergence check
        if (Math.abs(vd - this.lastVoltage) > 0.01) {
            context.setConverged(false);
        }
        vd = this.limitStep(vd, this.lastVoltage);
        this.lastVoltage = vd;

        // gmin: tiny conductance to prevent singular matrix
        let gmin = this.saturationCurrent * 0.01;
        if (subIterations > 100) {
            gmin = Math.exp(-9 * Math.log(10) * (1 - subIterations / 3000));
            if (gmin > 0.1) gmin = 0.1;
        }

        if (vd >= 0 || this.breakdownVoltage === 0) {
            // Regular diode or forward-biased Zener (matches Java exactly)
            const evalExp = Math.exp(vd * this._vdcoef);
            const geq = this._vdcoef * this.saturationCurrent * evalExp + gmin;
            const nc = (evalExp - 1) * this.saturationCurrent - geq * vd;
            context.stampConductance(n1, n2, geq);
            context.stampCurrentSource(n1, n2, nc);
        } else {
            // Zener reverse-breakdown region
            // I(Vd) = Is * (exp[Vd*vdcoef] - exp[(-Vd-Vz)*vzcoef] - 1)
            // geq = Is * (vdcoef*exp(Vd*vdcoef) + vzcoef*exp((-Vd-zoffset)*vzcoef)) + gmin
            // nc  = Is * (exp(Vd*vdcoef) - exp((-Vd-zoffset)*vzcoef) - 1) + geq*(-Vd)
            const vzcoef = 1 / VT;
            const expFwd = Math.exp(vd * this._vdcoef);
            const expRev = Math.exp((-vd - this._zoffset) * vzcoef);
            const geq = this.saturationCurrent * (
                this._vdcoef * expFwd + vzcoef * expRev
            ) + gmin;
            const nc = this.saturationCurrent * (
                expFwd - expRev - 1
            ) + geq * (-vd);
            context.stampConductance(n1, n2, geq);
            context.stampCurrentSource(n1, n2, nc);
        }
    }

    /** Compute current from voltage (matches Java Diode.calculateCurrent) */
    getCurrent(vd: number): number {
        this.ensureRecalc();
        if (vd >= 0 || this.breakdownVoltage === 0) {
            return this.saturationCurrent * (Math.exp(vd * this._vdcoef) - 1);
        }
        // Zener region
        const vzcoef = 1 / VT;
        return this.saturationCurrent * (
            Math.exp(vd * this._vdcoef) - Math.exp((-vd - this._zoffset) * vzcoef) - 1
        );
    }
}
