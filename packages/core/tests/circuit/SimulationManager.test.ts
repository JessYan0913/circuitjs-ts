import { describe, test, expect } from 'vitest';
import { MNAMatrix } from '../../src/matrix/MNAMatrix.js';

describe('SimulationManager', () => {
    test('resistor divider via direct MNAMatrix', () => {
        // Vsrc(5V) between GND(0) and N1,
        // R1(1k) between N1 and N2,
        // R2(2k) between N2 and GND(0)
        //
        // 2 non-ground nodes (N1, N2) + 1 voltage source
        const m = new MNAMatrix(3, 2);

        m.stampVoltageSource(0, 1, 0, 5);   // Vsrc: V(1)-V(0)=5
        m.stampResistor(1, 2, 1000);        // R1: 1k between N1(1) and N2(2)
        m.stampResistor(2, 0, 2000);        // R2: 2k between N2(2) and GND(0)

        m.saveOrig();

        const d = m.data;
        const n = m.size;
        console.log('Matrix:');
        for (let i = 0; i < n; i++) {
            const row: string[] = [];
            for (let j = 0; j < n; j++) row.push(d[i * n + j].toFixed(6));
            console.log(`  [${row.join(', ')}]  |  ${m.rightSide[i].toFixed(4)}`);
        }

        // Verify no zero rows
        for (let i = 0; i < n; i++) {
            let allZero = true;
            for (let j = 0; j < n; j++) { if (d[i * n + j] !== 0) { allZero = false; break; } }
            expect(allZero).toBe(false);
        }

        const ok = m.luFactor();
        expect(ok).toBe(true);
        m.luSolve();

        console.log('Solution:', m.rightSide.map(v => v.toFixed(6)).join(', '));
        expect(m.rightSide[0]).toBeCloseTo(5, 4);      // N1 = 5V
        expect(m.rightSide[1]).toBeCloseTo(3.33333, 3); // N2 = 3.333V
    });
});
