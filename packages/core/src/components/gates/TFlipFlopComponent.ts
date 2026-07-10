import { ChipComponent, createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import { registerComponent } from '../registry.js';

/** T Flip-Flop */
export class TFlipFlopComponent extends ChipComponent {
    private clockState = false;

    getChipName(): string { return 'T FF'; }

    override setupPins(): void {
        this.sizeX = 2;
        this.sizeY = 2;
        this.pins = [
            createPin(0, SIDE_W, 'T'),
            createPin(1, SIDE_W, '>'),
            createPin(0, SIDE_E, 'Q'),
            createPin(1, SIDE_E, 'Q̅'),
        ];
        this.pins[1].clock = true;
        this.pins[2].output = true;
        this.pins[3].output = true;
        this.pins[3].lineOver = true;
    }

    override execute(): void {
        const clk = this.pins[1].value;
        const t = this.pins[0].value;
        let q = this.pins[2].value;

        // Rising edge clock
        if (clk && !this.clockState && t) {
            q = !q;
            this.pins[2].value = q;
            this.pins[3].value = !q;
        }
        this.clockState = clk;
    }

    override getDumpType(): number | string { return 193; }
}

registerComponent(193, 'TFlipFlopElm', TFlipFlopComponent);
