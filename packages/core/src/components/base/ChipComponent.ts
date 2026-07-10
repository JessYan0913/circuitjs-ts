import { CircuitComponent } from './CircuitComponent.js';
import type { StampContext, EditInfo, Graphics, Point } from '@circuitjs/shared';
import { setVoltageColor, drawThickLinePt, drawThickCircle, drawDots, drawPost } from '../drawutils.js';

export const SIDE_N = 0;
export const SIDE_S = 1;
export const SIDE_W = 2;
export const SIDE_E = 3;

export interface PinDef {
    pos: number;
    side: number;
    text: string;
    post: Point;
    stub: Point;
    textloc: Point;
    voltSource: number;
    lineOver: boolean;
    bubble: boolean;
    clock: boolean;
    output: boolean;
    value: boolean;
    state: boolean;
    selected: boolean;
    current: number;
    curcount: number;
}

function createPin(pos: number, side: number, text: string): PinDef {
    return {
        pos, side, text,
        post: { x: 0, y: 0 },
        stub: { x: 0, y: 0 },
        textloc: { x: 0, y: 0 },
        voltSource: -1,
        lineOver: false,
        bubble: false,
        clock: false,
        output: false,
        value: false,
        state: false,
        selected: false,
        current: 0,
        curcount: 0,
    };
}

/** Base class for chip/IC-style components */
export abstract class ChipComponent extends CircuitComponent {
    static readonly FLAG_SMALL = 1;
    static readonly FLAG_FLIP_X = 1024;
    static readonly FLAG_FLIP_Y = 2048;

    csize = 2;
    cspc = 16;
    cspc2 = 32;
    sizeX = 2;
    sizeY = 2;
    pins: PinDef[] = [];
    lastClock = false;

    rectPointsX: number[] = [];
    rectPointsY: number[] = [];
    clockPointsX: number[] | null = null;
    clockPointsY: number[] | null = null;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.noDiagonal = true;
        this.setupPins();
        this.setSize(2);
    }

    abstract getChipName(): string;
    abstract setupPins(): void;
    abstract execute(): void;

    setSize(s: number): void {
        this.csize = s;
        this.cspc = 8 * s;
        this.cspc2 = this.cspc * 2;
        if (s === 1) this.flags |= ChipComponent.FLAG_SMALL;
        else this.flags &= ~ChipComponent.FLAG_SMALL;
    }

    override setPoints(): void {
        this.clockPointsX = null;
        const hs = this.cspc;
        const x0 = this.x + this.cspc2;
        const y0 = this.y;
        const xr = x0 - this.cspc;
        const yr = y0 - this.cspc;
        const xs = this.sizeX * this.cspc2;
        const ys = this.sizeY * this.cspc2;

        this.rectPointsX = [xr, xr + xs, xr + xs, xr];
        this.rectPointsY = [yr, yr, yr + ys, yr + ys];
        this.setBbox(xr, yr, this.rectPointsX[2], this.rectPointsY[2]);

        for (const p of this.pins) {
            switch (p.side) {
                case SIDE_N:
                    this.setPinPoint(p, x0, y0, 1, 0, 0, -1, 0, 0);
                    break;
                case SIDE_S:
                    this.setPinPoint(p, x0, y0, 1, 0, 0, 1, 0, ys - this.cspc2);
                    break;
                case SIDE_W:
                    this.setPinPoint(p, x0, y0, 0, 1, -1, 0, 0, 0);
                    break;
                case SIDE_E:
                    this.setPinPoint(p, x0, y0, 0, 1, 1, 0, xs - this.cspc2, 0);
                    break;
            }
        }
    }

    private setPinPoint(
        p: PinDef, px: number, py: number,
        dx: number, dy: number, dax: number, day: number,
        sx: number, sy: number,
    ): void {
        if ((this.flags & ChipComponent.FLAG_FLIP_X) !== 0) {
            dx = -dx;
            dax = -dax;
            px += this.cspc2 * (this.sizeX - 1);
            sx = -sx;
        }
        if ((this.flags & ChipComponent.FLAG_FLIP_Y) !== 0) {
            dy = -dy;
            day = -day;
            py += this.cspc2 * (this.sizeY - 1);
            sy = -sy;
        }

        const xa = px + this.cspc2 * dx * p.pos + sx;
        const ya = py + this.cspc2 * dy * p.pos + sy;

        p.post = { x: xa + dax * this.cspc2, y: ya + day * this.cspc2 };
        p.stub = { x: xa + dax * this.cspc, y: ya + day * this.cspc };
        p.textloc = { x: xa, y: ya };

        if (p.clock) {
            this.clockPointsX = new Array(3);
            this.clockPointsY = new Array(3);
            this.clockPointsX[0] = xa + dax * this.cspc - dx * this.cspc / 2;
            this.clockPointsY[0] = ya + day * this.cspc - dy * this.cspc / 2;
            this.clockPointsX[1] = xa;
            this.clockPointsY[1] = ya;
            this.clockPointsX[2] = xa + dax * this.cspc + dx * this.cspc / 2;
            this.clockPointsY[2] = ya + day * this.cspc + dy * this.cspc / 2;
        }
    }

    override getPostCount(): number { return this.pins.length; }

    override getPost(n: number): Point {
        return this.pins[n].post;
    }

    override getVoltageSourceCount(): number {
        return this.pins.filter(p => p.output).length;
    }

    override setVoltageSource(_n: number, vs: number): void {
        let j = 0;
        for (const p of this.pins) {
            if (p.output) {
                if (j === _n) {
                    p.voltSource = vs;
                    return;
                }
                j++;
            }
        }
    }

    override stamp(context: StampContext): void {
        for (let i = 0; i < this.pins.length; i++) {
            const p = this.pins[i];
            if (p.output) {
                context.stampVoltageSource(0, this.nodes[i], p.voltSource);
            }
        }
    }

    override doStep(context: StampContext): void {
        // Read input pin values
        for (let i = 0; i < this.pins.length; i++) {
            const p = this.pins[i];
            if (!p.output) {
                p.value = this.volts[i] > 2.5;
            }
        }
        this.execute();
        for (let i = 0; i < this.pins.length; i++) {
            const p = this.pins[i];
            if (p.output) {
                context.updateVoltageSource(0, this.nodes[i], p.voltSource, p.value ? 5 : 0);
            }
        }
    }

    override reset(): void {
        for (const p of this.pins) {
            p.value = false;
            p.curcount = 0;
        }
        for (let i = 0; i < this.pins.length; i++) {
            this.volts[i] = 0;
        }
        this.lastClock = false;
    }

    override setCurrent(_x: number, c: number): void {
        for (const p of this.pins) {
            if (p.output && p.voltSource === _x) {
                p.current = c;
            }
        }
    }

    override draw(g: Graphics): void {
        this.drawChip(g);
    }

    drawChip(g: Graphics): void {
        for (let i = 0; i < this.pins.length; i++) {
            const p = this.pins[i];
            setVoltageColor(g, this.volts[i], this);
            drawThickLinePt(g, p.post, p.stub);
            drawDots(g, p.stub, p.post, p.curcount);

            if (p.bubble) {
                g.setColor('#000000');
                drawThickCircle(g, p.bubble ? p.post.x : 0, p.bubble ? p.post.y : 0, 1);
                g.setColor('#808080');
                drawThickCircle(g, p.bubble ? p.post.x : 0, p.bubble ? p.post.y : 0, 3);
            }
        }

        // Draw chip body
        g.setColor(this.needsHighlight() ? '#00FFFF' : '#808080');
        g.setLineWidth(3);
        g.drawPolyline(this.rectPointsX, this.rectPointsY, 4);
        g.setLineWidth(1);

        // Draw clock symbol if present
        if (this.clockPointsX != null && this.clockPointsY != null) {
            g.drawPolyline(this.clockPointsX, this.clockPointsY, 3);
        }

        // Draw pin labels
        for (const p of this.pins) {
            g.setColor(p.selected ? '#00FFFF' : '#FFFFFF');
            const fsz = 10 * this.csize;
            g.setFontSize(fsz);
            const sw = g.measureWidth(p.text);
            const cx = p.textloc.x - Math.round(sw / 2);
            g.drawString(p.text, cx, p.textloc.y);

            if (p.lineOver) {
                const ya = p.textloc.y - Math.round(fsz / 3);
                g.drawLine(p.textloc.x - sw / 2, ya, p.textloc.x + sw / 2, ya);
            }
        }

        // Draw posts
        for (const p of this.pins) {
            drawPost(g, p.post);
        }
    }

    override getInfo(): string[] {
        const arr: string[] = [this.getChipName()];
        let a = 1;
        for (let i = 0; i < this.pins.length; i++) {
            const p = this.pins[i];
            const label = p.text || (p.clock ? 'Clk' : '');
            const val = `Pin ${i}`;
            if (!arr[a]) arr[a] = '';
            else arr[a] += '; ';
            arr[a] += `${label || val} = ${this.volts[i].toFixed(2)} V`;
            if (i % 2 === 1) a++;
        }
        return arr;
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Flip X', checkbox: true, checkboxState: (this.flags & ChipComponent.FLAG_FLIP_X) !== 0 };
        if (n === 1) return { name: 'Flip Y', checkbox: true, checkboxState: (this.flags & ChipComponent.FLAG_FLIP_Y) !== 0 };
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 0 && ei.checkboxState !== undefined) {
            if (ei.checkboxState) this.flags |= ChipComponent.FLAG_FLIP_X;
            else this.flags &= ~ChipComponent.FLAG_FLIP_X;
            this.setPoints();
        }
        if (_n === 1 && ei.checkboxState !== undefined) {
            if (ei.checkboxState) this.flags |= ChipComponent.FLAG_FLIP_Y;
            else this.flags &= ~ChipComponent.FLAG_FLIP_Y;
            this.setPoints();
        }
    }

    getCurrentIntoNode(n: number): number {
        return this.pins[n]?.current ?? 0;
    }

    hasGroundConnection(_n1: number): boolean {
        return this.pins[_n1]?.output ?? false;
    }
}

export { createPin };
