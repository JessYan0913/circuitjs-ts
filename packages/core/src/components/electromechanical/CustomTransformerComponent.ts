import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics, Point } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import {
    setVoltageColor, drawThickLinePt,
    drawPost, drawDots,
} from '../drawutils.js';

/**
 * Custom Transformer — arbitrary number of coils with configurable turns ratios.
 * Port of Java CustomTransformerElm.
 *
 * Description format:
 *   "t1,t2: t3,t4" — comma separates coils, colon separates primary from secondary
 *   Numbers are turns ratios, negative = reverse polarity
 *   "+" connects coils (shares a node)
 * Example: "1,1:2,2" = 2 primary coils (ratio 1 each), 2 secondary coils (ratio 2 each)
 */
export class CustomTransformerComponent extends CircuitComponent {
    inductance = 4;
    couplingCoef = 0.999;
    width = 32;
    description = '1,1:1';

    coilCount = 0;
    nodeCount = 0;
    coilNodes: number[] = [];      // 2 per coil: start node, end node
    coilInductances: number[] = [];
    coilPolarities: number[] = [];
    coilCurrents: number[] = [];
    coilCurCounts: number[] = [];
    coilCurSourceValues: number[] = [];
    nodeCurrents: number[] = [];
    needDots = true;

    // Transform matrix (coilCount × coilCount)
    private xformMatrix: number[][] | null = [];
    private useTrapezoidal = true;
    private _voltdiff: number[] = [];

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.noDiagonal = true;
        this.parseDescription(this.description);
    }

    override getDumpType(): number | string { return 406; }

    override handleDumpData(tokens: string[], startIndex: number): void {
        if (tokens.length > startIndex) this.inductance = parseFloat(tokens[startIndex]);
        if (tokens.length > startIndex + 1) this.couplingCoef = parseFloat(tokens[startIndex + 1]);
        if (tokens.length > startIndex + 2) {
            // Description is escaped in Java: CustomLogicModel.unescape
            this.description = tokens[startIndex + 2];
        }
        if (tokens.length > startIndex + 3) {
            const savedCoilCount = parseInt(tokens[startIndex + 3]);
            this.coilCurrents = [];
            for (let i = 0; i < savedCoilCount && i + startIndex + 4 < tokens.length; i++) {
                this.coilCurrents[i] = parseFloat(tokens[startIndex + 4 + i]);
            }
        }
        this.parseDescription(this.description);
        // Restore currents
        if (this.coilCurrents.length > 0) {
            for (let i = 0; i < Math.min(this.coilCount, this.coilCurrents.length); i++) {
                // Keep parsed value
            }
        }
    }

    override dump(): string {
        let s = super.dump() + ` ${this.inductance} ${this.couplingCoef} ${this.description} ${this.coilCount}`;
        for (let i = 0; i < this.coilCount; i++) {
            s += ` ${this.coilCurrents[i] || 0}`;
        }
        return s;
    }

    override getPostCount(): number { return this.nodeCount; }

    override getPost(n: number): Point {
        // Map from node index to physical post position
        // This is approximate - uses the node positions
        if (n === 0) return this.point1;
        if (n === 1) return this.point2;
        return { x: (this.point1.x + this.point2.x) / 2, y: (this.point1.y + this.point2.y) / 2 };
    }

    override reset(): void {
        for (let i = 0; i < this.volts.length; i++) this.volts[i] = 0;
        for (let i = 0; i < this.coilCount; i++) {
            this.coilCurrents[i] = 0;
            this.coilCurCounts[i] = 0;
        }
    }

    private parseDescription(desc: string): void {
        // Handle escaped format (Java CustomLogicModel.escape/unescape)
        if (desc.includes('~') || desc.includes('`')) {
            desc = desc.replace(/~/g, '+').replace(/`/g, ',');
        }

        // Collect raw tokens with connection markers
        // First split by ',' to get segments (separate physical windings)
        const segments = desc.split(',');
        const allTokens: { ratio: number; connected: boolean }[] = [];
        this.needDots = true;

        for (const segment of segments) {
            // Split each segment by ':' (primary:secondary boundary)
            const halves = segment.split(':');
            for (const half of halves) {
                // Split by '+' to find connected coils (share a node)
                const plusParts = half.split('+');
                for (let i = 0; i < plusParts.length; i++) {
                    const part = plusParts[i].trim();
                    if (part.length === 0) continue;
                    const ratio = parseFloat(part);
                    if (isNaN(ratio)) continue;
                    // '+' means this coil is connected to previous (share node)
                    allTokens.push({ ratio, connected: (i > 0) });
                }
            }
        }

        this.coilCount = allTokens.length;
        if (this.coilCount === 0) {
            this.coilCount = 2;
            // Default: 2 coils, ratio 1 each
        }

        // Allocate
        this.coilInductances = new Array(this.coilCount);
        this.coilPolarities = new Array(this.coilCount);
        this.coilCurrents = new Array(this.coilCount);
        this.coilCurCounts = new Array(this.coilCount);
        this.coilCurSourceValues = new Array(this.coilCount);
        this._voltdiff = new Array(this.coilCount);
        this.nodeCurrents = [];

        // Build node assignment: each coil gets 2 nodes
        // '+' connected coils share a node (the end of previous = start of current)
        this.nodeCount = 0;
        this.coilNodes = [];
        for (let i = 0; i < this.coilCount; i++) {
            const token = allTokens.length > 0 ? allTokens[i] : { ratio: 1, connected: false };
            const t = token.ratio;
            this.coilPolarities[i] = t >= 0 ? 1 : -1;
            const absT = Math.abs(t);
            // Inductance proportional to turns squared (matches Java)
            this.coilInductances[i] = absT * absT * this.inductance;

            // If connected to previous coil (via +), share the previous coil's end node
            if (token.connected && i > 0) {
                // Share node: start = previous coil's end node
                this.coilNodes.push(this.coilNodes[this.coilNodes.length - 1]);
                this.coilNodes.push(this.nodeCount);
                this.nodeCount++;
            } else {
                this.coilNodes.push(this.nodeCount);
                this.coilNodes.push(this.nodeCount + 1);
                this.nodeCount += 2;
            }

            this.coilCurrents[i] = 0;
            this.coilCurCounts[i] = 0;
        }

        // Re-allocate nodes
        this.allocNodes();
        this.setPoints();
    }

    override stamp(context: StampContext): void {
        if (context.timeStep === 0 || this.coilCount === 0) return;

        this.useTrapezoidal = context.integrationMethod !== 'backwardEuler';

        // Build the inductance matrix
        const n = this.coilCount;
        const mat: number[][] = [];
        for (let i = 0; i < n; i++) {
            mat[i] = new Array(n);
            for (let j = 0; j < n; j++) {
                if (i === j) {
                    mat[i][j] = this.coilInductances[i];
                } else {
                    const li = this.coilInductances[i];
                    const lj = this.coilInductances[j];
                    const p = this.coilPolarities[i] * this.coilPolarities[j];
                    mat[i][j] = this.couplingCoef * Math.sqrt(li * lj) * p;
                }
            }
        }

        // Invert the matrix
        this.xformMatrix = this.invertMatrix(mat);

        if (!this.xformMatrix) return;

        // Multiply by timeStep
        const ts = this.useTrapezoidal ? context.timeStep / 2 : context.timeStep;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                this.xformMatrix[i][j] *= ts;
            }
        }

        // Stamp conductances and VCCSs
        for (let i = 0; i < n; i++) {
            const ni = this.coilNodes[i * 2];
            const ni2 = this.coilNodes[i * 2 + 1];
            for (let j = 0; j < n; j++) {
                const nj = this.coilNodes[j * 2];
                const nj2 = this.coilNodes[j * 2 + 1];
                if (i === j) {
                    context.stampConductance(this.nodes[ni], this.nodes[ni2], this.xformMatrix[i][j]);
                } else {
                    context.stampVCCurrentSource(
                        this.nodes[ni], this.nodes[ni2],
                        this.nodes[nj], this.nodes[nj2],
                        this.xformMatrix[i][j],
                    );
                }
            }
            context.markRightSideChanging(this.nodes[ni]);
            context.markRightSideChanging(this.nodes[ni2]);
        }

        // Initialize node currents
        this.nodeCurrents = new Array(this.nodeCount);
    }

    private invertMatrix(mat: number[][]): number[][] | null {
        const n = mat.length;
        // Augmented matrix [A | I]
        const aug: number[][] = [];
        for (let i = 0; i < n; i++) {
            aug[i] = new Array(2 * n);
            for (let j = 0; j < n; j++) {
                aug[i][j] = mat[i][j];
            }
            aug[i][n + i] = 1;
        }

        // Gaussian elimination with partial pivoting
        for (let col = 0; col < n; col++) {
            // Find pivot
            let maxVal = Math.abs(aug[col][col]);
            let maxRow = col;
            for (let row = col + 1; row < n; row++) {
                const v = Math.abs(aug[row][col]);
                if (v > maxVal) { maxVal = v; maxRow = row; }
            }
            if (maxVal < 1e-30) return null;

            // Swap rows
            if (maxRow !== col) {
                const tmp = aug[col];
                aug[col] = aug[maxRow];
                aug[maxRow] = tmp;
            }

            // Scale pivot row
            const pivot = aug[col][col];
            for (let j = col; j < 2 * n; j++) {
                aug[col][j] /= pivot;
            }

            // Eliminate other rows
            for (let row = 0; row < n; row++) {
                if (row !== col) {
                    const factor = aug[row][col];
                    for (let j = col; j < 2 * n; j++) {
                        aug[row][j] -= factor * aug[col][j];
                    }
                }
            }
        }

        // Extract inverse
        const inv: number[][] = [];
        for (let i = 0; i < n; i++) {
            inv[i] = new Array(n);
            for (let j = 0; j < n; j++) {
                inv[i][j] = aug[i][n + j];
            }
        }
        return inv;
    }

    override startIteration(): void {
        if (!this.xformMatrix) return;
        const n = this.coilCount;

        // Compute voltdiff for each coil
        for (let i = 0; i < n; i++) {
            const ni = this.coilNodes[i * 2];
            const ni2 = this.coilNodes[i * 2 + 1];
            this._voltdiff[i] = this.volts[ni] - this.volts[ni2];
        }

        // Compute current source values from companion model
        for (let i = 0; i < n; i++) {
            if (this.useTrapezoidal) {
                let sum = this.coilCurrents[i];
                for (let j = 0; j < n; j++) {
                    sum += this._voltdiff[j] * this.xformMatrix[i][j];
                }
                this.coilCurSourceValues[i] = sum;
            } else {
                this.coilCurSourceValues[i] = this.coilCurrents[i];
            }
        }
    }

    override doStep(context: StampContext): void {
        if (!this.xformMatrix) return;
        const n = this.coilCount;

        for (let i = 0; i < n; i++) {
            const ni = this.coilNodes[i * 2];
            const ni2 = this.coilNodes[i * 2 + 1];
            context.stampCurrentSource(this.nodes[ni], this.nodes[ni2], this.coilCurSourceValues[i]);
        }
    }

    override calculateCurrent(): void {
        if (!this.xformMatrix) return;

        const n = this.coilCount;

        // Zero node currents
        for (let i = 0; i < this.nodeCount; i++) {
            this.nodeCurrents[i] = 0;
        }

        for (let i = 0; i < n; i++) {
            const ni = this.coilNodes[i * 2];
            const ni2 = this.coilNodes[i * 2 + 1];
            let val = this.coilCurSourceValues[i];
            for (let j = 0; j < n; j++) {
                val += this._voltdiff[j] * this.xformMatrix[i][j];
            }
            this.coilCurrents[i] = val;
            this.nodeCurrents[ni] += val;
            this.nodeCurrents[ni2] -= val;
        }

        // External current = sum of all coil currents from node 0
        this.current = this.nodeCurrents[0];
    }

    override getCurrentIntoNode(n: number): number {
        if (n < this.nodeCount) return -this.nodeCurrents[n];
        return 0;
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Base Inductance (H)', value: this.inductance, min: 0.001, max: 1000 };
        if (n === 1) {
            return {
                name: 'Description',
                text: this.description,
                // In Java, this shows a link to a help page
            };
        }
        if (n === 2) return { name: 'Coupling Coefficient', value: this.couplingCoef, min: 0, max: 0.999999 };
        if (n === 3) return { name: 'Trapezoidal Approximation', checkbox: true, checkboxState: this.useTrapezoidal };
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 0 && ei.value !== undefined) {
            this.inductance = ei.value;
            this.parseDescription(this.description);
        }
        if (_n === 1 && ei.text !== undefined) {
            this.description = ei.text;
            this.parseDescription(this.description);
        }
        if (_n === 2 && ei.value !== undefined) {
            this.couplingCoef = ei.value;
        }
        if (_n === 3 && ei.checkboxState !== undefined) {
            this.useTrapezoidal = ei.checkboxState;
        }
    }

    override getInfo(): string[] {
        const arr: string[] = ['transformer (custom)'];
        arr.push(`L = ${this.inductance} H`);
        for (let i = 0; i < this.coilCount; i++) {
            const ni = this.coilNodes[i * 2];
            const ni2 = this.coilNodes[i * 2 + 1];
            arr.push(`Vd${i} = ${(this.volts[ni] - this.volts[ni2]).toFixed(3)} V`);
            arr.push(`I${i} = ${(this.coilCurrents[i] * 1000).toFixed(2)} mA`);
        }
        return arr;
    }

    override draw(g: Graphics): void {
        const hs = this.width / 2;
        this.calcLeads(this.width);

        // Draw simplified transformer symbol
        const midX = (this.point1.x + this.point2.x) / 2;
        const midY = (this.point1.y + this.point2.y) / 2;

        // Primary side lead
        setVoltageColor(g, this.volts[0], this);
        drawThickLinePt(g, this.point1, { x: this.point1.x, y: midY });

        // Secondary side lead
        setVoltageColor(g, this.volts[1] || this.volts[0], this);
        drawThickLinePt(g, this.point2, { x: this.point2.x, y: midY });

        // Coil symbol
        g.setColor(this.needsHighlight() ? '#00FFFF' : '#808080');
        g.setLineWidth(2);

        const coilsPerSide = Math.min(this.coilCount, 4);
        const spacing = hs * 2 / (coilsPerSide + 1);

        for (let i = 0; i < coilsPerSide; i++) {
            const y = midY - hs + spacing * (i + 1);
            // Primary arch
            const cx1 = this.point1.x + (midX - this.point1.x) * 0.6;
            g.drawLine(this.point1.x + 10, y - 4, cx1, y - 5);
            g.drawLine(this.point1.x + 10, y + 4, cx1, y + 5);

            // Secondary arch
            const cx2 = midX + (this.point2.x - midX) * 0.4;
            g.drawLine(cx2, y - 5, this.point2.x - 10, y - 4);
            g.drawLine(cx2, y + 5, this.point2.x - 10, y + 4);
        }

        // Core
        g.setLineWidth(1);
        g.setColor('#808080');
        const coreX1 = this.point1.x + (midX - this.point1.x) * 0.7;
        const coreX2 = midX + (this.point2.x - midX) * 0.7;
        g.drawLine(coreX1, midY - hs, coreX1, midY + hs);
        g.drawLine(coreX2, midY - hs, coreX2, midY + hs);

        // Posts for all nodes
        for (let i = 0; i < this.nodeCount && i < 10; i++) {
            const px = this.point1.x + (this.point2.x - this.point1.x) * (i / Math.max(1, this.nodeCount - 1));
            const py = (i % 2 === 0) ? midY - hs - 15 : midY + hs + 15;
            drawPost(g, { x: px, y: Math.round(py) });
        }
    }
}

registerComponent(406, 'CustomTransformerElm', CustomTransformerComponent);
