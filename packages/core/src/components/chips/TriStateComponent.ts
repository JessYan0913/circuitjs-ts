import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { setVoltageColor, drawThickLinePt, drawPost, interpPoint, interpPointPerp } from '../drawutils.js';

/** Tri-State Buffer */
export class TriStateComponent extends CircuitComponent {
    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.noDiagonal = true;
    }

    getDumpType(): number | string { return 180; }
    getPostCount(): number { return 3; } // IN, OUT, EN
    getVoltageSourceCount(): number { return 1; }

    get isEnabled(): boolean {
        return this.volts[2] > 2.5;
    }

    stamp(context: StampContext): void {
        // Output voltage source (driven when enabled)
        context.stampVoltageSource(0, this.nodes[1], this.voltSource);
    }

    doStep(context: StampContext): void {
        if (this.isEnabled) {
            // Drive output to input voltage (or logical level)
            const inVoltage = this.volts[0];
            context.updateVoltageSource(0, this.nodes[1], this.voltSource, inVoltage > 2.5 ? 5 : 0);
        } else {
            // High impedance: don't drive (remove the voltage source effect)
            context.updateVoltageSource(0, this.nodes[1], this.voltSource, 0);
        }
    }

    setPoints(): void {
        super.setPoints();
        this.calcLeads(16);
    }

    draw(g: Graphics): void {
        const mid = interpPoint(this.point1, this.point2, 0.5);
        const p5 = interpPoint(this.point1, this.point2, 0.3);
        const p6 = interpPoint(this.point1, this.point2, 0.7);

        // Draw enable lead
        setVoltageColor(g, this.volts[2], this);
        g.drawLine(mid.x, this.y + 4, mid.x, this.y + 20);
        drawPost(g, { x: mid.x, y: this.y + 20 });

        // Draw IN lead
        setVoltageColor(g, this.volts[0], this);
        drawThickLinePt(g, this.point1, p5);

        // OUT lead
        setVoltageColor(g, this.volts[1], this);
        drawThickLinePt(g, p6, this.point2);

        // Draw tri-state buffer symbol (triangle with enable)
        g.setColor('#FFFFFF');
        g.setLineWidth(2);

        // Triangle (buffer)
        g.drawLine(p5.x, p5.y, p6.x, mid.y);
        g.drawLine(p5.x, p5.y, p6.x, p6.y);
        g.drawLine(p6.x, p6.y, p6.x, p6.y); // horizontal output

        // Enable control arrow
        g.drawLine(mid.x - 4, mid.y, mid.x + 4, mid.y);

        drawPost(g, this.point1);
        drawPost(g, this.point2);
    }

    getInfo(): string[] {
        return [`Tri-State (${this.isEnabled ? 'EN' : 'DIS'})`];
    }
}

registerComponent(180, 'TriStateElm', TriStateComponent);
