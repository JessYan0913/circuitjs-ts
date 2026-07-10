import { ChipComponent, createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import type { EditInfo } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';

/** Binary Counter */
export class CounterComponent extends ChipComponent {
    maxCount = 16; // 4-bit default
    private count = 0;
    private clockState = false;

    getChipName(): string { return 'Counter'; }

    get bitCount(): number {
        let b = 0, m = this.maxCount - 1;
        while (m > 0) { b++; m >>= 1; }
        return Math.max(1, b);
    }

    override setupPins(): void {
        this.sizeX = 2;
        const bits = this.bitCount;
        this.sizeY = Math.max(2, Math.ceil((bits + 2) / 2));
        this.pins = [
            createPin(0, SIDE_W, '>'),
            createPin(1, SIDE_W, 'R'),
        ];
        this.pins[0].clock = true;
        for (let i = 0; i < bits; i++) {
            const p = createPin(i, SIDE_E, `Q${i}`);
            p.output = true;
            this.pins.push(p);
        }
    }

    override execute(): void {
        const clk = this.pins[0].value;
        const rst = this.pins[1].value;

        if (rst) {
            this.count = 0;
            this.clockState = clk;
            this.updateOutputs();
            return;
        }

        if (clk && !this.clockState) {
            this.count = (this.count + 1) % this.maxCount;
            this.updateOutputs();
        }
        this.clockState = clk;
    }

    private updateOutputs(): void {
        const bits = this.bitCount;
        for (let i = 0; i < bits; i++) {
            this.pins[2 + i].value = ((this.count >>> i) & 1) !== 0;
        }
    }

    override getDumpType(): number | string { return 164; }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) {
            return { name: 'Max count', value: this.maxCount, min: 2, max: 256 };
        }
        return super.getEditInfo(n - 1);
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 0 && ei.value !== undefined) {
            const newMax = Math.max(2, Math.min(256, Math.round(Number(ei.value))));
            if (newMax !== this.maxCount) {
                this.maxCount = newMax;
                if (this.count >= this.maxCount) this.count = 0;
                this.setupPins();
                this.setPoints();
                this.allocNodes();
            }
            return;
        }
        super.setEditValue(_n - 1, ei);
    }

    override dump(): string {
        return super.dump() + ` ${this.maxCount} ${this.count}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.maxCount = parseInt(tokens[start]) || 16;
        if (tokens.length > start + 1) this.count = parseInt(tokens[start + 1]) || 0;
        this.setupPins();
        this.setPoints();
        this.allocNodes();
    }
}

registerComponent(164, 'CounterElm', CounterComponent);
