import { GateComponent } from './GateComponent.js';
import { registerComponent } from '../registry.js';

export class XorGateComponent extends GateComponent {
    override calcOutput(inputs: boolean[]): boolean {
        return inputs.reduce((a, b) => a !== b, false);
    }
    override getDumpType(): number | string { return 154; }
    override getChipName(): string { return 'XOR'; }
}

registerComponent(154, 'XorGateElm', XorGateComponent);
