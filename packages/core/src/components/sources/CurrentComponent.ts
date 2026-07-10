import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, Graphics } from '@circuitjs/shared';
import { COLOR_CURRENT_SOURCE } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { interpPoint } from '../drawutils.js';

/** Current Source */
export class CurrentComponent extends CircuitComponent {
    currentValue = 0.01;  // 10 mA default

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
    }

    getDumpType(): number | string { return 'i'; }

    stamp(context: StampContext): void {
        context.stampCurrentSource(this.nodes[0], this.nodes[1], this.currentValue);
    }

    getInfo(): string[] {
        return [`Current Source: ${this.currentValue} A`];
    }

    draw(g: Graphics): void {
        // Current source: circle with arrow inside
        const mid = interpPoint(this.point1, this.point2, 0.5);
        g.setLineWidth(2);
        g.setColor(COLOR_CURRENT_SOURCE);
        g.drawOval(mid.x, mid.y, 12, 12);
        g.setFontSize(11);
        g.textAlign('center');
        g.textBaseline('middle');
        g.drawString('I', mid.x, mid.y);
    }
}

registerComponent('i'.charCodeAt(0), 'CurrentElm', CurrentComponent);
