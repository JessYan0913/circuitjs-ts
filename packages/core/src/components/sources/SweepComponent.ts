import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { setVoltageColor, drawThickLinePt, drawThickCircle, drawDots, drawPost } from '../drawutils.js';

/** Frequency sweep generator — linear or logarithmic sweep */
export class SweepComponent extends CircuitComponent {
    static readonly FLAG_LOG = 1;
    static readonly FLAG_BIDIR = 2;

    minF = 20;
    maxF = 4000;
    maxV = 5;
    sweepTime = 0.1;

    // Internal state
    frequency = 20;
    freqTime = 0;
    fadd = 0;
    fmul = 1;
    dir = 1;
    savedTimeStep = -1;
    v = 0;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.flags = SweepComponent.FLAG_BIDIR;
        this.reset();
    }

    getDumpType(): number | string { return 170; }
    getPostCount(): number { return 1; }
    getVoltageSourceCount(): number { return 1; }

    override dump(): string {
        return super.dump() + ` ${this.minF} ${this.maxF} ${this.maxV} ${this.sweepTime}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.minF = parseFloat(tokens[start]) || 20;
        if (tokens.length > start + 1) this.maxF = parseFloat(tokens[start + 1]) || 4000;
        if (tokens.length > start + 2) this.maxV = parseFloat(tokens[start + 2]) || 5;
        if (tokens.length > start + 3) this.sweepTime = parseFloat(tokens[start + 3]) || 0.1;
        this.reset();
    }

    override reset(): void {
        this.frequency = this.minF;
        this.freqTime = 0;
        this.dir = 1;
        this.savedTimeStep = -1;
        this.setParams(1e-5);
    }

    setParams(ts: number): void {
        if (this.frequency < this.minF || this.frequency > this.maxF) {
            this.frequency = this.minF;
            this.freqTime = 0;
            this.dir = 1;
        }
        if ((this.flags & SweepComponent.FLAG_LOG) === 0) {
            this.fadd = this.dir * ts * (this.maxF - this.minF) / this.sweepTime;
            this.fmul = 1;
        } else {
            this.fadd = 0;
            this.fmul = Math.pow(this.maxF / this.minF, this.dir * ts / this.sweepTime);
        }
        this.savedTimeStep = ts;
    }

    override startIteration(): void {
        const ts = this.savedTimeStep > 0 ? this.savedTimeStep : 1e-5;

        this.v = Math.sin(this.freqTime) * this.maxV;
        this.freqTime += this.frequency * 2 * Math.PI * ts;
        this.frequency = this.frequency * this.fmul + this.fadd;

        if (this.frequency >= this.maxF && this.dir === 1) {
            if ((this.flags & SweepComponent.FLAG_BIDIR) !== 0) {
                this.fadd = -this.fadd;
                this.fmul = 1 / this.fmul;
                this.dir = -1;
            } else {
                this.frequency = this.minF;
            }
        }
        if (this.frequency <= this.minF && this.dir === -1) {
            this.fadd = -this.fadd;
            this.fmul = 1 / this.fmul;
            this.dir = 1;
        }
    }

    override stamp(context: StampContext): void {
        context.stampVoltageSource(0, this.nodes[0], this.voltSource);
    }

    override doStep(context: StampContext): void {
        // Save timeStep from context and recompute params if it changed
        if (context.timeStep !== this.savedTimeStep) {
            this.setParams(context.timeStep);
        }
        context.updateVoltageSource(0, this.nodes[0], this.voltSource, this.v);
    }

    override getVoltageDiff(): number { return this.volts[0]; }

    override setPoints(): void {
        super.setPoints();
        const circleSize = 17;
        if (this.dn > 0) {
            const f = 1 - circleSize / this.dn;
            this.lead1 = {
                x: Math.floor(this.point1.x * (1 - f) + this.point2.x * f + 0.48),
                y: Math.floor(this.point1.y * (1 - f) + this.point2.y * f + 0.48),
            };
        }
    }

    override draw(g: Graphics): void {
        this.setBboxPts(this.point1, this.point2, 17);
        setVoltageColor(g, this.volts[0], this);
        drawThickLinePt(g, this.point1, this.lead1);

        g.setColor(this.needsHighlight() ? '#00FFFF' : '#808080');
        const xc = this.point2.x;
        const yc = this.point2.y;
        const circleSize = 17;
        drawThickCircle(g, xc, yc, circleSize);
        this.adjustBbox(xc - circleSize, yc - circleSize, xc + circleSize, yc + circleSize);

        // Draw animated sine wave inside circle with frequency-dependent compression
        const xl = 10;
        const w = 1 + 2 * (this.frequency - this.minF) / (this.maxF - this.minF);
        const ctx = g.getContext();
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#FFFFFF';
        for (let i = -xl; i <= xl; i++) {
            const yy = yc + Math.round(0.95 * Math.sin(i * Math.PI * w / xl) * 8);
            if (i === -xl) ctx.moveTo(xc + i, yy);
            else ctx.lineTo(xc + i, yy);
        }
        ctx.stroke();
        ctx.lineWidth = 1;

        drawDots(g, this.point1, this.lead1, this.curcount);
        drawPost(g, this.point1);
    }

    override getInfo(): string[] {
        const logFlag = (this.flags & SweepComponent.FLAG_LOG) !== 0;
        return [
            `sweep ${logFlag ? '(log)' : '(linear)'}`,
            `V = ${this.volts[0].toFixed(3)} V`,
            `f = ${this.frequency.toFixed(1)} Hz`,
            `range = ${this.minF.toFixed(1)} .. ${this.maxF.toFixed(1)} Hz`,
        ];
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Min Frequency (Hz)', value: this.minF };
        if (n === 1) return { name: 'Max Frequency (Hz)', value: this.maxF };
        if (n === 2) return { name: 'Sweep Time (s)', value: this.sweepTime };
        if (n === 3) return { name: 'Logarithmic', checkbox: true, checkboxState: (this.flags & SweepComponent.FLAG_LOG) !== 0 };
        if (n === 4) return { name: 'Max Voltage', value: this.maxV };
        if (n === 5) return { name: 'Bidirectional', checkbox: true, checkboxState: (this.flags & SweepComponent.FLAG_BIDIR) !== 0 };
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 0 && ei.value !== undefined) this.minF = ei.value;
        if (_n === 1 && ei.value !== undefined) this.maxF = ei.value;
        if (_n === 2 && ei.value !== undefined) this.sweepTime = ei.value;
        if (_n === 4 && ei.value !== undefined) this.maxV = ei.value;
        if (_n === 3 && ei.checkboxState !== undefined) {
            if (ei.checkboxState) this.flags |= SweepComponent.FLAG_LOG;
            else this.flags &= ~SweepComponent.FLAG_LOG;
        }
        if (_n === 5 && ei.checkboxState !== undefined) {
            if (ei.checkboxState) this.flags |= SweepComponent.FLAG_BIDIR;
            else this.flags &= ~SweepComponent.FLAG_BIDIR;
        }
        this.reset();
    }

    override getPower(): number { return -this.getVoltageDiff() * this.current; }
}

registerComponent(170, 'SweepElm', SweepComponent);
