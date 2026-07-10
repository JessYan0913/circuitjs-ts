import { ChipComponent, createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import type { EditInfo } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';

/** 8-bit Sequence Generator */
export class SeqGenComponent extends ChipComponent {
    data = 0;      // 8-bit data
    position = 0;  // 0-8
    oneshot = false;
    lastchangetime = 0;
    clockstate = false;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
    }

    getChipName(): string { return 'Sequence generator'; }

    override setupPins(): void {
        this.sizeX = 2;
        this.sizeY = 2;
        this.pins = [
            createPin(0, SIDE_W, ''),
            createPin(1, SIDE_E, 'Q'),
        ];
        this.pins[0].clock = true;
        this.pins[1].output = true;
    }

    override getVoltageSourceCount(): number { return 1; }

    getNextBit(): void {
        this.pins[1].value = ((this.data >>> this.position) & 1) !== 0;
        this.position++;
    }

    override execute(): void {
        if (this.oneshot) {
            if (this.position <= 8) {
                this.getNextBit();
            }
        }

        if (this.pins[0].value && !this.clockstate) {
            this.clockstate = true;
            if (this.oneshot) {
                this.position = 0;
            } else {
                this.getNextBit();
                if (this.position >= 8) this.position = 0;
            }
        }
        if (!this.pins[0].value) this.clockstate = false;
    }

    override getDumpType(): number | string { return 188; }

    override dump(): string {
        return super.dump() + ` ${this.data} ${this.oneshot}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.data = parseInt(tokens[start]) || 0;
        if (tokens.length > start + 1) {
            this.oneshot = tokens[start + 1] === 'true';
            if (this.oneshot) this.position = 8;
        }
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n >= 0 && n <= 7) {
            return {
                name: `Bit ${n} set`,
                checkbox: true,
                checkboxState: (this.data & (1 << n)) !== 0,
            };
        }
        if (n === 8) {
            return { name: 'One shot', checkbox: true, checkboxState: this.oneshot };
        }
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n >= 0 && _n <= 7 && ei.checkboxState !== undefined) {
            if (ei.checkboxState) this.data |= (1 << _n);
            else this.data &= ~(1 << _n);
        }
        if (_n === 8 && ei.checkboxState !== undefined) {
            if (ei.checkboxState) {
                this.oneshot = true;
                this.position = 8;
            } else {
                this.position = 0;
                this.oneshot = false;
            }
        }
    }
}

registerComponent(188, 'SeqGenElm', SeqGenComponent);
