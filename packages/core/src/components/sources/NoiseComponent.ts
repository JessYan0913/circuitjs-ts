import { RailComponent } from './RailComponent.js';
import { WF_NOISE } from './DCVoltageComponent.js';
import { registerComponent } from '../registry.js';

/** White noise source — extends Rail with WF_NOISE waveform */
export class NoiseComponent extends RailComponent {
    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.waveform = WF_NOISE;
    }

    override handleDumpData(tokens: string[], start: number): void {
        // Noise appears as Rail in dump; waveform is set in constructor
        // but we need to parse the 6 standard voltage fields
        if (tokens.length > start) this.waveform = parseInt(tokens[start]) || WF_NOISE;
        if (tokens.length > start + 1) this.frequency = parseFloat(tokens[start + 1]) || 40;
        if (tokens.length > start + 2) this.maxVoltage = parseFloat(tokens[start + 2]) || 5;
        if (tokens.length > start + 3) this.bias = parseFloat(tokens[start + 3]) || 0;
        if (tokens.length > start + 4) this.phaseShift = parseFloat(tokens[start + 4]) || 0;
        if (tokens.length > start + 5) this.dutyCycle = parseFloat(tokens[start + 5]) || 0.5;
        this.waveform = WF_NOISE;
    }

    getInfo(): string[] {
        return [`Noise Source: ${this.maxVoltage} V`];
    }
}

registerComponent('n'.charCodeAt(0), 'NoiseElm', NoiseComponent);
