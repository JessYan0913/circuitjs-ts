import { VoltageComponent, WF_DC, WF_AC, WF_SQUARE } from './DCVoltageComponent.js';
import type { StampContext } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';

/** 1-terminal voltage source (other terminal is GND) */
export class RailComponent extends VoltageComponent {
    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        // Default to DC for Rail
        this.waveform = WF_DC;
    }

    getDumpType(): number | string { return 'R'; }

    // Rail uses only 1 terminal (other is GND)
    stamp(context: StampContext): void {
        if (this.waveform === WF_DC) {
            context.stampVoltageSource(this.nodes[0], 0, this.voltSource, this.getVoltage());
        } else {
            context.stampVoltageSource(this.nodes[0], 0, this.voltSource);
        }
    }

    doStep(context: StampContext): void {
        if (this.waveform !== WF_DC) {
            context.updateVoltageSource(this.nodes[0], 0, this.voltSource, this.getVoltage());
        }
    }

    getInfo(): string[] {
        const names = ['DC', 'AC', 'Square', 'Triangle', 'Sawtooth', 'Pulse', 'Var', 'Noise'];
        return [`${names[this.waveform] || '?'} Source: ${this.maxVoltage} V`];
    }

    getShortcut(): number { return 'R'.charCodeAt(0); }
}

// ACRail, SquareRail, Clock all use RailComponent with different waveform defaults
export class ACRailComponent extends RailComponent {
    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.waveform = WF_AC;
    }
}

export class SquareRailComponent extends RailComponent {
    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.waveform = WF_SQUARE;
    }
}

export class ClockComponent extends RailComponent {
    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.waveform = WF_SQUARE;
        this.maxVoltage = 5;
        this.frequency = 100;
    }

    getInfo(): string[] {
        return [`Clock: ${this.frequency} Hz`];
    }
}

registerComponent('R'.charCodeAt(0), 'RailElm', RailComponent);
registerComponent('R'.charCodeAt(0), 'ACRailElm', ACRailComponent);
registerComponent('R'.charCodeAt(0), 'SquareRailElm', SquareRailComponent);
registerComponent('R'.charCodeAt(0), 'ClockElm', ClockComponent);
