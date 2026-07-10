import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';

/** Wire — 0V voltage source to enforce equal node voltages and provide MNA current */
export class WireComponent extends CircuitComponent {
    getDumpType(): number | string { return 'w'; }

    stamp(context: StampContext): void {
        context.stampVoltageSource(this.nodes[0], this.nodes[1], this.voltSource, 0);
    }

    getVoltageSourceCount(): number { return 1; }

    isWire(): boolean { return true; }

    calculateCurrent(): void {
        // current is set by applySolvedVoltages via VS row readback
    }

    getInfo(): string[] {
        return ['Wire'];
    }
}

registerComponent('w'.charCodeAt(0), 'WireElm', WireComponent);
