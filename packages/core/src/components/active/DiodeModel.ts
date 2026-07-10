import type { StampContext } from '@circuitjs/shared';

const VT = 0.025865; // Thermal voltage at 300K (matches Java)

/**
 * Diode companion model — Newton-Raphson linearization.
 * Port of the Java Diode class.
 */
export class DiodeModel {
    saturationCurrent = 1e-14; // Is (leakage)
    emissionCoefficient = 1.0; // N

    private lastVoltage = 0;

    get vscale(): number { return this.emissionCoefficient * VT; }
    get vdcoef(): number { return 1 / this.vscale; }
    get vcrit(): number {
        return this.vscale * Math.log(this.vscale / (Math.SQRT2 * this.saturationCurrent));
    }

    reset(): void {
        this.lastVoltage = 0;
    }

    /** Limit voltage change per iteration (SPICE-derived) */
    private limitStep(vnew: number, vold: number): number {
        if (vnew > this.vcrit && Math.abs(vnew - vold) > (this.vscale + this.vscale)) {
            if (vold > 0) {
                const arg = 1 + (vnew - vold) / this.vscale;
                if (arg > 0) {
                    vnew = vold + this.vscale * Math.log(arg);
                } else {
                    vnew = this.vcrit;
                }
            } else {
                vnew = this.vscale * Math.log(vnew / this.vscale);
            }
            return vnew;
        }
        return vnew;
    }

    /** Stamp the linearized diode model */
    doStep(vd: number, context: StampContext, n1: number, n2: number, subIterations: number): void {
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

        // Diode: I = Is * (exp(Vd * vdcoef) - 1)
        const vdcoef = this.vdcoef;
        const evalExp = Math.exp(Math.min(vd * vdcoef, 100));
        const geq = vdcoef * this.saturationCurrent * evalExp + gmin;
        const nc = (evalExp - 1) * this.saturationCurrent - geq * vd;

        context.stampConductance(n1, n2, geq);
        context.stampCurrentSource(n1, n2, nc);
    }

    /** Compute current from voltage */
    getCurrent(vd: number): number {
        return this.saturationCurrent * (Math.exp(Math.min(vd * this.vdcoef, 100)) - 1);
    }
}
