/**
 * CustomCompositeChipComponent — user-defined subcircuit as a chip with
 * explicit input/output pin classification and full subcircuit simulation.
 *
 * Extends CompositeElm: internal child components are created from the
 * model dump, stamped into the parent circuit's MNA matrix, and stepped
 * each iteration.
 */
import { CompositeElm } from '../base/CompositeElm.js';
import { createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import type { EditInfo } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { CustomCompositeModel } from './CustomCompositeModel.js';

export class CustomCompositeChipComponent extends CompositeElm {
    model: CustomCompositeModel;
    /** Which pins are inputs (vs outputs) — stored as a bitmask string */
    inputFlags = '';

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number; model?: CustomCompositeModel }) {
        super(args);
        this.model = args.model ?? new CustomCompositeModel();
        this.loadSubcircuit();
    }

    getChipName(): string { return 'Chip'; }

    override getComponentDumps(): string[] {
        return this.model.componentDumps;
    }

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
        // Simulation is handled by children via CompositeElm stamp/doStep delegation.
    }

    /** Load (or reload) the subcircuit from the current model data */
    private loadSubcircuit(): void {
        const dumps = this.getComponentDumps();
        if (dumps.length === 0) return;

        const pinCount = this.model.pinNames.length;
        const extNodes: number[] = [];
        if (this.model.extList.length > 0) {
            for (let i = 0; i < this.model.extList.length; i++) {
                extNodes.push(this.model.extList[i].node);
            }
        } else {
            for (let i = 0; i < pinCount; i++) {
                extNodes.push(i);
            }
        }

        this.loadComposite(extNodes, dumps);
    }

    // ---- Serialization ----

    override getDumpType(): number | string {
        return 'cchip';
    }

    override dump(): string {
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
            this.loadSubcircuit();
        } catch {
            // Keep defaults
        }
    }

    override dumpModel(): string | null {
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
        if (n === pc * 2 + 1) {
            return { name: 'Edit model', button: 'Edit Model' };
        }
        return super.getEditInfo(n - pc * 2 - 2);
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
        if (_n < pc * 2 && ei.checkboxState !== undefined) {
            const pi = _n - pc;
            const arr = this.inputFlags.split('');
            arr[pi] = ei.checkboxState ? '0' : '1';
            this.inputFlags = arr.join('');
            this.setupPins();
            this.setPoints();
            this.loadSubcircuit();
            return;
        }
        if (_n === pc * 2) {
            if (ei.text !== undefined) this.model.parseDump(ei.text);
            else if (ei.value !== undefined) this.model.parseDump(String(ei.value));
            this.loadSubcircuit();
            return;
        }
        if (_n === pc * 2 + 1) {
            // Button action — the UI layer should open EditCompositeModelDialog
            return;
        }
        super.setEditValue(_n - pc * 2 - 2, ei);
    }
}

registerComponent('cchip', 'CustomCompositeChipElm', CustomCompositeChipComponent);
