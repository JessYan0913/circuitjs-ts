import { ChipComponent, createPin } from '../base/ChipComponent.js';
import type { StampContext } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';

/** PhaseCompElm — phase comparator (digital chip, 3 pins) */
export class PhaseCompElm extends ChipComponent {
    ff1 = false;
    ff2 = false;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
    }

    getChipName(): string {
        return 'phase comparator';
    }

    setupPins(): void {
        this.sizeX = 2;
        this.sizeY = 2;
        this.pins = [
            createPin(0, 2, 'I1'),  // SIDE_W
            createPin(1, 2, 'I2'),  // SIDE_W
            { ...createPin(0, 3, 'O'), output: true }, // SIDE_E, output
        ];
        // Fix: the third pin was created with createPin but output was set after
        // Using the approach that matches ChipComponent pattern better
        this.pins[2].output = true;
    }

    override nonLinear(): boolean {
        return true;
    }

    override stamp(context: StampContext): void {
        const vn = context.getVoltageSourceRow(this.pins[2].voltSource);
        context.stampNonLinear(vn);
        context.stampNonLinear(0);
        context.stampNonLinear(this.nodes[2]);
    }

    override doStep(context: StampContext): void {
        const v1 = this.volts[0] > 2.5;
        const v2 = this.volts[1] > 2.5;

        if (v1 && !this.pins[0].value) this.ff1 = true;
        if (v2 && !this.pins[1].value) this.ff2 = true;
        if (this.ff1 && this.ff2) {
            this.ff1 = false;
            this.ff2 = false;
        }

        const out = this.ff1 ? 5 : this.ff2 ? 0 : -1;
        if (out !== -1) {
            context.updateVoltageSource(0, this.nodes[2], this.pins[2].voltSource, out);
        } else {
            // Tie current through output pin to 0
            const vn = context.getVoltageSourceRow(this.pins[2].voltSource);
            context.stampMatrix(vn, vn, 1);
        }

        this.pins[0].value = v1;
        this.pins[1].value = v2;
    }

    override getPostCount(): number {
        return 3;
    }

    override getVoltageSourceCount(): number {
        return 1;
    }

    override getDumpType(): number | string {
        return 161;
    }

    // No extra execute() needed — doStep handles everything
    execute(): void {
        // handled in doStep
    }
}

registerComponent(161, 'PhaseCompElm', PhaseCompElm);
