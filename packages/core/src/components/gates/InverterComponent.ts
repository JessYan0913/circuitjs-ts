import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { setVoltageColor, drawThickLinePt, drawThickPolygon, drawThickCircle, drawPost, interpPoint, interpPointPerp } from '../drawutils.js';

/** Inverter (NOT gate) with slew rate control */
export class InverterComponent extends CircuitComponent {
    slewRate = 0.5;
    highVoltage = 5;
    private lastOutputVoltage = 0;

    private hs = 16;
    private ww = 16;
    private gatePoints: { x: number; y: number }[] = [];
    private pcircle = { x: 0, y: 0 };

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.noDiagonal = true;
    }

    getDumpType(): number | string { return 'I'.charCodeAt(0); }
    getPostCount(): number { return 2; }
    getVoltageSourceCount(): number { return 1; }

    stamp(context: StampContext): void {
        context.stampVoltageSource(0, this.nodes[1], this.voltSource);
    }

    startIteration(): void {
        this.lastOutputVoltage = this.volts[1];
    }

    doStep(context: StampContext): void {
        const out = this.volts[0] > this.highVoltage * 0.5 ? 0 : this.highVoltage;
        const maxStep = this.slewRate * this.simTime * 1e9;
        const clamped = Math.max(
            Math.min(this.lastOutputVoltage + maxStep, out),
            this.lastOutputVoltage - maxStep,
        );
        context.updateVoltageSource(0, this.nodes[1], this.voltSource, clamped);
    }

    getConnection(n1: number, n2: number): boolean { return false; }
    hasGroundConnection(n1: number): boolean { return n1 === 1; }

    getCurrentIntoNode(n: number): number {
        return (n === 1) ? this.current : 0;
    }

    override setPoints(): void {
        super.setPoints();
        this.hs = 16;
        this.ww = Math.min(16, Math.floor(this.dn / 2));

        const l1 = interpPoint(this.point1, this.point2, 0.5 - this.ww / this.dn);
        const l2 = interpPoint(this.point1, this.point2, 0.5 + (this.ww + 2) / this.dn);
        this.lead1 = l1;
        this.lead2 = l2;
        this.pcircle = interpPoint(this.point1, this.point2, 0.5 + (this.ww - 2) / this.dn);

        const tip = interpPoint(this.point1, this.point2, 0.5 + (this.ww - 5) / this.dn);
        this.gatePoints = [
            interpPointPerp(this.lead1, this.lead2, 0, this.hs),
            interpPointPerp(this.lead1, this.lead2, 1, this.hs),
            tip,
        ];
    }

    draw(g: Graphics): void {
        drawPost(g, this.point1);
        drawPost(g, this.point2);

        setVoltageColor(g, this.volts[0], this);
        drawThickLinePt(g, this.point1, this.lead1);
        setVoltageColor(g, this.volts[1], this);
        drawThickLinePt(g, this.lead2, this.point2);

        g.setColor('#CCCCCC');
        if (this.gatePoints.length >= 3) {
            drawThickPolygon(g,
                this.gatePoints.map(p => p.x),
                this.gatePoints.map(p => p.y), 3);
        }

        drawThickCircle(g, this.pcircle.x, this.pcircle.y, 3);
    }

    getInfo(): string[] {
        return [
            'inverter',
            `Vi = ${this.volts[0].toFixed(2)} V`,
            `Vo = ${this.volts[1].toFixed(2)} V`,
        ];
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Slew Rate (V/ns)', value: this.slewRate };
        if (n === 1) return { name: 'High Voltage (V)', value: this.highVoltage };
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 0 && ei.value !== undefined) this.slewRate = ei.value;
        if (_n === 1 && ei.value !== undefined) this.highVoltage = ei.value;
    }

    override dump(): string {
        return super.dump() + ` ${this.slewRate} ${this.highVoltage}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.slewRate = parseFloat(tokens[start]) || 0.5;
        if (tokens.length > start + 1) this.highVoltage = parseFloat(tokens[start + 1]) || 5;
    }
}

registerComponent('I'.charCodeAt(0), 'InverterElm', InverterComponent);
