import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { setVoltageColor, drawThickLinePt, drawPost } from '../drawutils.js';

/** LogicInput — clickable toggle between 0 and 1 */
export class LogicInputComponent extends CircuitComponent {
    value = false;
    highVoltage = 5;
    lowVoltage = 0;
    private readonly hs = 12;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.noDiagonal = true;
    }

    getDumpType(): number | string { return 'L'.charCodeAt(0); }
    getPostCount(): number { return 1; }
    getVoltageSourceCount(): number { return 1; }
    getInternalNodeCount(): number { return 1; }

    stamp(context: StampContext): void {
        context.stampVoltageSource(this.nodes[0], this.nodes[1], this.voltSource, this.value ? this.highVoltage : this.lowVoltage);
    }

    doStep(context: StampContext): void {
        context.updateVoltageSource(this.nodes[0], this.nodes[1], this.voltSource, this.value ? this.highVoltage : this.lowVoltage);
    }

    override reset(): void {
        this.value = false;
    }

    setPoints(): void {
        super.setPoints();
        this.calcLeads(0);
    }

    /** Called by the UI when clicked */
    toggle(): void {
        this.value = !this.value;
    }

    /** Check if a click at (px, py) hits the toggle area */
    hitToggle(px: number, py: number): boolean {
        return px >= this.x - this.hs && px <= this.x + this.hs &&
               py >= this.y - this.hs && py <= this.y + this.hs;
    }

    draw(g: Graphics): void {
        const v = this.volts[0];
        setVoltageColor(g, v, this);
        drawThickLinePt(g, this.point1, this.lead1);
        g.setColor(this.value ? '#00FF00' : '#CC0000');
        g.fillRect(this.x - this.hs, this.y - this.hs, this.hs * 2, this.hs * 2);
        g.setColor('#FFFFFF');
        g.setLineWidth(1);
        g.drawRect(this.x - this.hs, this.y - this.hs, this.hs * 2, this.hs * 2);
        g.setFontSize(16);
        g.textAlign('center');
        g.textBaseline('middle');
        g.drawString(this.value ? '1' : '0', this.x, this.y);
        drawPost(g, this.point1);
    }

    getInfo(): string[] {
        return [`Logic Input: ${this.value ? '1' : '0'} (${this.value ? this.highVoltage : this.lowVoltage} V)`];
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'High voltage', value: this.highVoltage };
        if (n === 1) return { name: 'Low voltage', value: this.lowVoltage };
        if (n === 2) return { name: 'Value (1=high)', checkbox: true, checkboxState: this.value };
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 0 && ei.value !== undefined) this.highVoltage = ei.value;
        if (_n === 1 && ei.value !== undefined) this.lowVoltage = ei.value;
        if (_n === 2 && ei.checkboxState !== undefined) this.value = ei.checkboxState;
    }

    override dump(): string {
        return super.dump() + ` ${this.value ? 1 : 0} ${this.highVoltage} ${this.lowVoltage}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.value = tokens[start] === '1';
        if (tokens.length > start + 1) this.highVoltage = parseFloat(tokens[start + 1]) || 5;
        if (tokens.length > start + 2) this.lowVoltage = parseFloat(tokens[start + 2]) || 0;
    }
}

registerComponent('L'.charCodeAt(0), 'LogicInputElm', LogicInputComponent);
