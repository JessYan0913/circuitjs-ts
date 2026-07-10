import { ChipComponent, createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import type { EditInfo } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';

/** Multiplexer — selects one of N inputs to output */
export class MultiplexerComponent extends ChipComponent {
    inputCount = 4; // 2, 4, or 8

    getChipName(): string { return 'MUX'; }

    get selectBits(): number {
        if (this.inputCount <= 2) return 1;
        if (this.inputCount <= 4) return 2;
        return 3;
    }

    override setupPins(): void {
        this.sizeX = 2;
        const selBits = this.selectBits;
        const totalPins = selBits + this.inputCount + 1; // sel + inputs + output
        this.sizeY = Math.max(2, Math.ceil(totalPins / 2));
        this.pins = [];

        // Select pins on left
        for (let i = 0; i < selBits; i++) {
            const p = createPin(i, SIDE_W, `S${i}`);
            this.pins.push(p);
        }
        // Data input pins on left
        for (let i = 0; i < this.inputCount; i++) {
            const p = createPin(selBits + i, SIDE_W, `${i}`);
            this.pins.push(p);
        }
        // Output on right
        const p = createPin(0, SIDE_E, 'Q');
        p.output = true;
        this.pins.push(p);
    }

    override execute(): void {
        let sel = 0;
        const selBits = this.selectBits;
        for (let i = 0; i < selBits; i++) {
            if (this.pins[i].value) sel |= (1 << i);
        }
        const inputVal = sel < this.inputCount ? this.pins[selBits + sel].value : false;
        this.pins[this.pins.length - 1].value = inputVal;
    }

    override getDumpType(): number | string { return 184; }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) {
            return { name: 'Inputs', value: this.inputCount, min: 2, max: 8 };
        }
        return super.getEditInfo(n - 1);
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 0 && ei.value !== undefined) {
            const v = Math.round(Number(ei.value));
            const newCount = v <= 2 ? 2 : v <= 4 ? 4 : 8;
            if (newCount !== this.inputCount) {
                this.inputCount = newCount;
                this.setupPins();
                this.setPoints();
                this.allocNodes();
            }
            return;
        }
        super.setEditValue(_n - 1, ei);
    }

    override dump(): string {
        return super.dump() + ` ${this.inputCount}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) {
            const v = parseInt(tokens[start]) || 4;
            this.inputCount = v <= 2 ? 2 : v <= 4 ? 4 : 8;
            this.setupPins();
            this.setPoints();
            this.allocNodes();
        }
    }
}

registerComponent(184, 'MultiplexerElm', MultiplexerComponent);
