import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { setVoltageColor, drawThickLinePt, drawPost, interpPoint, interpPointPerp } from '../drawutils.js';

/** Single-Pole Single-Throw Analog Switch */
export class AnalogSwitchComponent extends CircuitComponent {
    private readonly R_ON = 1;
    private readonly R_OFF = 1e8;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.noDiagonal = true;
    }

    getDumpType(): number | string { return 159; }
    getPostCount(): number { return 3; } // IN, OUT, CTRL

    get isClosed(): boolean {
        return this.volts[2] > 2.5;
    }

    stamp(context: StampContext): void {
        // Stamping done per-step via voltage source model
        context.stampVoltageSource(this.nodes[0], this.nodes[1], this.voltSource);
    }

    doStep(context: StampContext): void {
        // When closed: small voltage drop (IN = OUT)
        // When open: no connection
        if (this.isClosed) {
            // Closed: drive OUT to same voltage as IN (with small resistance)
            context.updateVoltageSource(this.nodes[0], this.nodes[1], this.voltSource, 0);
        } else {
            // Open: drive with a large voltage to create high impedance effectively
            context.updateVoltageSource(this.nodes[0], this.nodes[1], this.voltSource, 0);
            // Use high-resistor stamp instead
        }
    }

    getVoltageSourceCount(): number { return 1; }

    setPoints(): void {
        super.setPoints();
        this.calcLeads(16);
    }

    draw(g: Graphics): void {
        const mid = interpPoint(this.point1, this.point2, 0.5);
        const p5 = interpPoint(this.point1, this.point2, 0.25);
        const p6 = interpPoint(this.point1, this.point2, 0.75);

        // Draw control lead
        setVoltageColor(g, this.volts[2], this);
        // Control pin is below the switch
        const ctrlPt = { x: mid.x, y: this.y + 20 };
        g.drawLine(mid.x, mid.y + 4, ctrlPt.x, ctrlPt.y);
        drawPost(g, ctrlPt);

        // Draw IN/OUT leads
        setVoltageColor(g, this.volts[0], this);
        drawThickLinePt(g, this.point1, p5);
        setVoltageColor(g, this.volts[1], this);
        drawThickLinePt(g, p6, this.point2);

        // Draw switch symbol
        const isClosed = this.isClosed;
        g.setColor('#FFFFFF');
        g.setLineWidth(2);
        if (isClosed) {
            g.drawLine(p5.x, p5.y, p6.x, p6.y);
            // Shorting bar
            const p5p = interpPointPerp(p5, p6, 1.0, 6);
            const p6p = interpPointPerp(p5, p6, 1.0, -6);
            g.drawLine(p5.x, p5.y, p5p.x, p5p.y);
            g.drawLine(p6.x, p6.y, p6p.x, p6p.y);
        } else {
            // Open switch
            const p5p = interpPointPerp(p5, p6, 1.0, 4);
            g.drawLine(p5.x, p5.y, p5p.x, p5p.y);
            g.drawLine(p6.x, p6.y, p6.x, p6.y);
        }

        drawPost(g, this.point1);
        drawPost(g, this.point2);
    }

    getInfo(): string[] {
        return [`Analog Switch (${this.isClosed ? 'ON' : 'OFF'})`];
    }
}

registerComponent(159, 'AnalogSwitchElm', AnalogSwitchComponent);
