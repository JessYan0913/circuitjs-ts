import { ChipComponent, createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import { registerComponent } from '../registry.js';

/** Half Adder: A + B = Sum, Cout */
export class HalfAdderComponent extends ChipComponent {
    getChipName(): string { return 'HalfAdder'; }

    override setupPins(): void {
        this.sizeX = 2;
        this.sizeY = 2;
        this.pins = [
            createPin(0, SIDE_W, 'A'),
            createPin(1, SIDE_W, 'B'),
            createPin(0, SIDE_E, 'S'),
            createPin(1, SIDE_E, 'Co'),
        ];
        this.pins[2].output = true;
        this.pins[3].output = true;
    }

    override execute(): void {
        const a = this.pins[0].value ? 1 : 0;
        const b = this.pins[1].value ? 1 : 0;
        this.pins[2].value = (a ^ b) !== 0;
        this.pins[3].value = (a & b) !== 0;
    }

    override getDumpType(): number | string { return 195; }
}

registerComponent(195, 'HalfAdderElm', HalfAdderComponent);
