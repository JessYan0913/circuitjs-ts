import { GateComponent } from './GateComponent.js';
import { registerComponent } from '../registry.js';

export class AndGateComponent extends GateComponent {
    override calcOutput(inputs: boolean[]): boolean {
        return inputs.every(Boolean);
    }
    override getDumpType(): number | string { return 150; }
    override getChipName(): string { return 'AND'; }
}

registerComponent(150, 'AndGateElm', AndGateComponent);
