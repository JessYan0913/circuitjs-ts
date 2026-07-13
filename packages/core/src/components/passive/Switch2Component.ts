import { SwitchComponent } from './SwitchComponent.js';
import type { StampContext, EditInfo, Graphics, Point } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import {
    setVoltageColor, drawThickLinePt, drawThickLineXY,
    interpPoint, interpPointPerp, drawDots, drawPost, interpPoint2,
} from '../drawutils.js';

/**
 * SPDT Switch (dump type 'S') — 1+throwCount posts.
 * Matches Java Switch2Elm (extends SwitchElm).
 */
export class Switch2Component extends SwitchComponent {
    /** Link ID for ganged switching (0 = independent) */
    link = 0;
    /** Number of throws (positions) */
    throwCount = 2;
    static readonly FLAG_CENTER_OFF = 1;

    /** Throw pole endpoints (far end of throw leads) */
    private swposts: Point[] = [];
    /** Throw pole connection points (near end of throw leads) */
    private swpoles: Point[] = [];

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.noDiagonal = true;
    }

    getDumpType(): number | string { return 'S'; }

    handleDumpData(tokens: string[], start: number): void {
        super.handleDumpData(tokens, start);
        // Java: super() handles position, momentary; then we read link, then throwCount
        if (tokens.length > start + 2) {
            this.link = parseInt(tokens[start + 2]) || 0;
        }
        if (tokens.length > start + 3) {
            this.throwCount = parseInt(tokens[start + 3]) || 2;
        }
        this.posCount = this.hasCenterOff() ? 3 : this.throwCount;
    }

    dump(): string {
        return super.dump() + ` ${this.link} ${this.throwCount}`;
    }

    hasCenterOff(): boolean {
        return (this.flags & Switch2Component.FLAG_CENTER_OFF) !== 0 && this.throwCount === 2;
    }

    setPoints(): void {
        super.setPoints();
        const openhs = 16;
        this.calcLeads(32);

        this.swposts = new Array(this.throwCount);
        this.swpoles = new Array(this.throwCount + 1); // +1 for center-off
        for (let i = 0; i < this.throwCount; i++) {
            let hs = -openhs * (i - (this.throwCount - 1) / 2);
            if (this.throwCount === 2 && i === 0) hs = openhs;
            this.swpoles[i] = interpPointPerp(this.lead1, this.lead2, 1, hs);
            this.swposts[i] = interpPointPerp(this.point1, this.point2, 1, hs);
        }
        // Last swpole = lead2 (for center-off, position 2)
        this.swpoles[this.throwCount] = { x: this.lead2.x, y: this.lead2.y };
        this.posCount = this.hasCenterOff() ? 3 : this.throwCount;
    }

    getPostCount(): number { return 1 + this.throwCount; }

    getPost(n: number): Point {
        if (n === 0) return this.point1;
        return this.swposts[n - 1];
    }

    getVoltageSourceCount(): number {
        if (this.position === 2 && this.hasCenterOff()) return 0;
        return 1;
    }

    stamp(context: StampContext): void {
        if (this.position === 2 && this.hasCenterOff()) return;
        context.stampVoltageSource(this.nodes[0], this.nodes[this.position + 1], this.voltSource, 0);
    }

    calculateCurrent(): void {
        if (this.position === 2 && this.hasCenterOff()) this.current = 0;
    }

    getConnection(n1: number, n2: number): boolean {
        if (this.position === 2 && this.hasCenterOff()) return false;
        return (n1 === 0 && n2 === 1 + this.position) || (n2 === 0 && n1 === 1 + this.position);
    }

    isWire(): boolean { return false; }

    getCurrentIntoNode(n: number): number {
        if (n === 0) return -this.current;
        if (n === this.position + 1) return this.current;
        return 0;
    }

    getInfo(): string[] {
        return [
            `switch (${this.link === 0 ? 'S' : 'D'}P${this.throwCount > 2 ? this.throwCount + 'T' : 'DT'})`,
            `I = ${this.current.toFixed(3)} A`,
        ];
    }

    getEditInfo(n: number): EditInfo | null {
        if (n === 1) return { name: 'Switch Group', value: this.link, dimensionless: true };
        if (n === 2) return { name: '# of Throws', value: this.throwCount, min: 2, max: 10, dimensionless: true };
        return super.getEditInfo(n);
    }

    setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 1) { this.link = Math.round(ei.value || 0); return; }
        if (_n === 2) {
            if (ei.value !== undefined && ei.value >= 2) {
                this.throwCount = Math.round(ei.value);
                if (this.throwCount > 2) this.momentary = false;
                this.allocNodes();
                this.setPoints();
            }
            return;
        }
        super.setEditValue(_n, ei);
    }

    getShortcut(): number { return 'S'.charCodeAt(0); }

    draw(g: Graphics): void {
        const openhs = 16;
        this.setBboxPts(this.point1, this.point2, openhs);
        if (this.throwCount > 0) {
            this.adjustBboxPts(this.swposts[0], this.swposts[this.throwCount - 1]);
        }

        // First lead
        setVoltageColor(g, this.volts[0], this);
        drawThickLinePt(g, this.point1, this.lead1);

        // Other leads
        for (let i = 0; i < this.throwCount; i++) {
            setVoltageColor(g, this.volts[i + 1], this);
            drawThickLinePt(g, this.swpoles[i], this.swposts[i]);
        }

        // Switch arm
        if (!this.needsHighlight()) g.setColor('#FFFFFF');
        else g.setColor('#00FFFF');
        g.setLineWidth(3);
        drawThickLinePt(g, this.lead1, this.swpoles[this.position]);
        g.setLineWidth(1);

        // Dots
        drawDots(g, this.point1, this.lead1, this.curcount);
        if (this.position !== 2 || !this.hasCenterOff()) {
            drawDots(g, this.swpoles[this.position], this.swposts[this.position], this.curcount);
        }

        // Posts
        drawPost(g, this.point1);
        for (let i = 0; i < this.throwCount; i++) {
            drawPost(g, this.swposts[i]);
        }
    }
}

registerComponent('S'.charCodeAt(0), 'Switch2Elm', Switch2Component);
