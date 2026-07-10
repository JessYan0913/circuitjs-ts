import { ChipComponent, createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import type { EditInfo } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';

/** DeMultiplexer — routes input to one of N outputs */
export class DeMultiplexerComponent extends ChipComponent {
    outputCount = 4; // 2, 4, or 8

    getChipName(): string { return 'DMUX'; }

    get selectBits(): number {
        if (this.outputCount <= 2) return 1;
        if (this.outputCount <= 4) return 2;
        return 3;
    }

    override setupPins(): void {
        this.sizeX = 2;
        const selBits = this.selectBits;
        const totalPins = 1 + selBits + this.outputCount; // data in + sel + outputs
        this.sizeY = Math.max(2, Math.ceil(totalPins / 2));
        this.pins = [];

        // Data input on left
        let pIdx = 0;
        this.pins.push(createPin(pIdx++, SIDE_W, 'D'));

        // Select pins on left
        for (let i = 0; i < selBits; i++) {
            this.pins.push(createPin(pIdx++, SIDE_W, `S${i}`));
        }
        // Outputs on right
        for (let i = 0; i < this.outputCount; i++) {
            const p = createPin(i, SIDE_E, `${i}`);
            p.output = true;
            this.pins.push(p);
        }
    }

    override execute(): void {
        let sel = 0;
        const selBits = this.selectBits;
        const dataIdx = 1;
        for (let i = 0; i < selBits; i++) {
            if (this.pins[dataIdx + i].value) sel |= (1 << i);
        }
        const dataIn = this.pins[0].value;
        const outStart = dataIdx + selBits;
        for (let i = 0; i < this.outputCount; i++) {
            this.pins[outStart + i].value = (i === sel) ? dataIn : false;
        }
    }

    override getDumpType(): number | string { return 185; }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) {
            return { name: 'Outputs', value: this.outputCount, min: 2, max: 8 };
        }
        return super.getEditInfo(n - 1);
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 0 && ei.value !== undefined) {
            const v = Math.round(Number(ei.value));
            const newCount = v <= 2 ? 2 : v <= 4 ? 4 : 8;
            if (newCount !== this.outputCount) {
                this.outputCount = newCount;
                this.setupPins();
                this.setPoints();
                this.allocNodes();
            }
            return;
        }
        super.setEditValue(_n - 1, ei);
    }

    override dump(): string {
        return super.dump() + ` ${this.outputCount}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) {
            const v = parseInt(tokens[start]) || 4;
            this.outputCount = v <= 2 ? 2 : v <= 4 ? 4 : 8;
            this.setupPins();
            this.setPoints();
            this.allocNodes();
        }
    }
}

registerComponent(185, 'DeMultiplexerElm', DeMultiplexerComponent);
