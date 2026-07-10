// ============================================================
// LU Solver — Crout's method with partial pivoting
// Direct port of CirSim.java lines 5012-5123
// ============================================================

export class LUSolver {
    /**
     * LU factorization (Crout's method).
     * a is a flat Float64Array of size n*n, row-major.
     * ipvt is Int32Array of length n for pivot tracking.
     * Returns false if matrix is singular.
     */
    static factor(a: Float64Array, n: number, ipvt: Int32Array): boolean {
        // Crout's method; loop through columns (no all-zero-row pre-check —
        // the 1e-18 fallback handles singular pivots gracefully)
        for (let j = 0; j !== n; j++) {
            // Calculate upper triangular elements for this column
            for (let i = 0; i !== j; i++) {
                let q = a[i * n + j];
                for (let k = 0; k !== i; k++) {
                    q -= a[i * n + k] * a[k * n + j];
                }
                a[i * n + j] = q;
            }

            // Calculate lower triangular elements for this column
            let largest = 0;
            let largestRow = -1;
            for (let i = j; i !== n; i++) {
                let q = a[i * n + j];
                for (let k = 0; k !== j; k++) {
                    q -= a[i * n + k] * a[k * n + j];
                }
                a[i * n + j] = q;
                const x = Math.abs(q);
                if (x >= largest) {
                    largest = x;
                    largestRow = i;
                }
            }

            // Pivoting
            if (j !== largestRow) {
                for (let k = 0; k !== n; k++) {
                    const x = a[largestRow * n + k];
                    a[largestRow * n + k] = a[j * n + k];
                    a[j * n + k] = x;
                }
            }

            // Keep track of row interchanges
            ipvt[j] = largestRow;

            // Avoid zeros
            if (a[j * n + j] === 0.0) {
                a[j * n + j] = 1e-18;
            }

            if (j !== n - 1) {
                const mult = 1.0 / a[j * n + j];
                for (let i = j + 1; i !== n; i++) {
                    a[i * n + j] *= mult;
                }
            }
        }

        return true;
    }

    /**
     * Solves the set of n linear equations using a LU factorization
     * previously performed by factor(). On input, b contains the right
     * hand side; on output, contains the solution.
     */
    static solve(a: Float64Array, n: number, ipvt: Int32Array, b: Float64Array): void {
        let i: number;

        // Find first nonzero b element and apply row swaps
        for (i = 0; i !== n; i++) {
            const row = ipvt[i];
            const swap = b[row];
            b[row] = b[i];
            b[i] = swap;
            if (swap !== 0) break;
        }

        // Forward substitution (solve Ly = b) with row swaps
        const bi = i;
        i++;
        for (; i < n; i++) {
            const row = ipvt[i];
            let tot = b[row];
            b[row] = b[i];
            for (let j = bi; j < i; j++) {
                tot -= a[i * n + j] * b[j];
            }
            b[i] = tot;
        }

        // Back substitution (solve Ux = y)
        for (i = n - 1; i >= 0; i--) {
            let tot = b[i];
            for (let j = i + 1; j !== n; j++) {
                tot -= a[i * n + j] * b[j];
            }
            b[i] = tot / a[i * n + i];
        }
    }
}
