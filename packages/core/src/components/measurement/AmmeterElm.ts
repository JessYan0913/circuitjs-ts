import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, Graphics, Point, EditInfo } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { interpPoint, setVoltageColor, drawThickLinePt, drawDots, drawPost } from '../drawutils.js';

/** AmmeterElm — series current meter */
export class AmmeterElm extends CircuitComponent {
    meter = 0;
    scale = 0;

    static readonly FLAG_SHOWCURRENT = 1;

    static readonly AM_VOL = 0;
    static readonly AM_RMS = 1;

    zerocount = 0;
    rmsI = 0;
    total = 0;
    count = 0;
    maxI = 0;
    lastMaxI = 0;
    minI = 0;
    lastMinI = 0;
    selectedValue = 0;

    increasingI = true;
    decreasingI = true;

    mid: Point = { x: 0, y: 0 };
    arrowPoly: { npoints: number; xpoints: number[]; ypoints: number[] } = { npoints: 3, xpoints: [0, 0, 0], ypoints: [0, 0, 0] };

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.flags = args.flags ?? AmmeterElm.FLAG_SHOWCURRENT;
    }

    getDumpType(): number | string {
        return 370;
    }

    override dump(): string {
        return `${super.dump()} ${this.meter} ${this.scale}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.meter = parseInt(tokens[start]) || 0;
        if (tokens.length > start + 1) this.scale = parseInt(tokens[start + 1]) || 0;
    }

    override getVoltageSourceCount(): number {
        return 1;
    }

    override stamp(context: StampContext): void {
        context.stampVoltageSource(this.nodes[0], this.nodes[1], this.voltSource, 0);
    }

    override setPoints(): void {
        super.setPoints();
        this.mid = interpPoint(this.point1, this.point2, 0.6);
        // Calculate arrow
        const adx = this.mid.x - this.point1.x;
        const ady = this.mid.y - this.point1.y;
        const len = Math.sqrt(adx * adx + ady * ady) || 1;
        const al = 14;
        const aw = 7;
        const p1 = { x: 0, y: 0 };
        const p2 = { x: 0, y: 0 };
        this.interpPoint2(this.point1, this.mid, p1, p2, 1 - al / len, aw);
        this.arrowPoly = {
            npoints: 3,
            xpoints: [this.mid.x, p1.x, p2.x],
            ypoints: [this.mid.y, p1.y, p2.y],
        };
    }

    override isWire(): boolean {
        return true;
    }

    override getPower(): number {
        return 0;
    }

    override getVoltageDiff(): number {
        return this.volts[0];
    }

    override stepFinished(): void {
        this.count++;
        this.total += this.current * this.current;
        const cur = this.current;

        if (cur > this.maxI && this.increasingI) {
            this.maxI = cur;
            this.increasingI = true;
            this.decreasingI = false;
        }
        if (cur < this.maxI && this.increasingI) {
            this.lastMaxI = this.maxI;
            this.minI = cur;
            this.increasingI = false;
            this.decreasingI = true;

            this.total = this.total / this.count;
            this.rmsI = Math.sqrt(this.total);
            if (isNaN(this.rmsI)) this.rmsI = 0;
            this.count = 0;
            this.total = 0;
        }
        if (cur < this.minI && this.decreasingI) {
            this.minI = cur;
            this.increasingI = false;
            this.decreasingI = true;
        }
        if (cur > this.minI && this.decreasingI) {
            this.lastMinI = this.minI;
            this.maxI = cur;
            this.increasingI = true;
            this.decreasingI = false;

            this.total = this.total / this.count;
            this.rmsI = Math.sqrt(this.total);
            if (isNaN(this.rmsI)) this.rmsI = 0;
            this.count = 0;
            this.total = 0;
        }
        if (cur === 0) {
            this.zerocount++;
            if (this.zerocount > 5) {
                this.total = 0;
                this.rmsI = 0;
                this.maxI = 0;
                this.minI = 0;
            }
        } else {
            this.zerocount = 0;
        }
    }

    override draw(g: Graphics): void {
        this.setVoltageColor(g, this.volts[0]);
        CircuitComponent.drawThickLine(g, this.point1, this.point2);
        CircuitComponent.fillPolygon(g, this.arrowPoly);
        this.drawDots(g, this.point1, this.point2, this.curcount);
        this.setBbox(this.point1.x, this.point1.y, this.point2.x, this.point2.y);
        this.adjustBbox(this.point1.x, this.point1.y - 3, this.point2.x, this.point2.y + 3);

        let s = 'A';
        switch (this.meter) {
            case AmmeterElm.AM_VOL:
                s = this.formatCurrentWithScale(this.current);
                break;
            case AmmeterElm.AM_RMS:
                s = `${this.rmsI.toFixed(4)} A(rms)`;
                break;
        }
        this.drawValues(g, s, 4);
        this.drawPosts(g);
    }

    private drawPosts(g: Graphics): void {
        drawPost(g, this.point1);
        drawPost(g, this.point2);
    }

    mustShowCurrent(): boolean {
        return (this.flags & AmmeterElm.FLAG_SHOWCURRENT) !== 0;
    }

    override getInfo(): string[] {
        const info = ['Ammeter'];
        switch (this.meter) {
            case AmmeterElm.AM_VOL:
                info[1] = `I = ${this.formatCurrent(this.current)}`;
                break;
            case AmmeterElm.AM_RMS:
                info[1] = `Irms = ${this.formatCurrent(this.rmsI)}`;
                break;
        }
        return info;
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) {
            return {
                name: 'Value',
                value: this.selectedValue,
                choices: ['Current', 'RMS Current'],
                selectedIndex: this.meter,
            };
        }
        if (n === 1) {
            return {
                name: 'Scale',
                choices: ['Auto', 'A', 'mA', 'µA'],
                selectedIndex: this.scale,
            };
        }
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 0 && ei.selectedIndex !== undefined) {
            this.meter = ei.selectedIndex;
        }
        if (_n === 1 && ei.selectedIndex !== undefined) {
            this.scale = ei.selectedIndex;
        }
    }

    private formatCurrent(c: number): string {
        if (Math.abs(c) < 1e-6) return `${(c * 1e9).toFixed(2)} nA`;
        if (Math.abs(c) < 1e-3) return `${(c * 1e6).toFixed(2)} µA`;
        if (Math.abs(c) < 1) return `${(c * 1e3).toFixed(2)} mA`;
        return `${c.toFixed(2)} A`;
    }

    private formatCurrentWithScale(c: number): string {
        return this.formatCurrent(c);
    }
}

registerComponent(370, 'AmmeterElm', AmmeterElm);
