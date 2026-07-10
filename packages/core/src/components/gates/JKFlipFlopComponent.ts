import { ChipComponent, createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import type { EditInfo } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';

/** JK Flip-Flop with optional Preset and Clear */
export class JKFlipFlopComponent extends ChipComponent {
    private clockState = false;
    hasReset = false;
    hasPreset = false;

    getChipName(): string { return 'JK FF'; }

    override setupPins(): void {
        this.sizeX = 2;
        this.sizeY = this.hasReset || this.hasPreset ? 4 : 3;
        const pins = [
            createPin(0, SIDE_W, 'J'),
            createPin(1, SIDE_W, 'K'),
            createPin(2, SIDE_W, '>'),
        ];
        pins[2].clock = true;
        if (this.hasReset) {
            pins.push(createPin(3, SIDE_W, 'R'));
        }
        if (this.hasPreset) {
            pins.push(createPin(this.hasReset ? 4 : 3, SIDE_W, 'S'));
        }
        pins.push(createPin(0, SIDE_E, 'Q'));
        pins.push(createPin(1, SIDE_E, 'Q̅'));
        pins[pins.length - 1].lineOver = true;
        pins[pins.length - 1].output = true;
        pins[pins.length - 2].output = true;
        this.pins = pins;
    }

    override execute(): void {
        const clk = this.pins[2].value;
        const j = this.pins[0].value;
        const k = this.pins[1].value;

        // Get current Q state from output pin
        let q = this.pins[this.pins.length - 2].value;

        // Handle preset (active low)
        const presetPin = this.hasPreset ? (this.hasReset ? 4 : 3) : -1;
        if (presetPin >= 0 && !this.pins[presetPin].value) {
            this.pins[this.pins.length - 2].value = true;
            this.pins[this.pins.length - 1].value = false;
            this.clockState = clk;
            return;
        }

        // Handle reset (active low)
        const resetPin = this.hasReset ? 3 : -1;
        if (resetPin >= 0 && !this.pins[resetPin].value) {
            this.pins[this.pins.length - 2].value = false;
            this.pins[this.pins.length - 1].value = true;
            this.clockState = clk;
            return;
        }

        // Rising edge clock
        if (clk && !this.clockState) {
            if (j && !k) {
                q = true;   // set
            } else if (!j && k) {
                q = false;  // reset
            } else if (j && k) {
                q = !q;     // toggle
            }
            // else j=0,k=0: hold
            this.pins[this.pins.length - 2].value = q;
            this.pins[this.pins.length - 1].value = !q;
        }
        this.clockState = clk;
    }

    override getDumpType(): number | string { return 156; }

    override dump(): string {
        return super.dump() + ` ${this.hasReset ? 1 : 0} ${this.hasPreset ? 1 : 0}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.hasReset = tokens[start] !== '0';
        if (tokens.length > start + 1) this.hasPreset = tokens[start + 1] !== '0';
        this.setupPins();
        this.setPoints();
        this.allocNodes();
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Has Reset', checkbox: true, checkboxState: this.hasReset };
        if (n === 1) return { name: 'Has Preset', checkbox: true, checkboxState: this.hasPreset };
        return super.getEditInfo(n - 2);
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 0 && ei.checkboxState !== undefined) {
            this.hasReset = ei.checkboxState;
            this.setupPins();
            this.setPoints();
            this.allocNodes();
            return;
        }
        if (_n === 1 && ei.checkboxState !== undefined) {
            this.hasPreset = ei.checkboxState;
            this.setupPins();
            this.setPoints();
            this.allocNodes();
            return;
        }
        super.setEditValue(_n - 2, ei);
    }
}

registerComponent(156, 'JKFlipFlopElm', JKFlipFlopComponent);
