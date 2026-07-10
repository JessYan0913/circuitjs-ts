import { ChipComponent, createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import type { EditInfo } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';

/** Serial-In Parallel-Out Shift Register */
export class SipoShiftComponent extends ChipComponent {
    bits = 8;
    private reg = 0;
    private clockState = false;

    getChipName(): string { return 'SIPO'; }

    override setupPins(): void {
        this.sizeX = 2;
        const totalPins = 3 + this.bits; // D + CLK + RST + Q outputs
        this.sizeY = Math.max(2, Math.ceil(totalPins / 2));
        this.pins = [
            createPin(0, SIDE_W, 'D'),
            createPin(1, SIDE_W, '>'),
            createPin(2, SIDE_W, 'R'),
        ];
        this.pins[1].clock = true;
        for (let i = 0; i < this.bits; i++) {
            const p = createPin(i, SIDE_E, `Q${i}`);
            p.output = true;
            this.pins.push(p);
        }
    }

    override execute(): void {
        const clk = this.pins[1].value;
        const rst = this.pins[2].value;

        if (rst) {
            this.reg = 0;
            this.clockState = clk;
            this.updateOutputs();
            return;
        }

        if (clk && !this.clockState) {
            const d = this.pins[0].value ? 1 : 0;
            this.reg = (this.reg << 1) | d;
            this.reg &= (1 << this.bits) - 1;
            this.updateOutputs();
        }
        this.clockState = clk;
    }

    private updateOutputs(): void {
        for (let i = 0; i < this.bits; i++) {
            this.pins[3 + i].value = ((this.reg >>> (this.bits - 1 - i)) & 1) !== 0;
        }
    }

    override getDumpType(): number | string { return 189; }

    override dump(): string {
        return super.dump() + ` ${this.bits} ${this.reg}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.bits = parseInt(tokens[start]) || 8;
        if (tokens.length > start + 1) this.reg = parseInt(tokens[start + 1]) || 0;
        this.setupPins();
        this.setPoints();
        this.allocNodes();
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Bits', value: this.bits, min: 2, max: 32 };
        return super.getEditInfo(n - 1);
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 0 && ei.value !== undefined) {
            this.bits = Math.max(2, Math.min(32, Math.round(Number(ei.value))));
            this.setupPins();
            this.setPoints();
            this.allocNodes();
            return;
        }
        super.setEditValue(_n - 1, ei);
    }
}

registerComponent(189, 'SipoShiftElm', SipoShiftComponent);
