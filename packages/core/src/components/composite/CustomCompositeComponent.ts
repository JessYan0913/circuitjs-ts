import { ChipComponent, createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import type { EditInfo } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { CustomCompositeModel } from './CustomCompositeModel.js';

/**
 * Custom Composite Component — user-defined subcircuit as a component.
 * Stores a subcircuit dump and presents external connections as chip pins.
 */
export class CustomCompositeComponent extends ChipComponent {
    model: CustomCompositeModel;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number; model?: CustomCompositeModel }) {
        super(args);
        this.model = args.model ?? new CustomCompositeModel();
    }

    getChipName(): string { return 'Composite'; }

    override setupPins(): void {
        const n = this.model.pinNames.length;
        this.sizeX = Math.max(2, Math.ceil(n / 2));
        this.sizeY = Math.max(2, n);
        this.pins = [];

        const inputCount = Math.ceil(n / 2);
        for (let i = 0; i < n; i++) {
            if (i < inputCount) {
                this.pins.push(createPin(i, SIDE_W, this.model.pinNames[i]));
            } else {
                const p = createPin(i - inputCount, SIDE_E, this.model.pinNames[i]);
                p.output = true;
                this.pins.push(p);
            }
        }
    }

    override execute(): void {
        // Subcircuit execution is a placeholder — the actual simulation
        // stamps internal components into the parent circuit.
        // For basic digital subcircuits, output pins track input states.
        // A full subcircuit simulator would need internal component iteration.
        const halfPins = Math.ceil(this.model.pinNames.length / 2);
        // Copy first half (inputs) to second half (outputs) as a basic pass-through
        for (let i = halfPins; i < this.model.pinNames.length; i++) {
            if (i < this.pins.length) {
                // Default pass-through for demo mode
                this.pins[i].value = false;
            }
        }
    }

    override getDumpType(): number | string { return 410; }

    override dump(): string {
        let s = super.dump();
        s += ` ${this.model.pinNames.length}`;
        for (const name of this.model.pinNames) s += ` ${name}`;
        s += ` ${this.model.circuitDump.length}`;
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
            const dumpLen = parseInt(tokens[idx]) || 0;
            idx++;
            const dump = tokens.slice(idx).join(' ').replace(/\\n/g, '\n');

            this.model = CustomCompositeModel.create(pinNames, dump);
            this.setupPins();
            this.setPoints();
            this.allocNodes();
        } catch {
            // Keep defaults on parse failure
        }
    }

    override getEditInfo(n: number): EditInfo | null {
        const pc = this.model.pinNames.length;
        if (n < pc) {
            return { name: `Pin ${n} name`, text: this.model.pinNames[n] };
        }
        if (n === pc) {
            return { name: 'Circuit dump', text: this.model.circuitDump.slice(0, 50) + '...' };
        }
        return super.getEditInfo(n - pc - 1);
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
        if (_n === pc) {
            if (ei.text !== undefined) this.model.parseDump(ei.text);
            else if (ei.value !== undefined) this.model.parseDump(String(ei.value));
            this.setupPins();
            this.setPoints();
            this.allocNodes();
            return;
        }
        super.setEditValue(_n - pc - 1, ei);
    }
}

registerComponent(410, 'CustomCompositeElm', CustomCompositeComponent);
