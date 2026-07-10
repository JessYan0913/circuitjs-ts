import { RailComponent } from '../sources/RailComponent.js';
import { WF_AC } from '../sources/DCVoltageComponent.js';
import type { EditInfo } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';

/** AudioInputElm — reads audio file data and outputs as voltage signal */
export class AudioInputElm extends RailComponent {
    data: Float64Array | null = null;
    timeOffset = 0;
    samplingRate = 44100;
    fileNum = 0;
    fileName: string | null = null;
    maxVoltage = 5;
    startPosition = 0;
    private lastSimTime = 0;

    static lastSamplingRate = 44100;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.waveform = WF_AC;
    }

    getDumpType(): number | string {
        return 411;
    }

    override dump(): string {
        return `${super.dump()} ${this.maxVoltage} ${this.startPosition} ${this.fileNum}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        // Parse parent data (waveform, frequency, etc.)
        if (tokens.length > start) this.waveform = parseInt(tokens[start]) || WF_AC;
        if (tokens.length > start + 1) this.frequency = parseFloat(tokens[start + 1]) || 40;
        if (tokens.length > start + 2) this.maxVoltage = parseFloat(tokens[start + 2]) || 5;
        if (tokens.length > start + 3) this.bias = parseFloat(tokens[start + 3]) || 0;
        if (tokens.length > start + 4) this.phaseShift = parseFloat(tokens[start + 4]) || 0;
        if (tokens.length > start + 5) this.dutyCycle = parseFloat(tokens[start + 5]) || 0.5;
        this.waveform = WF_AC;

        // Audio-specific data
        if (tokens.length > start + 6) this.maxVoltage = parseFloat(tokens[start + 6]) || 5;
        if (tokens.length > start + 7) this.startPosition = parseFloat(tokens[start + 7]) || 0;
        if (tokens.length > start + 8) this.fileNum = parseInt(tokens[start + 8]) || 0;
    }

    override reset(): void {
        this.timeOffset = this.startPosition;
        this.lastSimTime = 0;
    }

    setSamplingRate(sr: number): void {
        this.samplingRate = sr;
    }

    override getVoltage(): number {
        if (this.data == null) return 0;
        if (this.timeOffset < this.startPosition) this.timeOffset = this.startPosition;
        const ptr = Math.floor(this.timeOffset * this.samplingRate);
        if (ptr >= this.data.length) {
            // Wrap around when exceeding data length (matches Java behavior)
            this.timeOffset = 0;
            return 0;
        }
        return this.data[ptr] * this.maxVoltage;
    }

    override stepFinished(): void {
        // Advance audio playback by one simulation time step.
        // Compute delta from last simTime, matching Java's timeOffset += sim.timeStep
        const dt = this.simTime - this.lastSimTime;
        this.lastSimTime = this.simTime;
        if (dt > 0) {
            this.timeOffset += dt;
        }
    }

    override getShortcut(): number {
        return 0;
    }

    override getInfo(): string[] {
        const info = ['audio input'];
        if (this.data == null) {
            info[1] = 'no file loaded';
            return info;
        }
        info[1] = `V = ${this.formatVoltage(this.volts[0])}`;
        info[2] = `pos = ${this.formatTime(this.timeOffset)}`;
        const dur = this.data.length / (this.samplingRate || 1);
        info[3] = `dur = ${this.formatTime(dur)}`;
        return info;
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) {
            return { name: 'Load Audio File', text: this.fileName || '' };
        }
        if (n === 1) return { name: 'Max Voltage', value: this.maxVoltage };
        if (n === 2) return { name: 'Start Position (s)', value: this.startPosition };
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 1 && ei.value !== undefined) this.maxVoltage = ei.value;
        if (_n === 2 && ei.value !== undefined) this.startPosition = ei.value;
    }

    setAudioData(data: Float64Array, name: string): void {
        this.data = data;
        this.fileName = name;
        AudioInputElm.lastSamplingRate = this.samplingRate;
    }

    private formatVoltage(v: number): string {
        if (Math.abs(v) < 1e-3) return `${(v * 1e3).toFixed(2)} mV`;
        return `${v.toFixed(2)} V`;
    }

    private formatTime(t: number): string {
        if (t >= 1) return `${t.toFixed(2)} s`;
        if (t >= 1e-3) return `${(t * 1e3).toFixed(2)} ms`;
        return `${(t * 1e6).toFixed(2)} µs`;
    }
}

registerComponent(411, 'AudioInputElm', AudioInputElm);
