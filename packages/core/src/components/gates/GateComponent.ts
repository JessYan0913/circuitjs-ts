import { ChipComponent, createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import type { EditInfo } from '@circuitjs/shared';

/** Abstract base for all logic gates */
export abstract class GateComponent extends ChipComponent {
    inputCount = 2;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number; inputCount?: number }) {
        super(args);
        if (args.inputCount !== undefined) {
            this.inputCount = args.inputCount;
        }
        this.noDiagonal = true;
    }

    abstract calcOutput(inputs: boolean[]): boolean;

    override getChipName(): string {
        return this.constructor.name.replace('Component', '');
    }

    override setupPins(): void {
        this.sizeX = 1;
        this.sizeY = Math.max(2, Math.ceil(this.inputCount / 2));
        this.pins = [];
        for (let i = 0; i < this.inputCount; i++) {
            this.pins.push(createPin(i, SIDE_W, ''));
        }
        this.pins.push(createPin(this.sizeY > 1 ? Math.floor(this.inputCount / 2) : 0, SIDE_E, ''));
        this.pins[this.pins.length - 1].output = true;
    }

    override execute(): void {
        const inputs = [];
        for (let i = 0; i < this.inputCount; i++) {
            inputs.push(this.pins[i].value);
        }
        this.pins[this.pins.length - 1].value = this.calcOutput(inputs);
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) {
            return { name: 'Inputs', value: this.inputCount, min: 1, max: 8 };
        }
        return super.getEditInfo(n - 1);
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 0) {
            const newCount = Math.max(1, Math.min(8, Math.round(Number(ei.value))));
            if (newCount !== this.inputCount) {
                this.inputCount = newCount;
                this.setupPins();
                this.setPoints();
                this.allocNodes();
            }
            return;
        }
        super.setEditValue(_n - 1, ei);
    }

    override dump(): string {
        return super.dump() + ` ${this.inputCount}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) {
            const newCount = parseInt(tokens[start]) || 2;
            if (newCount !== this.inputCount) {
                this.inputCount = newCount;
                this.setupPins();
                this.setPoints();
                this.allocNodes();
            }
        }
    }
}
