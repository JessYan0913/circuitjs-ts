import { GateComponent } from './GateComponent.js';
import { registerComponent } from '../registry.js';

export class XorGateComponent extends GateComponent {
    override getDumpType(): number | string { return 154; }
    override getGateName(): string { return 'XOR gate'; }
    override getGateText(): string | null { return '=1'; }

    override calcFunction(): boolean {
        let f = false;
        for (let i = 0; i < this.inputCount; i++) {
            const input = this.getInput(i);
            if (i === 0) f = input;
            else f = f !== input;
        }
        return f;
    }
}

registerComponent(154, 'XorGateElm', XorGateComponent);
