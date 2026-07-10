import { ChipComponent, createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import type { EditInfo } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { CustomCompositeModel } from './CustomCompositeModel.js';

/**
 * Custom Composite Chip — user-defined subcircuit presented as a chip with named pins.
 * Similar to CustomCompositeComponent but with chip-style rendering and
 * explicit input/output pin classification.
 */
export class CustomCompositeChipComponent extends ChipComponent {
    model: CustomCompositeModel;
    /** Which pins are inputs (vs outputs) — stored as a bitmask string */
    inputFlags = '';

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number; model?: CustomCompositeModel }) {
        super(args);
        this.model = args.model ?? new CustomCompositeModel();
    }

    getChipName(): string { return 'Chip'; }

    override setupPins(): void {
        const n = this.model.pinNames.length;
        this.sizeX = Math.max(2, Math.ceil(n / 2));
        this.sizeY = Math.max(2, n);
        this.pins = [];

        const halfPins = Math.ceil(n / 2);
        for (let i = 0; i < n; i++) {
            const isInput = this.inputFlags[i] === '1';
            const isOutput = this.inputFlags[i] === '0';
            if (i < halfPins) {
                const p = createPin(i, SIDE_W, this.model.pinNames[i] || `P${i}`);
                if (isOutput && halfPins <= n) p.output = true;
                this.pins.push(p);
            } else {
                const p = createPin(i - halfPins, SIDE_E, this.model.pinNames[i] || `P${i}`);
                p.output = true;
                this.pins.push(p);
            }
        }
    }

    override execute(): void {
        // Base subcircuit execution — output pins track input states
        // A full implementation would step internal components
        const halfPins = Math.ceil(this.model.pinNames.length / 2);
        for (let i = halfPins; i < this.model.pinNames.length; i++) {
            if (i < this.pins.length) {
                const inputIdx = i - halfPins;
                if (inputIdx < halfPins && inputIdx < this.pins.length) {
                    this.pins[i].value = this.pins[inputIdx].value;
                }
            }
        }
    }

    override getDumpType(): number | string {
        // CustomCompositeChip uses a string-based dump type
        return 'cchip';
    }

    override dump(): string {
        // Override to use string-based dump format: cchip x y x2 y2 flags ...data...
        let s = `cchip ${this.x} ${this.y} ${this.x2} ${this.y2} ${this.flags}`;
        s += ` ${this.model.pinNames.length}`;
        for (const name of this.model.pinNames) s += ` ${name}`;
        s += ` ${this.inputFlags}`;
        s += ` ${this.model.circuitDump.replace(/\n/g, '\\n')}`;
        return s;
    }

    override handleDumpData(tokens: string[], start: number): void {
        try {
            const pinCount = parseInt(tokens[start]) || 2;
            let idx = start + 1;
            const pinNames: string[] = [];
            for (let i = 0; i < pinCount && idx < tokens.length; i++, idx++) {
                pinNames.push(tokens[idx]);
            }
            this.inputFlags = tokens[idx] || '';
            idx++;
            const dump = tokens.slice(idx).join(' ').replace(/\\n/g, '\n');

            this.model = CustomCompositeModel.create(pinNames, dump);
            this.setupPins();
            this.setPoints();
            this.allocNodes();
        } catch {
            // Keep defaults
        }
    }

    override getEditInfo(n: number): EditInfo | null {
        const pc = this.model.pinNames.length;
        if (n < pc) {
            return { name: `Pin ${n} name`, text: this.model.pinNames[n] };
        }
        if (n < pc * 2) {
            const pi = n - pc;
            return {
                name: `Pin ${pi} direction`,
                checkbox: true,
                checkboxState: this.inputFlags[pi] !== '1',
            };
        }
        if (n === pc * 2) {
            return { name: 'Circuit dump', text: this.model.circuitDump.slice(0, 50) + '...' };
        }
        return super.getEditInfo(n - pc * 2 - 1);
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        const pc = this.model.pinNames.length;
        if (_n < pc) {
            if (ei.text !== undefined) this.model.pinNames[_n] = ei.text;
            else if (ei.value !== undefined) this.model.pinNames[_n] = String(ei.value);
            this.setupPins();
            this.setPoints();
            this.allocNodes();
            return;
        }
        if (_n < pc * 2 && ei.checkboxState !== undefined) {
            const pi = _n - pc;
            const arr = this.inputFlags.split('');
            arr[pi] = ei.checkboxState ? '0' : '1';
            this.inputFlags = arr.join('');
            this.setupPins();
            this.setPoints();
            this.allocNodes();
            return;
        }
        if (_n === pc * 2) {
            if (ei.text !== undefined) this.model.parseDump(ei.text);
            else if (ei.value !== undefined) this.model.parseDump(String(ei.value));
            return;
        }
        super.setEditValue(_n - pc * 2 - 1, ei);
    }
}

// Register with string key
registerComponent('cchip', 'CustomCompositeChipElm', CustomCompositeChipComponent);
