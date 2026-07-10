import { ChipComponent, createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import type { EditInfo } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';

/** Binary Counter with up/down, modulus, invertreset (matches Java CounterElm) */
export class CounterComponent extends ChipComponent {
    static readonly FLAG_UP_DOWN = 4;

    bits = 4;
    invertreset = true;
    modulus = 0;
    private count = 0;
    private clockState = false;

    getChipName(): string { return 'Counter'; }

    hasUpDown(): boolean { return (this.flags & CounterComponent.FLAG_UP_DOWN) !== 0; }
    needsBits(): boolean { return true; }

    override setupPins(): void {
        this.sizeX = 2;
        this.sizeY = this.bits > 2 ? this.bits : 2;
        const totalPins = this.hasUpDown() ? this.bits + 3 : this.bits + 2;
        this.pins = [];

        this.pins.push(createPin(0, SIDE_W, ''));
        this.pins[0].clock = true;

        this.pins.push(createPin(this.sizeY - 1, SIDE_W, 'R'));
        this.pins[1].bubble = this.invertreset;

        for (let i = 0; i < this.bits; i++) {
            const p = createPin(i, SIDE_E, `Q${this.bits - i - 1}`);
            p.output = true;
            this.pins.push(p);
        }

        if (this.hasUpDown()) {
            this.pins.push(createPin(this.sizeY - 2, SIDE_W, 'U/D'));
        }
    }

    override getPostCount(): number {
        return this.hasUpDown() ? this.bits + 3 : this.bits + 2;
    }

    override getVoltageSourceCount(): number { return this.bits; }

    override execute(): void {
        // Clock rising edge
        if (this.pins[0].value && !this.clockState) {
            let value = 0;
            const lastBit = 2 + this.bits - 1;

            // Get current value from output pins
            for (let i = 0; i < this.bits; i++) {
                if (this.pins[lastBit - i].value) value |= (1 << i);
            }

            // Apply direction
            let dir = 1;
            if (this.hasUpDown() && this.pins[this.bits + 2].value) dir = -1;

            // Update value
            value += dir;
            if (this.modulus !== 0) {
                value = ((value % this.modulus) + this.modulus) % this.modulus;
            }

            this.count = value;

            // Convert value to binary
            for (let i = 0; i < this.bits; i++) {
                this.pins[lastBit - i].value = (value & (1 << i)) !== 0;
            }
        }

        // Reset (active when !pins[1].value == invertreset)
        if (this.pins[1].value !== this.invertreset) {
            for (let i = 0; i < this.bits; i++) {
                this.pins[i + 2].value = false;
            }
        }

        this.clockState = this.pins[0].value;
    }

    override getDumpType(): number | string { return 164; }

    override dump(): string {
        return super.dump() + ` ${this.invertreset} ${this.modulus}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.invertreset = tokens[start] === 'true';
        if (tokens.length > start + 1) this.modulus = parseInt(tokens[start + 1]) || 0;
        this.setupPins();
        this.setPoints();
        this.allocNodes();
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 2) {
            return { name: 'Invert reset pin', checkbox: true, checkboxState: this.invertreset };
        }
        if (n === 3) {
            return { name: '# of Bits', value: this.bits, min: 3, max: 16 };
        }
        if (n === 4) {
            return { name: 'Modulus', value: this.modulus, min: 0, max: 65536 };
        }
        if (n === 5) {
            return { name: 'Up/Down Pin', checkbox: true, checkboxState: this.hasUpDown() };
        }
        return super.getEditInfo(n);
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 2 && ei.checkboxState !== undefined) {
            this.invertreset = ei.checkboxState;
            this.setupPins();
            this.setPoints();
            return;
        }
        if (_n === 3 && ei.value !== undefined && ei.value >= 3) {
            this.bits = Math.round(Number(ei.value));
            this.setupPins();
            this.setPoints();
            this.allocNodes();
            return;
        }
        if (_n === 4 && ei.value !== undefined) {
            this.modulus = Math.round(Number(ei.value));
            return;
        }
        if (_n === 5 && ei.checkboxState !== undefined) {
            if (ei.checkboxState) this.flags |= CounterComponent.FLAG_UP_DOWN;
            else this.flags &= ~CounterComponent.FLAG_UP_DOWN;
            this.setupPins();
            this.setPoints();
            this.allocNodes();
            return;
        }
        super.setEditValue(_n, ei);
    }
}

registerComponent(164, 'CounterElm', CounterComponent);
