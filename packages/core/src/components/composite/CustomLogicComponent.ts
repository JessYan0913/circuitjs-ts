import { ChipComponent, createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import type { EditInfo, StampContext } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { CustomLogicModel, type CustomLogicRule } from './CustomLogicModel.js';

/** User-configurable logic component with boolean expressions */
export class CustomLogicComponent extends ChipComponent {
    model: CustomLogicModel;
    private holdValues: boolean[] = [];

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number; model?: CustomLogicModel }) {
        super(args);
        this.model = args.model ?? CustomLogicModel.create(['A', 'B'], ['Q'], [{ expr: 'A&B', hold: false }]);
        this.holdValues = this.model.rules.map(() => false);
    }

    getChipName(): string { return 'Custom'; }

    override setupPins(): void {
        this.sizeX = this.model.chipWidth;
        this.sizeY = this.model.chipHeight;
        this.pins = [];
        const ic = this.model.inputs.length;
        const oc = this.model.outputs.length;
        const maxPinsPerSide = Math.max(ic, oc);

        for (let i = 0; i < ic; i++) {
            this.pins.push(createPin(i, SIDE_W, this.model.inputs[i]));
        }
        for (let i = 0; i < oc; i++) {
            const p = createPin(i, SIDE_E, this.model.outputs[i]);
            p.output = true;
            this.pins.push(p);
        }
    }

    override execute(): void {
        const inputValues = [];
        for (let i = 0; i < this.model.inputs.length; i++) {
            inputValues.push(this.pins[i].value);
        }

        const outputValues = this.model.evaluate(inputValues);

        for (let i = 0; i < this.model.outputs.length; i++) {
            const rule = this.model.rules[i];
            if (rule.hold && outputValues[i]) {
                // On rising edge of the expression, set hold
                this.holdValues[i] = true;
            }
            if (!rule.hold || !this.holdValues[i]) {
                this.pins[this.model.inputs.length + i].value = outputValues[i];
            }
            // Clear hold on next false evaluation
            if (rule.hold && !outputValues[i]) {
                this.holdValues[i] = false;
            }
        }
    }

    override getDumpType(): number | string { return 208; }

    override dump(): string {
        let s = super.dump();
        s += ` ${this.model.inputs.length} ${this.model.outputs.length}`;
        s += ` ${this.model.chipWidth} ${this.model.chipHeight}`;
        for (const name of this.model.inputs) s += ` ${name}`;
        for (const name of this.model.outputs) s += ` ${name}`;
        for (const rule of this.model.rules) s += ` ${rule.expr}`;
        for (const rule of this.model.rules) s += ` ${rule.hold ? 1 : 0}`;
        return s;
    }

    override handleDumpData(tokens: string[], start: number): void {
        try {
            const ic = parseInt(tokens[start]) || 2;
            const oc = parseInt(tokens[start + 1]) || 1;
            const cw = parseInt(tokens[start + 2]) || 4;
            const ch = parseInt(tokens[start + 3]) || 3;
            let idx = start + 4;

            const inputs: string[] = [];
            for (let i = 0; i < ic && idx < tokens.length; i++, idx++) {
                inputs.push(tokens[idx]);
            }
            const outputs: string[] = [];
            for (let i = 0; i < oc && idx < tokens.length; i++, idx++) {
                outputs.push(tokens[idx]);
            }
            const rules: CustomLogicRule[] = [];
            const exprs: string[] = [];
            for (let i = 0; i < oc && idx < tokens.length; i++, idx++) {
                exprs.push(tokens[idx]);
            }
            const holds: string[] = [];
            for (let i = 0; i < oc && idx < tokens.length; i++, idx++) {
                holds.push(tokens[idx]);
            }
            for (let i = 0; i < oc; i++) {
                rules.push({
                    expr: exprs[i] || '0',
                    hold: holds[i] === '1',
                });
            }

            this.model = CustomLogicModel.create(inputs, outputs, rules);
            this.model.chipWidth = cw;
            this.model.chipHeight = ch;
            this.holdValues = this.model.rules.map(() => false);
            this.setupPins();
            this.setPoints();
            this.allocNodes();
        } catch {
            // Keep default model on parse failure
        }
    }

    override getEditInfo(n: number): EditInfo | null {
        const ic = this.model.inputs.length;
        const oc = this.model.outputs.length;
        if (n < ic) {
            return { name: `Input ${n} name`, text: this.model.inputs[n] };
        }
        if (n < ic + oc) {
            const oi = n - ic;
            return { name: `Output ${oi} name`, text: this.model.outputs[oi] };
        }
        if (n < ic + oc + oc) {
            const oi = n - ic - oc;
            return { name: `Output ${oi} expr`, text: this.model.rules[oi]?.expr ?? '' };
        }
        if (n < ic + oc + oc + oc) {
            const oi = n - ic - oc - oc;
            return { name: `Output ${oi} hold`, checkbox: true, checkboxState: this.model.rules[oi]?.hold ?? false };
        }
        return super.getEditInfo(n - ic - oc - oc - oc);
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        const ic = this.model.inputs.length;
        const oc = this.model.outputs.length;
        if (_n < ic) {
            if (ei.text !== undefined) this.model.inputs[_n] = ei.text;
            else if (ei.value !== undefined) this.model.inputs[_n] = String(ei.value);
            this.setupPins();
            this.setPoints();
            this.allocNodes();
            return;
        }
        if (_n < ic + oc) {
            if (ei.text !== undefined) this.model.outputs[_n - ic] = ei.text;
            else if (ei.value !== undefined) this.model.outputs[_n - ic] = String(ei.value);
            this.setupPins();
            this.setPoints();
            this.allocNodes();
            return;
        }
        if (_n < ic + oc + oc) {
            if (ei.text !== undefined) this.model.rules[_n - ic - oc]!.expr = ei.text;
            else if (ei.value !== undefined) this.model.rules[_n - ic - oc]!.expr = String(ei.value);
            return;
        }
        if (_n < ic + oc + oc + oc && ei.checkboxState !== undefined) {
            this.model.rules[_n - ic - oc - oc]!.hold = ei.checkboxState;
            return;
        }
        super.setEditValue(_n - ic - oc - oc - oc, ei);
    }
}

registerComponent(208, 'CustomLogicElm', CustomLogicComponent);
