import { GateComponent } from './GateComponent.js';
import { registerComponent } from '../registry.js';

export class InverterComponent extends GateComponent {
    override calcOutput(inputs: boolean[]): boolean {
        return !inputs[0];
    }
    override getDumpType(): number | string { return 'I'.charCodeAt(0); }
    override getChipName(): string { return 'NOT'; }
}

registerComponent('I'.charCodeAt(0), 'InverterElm', InverterComponent);
