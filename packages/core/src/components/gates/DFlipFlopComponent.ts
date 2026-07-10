import { ChipComponent, createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import type { EditInfo } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';

/** D Flip-Flop with optional Preset and Clear */
export class DFlipFlopComponent extends ChipComponent {
    private clockState = false;
    hasReset = false;
    hasPreset = false;

    getChipName(): string { return 'D FF'; }

    override setupPins(): void {
        this.sizeX = 2;
        this.sizeY = this.hasReset || this.hasPreset ? 3 : 2;
        const pins = [
            createPin(0, SIDE_W, 'D'),
            createPin(1, SIDE_W, '>'),
        ];
        pins[1].clock = true;
        if (this.hasReset) {
            pins.push(createPin(2, SIDE_W, 'R'));
        }
        if (this.hasPreset) {
            pins.push(createPin(this.hasReset ? 3 : 2, SIDE_W, 'S'));
        }
        pins.push(createPin(0, SIDE_E, 'Q'));
        pins.push(createPin(1, SIDE_E, 'Q̅'));
        pins[pins.length - 1].lineOver = true;
        pins[pins.length - 1].output = true;
        pins[pins.length - 2].output = true;
        this.pins = pins;
    }

    override execute(): void {
        const clk = this.pins[1].value;
        let d = this.pins[0].value;

        // Handle preset (active low)
        const presetPin = this.hasPreset ? (this.hasReset ? 3 : 2) : -1;
        if (presetPin >= 0 && !this.pins[presetPin].value) {
            this.pins[this.pins.length - 2].value = true;
            this.pins[this.pins.length - 1].value = false;
            this.clockState = clk;
            return;
        }

        // Handle reset (active low)
        const resetPin = this.hasReset ? 2 : -1;
        if (resetPin >= 0 && !this.pins[resetPin].value) {
            this.pins[this.pins.length - 2].value = false;
            this.pins[this.pins.length - 1].value = true;
            this.clockState = clk;
            return;
        }

        // Rising edge clock
        if (clk && !this.clockState) {
            this.pins[this.pins.length - 2].value = d;
            this.pins[this.pins.length - 1].value = !d;
        }
        this.clockState = clk;
    }

    override getDumpType(): number | string { return 155; }

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

registerComponent(155, 'DFlipFlopElm', DFlipFlopComponent);
