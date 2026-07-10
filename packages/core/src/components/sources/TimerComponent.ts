import { ChipComponent, createPin, SIDE_N, SIDE_S, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import type { StampContext, EditInfo } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';

/** 555 Timer IC behavioral model */
export class TimerComponent extends ChipComponent {
    static readonly FLAG_RESET = 2;
    static readonly FLAG_GROUND = 4;

    static readonly N_DIS = 0;
    static readonly N_TRIG = 1;
    static readonly N_THRES = 2;
    static readonly N_VIN = 3;
    static readonly N_CTL = 4;
    static readonly N_OUT = 5;
    static readonly N_RST = 6;
    static readonly N_GND = 7;

    out = false;
    ground = 0;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
    }

    override getDefaultFlags(): number {
        return TimerComponent.FLAG_RESET | TimerComponent.FLAG_GROUND;
    }

    getChipName(): string { return '555 Timer'; }

    override setupPins(): void {
        this.sizeX = 3;
        this.sizeY = 5;
        this.pins = [
            createPin(1, SIDE_W, 'dis'),
            createPin(3, SIDE_W, 'tr'),
            createPin(4, SIDE_W, 'th'),
            createPin(1, SIDE_N, 'Vin'),
            createPin(1, SIDE_S, 'ctl'),
            createPin(2, SIDE_E, 'out'),
            createPin(1, SIDE_E, 'rst'),
            createPin(2, SIDE_S, 'gnd'),
        ];
        this.pins[TimerComponent.N_TRIG].lineOver = true;
        this.pins[TimerComponent.N_OUT].state = true;
    }

    hasReset(): boolean { return (this.flags & TimerComponent.FLAG_RESET) !== 0 || this.hasGroundPin(); }
    hasGroundPin(): boolean { return (this.flags & TimerComponent.FLAG_GROUND) !== 0; }

    override getPostCount(): number {
        return this.hasGroundPin() ? 8 : this.hasReset() ? 7 : 6;
    }

    override nonLinear(): boolean { return true; }

    override stamp(context: StampContext): void {
        this.ground = this.hasGroundPin() ? this.nodes[TimerComponent.N_GND] : 0;

        // Voltage divider for control pin at 2/3 V
        context.stampResistor(this.nodes[TimerComponent.N_VIN], this.nodes[TimerComponent.N_CTL], 5000);
        const groundNode = this.hasGroundPin() ? this.nodes[TimerComponent.N_GND] : 0;
        context.stampResistor(this.nodes[TimerComponent.N_CTL], groundNode, 10000);

        // Nonlinear pins for discharge, output, Vin
        context.stampNonLinear(this.nodes[TimerComponent.N_DIS] > 0 ? this.nodes[TimerComponent.N_DIS] - 1 : 0);
        context.stampNonLinear(this.nodes[TimerComponent.N_OUT] > 0 ? this.nodes[TimerComponent.N_OUT] - 1 : 0);
        context.stampNonLinear(this.nodes[TimerComponent.N_VIN] > 0 ? this.nodes[TimerComponent.N_VIN] - 1 : 0);
        if (this.hasGroundPin()) {
            context.stampNonLinear(this.nodes[TimerComponent.N_GND] > 0 ? this.nodes[TimerComponent.N_GND] - 1 : 0);
        }
    }

    override calculateCurrent(): void {
        const groundVolts = this.hasGroundPin() ? this.volts[TimerComponent.N_GND] : 0;

        this.pins[TimerComponent.N_VIN].current =
            (this.volts[TimerComponent.N_CTL] - this.volts[TimerComponent.N_VIN]) / 5000;

        this.pins[TimerComponent.N_CTL].current =
            -(this.volts[TimerComponent.N_CTL] - groundVolts) / 10000 -
            this.pins[TimerComponent.N_VIN].current;

        this.pins[TimerComponent.N_DIS].current =
            (!this.out) ? -(this.volts[TimerComponent.N_DIS] - groundVolts) / 10 : 0;

        this.pins[TimerComponent.N_OUT].current =
            -(this.volts[TimerComponent.N_OUT] -
              (this.out ? this.volts[TimerComponent.N_VIN] : groundVolts));

        if (this.out) {
            this.pins[TimerComponent.N_VIN].current -= this.pins[TimerComponent.N_OUT].current;
        }

        if (this.hasGroundPin()) {
            this.pins[TimerComponent.N_GND].current =
                (this.volts[TimerComponent.N_CTL] - groundVolts) / 10000;
            if (!this.out) {
                this.pins[TimerComponent.N_GND].current +=
                    (this.volts[TimerComponent.N_DIS] - groundVolts) / 10 +
                    (this.volts[TimerComponent.N_OUT] - groundVolts);
            }
        }
    }

    override startIteration(): void {
        const vctl = this.volts[TimerComponent.N_CTL];
        this.out = this.volts[TimerComponent.N_OUT] > this.volts[TimerComponent.N_VIN] / 2;

        // Threshold comparator: threshold > control → output low
        if (this.volts[TimerComponent.N_THRES] > vctl) {
            this.out = false;
        }

        // Trigger comparator: trigger < control/2 → output high (overrides threshold)
        if (vctl / 2 > this.volts[TimerComponent.N_TRIG]) {
            this.out = true;
        }

        const groundVolts = this.hasGroundPin() ? this.volts[TimerComponent.N_GND] : 0;

        // Reset overrides trigger
        if (this.hasReset() && this.volts[TimerComponent.N_RST] < 0.7 + groundVolts) {
            this.out = false;
        }
    }

    override doStep(context: StampContext): void {
        const groundNode = this.hasGroundPin() ? this.nodes[TimerComponent.N_GND] : 0;

        // If output is low, discharge pin to ground via 10 ohm
        if (!this.out) {
            context.stampResistor(this.nodes[TimerComponent.N_DIS], groundNode, 10);
        }

        // If output is high, connect Vin to output; otherwise output to ground
        context.stampResistor(
            this.out ? this.nodes[TimerComponent.N_VIN] : groundNode,
            this.nodes[TimerComponent.N_OUT],
            1,
        );
    }

    override execute(): void { /* handled in startIteration/doStep */ }

    override getDumpType(): number | string { return 165; }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 2) {
            return {
                name: 'Ground Pin',
                checkbox: true,
                checkboxState: this.hasGroundPin(),
            };
        }
        return super.getEditInfo(n);
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 2 && ei.checkboxState !== undefined) {
            if (ei.checkboxState) this.flags |= TimerComponent.FLAG_GROUND;
            else this.flags &= ~TimerComponent.FLAG_GROUND;
            this.allocNodes();
            this.setPoints();
            return;
        }
        super.setEditValue(_n, ei);
    }
}

registerComponent(165, 'TimerElm', TimerComponent);
