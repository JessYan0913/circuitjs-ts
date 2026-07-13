import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import {
    setVoltageColor, drawThickLineXY, drawThickLinePt,
    interpPoint2, drawDots, drawPost,
} from '../drawutils.js';

export class GroundComponent extends CircuitComponent {
    getDumpType(): number | string { return 'g'; }
    getPostCount(): number { return 1; }

    // Java GroundElm stamps a 0V voltage source to track branch current
    // stampVoltageSource(0, nodes[0], vs, 0): V(nodes[0]) - V(0) = 0 → nodes[0] = 0V
    getVoltageSourceCount(): number { return 1; }

    stamp(context: StampContext): void {
        context.stampVoltageSource(0, this.nodes[0], this.voltSource, 0);
    }

    // Java GroundElm.setCurrent: current = -c (negates the branch current)
    // Branch current positive = flowing INTO source from node → negate for display direction
    override updateCurcount(currentMult: number): void {
        let cadd = -this.current * currentMult;
        cadd %= 8;
        this.curcount += cadd;
    }

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

        drawDots(g, this.point1, this.point2, this.curcount);
        drawPost(g, this.point1);
    }
}

registerComponent('g'.charCodeAt(0), 'GroundElm', GroundComponent);
