import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { setVoltageColor, drawThickLinePt, drawPost, interpPoint, interpPointPerp } from '../drawutils.js';

/** Tri-State Buffer (voltage source + internal node + resistor model) */
export class TriStateComponent extends CircuitComponent {
    r_on = 0.1;
    r_off = 1e10;
    private open = false;

    private point3 = { x: 0, y: 0 };
    private lead3 = { x: 0, y: 0 };
    private gatePoints: { x: number; y: number }[] = [];

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.noDiagonal = true;
    }

    getDumpType(): number | string { return 180; }
    getPostCount(): number { return 3; }
    getInternalNodeCount(): number { return 1; }
    getVoltageSourceCount(): number { return 1; }
    nonLinear(): boolean { return true; }

    stamp(context: StampContext): void {
        context.stampVoltageSource(0, this.nodes[3], this.voltSource);
        context.stampNonLinear(this.nodes[3]);
        context.stampNonLinear(this.nodes[1]);
    }

    doStep(context: StampContext): void {
        this.open = this.volts[2] < 2.5;
        const resistance = this.open ? this.r_off : this.r_on;
        context.stampResistor(this.nodes[3], this.nodes[1], resistance);
        context.updateVoltageSource(0, this.nodes[3], this.voltSource, this.volts[0] > 2.5 ? 5 : 0);
    }

    calculateCurrent(): void {
        this.current = (this.volts[3] - this.volts[1]) / (this.open ? this.r_off : this.r_on);
    }

    getCurrentIntoNode(n: number): number {
        if (n === 1) return this.current;
        return 0;
    }

    getConnection(n1: number, n2: number): boolean { return false; }
    hasGroundConnection(n1: number): boolean { return n1 === 1; }

    override setPoints(): void {
        super.setPoints();
        this.calcLeads(32);
        const hs = 16;
        const ww = Math.min(16, Math.floor(this.dn / 2));

        // Triangle
        this.gatePoints = [
            interpPointPerp(this.lead1, this.lead2, 0, hs + 2),
            interpPointPerp(this.lead1, this.lead2, 1, hs + 2),
            interpPoint(this.point1, this.point2, 0.5 + (ww - 2) / this.dn),
        ];

        this.point3 = interpPointPerp(this.point1, this.point2, 0.5, -hs);
        this.lead3 = interpPointPerp(this.point1, this.point2, 0.5, -hs / 2);
    }

    getPost(n: number): { x: number; y: number } {
        if (n === 0) return this.point1;
        if (n === 1) return this.point2;
        return this.point3;
    }

    draw(g: Graphics): void {
        this.setBbox(this.point1.x, this.point1.y, this.point2.x, this.point2.y);

        setVoltageColor(g, this.volts[0], this);
        drawThickLinePt(g, this.point1, this.lead1);
        setVoltageColor(g, this.volts[1], this);
        drawThickLinePt(g, this.lead2, this.point2);

        g.setColor('#CCCCCC');
        if (this.gatePoints.length >= 3) {
            g.drawPolyline(
                this.gatePoints.map(p => p.x),
                this.gatePoints.map(p => p.y), 3);
        }

        setVoltageColor(g, this.volts[2], this);
        drawThickLinePt(g, this.point3, this.lead3);

        drawPost(g, this.point1);
        drawPost(g, this.point2);
        drawPost(g, this.point3);
    }

    getInfo(): string[] {
        return [
            'tri-state buffer',
            this.open ? 'open' : 'closed',
            `Vd = ${(this.volts[0] - this.volts[1]).toFixed(2)} V`,
            `I = ${this.current.toFixed(3)} A`,
            `Vc = ${this.volts[2].toFixed(2)} V`,
        ];
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'On Resistance (ohms)', value: this.r_on };
        if (n === 1) return { name: 'Off Resistance (ohms)', value: this.r_off };
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 0 && ei.value !== undefined && ei.value > 0) this.r_on = ei.value;
        if (_n === 1 && ei.value !== undefined && ei.value > 0) this.r_off = ei.value;
    }

    override dump(): string {
        return super.dump() + ` ${this.r_on} ${this.r_off}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.r_on = parseFloat(tokens[start]) || 0.1;
        if (tokens.length > start + 1) this.r_off = parseFloat(tokens[start + 1]) || 1e10;
    }
}

registerComponent(180, 'TriStateElm', TriStateComponent);
