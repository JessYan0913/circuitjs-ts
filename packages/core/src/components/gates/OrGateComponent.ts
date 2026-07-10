import { GateComponent } from './GateComponent.js';
import { registerComponent } from '../registry.js';

export class OrGateComponent extends GateComponent {
    override calcOutput(inputs: boolean[]): boolean {
        return inputs.some(Boolean);
    }
    override getDumpType(): number | string { return 152; }
    override getChipName(): string { return 'OR'; }
}

registerComponent(152, 'OrGateElm', OrGateComponent);
