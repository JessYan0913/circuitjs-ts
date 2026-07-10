import { ChipComponent, createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import type { EditInfo } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';

/** Monostable Multivibrator (One-shot) */
export class MonostableComponent extends ChipComponent {
    private triggerState = false;
    private triggered = false;
    private timer = 0;
    pulseLength = 0.01; // seconds (default 10ms)

    getChipName(): string { return 'Mono'; }

    override setupPins(): void {
        this.sizeX = 2;
        this.sizeY = 2;
        this.pins = [
            createPin(0, SIDE_W, 'TR'),
            createPin(0, SIDE_E, 'Q'),
            createPin(1, SIDE_E, 'Q̅'),
        ];
        this.pins[1].output = true;
        this.pins[2].output = true;
        this.pins[2].lineOver = true;
    }

    override execute(): void {
        const trig = this.pins[0].value;

        // Trigger on rising edge
        if (trig && !this.triggerState) {
            this.triggered = true;
            this.timer = this.pulseLength;
        }
        this.triggerState = trig;

        // Update output
        this.pins[1].value = this.triggered;
        this.pins[2].value = !this.triggered;
    }

    override stepFinished(): void {
        if (this.triggered && this.simTime > 0) {
            // Count down
            const dt = this.simTime - (this.simTime - 1e-5); // approximate
            this.timer -= 1e-5;
            if (this.timer <= 0) {
                this.triggered = false;
                this.timer = 0;
            }
        }
    }

    override getDumpType(): number | string { return 194; }

    override dump(): string {
        return super.dump() + ` ${this.pulseLength}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.pulseLength = parseFloat(tokens[start]) || 0.01;
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Pulse length (s)', value: this.pulseLength };
        return super.getEditInfo(n - 1);
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 0 && ei.value !== undefined) {
            this.pulseLength = Math.max(1e-6, Number(ei.value));
            return;
        }
        super.setEditValue(_n - 1, ei);
    }
}

registerComponent(194, 'MonostableElm', MonostableComponent);
