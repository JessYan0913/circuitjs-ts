import { ChipComponent, createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import type { EditInfo } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';

/** Monostable Multivibrator (One-shot) with retriggerable option (matches Java MonostableElm) */
export class MonostableComponent extends ChipComponent {
    private prevInputValue = false;
    private lastRisingEdge = 0;
    retriggerable = false;
    private triggered = false;
    delay = 0.01;

    getChipName(): string { return 'Monostable'; }

    override setupPins(): void {
        this.sizeX = 2;
        this.sizeY = 2;
        this.pins = [
            createPin(0, SIDE_W, ''),
            createPin(0, SIDE_E, 'Q'),
            createPin(1, SIDE_E, 'Q̅'),
        ];
        this.pins[0].clock = true;
        this.pins[1].output = true;
        this.pins[2].output = true;
        this.pins[2].lineOver = true;
    }

    override getPostCount(): number { return 3; }
    override getVoltageSourceCount(): number { return 2; }

    override execute(): void {
        // Trigger on rising edge (with retriggerable option)
        if (this.pins[0].value && this.prevInputValue !== this.pins[0].value &&
            (this.retriggerable || !this.triggered)) {
            this.lastRisingEdge = this.simTime;
            this.pins[1].value = true;
            this.pins[2].value = false;
            this.triggered = true;
        }

        // Timeout
        if (this.triggered && this.simTime > this.lastRisingEdge + this.delay) {
            this.pins[1].value = false;
            this.pins[2].value = true;
            this.triggered = false;
        }

        this.prevInputValue = this.pins[0].value;
    }

    override getDumpType(): number | string { return 194; }

    override dump(): string {
        return super.dump() + ` ${this.retriggerable} ${this.delay}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.retriggerable = tokens[start] === 'true';
        if (tokens.length > start + 1) this.delay = parseFloat(tokens[start + 1]) || 0.01;
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 2) {
            return { name: 'Retriggerable', checkbox: true, checkboxState: this.retriggerable };
        }
        if (n === 3) {
            return { name: 'Period (s)', value: this.delay, min: 0.001, max: 0.1 };
        }
        return super.getEditInfo(n);
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 2 && ei.checkboxState !== undefined) {
            this.retriggerable = ei.checkboxState;
            return;
        }
        if (_n === 3 && ei.value !== undefined) {
            this.delay = ei.value;
            return;
        }
        super.setEditValue(_n, ei);
    }
}

registerComponent(194, 'MonostableElm', MonostableComponent);
