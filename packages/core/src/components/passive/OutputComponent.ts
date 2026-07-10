import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { COLOR_OUTPUT } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { interpPoint } from '../drawutils.js';

/** Output/Analog Output — measures voltage at a point (no loading) */
export class OutputComponent extends CircuitComponent {
    getDumpType(): number | string { return 'O'; }
    getPostCount(): number { return 3; } // two for measurement, third is ground reference

    stamp(context: StampContext): void {
        // Output component draws no current — it's a voltage measurement point
        // In the original, it stamps a 10M resistor between nodes[2] and GND
        // and connects nodes[0] and nodes[1] via a wire (zero voltage source)
        context.stampResistor(this.nodes[2], 0, 1e7);
    }

    getVoltageSourceCount(): number { return 1; }
    getInternalNodeCount(): number { return 1; }

    draw(g: Graphics): void {
        // Output probe: circle with meter indicator
        const mid = interpPoint(this.point1, this.point2, 0.5);
        g.setLineWidth(2);
        g.setColor(COLOR_OUTPUT);
        g.drawOval(mid.x, mid.y, 12, 12);
        g.setFontSize(11);
        g.textAlign('center');
        g.textBaseline('middle');
        g.drawString('V', mid.x, mid.y);
    }

    getInfo(): string[] {
        return ['Output'];
    }
}

registerComponent('O'.charCodeAt(0), 'OutputElm', OutputComponent);
