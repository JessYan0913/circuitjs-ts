import { ChipComponent, createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';

/**
 * Time-Delay Relay — switches output after a configurable delay.
 * Port of Java TimeDelayRelayElm.
 *
 * Pin configuration:
 *   0: Vin (control voltage input)
 *   1: GND (ground)
 *   2: IN  (switch input)
 *   3: OUT (switch output)
 */
export class TimeDelayRelayComponent extends ChipComponent {
    onDelay = 1;        // seconds
    offDelay = 0;       // seconds
    onResistance = 1;
    offResistance = 1e7;
    private resistance = 1e7;
    private lastTransition = 0;
    private poweredState = false;
    private onState = false;
    private vinResistance = 10e3;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.resistance = this.offResistance;
    }

    override getDumpType(): number | string { return 414; }

    override handleDumpData(tokens: string[], startIndex: number): void {
        if (tokens.length > startIndex) this.onDelay = parseFloat(tokens[startIndex]);
        if (tokens.length > startIndex + 1) this.offDelay = parseFloat(tokens[startIndex + 1]);
        if (tokens.length > startIndex + 2) this.onResistance = parseFloat(tokens[startIndex + 2]);
        if (tokens.length > startIndex + 3) this.offResistance = parseFloat(tokens[startIndex + 3]);
        this.resistance = this.offResistance;
    }

    override dump(): string {
        return super.dump() + ` ${this.onDelay} ${this.offDelay} ${this.onResistance} ${this.offResistance}`;
    }

    getChipName(): string { return 'time delay relay'; }

    override setupPins(): void {
        this.sizeX = 2;
        this.sizeY = 2;
        this.pins = [
            createPin(0, SIDE_W, 'Vin'),
            createPin(0, SIDE_E, 'GND'),
            createPin(1, SIDE_W, 'in'),
            createPin(1, SIDE_E, 'out'),
        ];
    }

    override stamp(context: StampContext): void {
        // Vin input resistor (linear, stamped once)
        context.stampResistor(this.nodes[0], this.nodes[1], this.vinResistance);
        // Switch pins are nonlinear — stamped each iteration via doStep
        context.stampNonLinear(this.nodes[2]);
        context.stampNonLinear(this.nodes[3]);
    }

    override nonLinear(): boolean { return true; }

    override doStep(context: StampContext): void {
        // Stamp switch resistor each NR iteration (matches Java TimeDelayRelayElm)
        this.resistance = this.onState ? this.onResistance : this.offResistance;
        context.stampResistor(this.nodes[2], this.nodes[3], this.resistance);
    }

    override execute(): void {
        // Read control voltage (matches Java TimeDelayRelayElm)
        const vin = this.volts[0] - this.volts[1];
        this.poweredState = vin > 2.5;
    }

    override stepFinished(): void {
        // Time management: only advance state once per converged timestep (matches Java)
        const delay = this.poweredState ? this.onDelay : this.offDelay;
        if (this.simTime > this.lastTransition + delay) {
            if (this.onState !== this.poweredState) {
                this.onState = this.poweredState;
                this.lastTransition = this.simTime;
            }
        }
    }

    override reset(): void {
        super.reset();
        this.lastTransition = 0;
        this.poweredState = false;
        this.onState = false;
        this.resistance = this.offResistance;
    }

    override getVoltageSourceCount(): number { return 0; }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 2) return { name: 'On Delay (s)', value: this.onDelay, min: 0, max: 100 };
        if (n === 3) return { name: 'Off Delay (s)', value: this.offDelay, min: 0, max: 100 };
        if (n === 4) return { name: 'On Resistance (Ω)', value: this.onResistance, min: 0.01, max: 100 };
        if (n === 5) return { name: 'Off Resistance (Ω)', value: this.offResistance, min: 1000, max: 1e9 };
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (ei.value === undefined) return;
        if (_n === 2) this.onDelay = ei.value;
        if (_n === 3) this.offDelay = ei.value;
        if (_n === 4) this.onResistance = ei.value;
        if (_n === 5) this.offResistance = ei.value;
    }

    override getInfo(): string[] {
        return [
            this.getChipName(),
            `Vin = ${(this.volts[0] - this.volts[1]).toFixed(2)} V`,
            this.onState ? 'Output = ON' : 'Output = OFF',
            `Vout = ${(this.volts[2] - this.volts[3]).toFixed(2)} V`,
        ];
    }
}

registerComponent(414, 'TimeDelayRelayElm', TimeDelayRelayComponent);
