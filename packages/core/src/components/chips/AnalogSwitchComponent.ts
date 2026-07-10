import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { setVoltageColor, drawThickLinePt, drawPost, interpPoint, interpPointPerp } from '../drawutils.js';

/** Single-Pole Single-Throw Analog Switch (nonlinear resistor model) */
export class AnalogSwitchComponent extends CircuitComponent {
    static readonly FLAG_INVERT = 1;

    r_on = 20;
    r_off = 1e10;
    private open = false;

    // Geometry points
    private point3 = { x: 0, y: 0 };
    private lead3 = { x: 0, y: 0 };

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.noDiagonal = true;
    }

    getDumpType(): number | string { return 159; }
    getPostCount(): number { return 3; }
    nonLinear(): boolean { return true; }

    get isClosed(): boolean { return !this.open; }

    stamp(context: StampContext): void {
        context.stampNonLinear(this.nodes[0]);
        context.stampNonLinear(this.nodes[1]);
    }

    doStep(context: StampContext): void {
        let open = this.volts[2] < 2.5;
        if ((this.flags & AnalogSwitchComponent.FLAG_INVERT) !== 0) {
            open = !open;
        }
        this.open = open;
        const resistance = open ? this.r_off : this.r_on;
        context.stampResistor(this.nodes[0], this.nodes[1], resistance);
    }

    calculateCurrent(): void {
        this.current = (this.volts[0] - this.volts[1]) / (this.open ? this.r_off : this.r_on);
    }

    getCurrentIntoNode(n: number): number {
        if (n === 2) return 0;
        if (n === 0) return -this.current;
        return this.current;
    }

    override setPoints(): void {
        super.setPoints();
        this.calcLeads(32);
        const openhs = 16;
        this.point3 = interpPointPerp(this.point1, this.point2, 0.5, -openhs);
        this.lead3 = interpPointPerp(this.point1, this.point2, 0.5, -openhs / 2);
    }

    getPost(n: number): { x: number; y: number } {
        if (n === 0) return this.point1;
        if (n === 1) return this.point2;
        return this.point3;
    }

    getConnection(n1: number, n2: number): boolean {
        if (n1 === 2 || n2 === 2) return false;
        return true;
    }

    draw(g: Graphics): void {
        const openhs = 16;
        const hs = this.open ? openhs : 0;

        this.setBbox(this.point1.x, this.point1.y, this.point2.x, this.point2.y);

        setVoltageColor(g, this.volts[0], this);
        drawThickLinePt(g, this.point1, this.lead1);
        setVoltageColor(g, this.volts[1], this);
        drawThickLinePt(g, this.lead2, this.point2);

        g.setColor('#CCCCCC');
        const ps = interpPointPerp(this.lead1, this.lead2, 1, hs);
        drawThickLinePt(g, this.lead1, ps);

        setVoltageColor(g, this.volts[2], this);
        drawThickLinePt(g, this.point3, this.lead3);

        const mid = interpPoint(this.point1, this.point2, 0.5);
        this.setBbox(Math.min(this.point1.x, this.point2.x, this.point3.x),
                      Math.min(this.point1.y, this.point2.y, this.point3.y),
                      Math.max(this.point1.x, this.point2.x, this.point3.x),
                      Math.max(this.point1.y, this.point2.y, this.point3.y));

        drawPost(g, this.point1);
        drawPost(g, this.point2);
        drawPost(g, this.point3);
    }

    getInfo(): string[] {
        return [
            'analog switch',
            this.open ? 'open' : 'closed',
            `Vd = ${(this.volts[0] - this.volts[1]).toFixed(2)} V`,
            `I = ${this.current.toFixed(3)} A`,
            `Vc = ${this.volts[2].toFixed(2)} V`,
        ];
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) {
            return { name: 'Normally closed', checkbox: true, checkboxState: (this.flags & AnalogSwitchComponent.FLAG_INVERT) !== 0 };
        }
        if (n === 1) return { name: 'On Resistance (ohms)', value: this.r_on };
        if (n === 2) return { name: 'Off Resistance (ohms)', value: this.r_off };
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 0 && ei.checkboxState !== undefined) {
            if (ei.checkboxState) this.flags |= AnalogSwitchComponent.FLAG_INVERT;
            else this.flags &= ~AnalogSwitchComponent.FLAG_INVERT;
        }
        if (_n === 1 && ei.value !== undefined && ei.value > 0) this.r_on = ei.value;
        if (_n === 2 && ei.value !== undefined && ei.value > 0) this.r_off = ei.value;
    }

    override dump(): string {
        return super.dump() + ` ${this.r_on} ${this.r_off}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.r_on = parseFloat(tokens[start]) || 20;
        if (tokens.length > start + 1) this.r_off = parseFloat(tokens[start + 1]) || 1e10;
    }
}

registerComponent(159, 'AnalogSwitchElm', AnalogSwitchComponent);
