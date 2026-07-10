import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import {
    setVoltageColor, drawThickLinePt, drawThickLineXY,
    interpPointPerpOut, drawDots, drawPost,
} from '../drawutils.js';

/** SPST Switch (dump type 's') */
export class SwitchComponent extends CircuitComponent {
    momentary = false;
    position = 0; // 0=closed, 1=open (subclasses may have more positions)
    /** Number of valid positions (used by toggle() wrap-around) */
    posCount = 2;
    private ps = { x: 0, y: 0 };
    private ps2 = { x: 0, y: 0 };

    getDumpType(): number | string { return 's'; }
    isWire(): boolean { return this.position === 0; }
    getVoltageSourceCount(): number { return this.position === 1 ? 0 : 1; }

    stamp(context: StampContext): void {
        if (this.position === 0) {
            context.stampVoltageSource(this.nodes[0], this.nodes[1], this.voltSource, 0);
        }
    }

    calculateCurrent(): void {
        if (this.position === 1) this.current = 0;
    }

    handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) {
            this.position = parseInt(tokens[start]) || 0;
        }
        if (tokens.length > start + 1) {
            this.momentary = tokens[start + 1] === 'true';
        }
    }

    dump(): string {
        return super.dump() + ` ${this.position} ${this.momentary}`;
    }

    setPoints(): void {
        super.setPoints();
        this.calcLeads(32);
    }

    getConnection(n1: number, n2: number): boolean { return this.position === 0; }

    /** Toggle switch position (matching Java SwitchElm.toggle — increments with posCount wrap) */
    toggle(): void {
        this.position++;
        if (this.position >= this.posCount)
            this.position = 0;
    }

    getInfo(): string[] {
        const label = this.momentary ? 'Push Switch' : 'Switch (SPST)';
        if (this.position === 1) {
            return [label, 'open'];
        }
        return [label, 'closed'];
    }

    getShortcut(): number { return 's'.charCodeAt(0); }

    draw(g: Graphics): void {
        const openhs = 16;
        const hs1 = this.position === 1 ? 0 : 2;
        const hs2 = this.position === 1 ? openhs : 2;

        this.calcLeads(32);
        setVoltageColor(g, this.volts[0], this);
        drawThickLinePt(g, this.point1, this.lead1);
        setVoltageColor(g, this.volts[1], this);
        drawThickLinePt(g, this.lead2, this.point2);

        interpPointPerpOut(this.lead1, this.lead2, this.ps, 0, hs1);
        interpPointPerpOut(this.lead1, this.lead2, this.ps2, 1, hs2);

        g.setLineWidth(3);
        g.setColor('#FFFFFF');
        drawThickLineXY(g, this.ps.x, this.ps.y, this.ps2.x, this.ps2.y);
        g.setLineWidth(1);

        if (this.position === 0) {
            drawDots(g, this.point1, this.lead1, this.curcount);
            drawDots(g, this.lead2, this.point2, -this.curcount);
        }

        drawPost(g, this.point1);
        drawPost(g, this.point2);
    }
}

registerComponent('s'.charCodeAt(0), 'SwitchElm', SwitchComponent);
