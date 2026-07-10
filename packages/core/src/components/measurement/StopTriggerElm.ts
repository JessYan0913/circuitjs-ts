import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, Graphics, EditInfo } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { drawPost } from '../drawutils.js';

/** StopTriggerElm — stops simulation when voltage crosses threshold */
export class StopTriggerElm extends CircuitComponent {
    triggerVoltage = 1;
    triggered = false;
    stopped = false;
    delay = 0;
    triggerTime = 0;
    type = 0;  // 0 = >=, 1 = <=

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
    }

    getDumpType(): number | string {
        return 408;
    }

    override getPostCount(): number {
        return 1;
    }

    override stamp(_context: StampContext): void {
        // Stop trigger — no MNA stamping needed
    }

    override dump(): string {
        return `${super.dump()} ${this.triggerVoltage} ${this.type} ${this.delay}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.triggerVoltage = parseFloat(tokens[start]) || 1;
        if (tokens.length > start + 1) this.type = parseInt(tokens[start + 1]) || 0;
        if (tokens.length > start + 2) this.delay = parseFloat(tokens[start + 2]) || 0;
    }

    override reset(): void {
        this.triggered = false;
        this.stopped = false;
    }

    override setPoints(): void {
        super.setPoints();
        this.lead1 = { x: this.point1.x, y: this.point1.y };
    }

    override draw(g: Graphics): void {
        const selected = this.needsHighlight() || this.stopped;
        g.setFont('SansSerif', selected ? 14 : 12);
        g.setFontSize(selected ? 14 : 12);
        g.setColor(selected ? '#00FFFF' : '#FFFFFF');

        const s = 'trigger';
        const textWidth = g.measureWidth(s);
        const f = 1 - (Math.floor(textWidth / 2) + 8) / (this.dn || 1);
        this.lead1 = {
            x: Math.floor(this.point1.x * (1 - f) + this.point2.x * f + 0.48),
            y: Math.floor(this.point1.y * (1 - f) + this.point2.y * f + 0.48),
        };
        this.setBbox(this.point1.x, this.point1.y, this.lead1.x, this.lead1.y);

        g.textAlign('center');
        g.textBaseline('middle');
        g.drawString(s, this.x2, this.y2);

        this.setVoltageColor(g, this.volts[0]);
        if (selected) g.setColor('#00FFFF');
        CircuitComponent.drawThickLine(g, this.point1, this.lead1);
        this.drawPosts(g);
    }

    private drawPosts(g: Graphics): void {
        drawPost(g, this.point1);
    }

    override stepFinished(): void {
        this.stopped = false;
        if (!this.triggered) {
            const cond = (this.type === 0)
                ? this.volts[0] >= this.triggerVoltage
                : this.volts[0] <= this.triggerVoltage;
            if (cond) {
                this.triggered = true;
                this.triggerTime = this.simTime;
            }
        }
        if (this.triggered && this.simTime >= this.triggerTime + this.delay) {
            this.triggered = false;
            this.stopped = true;
        }
    }

    override getVoltageDiff(): number {
        return this.volts[0];
    }

    override getInfo(): string[] {
        const info = ['stop trigger'];
        info[1] = `V = ${this.formatVoltage(this.volts[0])}`;
        info[2] = `Vtrigger = ${this.formatVoltage(this.triggerVoltage)}`;
        if (this.triggered) {
            info[3] = `stopping in ${this.formatTime(this.triggerTime + this.delay - this.simTime)}`;
        } else if (this.stopped) {
            info[3] = 'stopped';
        } else {
            info[3] = 'waiting';
        }
        return info;
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Trigger Voltage', value: this.triggerVoltage };
        if (n === 1) {
            return {
                name: 'Trigger Type',
                choices: ['>=', '<='],
                selectedIndex: this.type,
            };
        }
        if (n === 2) return { name: 'Delay (s)', value: this.delay };
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (ei.value !== undefined) {
            if (_n === 0) this.triggerVoltage = ei.value;
            if (_n === 2) this.delay = ei.value;
        }
        if (_n === 1 && ei.selectedIndex !== undefined) {
            this.type = ei.selectedIndex;
        }
    }

    private formatVoltage(v: number): string {
        if (Math.abs(v) < 1e-3) return `${(v * 1e3).toFixed(2)} mV`;
        return `${v.toFixed(2)} V`;
    }

    private formatTime(t: number): string {
        if (t >= 1) return `${t.toFixed(3)} s`;
        if (t >= 1e-3) return `${(t * 1e3).toFixed(2)} ms`;
        return `${(t * 1e6).toFixed(2)} µs`;
    }
}

registerComponent(408, 'StopTriggerElm', StopTriggerElm);
