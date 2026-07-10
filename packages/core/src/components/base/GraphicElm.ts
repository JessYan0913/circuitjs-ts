import { CircuitComponent } from './CircuitComponent.js';

/**
 * GraphicElm — base class for non-electrical graphic elements.
 * These components have no circuit function (no MNA stamping)
 * and are used for decorations, labels, boxes, etc.
 */
export abstract class GraphicElm extends CircuitComponent {
    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
    }

    /** Graphic elements have no electrical posts */
    getPostCount(): number {
        return 0;
    }

    /** No MNA stamping for graphic-only elements */
    stamp(_context: import('@circuitjs/shared').StampContext): void {
        // no-op
    }

    /** No simulation steps for graphic elements */
    doStep(_context: import('@circuitjs/shared').StampContext): void {
        // no-op
    }

    /** Identify as graphic element */
    isGraphicElm(): boolean {
        return true;
    }

    /** Default dump type for graphic elements */
    abstract getDumpType(): number | string;

    getInfo(): string[] {
        return [];
    }
}
