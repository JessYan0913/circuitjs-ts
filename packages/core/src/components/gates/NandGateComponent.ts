import { GateComponent } from './GateComponent.js';
import { registerComponent } from '../registry.js';

export class NandGateComponent extends GateComponent {
    override calcOutput(inputs: boolean[]): boolean {
        return !inputs.every(Boolean);
    }
    override getDumpType(): number | string { return 151; }
    override getChipName(): string { return 'NAND'; }
}

registerComponent(151, 'NandGateElm', NandGateComponent);
