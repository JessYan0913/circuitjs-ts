import { SwitchComponent } from './SwitchComponent.js';
import type { StampContext, EditInfo, Point } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import {
    setVoltageColor, drawThickLinePt, drawThickLineXY,
    interpPointPerp, drawDots, drawPost,
} from '../drawutils.js';

/**
 * Make-Before-Break Switch (dump type 416).
 * 4 positions: 0 = pole 0, 1 = both, 2 = pole 1, 3 = both (transition).
 * Matches Java MBBSwitchElm (extends SwitchElm).
 */
export class MBBSwitchComponent extends SwitchComponent {
    /** Link ID for ganged switching */
    link = 0;
    /** Two voltage source indices */
    voltSources: number[] = [0, 0];
    /** Current through each pole */
    currents: number[] = [0, 0];
    /** Current counters for dot animation (extra for combined path) */
    curcounts: number[] = [0, 0, 0];
    /** Both poles connected? */
    both = false;

    private swposts: Point[] = [];
    private swpoles: Point[] = [];

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.noDiagonal = true;
        this.posCount = 4;
    }

    getDumpType(): number | string { return 416; }

    handleDumpData(tokens: string[], start: number): void {
        super.handleDumpData(tokens, start);
        // Java: super() handles position, momentary; then link
        if (tokens.length > start + 2) {
            this.link = parseInt(tokens[start + 2]) || 0;
        }
        this.posCount = 4;
    }

    dump(): string {
        return super.dump() + ` ${this.link}`;
    }

    setPoints(): void {
        super.setPoints();
        const openhs = 16;
        this.calcLeads(32);

        this.swposts = new Array(2);
        this.swpoles = new Array(2);
        for (let i = 0; i < 2; i++) {
            let hs = -openhs * (i - (2 - 1) / 2);
            if (i === 0) hs = openhs;
            this.swpoles[i] = interpPointPerp(this.lead1, this.lead2, 1, hs);
            this.swposts[i] = interpPointPerp(this.point1, this.point2, 1, hs);
        }
        // 4 positions (pole 1, both, pole 2, both)
        this.posCount = 4;
    }

    getPostCount(): number { return 3; }

    getPost(n: number): Point {
        if (n === 0) return this.point1;
        return this.swposts[n - 1];
    }

    setVoltageSource(n: number, v: number): void {
        if (n < 2) this.voltSources[n] = v;
    }

    setCurrent(vn: number, c: number): void {
        if (this.both) {
            // When both connected, assign to the correct pole
            if (vn === this.voltSources[0]) this.currents[0] = c;
            else if (vn === this.voltSources[1]) this.currents[1] = c;
        } else {
            this.currents[this.position / 2] = c;
        }
    }

    calculateCurrent(): void {
        // Make sure current of unconnected pole is zero
        if (!this.both) {
            this.currents[1 - (this.position / 2)] = 0;
        }
    }

    getVoltageSourceCount(): number {
        this.both = (this.position === 1 || this.position === 3);
        return this.both ? 2 : 1;
    }

    stamp(context: StampContext): void {
        let vs = 0;
        if (this.both || this.position === 0) {
            context.stampVoltageSource(this.nodes[0], this.nodes[1], this.voltSources[vs++], 0);
        }
        if (this.both || this.position === 2) {
            context.stampVoltageSource(this.nodes[0], this.nodes[2], this.voltSources[vs++], 0);
        }
    }

    getConnection(n1: number, n2: number): boolean {
        if (this.both) return true;
        return (n1 === 0 && n2 === 1 + this.position / 2) ||
               (n2 === 0 && n1 === 1 + this.position / 2);
    }

    isWire(): boolean { return false; }

    getCurrentIntoNode(n: number): number {
        if (n === 0) return -this.currents[0] - this.currents[1];
        return this.currents[n - 1];
    }

    getInfo(): string[] {
        return [
            `switch (${this.link === 0 ? 'S' : 'D'}PDT, MBB)`,
            `I = ${(this.currents[0] + this.currents[1]).toFixed(3)} A`,
        ];
    }

    getEditInfo(n: number): EditInfo | null {
        if (n === 1) return { name: 'Switch Group', value: this.link, dimensionless: true };
        return super.getEditInfo(n);
    }

    setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 1) { this.link = Math.round(ei.value || 0); return; }
        super.setEditValue(_n, ei);
    }

    getShortcut(): number { return 0; }

    draw(g: import('@circuitjs/shared').Graphics): void {
        const openhs = 16;
        this.setBboxPts(this.point1, this.point2, openhs);
        if (this.swposts.length >= 2) {
            this.adjustBboxPts(this.swposts[0], this.swposts[1]);
        }

        // First lead
        setVoltageColor(g, this.volts[0], this);
        drawThickLinePt(g, this.point1, this.lead1);

        // Other leads
        for (let i = 0; i < 2; i++) {
            setVoltageColor(g, this.volts[i + 1], this);
            drawThickLinePt(g, this.swpoles[i], this.swposts[i]);
        }

        // Switch arm
        if (!this.needsHighlight()) g.setColor('#FFFFFF');
        else g.setColor('#00FFFF');
        g.setLineWidth(3);
        if (this.both || this.position === 0) {
            drawThickLinePt(g, this.lead1, this.swpoles[0]);
        }
        if (this.both || this.position === 2) {
            drawThickLinePt(g, this.lead1, this.swpoles[1]);
        }
        g.setLineWidth(1);

        // Current dots for each path
        for (let i = 0; i < 2; i++) {
            drawDots(g, this.swpoles[i], this.swposts[i], this.curcounts[i]);
        }
        drawDots(g, this.point1, this.lead1, this.curcounts[2]);

        // Posts
        drawPost(g, this.point1);
        drawPost(g, this.swposts[0]);
        drawPost(g, this.swposts[1]);
    }
}

registerComponent(416, 'MBBSwitchElm', MBBSwitchComponent);
