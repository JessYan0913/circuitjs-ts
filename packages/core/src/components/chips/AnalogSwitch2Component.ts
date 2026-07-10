import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { setVoltageColor, drawThickLinePt, drawPost, interpPoint } from '../drawutils.js';

/** Single-Pole Double-Throw Analog Switch */
export class AnalogSwitch2Component extends CircuitComponent {
    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.noDiagonal = true;
    }

    getDumpType(): number | string { return 160; }
    getPostCount(): number { return 4; } // COM, NO, NC, CTRL
    getVoltageSourceCount(): number { return 1; }

    get isClosedToNO(): boolean {
        return this.volts[3] > 2.5;
    }

    stamp(context: StampContext): void {
        // Voltage source between COM and the active pin
        context.stampVoltageSource(this.nodes[0], this.isClosedToNO ? this.nodes[1] : this.nodes[2], this.voltSource);
    }

    doStep(context: StampContext): void {
        // Drive active output to match COM voltage
        if (this.isClosedToNO) {
            context.updateVoltageSource(this.nodes[0], this.nodes[1], this.voltSource, 0);
        } else {
            context.updateVoltageSource(this.nodes[0], this.nodes[2], this.voltSource, 0);
        }
    }

    setPoints(): void {
        super.setPoints();
        this.calcLeads(16);
    }

    draw(g: Graphics): void {
        const mid = interpPoint(this.point1, this.point2, 0.5);

        // Draw leads
        setVoltageColor(g, this.volts[0], this);
        drawThickLinePt(g, this.point1, this.lead1);
        setVoltageColor(g, this.volts[1], this);
        drawThickLinePt(g, this.point2, { x: this.point2.x, y: this.lead1.y });
        setVoltageColor(g, this.volts[2], this);
        drawThickLinePt(g, this.lead2, this.point2);

        // Control
        setVoltageColor(g, this.volts[3], this);
        drawThickLinePt(g, { x: mid.x, y: mid.y + 4 }, { x: mid.x, y: this.y + 20 });
        drawPost(g, { x: mid.x, y: this.y + 20 });

        // Switch symbol
        g.setColor('#FFFFFF');
        g.setLineWidth(2);
        const topY = this.y - 8;
        const botY = this.y + 8;
        const connectToNO = this.isClosedToNO;
        if (connectToNO) {
            g.drawLine(this.x, topY, mid.x, this.lead1.y);
            g.drawLine(this.x, this.y, mid.x, this.y);
        } else {
            g.drawLine(this.x, this.y, mid.x, this.y);
            g.drawLine(this.x, botY, mid.x, this.lead2.y);
        }

        drawPost(g, this.point1);
        drawPost(g, this.point2);
    }

    getInfo(): string[] {
        return [`Switch2: ${this.isClosedToNO ? 'COM→NO' : 'COM→NC'}`];
    }
}

registerComponent(160, 'AnalogSwitch2Elm', AnalogSwitch2Component);
