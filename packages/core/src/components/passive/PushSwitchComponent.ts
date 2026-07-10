import { SwitchComponent } from './SwitchComponent.js';

/**
 * Push (momentary) switch — normally open, closes while pressed.
 * Inherits dump type 's' from SwitchComponent (matching Java PushSwitchElm behavior).
 * Distinguishes from regular SwitchComponent by the `momentary=true` flag in dump data.
 */
export class PushSwitchComponent extends SwitchComponent {
    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        // Match Java PushSwitchElm: initially open, momentary
        this.position = 1;
        this.momentary = true;
    }

    getShortcut(): number { return 0; }
}
