import { ChipComponent, createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import { registerComponent } from '../registry.js';

/** Full Adder: A + B + Cin = Sum, Cout */
export class FullAdderComponent extends ChipComponent {
    getChipName(): string { return 'FullAdder'; }

    override setupPins(): void {
        this.sizeX = 2;
        this.sizeY = 3;
        this.pins = [
            createPin(0, SIDE_W, 'A'),
            createPin(1, SIDE_W, 'B'),
            createPin(2, SIDE_W, 'Ci'),
            createPin(0, SIDE_E, 'S'),
            createPin(1, SIDE_E, 'Co'),
        ];
        this.pins[3].output = true;
        this.pins[4].output = true;
    }

    override execute(): void {
        const a = this.pins[0].value ? 1 : 0;
        const b = this.pins[1].value ? 1 : 0;
        const ci = this.pins[2].value ? 1 : 0;
        const sum = a ^ b ^ ci;
        const cout = (a & b) | (a & ci) | (b & ci);
        this.pins[3].value = sum !== 0;
        this.pins[4].value = cout !== 0;
    }

    override getDumpType(): number | string { return 196; }
}

registerComponent(196, 'FullAdderElm', FullAdderComponent);
