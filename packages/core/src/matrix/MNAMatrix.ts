// ============================================================
// MNA Matrix — Dense matrix using flat Float64Array storage
// Row-major: data[row * stride + col]
// ============================================================

import { RowType, type RowInfo } from '@circuitjs/shared';
import { createRowInfo } from './RowInfo.js';
import { LUSolver } from './LUSolver.js';

export class MNAMatrix {
    data: Float64Array;
    size: number;
    rightSide: Float64Array;
    numNodeRows: number;      // number of non-ground node rows (= nodeCount - 1)

    origData: Float64Array;
    origRightSide: Float64Array;

    rowInfo: RowInfo[];
    permute: Int32Array;

    circuitNonLinear: boolean;
    needsMap: boolean;

    constructor(size: number, numNodeRows: number) {
        this.size = size;
        this.numNodeRows = numNodeRows;
        const n = size * size;
        this.data = new Float64Array(n);
        this.rightSide = new Float64Array(size);
        this.origData = new Float64Array(n);
        this.origRightSide = new Float64Array(size);
        this.rowInfo = [];
        this.permute = new Int32Array(size);
        this.circuitNonLinear = false;
        this.needsMap = false;

        for (let i = 0; i < size; i++) {
            this.rowInfo.push(createRowInfo());
        }
    }

    resize(newSize: number, newNumNodeRows: number): void {
        this.size = newSize;
        this.numNodeRows = newNumNodeRows;
        const n = newSize * newSize;
        this.data = new Float64Array(n);
        this.rightSide = new Float64Array(newSize);
        this.origData = new Float64Array(n);
        this.origRightSide = new Float64Array(newSize);
        this.permute = new Int32Array(newSize);

        this.rowInfo = [];
        for (let i = 0; i < newSize; i++) {
            this.rowInfo.push(createRowInfo());
        }
        this.needsMap = false;
    }

    // ---- Stamp helpers (called by components) ----

    /** Stamp a value at (row, col), translating indices if needsMap is set */
    addValue(row: number, col: number, value: number): void {
        if (row > 0 && col > 0) {
            if (this.needsMap) {
                row = this.rowInfo[row - 1].mapRow;
                const ri = this.rowInfo[col - 1];
                if (ri.type === RowType.ROW_CONST) {
                    this.rightSide[row] -= value * ri.value;
                    return;
                }
                col = ri.mapCol;
            } else {
                row--;
                col--;
            }
            this.data[row * this.size + col] += value;
        }
    }

    /** Stamp right side value (current source into node i) */
    addRightSide(row: number, value: number): void {
        if (row > 0) {
            if (this.needsMap) {
                row = this.rowInfo[row - 1].mapRow;
            } else {
                row--;
            }
            this.rightSide[row] += value;
        }
    }

    /** Mark a right side value as changing each iteration */
    markRightSideChanging(row: number): void {
        if (row > 0) {
            this.rowInfo[row - 1].rsChanges = true;
        }
    }

    /** Mark a row's matrix entries as changing each iteration (non-linear) */
    markNonLinear(row: number): void {
        if (row > 0) {
            this.rowInfo[row - 1].lsChanges = true;
        }
    }

    /** Update voltage source value in doStep() */
    updateVoltageSource(_n1: number, _n2: number, vsIndex: number, voltage: number): void {
        const vn = this.numNodeRows + 1 + vsIndex; // 1-based row, past all circuit nodes
        this.addRightSide(vn, voltage);
    }

    // ---- Resistor / conductance helpers ----

    stampResistor(n1: number, n2: number, resistance: number): void {
        const r0 = 1 / resistance;
        this.addValue(n1, n1, r0);
        this.addValue(n2, n2, r0);
        this.addValue(n1, n2, -r0);
        this.addValue(n2, n1, -r0);
    }

    stampConductance(n1: number, n2: number, r0: number): void {
        this.addValue(n1, n1, r0);
        this.addValue(n2, n2, r0);
        this.addValue(n1, n2, -r0);
        this.addValue(n2, n1, -r0);
    }

    stampVoltageSource(n1: number, n2: number, vsIndex: number, voltage?: number): void {
        const vn = this.numNodeRows + 1 + vsIndex; // 1-based row, past all circuit nodes
        this.addValue(vn, n1, -1);
        this.addValue(vn, n2, 1);
        if (voltage !== undefined) {
            this.addRightSide(vn, voltage);
        } else {
            this.markRightSideChanging(vn);
        }
        this.addValue(n1, vn, 1);
        this.addValue(n2, vn, -1);
    }

    stampCurrentSource(n1: number, n2: number, current: number): void {
        this.addRightSide(n1, -current);
        this.addRightSide(n2, current);
    }

    stampCCCS(n1: number, n2: number, vsIndex: number, gain: number): void {
        const vn = this.numNodeRows + 1 + vsIndex;
        this.addValue(n1, vn, gain);
        this.addValue(n2, vn, -gain);
    }

    stampVCCurrentSource(
        cn1: number, cn2: number,
        vn1: number, vn2: number,
        g: number,
    ): void {
        this.addValue(cn1, vn1, g);
        this.addValue(cn2, vn2, g);
        this.addValue(cn1, vn2, -g);
        this.addValue(cn2, vn1, -g);
    }

    stampVCVS(n1: number, n2: number, coef: number, vsIndex: number): void {
        const vn = this.numNodeRows + 1 + vsIndex;
        this.addValue(vn, n1, coef);
        this.addValue(vn, n2, -coef);
    }

    // ---- Save / Restore for nonlinear iteration ----

    saveOrig(): void {
        this.origData.set(this.data);
        this.origRightSide.set(this.rightSide);
    }

    restoreOrig(): void {
        this.data.set(this.origData);
        this.rightSide.set(this.origRightSide);
    }

    resetToOrig(): void {
        // Restore ALL rightSide values to originals, then doStep will add changes
        this.rightSide.set(this.origRightSide);
        if (this.circuitNonLinear) {
            this.data.set(this.origData);
        }
    }

    // ---- Matrix simplification ----

    /** Remove ROW_CONST rows/cols to produce a smaller matrix */
    simplify(): boolean {
        const n = this.size;

        // Find rows with only one non-zero non-const entry
        for (let restart = 0; restart < n; restart++) {
            const i = restart;
            const ri = this.rowInfo[i];
            if (ri.lsChanges || ri.dropRow || ri.rsChanges) continue;

            let rsAdd = 0;
            let qp = -1;
            let qv = 0;
            let j: number;

            for (j = 0; j < n; j++) {
                const q = this.data[i * n + j];
                if (this.rowInfo[j].type === RowType.ROW_CONST) {
                    rsAdd -= this.rowInfo[j].value * q;
                    continue;
                }
                if (q === 0) continue;
                if (qp === -1) {
                    qp = j;
                    qv = q;
                    continue;
                }
                break;
            }

            if (j === n && qp !== -1) {
                const elt = this.rowInfo[qp];
                if (elt.type !== RowType.ROW_NORMAL) continue;
                elt.type = RowType.ROW_CONST;
                elt.value = (this.rightSide[i] + rsAdd) / qv;
                this.rowInfo[i].dropRow = true;
                restart = -1; // start over
            }
        }

        // Build the simplified matrix
        let nn = 0;
        for (let i = 0; i < n; i++) {
            const elt = this.rowInfo[i];
            if (elt.type === RowType.ROW_NORMAL) {
                elt.mapCol = nn++;
            } else {
                elt.mapCol = -1;
            }
        }

        const newSize = nn;
        if (newSize === n) return true; // no simplification

        const newData = new Float64Array(newSize * newSize);
        const newRS = new Float64Array(newSize);
        let ii = 0;

        for (let i = 0; i < n; i++) {
            const rri = this.rowInfo[i];
            if (rri.dropRow) {
                rri.mapRow = -1;
                continue;
            }
            newRS[ii] = this.rightSide[i];
            rri.mapRow = ii;
            for (let j = 0; j < n; j++) {
                const rj = this.rowInfo[j];
                if (rj.type === RowType.ROW_CONST) {
                    newRS[ii] -= rj.value * this.data[i * n + j];
                } else {
                    newData[ii * newSize + rj.mapCol] += this.data[i * n + j];
                }
            }
            ii++;
        }

        this.data = newData;
        this.rightSide = newRS;
        this.size = newSize;
        this.needsMap = true;

        // Save orig for the new matrix
        this.origData = new Float64Array(newData);
        this.origRightSide = new Float64Array(newRS);

        return true;
    }

    // ---- LU factor and solve ----

    luFactor(): boolean {
        return LUSolver.factor(this.data, this.size, this.permute);
    }

    luSolve(): void {
        LUSolver.solve(this.data, this.size, this.permute, this.rightSide);
    }
}
