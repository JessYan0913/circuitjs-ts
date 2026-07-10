import type { Graphics, EditInfo } from '@circuitjs/shared';
import { GraphicElm } from '../base/GraphicElm.js';
import { registerComponent } from '../registry.js';

/** Box (dump type 'b') — pure graphic decoration with dashed rectangle, no electrical function */
export class BoxComponent extends GraphicElm {
    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
    }

    getDumpType(): number | string { return 'b'; }

    drag(xx: number, yy: number): void {
        this.x2 = xx;
        this.y2 = yy;
        this.setPoints();
    }

    creationFailed(): boolean {
        return Math.abs(this.x2 - this.x) < 32 || Math.abs(this.y2 - this.y) < 32;
    }

    getInfo(): string[] {
        return [];
    }

    getShortcut(): number { return 0; }

    getEditInfo(_n: number): EditInfo | null { return null; }

    setEditValue(_n: number, _ei: EditInfo): void { /* no-op */ }

    draw(g: Graphics): void {
        this.setBbox(this.x, this.y, this.x2, this.y2);

        if (this.needsHighlight()) {
            g.setColor('#00FFFF');
        } else {
            g.setColor('#808080');
        }

        // Draw dashed rectangle (matches Java g.setLineDash(16, 6))
        g.save();
        g.setLineWidth(2);
        const ctx = g.getContext();
        ctx.setLineDash([16, 6]);

        const x1 = Math.min(this.x, this.x2);
        const y1 = Math.min(this.y, this.y2);
        const x2 = Math.max(this.x, this.x2);
        const y2 = Math.max(this.y, this.y2);
        g.drawRect(x1, y1, x2 - x1, y2 - y1);

        ctx.setLineDash([]);
        g.setLineWidth(1);
        g.restore();
    }
}

registerComponent('b'.charCodeAt(0), 'BoxElm', BoxComponent);
