import { ChipComponent, createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import type { EditInfo, StampContext } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';

/** Digital-to-Analog Converter */
export class DACComponent extends ChipComponent {
    bits = 8;
    vref = 5;

    getChipName(): string { return 'DAC'; }

    override setupPins(): void {
        this.sizeX = 2;
        this.sizeY = Math.max(2, Math.ceil(this.bits / 2));
        this.pins = [];
        for (let i = 0; i < this.bits; i++) {
            this.pins.push(createPin(i, SIDE_W, `D${i}`));
        }
        const p = createPin(0, SIDE_E, 'Out');
        p.output = true;
        this.pins.push(p);
    }

    override execute(): void {
        // Logic handled in doStep
    }

    override doStep(context: StampContext): void {
        let digital = 0;
        for (let i = 0; i < this.bits; i++) {
            if (this.pins[i].value) digital |= (1 << i);
        }
        const maxVal = (1 << this.bits) - 1;
        const vout = (digital / maxVal) * this.vref;
        this.pins[this.pins.length - 1].value = vout > 2.5;

        for (let i = 0; i < this.pins.length; i++) {
            const p = this.pins[i];
            if (p.output) {
                context.updateVoltageSource(0, this.nodes[i], p.voltSource, vout);
            }
        }
    }

    override getDumpType(): number | string { return 166; }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Bits', value: this.bits, min: 4, max: 16 };
        if (n === 1) return { name: 'Vref', value: this.vref };
        return super.getEditInfo(n - 2);
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 0 && ei.value !== undefined) {
            const newBits = Math.max(4, Math.min(16, Math.round(Number(ei.value))));
            if (newBits !== this.bits) {
                this.bits = newBits;
                this.setupPins();
                this.setPoints();
                this.allocNodes();
            }
            return;
        }
        if (_n === 1 && ei.value !== undefined) {
            this.vref = Number(ei.value);
            return;
        }
        super.setEditValue(_n - 2, ei);
    }

    override dump(): string {
        return super.dump() + ` ${this.bits} ${this.vref}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.bits = parseInt(tokens[start]) || 8;
        if (tokens.length > start + 1) this.vref = parseFloat(tokens[start + 1]) || 5;
        this.setupPins();
        this.setPoints();
        this.allocNodes();
    }
}

registerComponent(166, 'DACElm', DACComponent);
