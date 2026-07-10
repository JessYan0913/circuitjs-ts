import { ChipComponent, createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import type { EditInfo } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';

/** Parallel-In Serial-Out Shift Register */
export class PisoShiftComponent extends ChipComponent {
    bits = 8;
    private reg = 0;
    private clockState = false;

    getChipName(): string { return 'PISO'; }

    override setupPins(): void {
        this.sizeX = 2;
        const totalPins = this.bits + 3; // data + CLK + LOAD + Q
        this.sizeY = Math.max(2, Math.ceil(totalPins / 2));
        this.pins = [];
        for (let i = 0; i < this.bits; i++) {
            this.pins.push(createPin(i, SIDE_W, `D${i}`));
        }
        const clkIdx = this.bits;
        const loadIdx = this.bits + 1;
        this.pins.push(createPin(clkIdx, SIDE_W, '>'));
        this.pins.push(createPin(loadIdx, SIDE_W, 'LD'));
        this.pins[clkIdx].clock = true;

        const q = createPin(0, SIDE_E, 'Q');
        q.output = true;
        this.pins.push(q);
    }

    override execute(): void {
        const clk = this.pins[this.bits].value;
        const load = this.pins[this.bits + 1].value;

        // Load on rising edge of LOAD (asynchronous)
        if (load) {
            this.reg = 0;
            for (let i = 0; i < this.bits; i++) {
                if (this.pins[i].value) this.reg |= (1 << i);
            }
        }

        // Shift on rising clock
        if (clk && !this.clockState) {
            // MSB first
            this.reg = (this.reg >>> 1) | (1 << (this.bits - 1)); // shift in 1 for signed behavior
            // We shift in 0
            this.reg = this.reg >>> 1;
        }
        this.clockState = clk;

        // Output MSB
        this.pins[this.pins.length - 1].value = ((this.reg >>> (this.bits - 1)) & 1) !== 0;
    }

    override getDumpType(): number | string { return 186; }

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

registerComponent(186, 'PisoShiftElm', PisoShiftComponent);
