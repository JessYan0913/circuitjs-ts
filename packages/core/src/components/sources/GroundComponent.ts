import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import {
    setVoltageColor, drawThickLineXY, drawThickLinePt,
    interpPoint2, interpPoint, drawDots, drawPost,
} from '../drawutils.js';

export class GroundComponent extends CircuitComponent {
    getDumpType(): number | string { return 'g'; }
    getPostCount(): number { return 1; }

    stamp(_context: StampContext): void {
        // Endpoint bound to node 0 by SimulationManager union-find; no stamp needed
    }

    getVoltageSourceCount(): number { return 0; }

    getInfo(): string[] {
        return ['Ground'];
    }

    getShortcut(): number { return 'g'.charCodeAt(0); }

    draw(g: Graphics): void {
        setVoltageColor(g, 0);
        drawThickLinePt(g, this.point1, this.point2);

        // Three decreasing horizontal bars
        for (let i = 0; i < 3; i++) {
            const a = 10 - i * 4;
            const b = i * 5;
            const p1 = { x: 0, y: 0 };
            const p2 = { x: 0, y: 0 };
            interpPoint2(this.point1, this.point2, p1, p2, 1 + b / this.dn, a);
            drawThickLineXY(g, p1.x, p1.y, p2.x, p2.y);
        }

        // Dot count and posts
        drawDots(g, this.point1, this.point2, this.curcount);
        drawPost(g, this.point1);
    }
}

registerComponent('g'.charCodeAt(0), 'GroundElm', GroundComponent);
