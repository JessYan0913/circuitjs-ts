import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';

/** Wire — Equal-voltage connection. No MNA stamp; nodes are merged via Union-Find.
    Matches Java WireElm where stamp() and getVoltageSourceCount() are removed. */
export class WireComponent extends CircuitComponent {
    getDumpType(): number | string { return 'w'; }

    stamp(_context: StampContext): void {
        // Wire nodes are merged in the matrix via Union-Find (SimulationManager).
        // No stamp needed. Matches Java WireElm where stamp() is a no-op.
    }

    isWire(): boolean { return true; }

    calculateCurrent(): void {
        // Wire current is set by calcWireCurrents() from neighbor currents.
    }

    getInfo(): string[] {
        return ['Wire'];
    }
}

registerComponent('w'.charCodeAt(0), 'WireElm', WireComponent);
