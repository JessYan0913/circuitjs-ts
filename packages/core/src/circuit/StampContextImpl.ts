import type { MNAMatrix } from '../matrix/MNAMatrix.js';

/**
 * StampContext — passed to component stamp() and doStep() methods.
 * Wraps MNAMatrix operations with the current timestep info.
 */
export class StampContextImpl {
    constructor(
        public matrix: MNAMatrix,
        public timeStep: number,
        public converged: boolean,
    ) {}

    setConverged(value: boolean): void { this.converged = value; }

    markRightSideChanging(row: number): void {
        this.matrix.markRightSideChanging(row);
    }

    stampMatrix(row: number, col: number, value: number): void {
        this.matrix.addValue(row, col, value);
    }

    stampRightSide(row: number, value: number): void {
        this.matrix.addRightSide(row, value);
    }

    stampResistor(n1: number, n2: number, resistance: number): void {
        this.matrix.stampResistor(n1, n2, resistance);
    }

    stampConductance(n1: number, n2: number, conductance: number): void {
        this.matrix.stampConductance(n1, n2, conductance);
    }

    stampVoltageSource(n1: number, n2: number, vsIndex: number, voltage?: number): void {
        this.matrix.stampVoltageSource(n1, n2, vsIndex, voltage);
    }

    stampCurrentSource(n1: number, n2: number, current: number): void {
        this.matrix.stampCurrentSource(n1, n2, current);
    }

    stampCCCS(n1: number, n2: number, vsIndex: number, gain: number): void {
        this.matrix.stampCCCS(n1, n2, vsIndex, gain);
    }

    stampVCCurrentSource(
        cn1: number, cn2: number,
        vn1: number, vn2: number,
        g: number,
    ): void {
        this.matrix.stampVCCurrentSource(cn1, cn2, vn1, vn2, g);
    }

    stampNonLinear(row: number): void {
        this.matrix.markNonLinear(row);
    }

    updateVoltageSource(n1: number, n2: number, vsIndex: number, voltage: number): void {
        this.matrix.updateVoltageSource(n1, n2, vsIndex, voltage);
    }
}
