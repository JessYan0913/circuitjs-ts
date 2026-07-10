import { describe, test, expect } from 'vitest';
import { LUSolver } from '../../src/matrix/LUSolver.js';
import { MNAMatrix } from '../../src/matrix/MNAMatrix.js';

describe('LUSolver', () => {
    test('solves 2x2 system', () => {
        const a = new Float64Array([2, 1, 1, 1]);
        const ipvt = new Int32Array(2);
        const b = new Float64Array([4, 3]);

        expect(LUSolver.factor(a, 2, ipvt)).toBe(true);
        LUSolver.solve(a, 2, ipvt, b);

        expect(b[0]).toBeCloseTo(1, 10);
        expect(b[1]).toBeCloseTo(2, 10);
    });

    test('solves 3x3 system', () => {
        // x + y + z = 6
        // 2x + 3y + z = 11
        // -x + 2y - z = -1
        // => x=5/3≈1.667, y=5/3≈1.667, z=8/3≈2.667
        const a = new Float64Array([
            1, 1, 1,
            2, 3, 1,
            -1, 2, -1,
        ]);
        const ipvt = new Int32Array(3);
        const b = new Float64Array([6, 11, -1]);

        expect(LUSolver.factor(a, 3, ipvt)).toBe(true);
        LUSolver.solve(a, 3, ipvt, b);

        expect(b[0]).toBeCloseTo(5 / 3, 10);
        expect(b[1]).toBeCloseTo(5 / 3, 10);
        expect(b[2]).toBeCloseTo(8 / 3, 10);
    });

    test('solves identity system', () => {
        const a = new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
        const ipvt = new Int32Array(4);
        const b = new Float64Array([3, -1, 7, 0]);

        LUSolver.factor(a, 4, ipvt);
        LUSolver.solve(a, 4, ipvt, b);

        expect(b[0]).toBe(3);
        expect(b[1]).toBe(-1);
        expect(b[2]).toBe(7);
        expect(b[3]).toBe(0);
    });
});

describe('MNAMatrix', () => {
    test('stampResistor and solve voltage divider', () => {
        // Vsrc(5V) -- R1(1k) -- N1 -- R2(2k) -- GND
        // stampVoltageSource(0, 2, ...): V(2) - V(0) = 5 → V(2) = 5
        const m = new MNAMatrix(3, 2); // 2 non-ground nodes + 1 voltage source
        m.stampResistor(2, 1, 1000);
        m.stampResistor(1, 0, 2000);
        m.stampVoltageSource(0, 2, 0, 5);

        m.saveOrig();
        m.luFactor();
        m.luSolve();

        expect(m.rightSide[0]).toBeCloseTo(3.33333, 4);
        expect(m.rightSide[1]).toBeCloseTo(5, 4);
    });
});
