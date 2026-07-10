import { ChipComponent, createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import type { EditInfo } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';

/** D Flip-Flop with active-HIGH Reset and Set (matches Java DFlipFlopElm) */
export class DFlipFlopComponent extends ChipComponent {
    static readonly FLAG_RESET = 2;
    static readonly FLAG_SET = 4;

    getChipName(): string { return 'D flip-flop'; }

    hasReset(): boolean { return (this.flags & DFlipFlopComponent.FLAG_RESET) !== 0 || this.hasSet(); }
    hasSet(): boolean { return (this.flags & DFlipFlopComponent.FLAG_SET) !== 0; }

    override setupPins(): void {
        this.sizeX = 2;
        this.sizeY = 3;
        this.pins = [];
        this.pins.push(createPin(0, SIDE_W, 'D'));
        this.pins.push(createPin(0, SIDE_E, 'Q'));
        this.pins[1].output = true;
        this.pins.push(createPin(this.hasSet() ? 1 : 2, SIDE_E, 'Q'));
        this.pins[2].output = true;
        this.pins[2].lineOver = true;
        this.pins.push(createPin(1, SIDE_W, ''));
        this.pins[3].clock = true;

        if (!this.hasSet()) {
            if (this.hasReset()) {
                this.pins.push(createPin(2, SIDE_W, 'R'));
            }
        } else {
            this.pins.push(createPin(2, SIDE_E, 'R'));  // pins[4]
            this.pins.push(createPin(2, SIDE_W, 'S'));  // pins[5]
        }
    }

    override getPostCount(): number {
        return 4 + (this.hasReset() ? 1 : 0) + (this.hasSet() ? 1 : 0);
    }

    override getVoltageSourceCount(): number { return 2; }

    override reset(): void {
        super.reset();
        this.volts[2] = 5;
        this.pins[2].value = true;
    }

    override execute(): void {
        // Rising edge clock: Q = D
        if (this.pins[3].value && !this.lastClock) {
            this.pins[1].value = this.pins[0].value;
            this.pins[2].value = !this.pins[0].value;
        }

        // Set (active HIGH) — note: S pin is pins[5] when Set exists
        if (this.hasSet() && this.pins[5].value) {
            this.pins[1].value = true;
            this.pins[2].value = false;
        }

        // Reset (active HIGH) — note: R pin is pins[4]
        if (this.hasReset() && this.pins[4].value) {
            this.pins[1].value = false;
            this.pins[2].value = true;
        }

        this.lastClock = this.pins[3].value;
    }

    override getDumpType(): number | string { return 155; }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 2) {
            return { name: 'Reset Pin', checkbox: true, checkboxState: this.hasReset() };
        }
        if (n === 3) {
            return { name: 'Set Pin', checkbox: true, checkboxState: this.hasSet() };
        }
        return super.getEditInfo(n);
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 2 && ei.checkboxState !== undefined) {
            if (ei.checkboxState) this.flags |= DFlipFlopComponent.FLAG_RESET;
            else this.flags &= ~(DFlipFlopComponent.FLAG_RESET | DFlipFlopComponent.FLAG_SET);
            this.setupPins();
            this.allocNodes();
            this.setPoints();
            return;
        }
        if (_n === 3 && ei.checkboxState !== undefined) {
            if (ei.checkboxState) this.flags |= DFlipFlopComponent.FLAG_SET;
            else this.flags &= ~DFlipFlopComponent.FLAG_SET;
            this.setupPins();
            this.allocNodes();
            this.setPoints();
            return;
        }
        super.setEditValue(_n, ei);
    }
}

registerComponent(155, 'DFlipFlopElm', DFlipFlopComponent);
