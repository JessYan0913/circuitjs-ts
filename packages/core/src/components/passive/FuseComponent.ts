import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import {
    setVoltageColor, drawThickLinePt,
    drawDots, drawPost, distance, getVoltageColor,
} from '../drawutils.js';

/**
 * Fuse (dump type 404) — i2t thermal blow model.
 * Matches Java FuseElm: accumulates heat from current, dissipates over time,
 * blows when heat exceeds i2t rating.
 */
export class FuseComponent extends CircuitComponent {
    resistance = 0.0613;
    i2t = 6.73;
    heat = 0;
    blown = false;
    readonly blownResistance = 1e9;
    private contextTimeStep = 1e-6;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
    }

    getDumpType(): number | string { return 404; }
    nonLinear(): boolean { return true; }

    stamp(context: StampContext): void {
        context.stampNonLinear(this.nodes[0]);
        context.stampNonLinear(this.nodes[1]);
    }

    startIteration(): void {
        const i = this.current;

        // accumulate heat from current
        this.heat += i * i * this.contextTimeStep;

        // dissipate heat — assume fuse can dissipate its entire i2t in 3 seconds
        this.heat -= this.contextTimeStep * this.i2t / 3;

        if (this.heat < 0) this.heat = 0;
        if (this.heat > this.i2t) this.blown = true;
    }

    doStep(context: StampContext): void {
        context.stampResistor(this.nodes[0], this.nodes[1], this.blown ? this.blownResistance : this.resistance);
        this.contextTimeStep = context.timeStep;
    }

    calculateCurrent(): void {
        const vd = this.volts[0] - this.volts[1];
        this.current = vd / (this.blown ? this.blownResistance : this.resistance);
    }

    handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start)     this.resistance = parseFloat(tokens[start]);
        if (tokens.length > start + 1) this.i2t = parseFloat(tokens[start + 1]);
        if (tokens.length > start + 2) this.heat = parseFloat(tokens[start + 2]);
        if (tokens.length > start + 3) this.blown = tokens[start + 3] === 'true';
    }

    dump(): string {
        return super.dump() + ` ${this.resistance} ${this.i2t} ${this.heat} ${this.blown}`;
    }

    reset(): void {
        super.reset();
        this.heat = 0;
        this.blown = false;
    }

    /** Temperature color — maps heat/i2t ratio to a color gradient (blue→red→yellow→white) */
    private getTempColor(g: Graphics): string {
        const c = getVoltageColor(g, this.volts[0], this);
        const temp = this.heat / this.i2t;

        // Parse RGB from hex string like #RRGGBB
        const r0 = parseInt(c.slice(1, 3), 16);
        const g0 = parseInt(c.slice(3, 5), 16);
        const b0 = parseInt(c.slice(5, 7), 16);

        if (temp < 0.3333) {
            const val = temp * 3;
            const x = Math.min(255, Math.round(255 * val));
            const r = Math.round(x + (255 - x) * r0 / 255);
            const gn = Math.round((255 - x) * g0 / 255);
            const b = Math.round((255 - x) * b0 / 255);
            return `rgb(${r},${gn},${b})`;
        }
        if (temp < 0.6667) {
            const x = Math.min(255, Math.round((temp - 0.3333) * 3 * 255));
            return `rgb(255,${x},0)`;
        }
        if (temp < 1) {
            const x = Math.min(255, Math.round((temp - 0.6666) * 3 * 255));
            return `rgb(255,255,${x})`;
        }
        return '#FFFFFF';
    }

    setPoints(): void {
        super.setPoints();
        this.calcLeads(16);
    }

    getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'I2t', value: this.i2t };
        if (n === 1) return { name: 'Resistance', value: this.resistance };
        return null;
    }

    setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 0 && ei.value !== undefined) this.i2t = ei.value;
        if (_n === 1 && ei.value !== undefined) this.resistance = ei.value;
    }

    getInfo(): string[] {
        const arr: string[] = [];
        arr[0] = this.blown ? 'fuse (blown)' : 'fuse';
        // basic info
        const vd = this.volts[0] - this.volts[1];
        arr[1] = `Vd = ${vd.toFixed(3)} V`;
        arr[2] = `I = ${this.current.toFixed(3)} A`;
        arr[3] = `R = ${this.resistance} ${String.fromCharCode(937)}`;
        arr[4] = `I2t = ${this.i2t}`;
        if (!this.blown) {
            arr[5] = `${Math.round(this.heat * 100 / this.i2t)}% melted`;
        }
        return arr;
    }

    getShortcut(): number { return 'f'.charCodeAt(0); }

    draw(g: Graphics): void {
        const segments = 16;
        const hs = 6;
        this.setBbox(this.point1.x, this.point1.y, this.point2.x, this.point2.y);
        this.calcLeads(24);

        // Draw leads with voltage color
        setVoltageColor(g, this.volts[0], this);
        drawThickLinePt(g, this.point1, this.lead1);
        setVoltageColor(g, this.volts[1], this);
        drawThickLinePt(g, this.lead2, this.point2);

        // Draw fuse body as a sine wave with temperature color
        const len = distance(this.lead1, this.lead2);
        g.save();

        const ctx = g.getContext();
        ctx.save();
        ctx.lineWidth = 3;
        ctx.translate(this.lead1.x, this.lead1.y);
        ctx.rotate(Math.atan2(this.lead2.y - this.lead1.y, this.lead2.x - this.lead1.x));
        ctx.strokeStyle = this.getTempColor(g);

        if (!this.blown) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            for (let i = 0; i <= segments; i++) {
                const x = i * len / segments;
                const y = hs * Math.sin(i * Math.PI * 2 / segments);
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        ctx.restore();
        g.restore();

        drawDots(g, this.point1, this.lead1, this.curcount);
        drawDots(g, this.lead2, this.point2, -this.curcount);
        drawPost(g, this.point1);
        drawPost(g, this.point2);
    }
}

registerComponent(404, 'FuseElm', FuseComponent);
