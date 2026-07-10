import { SwitchComponent } from './SwitchComponent.js';
import { registerComponent } from '../registry.js';

/** Push (momentary) switch — normally open, closes while pressed (dump type 'p') */
export class PushSwitchComponent extends SwitchComponent {
    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        // Match Java PushSwitchElm: initially open, momentary
        this.position = 1;
        this.momentary = true;
    }

    getDumpType(): number | string { return 'p'; }

    getShortcut(): number { return 0; }
}

registerComponent('p'.charCodeAt(0), 'PushSwitchElm', PushSwitchComponent);
