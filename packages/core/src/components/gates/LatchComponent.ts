import { ChipComponent, createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import { registerComponent } from '../registry.js';

/** D Latch (level-sensitive) */
export class LatchComponent extends ChipComponent {
    getChipName(): string { return 'Latch'; }

    override setupPins(): void {
        this.sizeX = 2;
        this.sizeY = 2;
        this.pins = [
            createPin(0, SIDE_W, 'D'),
            createPin(1, SIDE_W, 'E'),
            createPin(0, SIDE_E, 'Q'),
            createPin(1, SIDE_E, 'Q̅'),
        ];
        this.pins[2].output = true;
        this.pins[3].output = true;
        this.pins[3].lineOver = true;
    }

    override execute(): void {
        const d = this.pins[0].value;
        const en = this.pins[1].value;

        if (en) {
            // Level-sensitive: Q follows D when enabled
            this.pins[2].value = d;
            this.pins[3].value = !d;
        }
        // else: Q holds previous value
    }

    override getDumpType(): number | string { return 168; }
}

registerComponent(168, 'LatchElm', LatchComponent);
