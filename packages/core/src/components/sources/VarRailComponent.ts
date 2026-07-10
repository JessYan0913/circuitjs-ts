import { type StampContext, type EditInfo } from '@circuitjs/shared';
import type { Adjustable } from '@circuitjs/shared';
import { RailComponent } from './RailComponent.js';
import { WF_VAR } from './DCVoltageComponent.js';
import { registerComponent } from '../registry.js';

/** Variable voltage rail with slider support */
export class VarRailComponent extends RailComponent implements Adjustable {
    /** Slider value 0-100, maps to [bias, maxVoltage] */
    sliderValue = 50;
    sliderText = 'Voltage';

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.waveform = WF_VAR;
    }

    getDumpType(): number | string { return 172; }

    override dump(): string {
        // Encode + signs for URL safety
        const encodedText = this.sliderText.replace(/\+/g, '%2B');
        return super.dump() + ` ${encodedText}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        // Parse the standard 6 voltage fields first
        if (tokens.length > start) this.waveform = parseInt(tokens[start]) || WF_VAR;
        if (tokens.length > start + 1) this.frequency = parseFloat(tokens[start + 1]) || 40;
        if (tokens.length > start + 2) this.maxVoltage = parseFloat(tokens[start + 2]) || 5;
        if (tokens.length > start + 3) this.bias = parseFloat(tokens[start + 3]) || 0;
        if (tokens.length > start + 4) this.phaseShift = parseFloat(tokens[start + 4]) || 0;
        if (tokens.length > start + 5) this.dutyCycle = parseFloat(tokens[start + 5]) || 0.5;
        this.waveform = WF_VAR;

        // The rest is slider text
        if (tokens.length > start + 6) {
            let text = tokens.slice(start + 6).join(' ');
            text = text.replace(/%2[bB]/g, '+');
            this.sliderText = text;
        }
    }

    /** Compute voltage from slider position: maps sliderValue (0-100) to [bias, maxVoltage] */
    override getVoltage(): number {
        return this.sliderValue * (this.maxVoltage - this.bias) / 100 + this.bias;
    }

    // Adjustable interface
    getSliderValue(): number {
        return this.sliderValue / 100;
    }

    setSliderValue(val: number): void {
        this.sliderValue = Math.max(0, Math.min(100, val * 100));
    }

    override stamp(context: StampContext): void {
        // Always use DC stamping with variable voltage
        context.stampVoltageSource(this.nodes[0], 0, this.voltSource, this.getVoltage());
    }

    override doStep(context: StampContext): void {
        // Update voltage each step from slider
        context.updateVoltageSource(this.nodes[0], 0, this.voltSource, this.getVoltage());
    }

    override setPoints(): void {
        super.setPoints();
        // VarRail uses short leads like DC
        this.calcLeads(8);
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Min Voltage', value: this.bias, min: -20, max: 20 };
        if (n === 1) return { name: 'Max Voltage', value: this.maxVoltage, min: -20, max: 20 };
        if (n === 2) return { name: 'Slider Text', text: this.sliderText };
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (ei.value !== undefined) {
            if (_n === 0) this.bias = ei.value;
            if (_n === 1) this.maxVoltage = ei.value;
        }
        if (ei.text !== undefined && _n === 2) {
            this.sliderText = ei.text;
        }
    }

    override getInfo(): string[] {
        return [`VarRail: ${this.getVoltage().toFixed(2)} V`];
    }

    override getShortcut(): number { return 0; }
}

registerComponent(172, 'VarRailElm', VarRailComponent);
