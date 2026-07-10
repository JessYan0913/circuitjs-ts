import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics, Point } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import {
    setVoltageColor, drawThickLinePt,
    drawPost, drawDots, drawCenteredText,
} from '../drawutils.js';

/**
 * Transmission Line — delay line model.
 * Port of Java TransLineElm.
 *
 * Node arrangement:
 *   0 = left bottom    1 = right bottom
 *   2 = left top       3 = right top
 *   4 = internal left   5 = internal right (voltage source nodes)
 */
export class TransLineComponent extends CircuitComponent {
    delay = 1e-6;      // delay in seconds
    imped = 75;        // characteristic impedance (ohms)
    width = 16;

    private voltageL: Float64Array | null = null;
    private voltageR: Float64Array | null = null;
    private lenSteps = 0;
    private ptr = 0;

    current1 = 0;
    current2 = 0;
    curCount1 = 0;
    curCount2 = 0;

    private voltSource1 = -1;
    private voltSource2 = -1;
    private inner: Point[] = [];

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.noDiagonal = true;
        this.delay = 1000 * 5e-6; // 1000 * default maxTimeStep
    }

    override getDumpType(): number | string { return 171; }

    override handleDumpData(tokens: string[], startIndex: number): void {
        if (tokens.length > startIndex) {
            this.delay = parseFloat(tokens[startIndex]);
        }
        if (tokens.length > startIndex + 1) {
            this.imped = parseFloat(tokens[startIndex + 1]);
        }
        if (tokens.length > startIndex + 2) {
            this.width = parseFloat(tokens[startIndex + 2]);
        }
    }

    override dump(): string {
        return super.dump() + ` ${this.delay} ${this.imped} ${this.width} ${0.}`;
    }

    override getPostCount(): number { return 4; }
    override getInternalNodeCount(): number { return 2; }
    override getVoltageSourceCount(): number { return 2; }

    override setVoltageSource(n: number, v: number): void {
        if (n === 0) this.voltSource1 = v;
        else this.voltSource2 = v;
    }

    override reset(): void {
        super.reset();
        // Recalculate buffer size based on delay and max timestep
        // Note: this is approximate — the actual timestep isn't known yet.
        // The initial allocation is done from sim.maxTimeStep via constructor.
        this.allocateBuffers();
    }

    private allocateBuffers(): void {
        this.lenSteps = Math.max(1, Math.ceil(this.delay / 5e-6));
        if (this.lenSteps > 100000) {
            this.voltageL = null;
            this.voltageR = null;
        } else {
            this.voltageL = new Float64Array(this.lenSteps);
            this.voltageR = new Float64Array(this.lenSteps);
        }
        this.ptr = 0;
    }

    override setPoints(): void {
        super.setPoints();
        const hs = this.width / 2;
        const pt1 = this.point1;
        const pt2 = this.point2;

        this.inner = [
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 },
        ];

        this.setPostByInterp(0, pt1, pt2, 0, -hs);
        this.setPostByInterp(1, pt1, pt2, 1, -hs);
        this.setPostByInterp(2, pt1, pt2, 0, hs);
        this.setPostByInterp(3, pt1, pt2, 1, hs);
    }

    private setPostByInterp(idx: number, a: { x: number; y: number }, b: { x: number; y: number }, f: number, perp: number): void {
        const gx = b.y - a.y;
        const gy = a.x - b.x;
        const len = Math.sqrt(gx * gx + gy * gy) || 1;
        const scale = perp / len;
        this.inner[idx] = {
            x: Math.floor(a.x * (1 - f) + b.x * f + gx * scale + 0.48),
            y: Math.floor(a.y * (1 - f) + b.y * f + gy * scale + 0.48),
        };
    }

    override stamp(context: StampContext): void {
        // Internal voltage sources
        context.stampVoltageSource(this.nodes[4], this.nodes[0], this.voltSource1, 0);
        context.stampVoltageSource(this.nodes[5], this.nodes[1], this.voltSource2, 0);

        // Impedance matching resistors
        context.stampResistor(this.nodes[2], this.nodes[4], this.imped);
        context.stampResistor(this.nodes[3], this.nodes[5], this.imped);

        // Re-allocate buffers with actual timestep
        this.lenSteps = Math.max(1, Math.ceil(this.delay / context.timeStep));
        if (this.lenSteps <= 100000) {
            this.voltageL = new Float64Array(this.lenSteps);
            this.voltageR = new Float64Array(this.lenSteps);
        } else {
            this.voltageL = null;
            this.voltageR = null;
        }
        this.ptr = 0;
    }

    override startIteration(): void {
        if (this.voltageL && this.voltageR) {
            // Store outgoing voltages
            // voltdiff = volts[2] - volts[0]; plus internal voltage drop
            this.voltageL[this.ptr] = this.volts[2] - this.volts[0] + this.volts[2] - this.volts[4];
            this.voltageR[this.ptr] = this.volts[3] - this.volts[1] + this.volts[3] - this.volts[5];
        }
    }

    override doStep(context: StampContext): void {
        if (!this.voltageL || !this.voltageR) return;

        const nextPtr = (this.ptr + 1) % this.lenSteps;
        // Output the delayed signal from the other end
        context.updateVoltageSource(this.nodes[4], this.nodes[0], this.voltSource1, -this.voltageR[nextPtr]);
        context.updateVoltageSource(this.nodes[5], this.nodes[1], this.voltSource2, -this.voltageL[nextPtr]);
    }

    override stepFinished(): void {
        this.ptr = (this.ptr + 1) % this.lenSteps;
    }

    override setCurrent(_x: number, c: number): void {
        if (_x === this.voltSource1) this.current1 = c;
        if (_x === this.voltSource2) this.current2 = c;
    }

    override getCurrentIntoNode(n: number): number {
        if (n === 0) return this.current1;
        if (n === 1) return this.current2;
        if (n === 2) return -this.current1;
        if (n === 3) return -this.current2;
        return 0;
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Delay (s)', value: this.delay, min: 1e-12, max: 1 };
        if (n === 1) return { name: 'Impedance (ohm)', value: this.imped, min: 1, max: 1000 };
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (ei.value === undefined) return;
        if (_n === 0) this.delay = ei.value;
        if (_n === 1) this.imped = ei.value;
    }

    override getInfo(): string[] {
        // Calculate approximate length at 65% velocity factor (speed of light * 0.65)
        const length = 3e8 * 0.65 * this.delay;
        const lenStr = length >= 1
            ? `${length.toFixed(2)} m`
            : `${(length * 100).toFixed(2)} cm`;

        return [
            'transmission line',
            `Z₀ = ${this.imped} Ω`,
            `Length = ${lenStr}`,
            `Delay = ${(this.delay * 1e9).toFixed(2)} ns`,
        ];
    }

    getConnection(_n1: number, _n2: number): boolean {
        return false;
    }

    override draw(g: Graphics): void {
        const v1 = this.volts[0];
        const v2 = this.volts[1];
        const v3 = this.volts[2];
        const v4 = this.volts[3];

        // Draw wires to the 4 posts
        setVoltageColor(g, v1, this);
        drawThickLinePt(g, this.point1, this.inner[0]);
        setVoltageColor(g, v2, this);
        drawThickLinePt(g, this.point2, this.inner[1]);
        setVoltageColor(g, v3, this);
        drawThickLinePt(g, this.point1, this.inner[2]);
        setVoltageColor(g, v4, this);
        drawThickLinePt(g, this.point2, this.inner[3]);

        // Two parallel lines representing the transmission line
        g.setLineWidth(2);
        g.setColor(this.needsHighlight() ? '#00FFFF' : '#808080');
        g.drawOval(this.inner[0].x - 2, this.inner[0].y - 2, 5, 5);
        g.drawOval(this.inner[1].x - 2, this.inner[1].y - 2, 5, 5);
        g.drawOval(this.inner[2].x - 2, this.inner[2].y - 2, 5, 5);
        g.drawOval(this.inner[3].x - 2, this.inner[3].y - 2, 5, 5);

        // Draw transmission line body — two parallel lines with dots
        g.setColor('#808080');
        g.setLineWidth(2);

        // Upper line: inner[2] to inner[3]
        g.drawLine(this.inner[2].x, this.inner[2].y, this.inner[3].x, this.inner[3].y);
        // Lower line: inner[0] to inner[1]
        g.drawLine(this.inner[0].x, this.inner[0].y, this.inner[1].x, this.inner[1].y);

        // Current dots
        drawDots(g, this.point1, this.inner[0], this.curCount1);
        drawDots(g, this.inner[1], this.point2, this.curCount2);

        drawPost(g, this.inner[0]);
        drawPost(g, this.inner[1]);
        drawPost(g, this.inner[2]);
        drawPost(g, this.inner[3]);
    }
}

registerComponent(171, 'TransLineElm', TransLineComponent);
