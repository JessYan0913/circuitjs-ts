import { ChipComponent, createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import type { EditInfo } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';

/** Ring Counter */
export class RingCounterComponent extends ChipComponent {
    outputCount = 4;
    private position = 0;
    private clockState = false;

    getChipName(): string { return 'Ring'; }

    override setupPins(): void {
        this.sizeX = 2;
        this.sizeY = Math.max(2, Math.ceil((this.outputCount + 2) / 2));
        this.pins = [
            createPin(0, SIDE_W, '>'),
            createPin(1, SIDE_W, 'R'),
        ];
        this.pins[0].clock = true;
        for (let i = 0; i < this.outputCount; i++) {
            const p = createPin(i, SIDE_E, `Q${i}`);
            p.output = true;
            this.pins.push(p);
        }
    }

    override execute(): void {
        const clk = this.pins[0].value;
        const rst = this.pins[1].value;

        if (rst) {
            this.position = 0;
            this.clockState = clk;
            this.updateOutputs();
            return;
        }

        if (clk && !this.clockState) {
            this.position = (this.position + 1) % this.outputCount;
            this.updateOutputs();
        }
        this.clockState = clk;
    }

    private updateOutputs(): void {
        for (let i = 0; i < this.outputCount; i++) {
            this.pins[2 + i].value = (i === this.position);
        }
    }

    override getDumpType(): number | string { return 163; }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) {
            return { name: 'Outputs', value: this.outputCount, min: 2, max: 16 };
        }
        return super.getEditInfo(n - 1);
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 0 && ei.value !== undefined) {
            const newCount = Math.max(2, Math.min(16, Math.round(Number(ei.value))));
            if (newCount !== this.outputCount) {
                this.outputCount = newCount;
                if (this.position >= this.outputCount) this.position = 0;
                this.setupPins();
                this.setPoints();
                this.allocNodes();
            }
            return;
        }
        super.setEditValue(_n - 1, ei);
    }

    override dump(): string {
        return super.dump() + ` ${this.outputCount} ${this.position}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.outputCount = parseInt(tokens[start]) || 4;
        if (tokens.length > start + 1) this.position = parseInt(tokens[start + 1]) || 0;
        this.setupPins();
        this.setPoints();
        this.allocNodes();
    }
}

registerComponent(163, 'RingCounterElm', RingCounterComponent);
