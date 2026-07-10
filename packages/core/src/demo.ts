import { MNAMatrix } from './matrix/MNAMatrix.js';

/**
 * Build and solve a resistor divider circuit directly.
 * Phase 1 verification — proves the core matrix solver works.
 */
export function solveDivider(R1: number, R2: number, V: number): { V1: number; V2: number; I: number } {
    const m = new MNAMatrix(3, 2);
    m.stampVoltageSource(0, 1, 0, V);  // Vsrc between GND(0) and N1
    m.stampResistor(1, 2, R1);          // R1 between N1 and N2
    m.stampResistor(2, 0, R2);          // R2 between N2 and GND(0)

    m.saveOrig();
    m.luFactor();
    m.luSolve();

    return {
        V1: m.rightSide[0],
        V2: m.rightSide[1],
        I: m.rightSide[2],
    };
}
