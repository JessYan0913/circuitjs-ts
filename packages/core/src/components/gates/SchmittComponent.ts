import { ChipComponent, createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import { registerComponent } from '../registry.js';

/** Schmitt trigger buffer — outputs high when input > threshold, low when input < lower threshold */
export class SchmittComponent extends ChipComponent {
    private readonly HYST = 1.0;
    private lastOutput = false;

    getChipName(): string { return 'Schmitt'; }

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
        const input = this.pins[0].value;
        const voltsIn = this.volts[0];
        // Hysteresis: switching threshold depends on current output state
        if (this.lastOutput) {
            this.pins[1].value = voltsIn > 2.5 - this.HYST;
        } else {
            this.pins[1].value = voltsIn > 2.5 + this.HYST;
        }
        this.lastOutput = this.pins[1].value;
    }

    override getDumpType(): number | string { return 182; }
}

registerComponent(182, 'SchmittElm', SchmittComponent);
