import { ChipComponent, createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import type { EditInfo, StampContext } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';

/** Analog-to-Digital Converter */
export class ADCComponent extends ChipComponent {
    bits = 8;
    vref = 5;

    getChipName(): string { return 'ADC'; }

    override setupPins(): void {
        this.sizeX = 2;
        this.sizeY = Math.max(2, Math.ceil((this.bits + 1) / 2));
        this.pins = [
            createPin(0, SIDE_W, 'In'),
            createPin(1, SIDE_W, 'Vref'),
        ];
        for (let i = 0; i < this.bits; i++) {
            const p = createPin(i, SIDE_E, `D${i}`);
            p.output = true;
            this.pins.push(p);
        }
    }

    override stamp(context: StampContext): void {
        super.stamp(context);
        // Add high-impedance input
        context.stampResistor(this.nodes[0], 0, 1e10);
    }

    override execute(): void {
        // Pure digital logic handled in doStep — nothing to do here
    }

    override doStep(context: StampContext): void {
        // Read analog voltage
        const vin = this.volts[0];
        const vref = this.pins[1].value ? this.vref : this.volts[1] > 0.1 ? this.volts[1] : this.vref;
        const maxVal = (1 << this.bits) - 1;
        let digital = Math.round((vin / vref) * maxVal);
        digital = Math.max(0, Math.min(maxVal, digital));

        for (let i = 0; i < this.bits; i++) {
            this.pins[2 + i].value = ((digital >>> i) & 1) !== 0;
        }

        // Drive output voltage sources
        for (let i = 0; i < this.pins.length; i++) {
            const p = this.pins[i];
            if (p.output) {
                context.updateVoltageSource(0, this.nodes[i], p.voltSource, p.value ? 5 : 0);
            }
        }
    }

    override getDumpType(): number | string { return 167; }

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

registerComponent(167, 'ADCElm', ADCComponent);
