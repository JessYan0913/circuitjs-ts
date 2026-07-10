import { GateComponent } from './GateComponent.js';
import { registerComponent } from '../registry.js';

export class NorGateComponent extends GateComponent {
    override calcOutput(inputs: boolean[]): boolean {
        return !inputs.some(Boolean);
    }
    override getDumpType(): number | string { return 153; }
    override getChipName(): string { return 'NOR'; }
}

registerComponent(153, 'NorGateElm', NorGateComponent);
