/**
 * CustomCompositeComponent — user-defined subcircuit as a component.
 *
 * Extends CompositeElm to provide full subcircuit simulation: internal
 * child components are created from the model dump, stamped into the
 * parent circuit's MNA matrix, and stepped each iteration.
 */
import { CompositeElm } from '../base/CompositeElm.js';
import { createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import type { EditInfo } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { CustomCompositeModel } from './CustomCompositeModel.js';

export class CustomCompositeComponent extends CompositeElm {
    model: CustomCompositeModel;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number; model?: CustomCompositeModel }) {
        super(args);
        this.model = args.model ?? new CustomCompositeModel();
        if (args.model) {
            this.loadSubcircuit();
        } else {
            const existing = CustomCompositeModel.getModelWithName(CustomCompositeModel.lastModelName);
            if (existing) {
                this.model = existing;
            }
            this.loadSubcircuit();
        }
    }

    getChipName(): string { return 'Composite'; }

    /** Return the component dump lines from the model */
    override getComponentDumps(): string[] {
        return this.model.componentDumps;
    }

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
        // Simulation is handled by children via CompositeElm stamp/doStep delegation.
        // Nothing to do here for digital output computation — the MNA solution
        // determines all node voltages including output pins.
    }

    /** Load (or reload) the subcircuit from the current model data */
    private loadSubcircuit(): void {
        const dumps = this.getComponentDumps();
        if (dumps.length === 0) return;

        // Build externalNodes mapping: pin i → subcircuit-local node i
        const pinCount = this.model.pinNames.length;
        const extNodes: number[] = [];
        if (this.model.extList.length > 0) {
            // Use extList from model if available (from serialization)
            for (let i = 0; i < this.model.extList.length; i++) {
                extNodes.push(this.model.extList[i].node);
            }
        } else {
            // Default: pin index = subcircuit-local node index
            for (let i = 0; i < pinCount; i++) {
                extNodes.push(i);
            }
        }

        this.loadComposite(extNodes, dumps);
    }

    // ---- Serialization ----

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
            this.loadSubcircuit();
        } catch {
            // Keep defaults on parse failure
        }
    }

    // ---- Model dump (model definitions precede component definition) ----

    override dumpModel(): string | null {
        // Dump the model if it hasn't been dumped yet
        const existing = CustomCompositeModel.modelMap.get(this.model.name);
        if (existing && !existing.dumped) {
            return existing.dump();
        }
        return null;
    }

    // ---- Edit Info ----

    override getEditInfo(n: number): EditInfo | null {
        const pc = this.model.pinNames.length;
        if (n < pc) {
            return { name: `Pin ${n} name`, text: this.model.pinNames[n] };
        }
        if (n === pc) {
            return { name: 'Circuit dump', text: this.model.circuitDump.slice(0, 50) + '...' };
        }
        if (n === pc + 1) {
            return { name: 'Edit model', button: 'Edit Model' };
        }
        return super.getEditInfo(n - pc - 2);
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        const pc = this.model.pinNames.length;
        if (_n < pc) {
            if (ei.text !== undefined) this.model.pinNames[_n] = ei.text;
            else if (ei.value !== undefined) this.model.pinNames[_n] = String(ei.value);
            this.setupPins();
            this.setPoints();
            this.loadSubcircuit();
            return;
        }
        if (_n === pc) {
            if (ei.text !== undefined) this.model.parseDump(ei.text);
            else if (ei.value !== undefined) this.model.parseDump(String(ei.value));
            this.loadSubcircuit();
            return;
        }
        if (_n === pc + 1) {
            // Button action — the UI layer should open EditCompositeModelDialog
            // Store the model reference so the UI can access it
            return;
        }
        super.setEditValue(_n - pc - 2, ei);
    }
}

registerComponent(410, 'CustomCompositeElm', CustomCompositeComponent);
