import { GateComponent } from './GateComponent.js';
import { registerComponent } from '../registry.js';

export class NorGateComponent extends GateComponent {
    override getDumpType(): number | string { return 153; }
    override getGateName(): string { return 'NOR gate'; }
    override getGateText(): string | null { return '≥1'; }
    override isInverting(): boolean { return true; }
    override hasBubble(): boolean { return true; }

    override calcFunction(): boolean {
        for (let i = 0; i < this.inputCount; i++) {
            if (this.getInput(i)) return true;
        }
        return false;
    }
}

registerComponent(153, 'NorGateElm', NorGateComponent);
