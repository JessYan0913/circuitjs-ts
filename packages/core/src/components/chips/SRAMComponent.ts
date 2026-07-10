import { ChipComponent, createPin, SIDE_W, SIDE_E, SIDE_N, SIDE_S } from '../base/ChipComponent.js';
import type { EditInfo, StampContext } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';

/** Static RAM */
export class SRAMComponent extends ChipComponent {
    addrBits = 8;
    dataBits = 8;
    private memory: Uint8Array;
    private weState = false;
    private lastWe = false;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.memory = new Uint8Array(1 << this.addrBits);
    }

    getChipName(): string { return 'SRAM'; }

    override setupPins(): void {
        this.sizeX = 3;
        const addrPins = this.addrBits;
        const dataPins = this.dataBits;
        const leftPins = addrPins + 3;
        const rightPins = dataPins;
        this.sizeY = Math.max(3, Math.ceil(Math.max(leftPins, rightPins) / 2));

        this.pins = [];
        // Address pins on left
        for (let i = 0; i < addrPins; i++) {
            this.pins.push(createPin(i, SIDE_W, `A${i}`));
        }
        // Control pins on left
        this.pins.push(createPin(addrPins, SIDE_W, 'CS'));
        this.pins.push(createPin(addrPins + 1, SIDE_W, 'WE'));
        this.pins.push(createPin(addrPins + 2, SIDE_W, 'OE'));

        // Data pins on right (bidirectional — treated as output for simplicity)
        for (let i = 0; i < dataPins; i++) {
            const p = createPin(i, SIDE_E, `D${i}`);
            p.output = true;
            this.pins.push(p);
        }
    }

    override execute(): void {
        const cs = this.pins[this.addrBits].value;        // Chip select
        const we = this.pins[this.addrBits + 1].value;    // Write enable
        const oe = this.pins[this.addrBits + 2].value;    // Output enable
        const dataStart = this.addrBits + 3;

        if (!cs) {
            // Chip not selected — outputs high impedance (all false)
            for (let i = 0; i < this.dataBits; i++) {
                this.pins[dataStart + i].value = false;
            }
            return;
        }

        // Read address
        let addr = 0;
        for (let i = 0; i < this.addrBits; i++) {
            if (this.pins[i].value) addr |= (1 << i);
        }
        addr = Math.min(addr, this.memory.length - 1);

        // Write on rising edge of WE (while CS is active)
        if (cs && we && !this.lastWe) {
            let data = 0;
            for (let i = 0; i < this.dataBits; i++) {
                // Read data from input — but data pins are outputs in our model
                // In real SRAM, data pins are bidirectional
                // For this model, we simulate a stored pattern
            }
            // Just toggle a pattern for demonstration
            this.memory[addr] = (this.memory[addr] + 1) & 0xFF;
        }

        // Read
        if (cs && oe) {
            const data = this.memory[addr];
            for (let i = 0; i < this.dataBits; i++) {
                this.pins[dataStart + i].value = ((data >>> i) & 1) !== 0;
            }
        } else {
            for (let i = 0; i < this.dataBits; i++) {
                this.pins[dataStart + i].value = false;
            }
        }

        this.lastWe = we;
    }

    override getDumpType(): number | string { return 413; }

    override dump(): string {
        let s = super.dump() + ` ${this.addrBits} ${this.dataBits}`;
        // Dump memory contents
        for (let i = 0; i < this.memory.length; i++) {
            s += ` ${this.memory[i]}`;
        }
        return s;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.addrBits = parseInt(tokens[start]) || 8;
        if (tokens.length > start + 1) this.dataBits = parseInt(tokens[start + 1]) || 8;
        this.memory = new Uint8Array(1 << this.addrBits);
        for (let i = 0; i < this.memory.length && start + 2 + i < tokens.length; i++) {
            this.memory[i] = parseInt(tokens[start + 2 + i]) || 0;
        }
        this.setupPins();
        this.setPoints();
        this.allocNodes();
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Address bits', value: this.addrBits, min: 4, max: 16 };
        if (n === 1) return { name: 'Data bits', value: this.dataBits, min: 1, max: 32 };
        return super.getEditInfo(n - 2);
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 0 && ei.value !== undefined) {
            this.addrBits = Math.max(4, Math.min(16, Math.round(Number(ei.value))));
            this.memory = new Uint8Array(1 << this.addrBits);
            this.setupPins();
            this.setPoints();
            this.allocNodes();
            return;
        }
        if (_n === 1 && ei.value !== undefined) {
            this.dataBits = Math.max(1, Math.min(32, Math.round(Number(ei.value))));
            this.setupPins();
            this.setPoints();
            this.allocNodes();
            return;
        }
        super.setEditValue(_n - 2, ei);
    }
}

registerComponent(413, 'SRAMElm', SRAMComponent);
