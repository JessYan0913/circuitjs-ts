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
    // n1=0 (GND), n2=nodes[0]: V(nodes[0]) - V(0) = voltage → correct polarity
    stamp(context: StampContext): void {
        if (this.waveform === WF_DC) {
            context.stampVoltageSource(0, this.nodes[0], this.voltSource, this.getVoltage());
        } else {
            context.stampVoltageSource(0, this.nodes[0], this.voltSource);
        }
    }

    doStep(context: StampContext): void {
        if (this.waveform !== WF_DC) {
            context.updateVoltageSource(0, this.nodes[0], this.voltSource, this.getVoltage());
        }
    }

    // Java RailElm.draw() uses updateDotCount(-current, curcount) — negate to get
    // conventional current direction in the external wire (out of positive terminal)
    override updateCurcount(currentMult: number): void {
        let cadd = -this.current * currentMult;
        cadd %= 8;
        this.curcount += cadd;
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
