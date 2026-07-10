import { ChipComponent, createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import type { EditInfo } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';

/** JK Flip-Flop (default negative-edge triggered, matches Java JKFlipFlopElm) */
export class JKFlipFlopComponent extends ChipComponent {
    static readonly FLAG_RESET = 2;
    static readonly FLAG_POSITIVE_EDGE = 4;

    getChipName(): string { return 'JK flip-flop'; }

    hasReset(): boolean { return (this.flags & JKFlipFlopComponent.FLAG_RESET) !== 0; }
    positiveEdgeTriggered(): boolean { return (this.flags & JKFlipFlopComponent.FLAG_POSITIVE_EDGE) !== 0; }

    override setupPins(): void {
        this.sizeX = 2;
        this.sizeY = 3;
        this.pins = [
            createPin(0, SIDE_W, 'J'),
            createPin(1, SIDE_W, ''),
            createPin(2, SIDE_W, 'K'),
            createPin(0, SIDE_E, 'Q'),
            createPin(2, SIDE_E, 'Q'),
        ];
        this.pins[1].clock = true;
        this.pins[1].bubble = !this.positiveEdgeTriggered();
        this.pins[3].output = true;
        this.pins[4].output = true;
        this.pins[4].lineOver = true;

        if (this.hasReset()) {
            this.pins.push(createPin(1, SIDE_E, 'R'));
        }
    }

    override getPostCount(): number {
        return 5 + (this.hasReset() ? 1 : 0);
    }

    override getVoltageSourceCount(): number { return 2; }

    override execute(): void {
        let transition: boolean;
        if (this.positiveEdgeTriggered()) {
            transition = this.pins[1].value && !this.lastClock;
        } else {
            transition = !this.pins[1].value && this.lastClock;
        }

        if (transition) {
            let q = this.pins[3].value;
            if (this.pins[0].value) {
                if (this.pins[2].value) {
                    q = !q;  // J=1, K=1 → toggle
                } else {
                    q = true; // J=1, K=0 → set
                }
            } else if (this.pins[2].value) {
                q = false;   // J=0, K=1 → reset
            }
            // J=0, K=0 → hold (q unchanged)
            this.pins[3].value = q;
            this.pins[4].value = !q;
        }
        this.lastClock = this.pins[1].value;

        if (this.hasReset() && this.pins[5].value) {
            this.pins[3].value = false;
            this.pins[4].value = true;
        }
    }

    override getDumpType(): number | string { return 156; }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 2) {
            return { name: 'Reset Pin', checkbox: true, checkboxState: this.hasReset() };
        }
        if (n === 3) {
            return { name: 'Positive Edge Triggered', checkbox: true, checkboxState: this.positiveEdgeTriggered() };
        }
        return super.getEditInfo(n);
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 2 && ei.checkboxState !== undefined) {
            if (ei.checkboxState) this.flags |= JKFlipFlopComponent.FLAG_RESET;
            else this.flags &= ~JKFlipFlopComponent.FLAG_RESET;
            this.setupPins();
            this.allocNodes();
            this.setPoints();
            return;
        }
        if (_n === 3 && ei.checkboxState !== undefined) {
            if (ei.checkboxState) this.flags |= JKFlipFlopComponent.FLAG_POSITIVE_EDGE;
            else this.flags &= ~JKFlipFlopComponent.FLAG_POSITIVE_EDGE;
            this.pins[1].bubble = !this.positiveEdgeTriggered();
            return;
        }
        super.setEditValue(_n, ei);
    }
}

registerComponent(156, 'JKFlipFlopElm', JKFlipFlopComponent);
