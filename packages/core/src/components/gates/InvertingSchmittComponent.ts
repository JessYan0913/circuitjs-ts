import { ChipComponent, createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import { registerComponent } from '../registry.js';

/** Inverting Schmitt trigger */
export class InvertingSchmittComponent extends ChipComponent {
    private readonly HYST = 1.0;
    private lastOutput = false;

    getChipName(): string { return 'InvSchmitt'; }

    override setupPins(): void {
        this.sizeX = 1;
        this.sizeY = 2;
        this.pins = [
            createPin(0, SIDE_W, ''),
            createPin(0, SIDE_E, ''),
        ];
        this.pins[1].output = true;
    }

    override execute(): void {
        const voltsIn = this.volts[0];
        if (this.lastOutput) {
            this.pins[1].value = voltsIn > 2.5 + this.HYST ? false : true;
        } else {
            this.pins[1].value = voltsIn > 2.5 - this.HYST ? false : true;
        }
        this.lastOutput = this.pins[1].value;
    }

    override getDumpType(): number | string { return 183; }
}

registerComponent(183, 'InvertingSchmittElm', InvertingSchmittComponent);
