import { RailComponent } from './RailComponent.js';
import { WF_AC } from './DCVoltageComponent.js';
import type { Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { drawThickLinePt, setVoltageColor, drawDots, drawPost } from '../drawutils.js';

/** Antenna input — simulates AM/FM radio signals */
export class AntennaComponent extends RailComponent {
    fmphase = 0;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.waveform = WF_AC;
    }

    getDumpType(): number | string { return 'A'; }

    override getVoltage(): number {
        const t = this.simTime;
        const fm = 3 * Math.sin(this.fmphase);
        return Math.sin(2 * Math.PI * t * 3000) * (1.3 + Math.sin(2 * Math.PI * t * 12)) * 3 +
               Math.sin(2 * Math.PI * t * 2710) * (1.3 + Math.sin(2 * Math.PI * t * 13)) * 3 +
               Math.sin(2 * Math.PI * t * 2433) * (1.3 + Math.sin(2 * Math.PI * t * 14)) * 3 + fm;
    }

    override stepFinished(): void {
        // Update FM phase for next step (timeStep is not stored on component,
        // so we use the simTime change as approximation via the time step count)
        // In the Java original: fmphase += 2*pi*(2200+sin(...)*100)*sim.timeStep
        // We store fmphase and stepFinished is called once per time step.
        // We need the actual time step value. Since it's not stored on the component,
        // we approximate by tracking the last simTime.
        const dt = this.getLastStepTime();
        this.fmphase += 2 * Math.PI * (2200 + Math.sin(2 * Math.PI * this.simTime * 13) * 100) * dt;
    }

    private lastStepTime = -1;
    private getLastStepTime(): number {
        if (this.lastStepTime < 0) {
            this.lastStepTime = this.simTime;
            return 1e-5;
        }
        const dt = this.simTime - this.lastStepTime;
        this.lastStepTime = this.simTime;
        return dt > 0 ? dt : 1e-5;
    }

    override draw(g: Graphics): void {
        setVoltageColor(g, this.volts[0], this);
        drawThickLinePt(g, this.point1, this.lead1);

        // Draw rail with antenna text
        g.setColor(this.needsHighlight() ? '#00FFFF' : '#808080');
        g.setFontSize(12);
        g.textAlign('center');
        g.textBaseline('middle');
        const mid_x = (this.point1.x + this.point2.x) / 2;
        const mid_y = (this.point1.y + this.point2.y) / 2;
        g.drawString('Ant', mid_x, mid_y);

        drawDots(g, this.point1, this.lead1, this.curcount);
        drawPost(g, this.point1);
    }

    override getInfo(): string[] {
        return ['Antenna', `V = ${this.getVoltage().toFixed(3)} V`];
    }
}

registerComponent('A'.charCodeAt(0), 'AntennaElm', AntennaComponent);
