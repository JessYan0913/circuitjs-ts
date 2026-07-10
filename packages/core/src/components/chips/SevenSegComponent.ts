import { ChipComponent, createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import type { Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { setVoltageColor } from '../drawutils.js';

/** 7-Segment LED Display */
export class SevenSegComponent extends ChipComponent {
    private readonly segPts: { x: number; y: number; w: number; h: number; horiz: boolean }[];

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        // Segment geometry relative to chip center
        this.segPts = [
            { x: -8, y: -10, w: 16, h: 3, horiz: true },   // a
            { x: 7, y: -8, w: 3, h: 10, horiz: false },    // b
            { x: 7, y: 4, w: 3, h: 10, horiz: false },     // c
            { x: -8, y: 10, w: 16, h: 3, horiz: true },    // d
            { x: -8, y: 4, w: 3, h: 10, horiz: false },    // e
            { x: -8, y: -8, w: 3, h: 10, horiz: false },   // f
            { x: -8, y: 0, w: 16, h: 3, horiz: true },     // g
        ];
    }

    getChipName(): string { return '7-Seg'; }

    override setupPins(): void {
        this.sizeX = 2;
        this.sizeY = 4;
        this.pins = [
            createPin(0, SIDE_W, 'a'),
            createPin(1, SIDE_W, 'b'),
            createPin(2, SIDE_W, 'c'),
            createPin(3, SIDE_W, 'd'),
            createPin(4, SIDE_W, 'e'),
            createPin(5, SIDE_W, 'f'),
            createPin(6, SIDE_W, 'g'),
            createPin(0, SIDE_E, '·'),
        ];
    }

    override execute(): void {
        // No logic needed — display is driven by input pin voltages
    }

    override drawChip(g: Graphics): void {
        // Draw the lead wires
        for (let i = 0; i < this.pins.length; i++) {
            const p = this.pins[i];
            setVoltageColor(g, this.volts[i], this);
            g.drawLine(p.post.x, p.post.y, p.stub.x, p.stub.y);
        }

        // Draw chip body
        g.setColor(this.needsHighlight() ? '#00FFFF' : '#404040');
        g.setLineWidth(3);
        g.drawPolyline(this.rectPointsX, this.rectPointsY, 4);
        g.setLineWidth(1);

        // Draw 7-segment display in center of chip
        const cx = (this.rectPointsX[0] + this.rectPointsX[2]) / 2;
        const cy = (this.rectPointsY[0] + this.rectPointsY[2]) / 2;
        const sc = 1.2;

        for (let segIdx = 0; segIdx < 7; segIdx++) {
            const seg = this.segPts[segIdx];
            const on = this.volts[segIdx] > 2.5;
            g.setColor(on ? '#FF0000' : '#331111');
            const x0 = cx + seg.x * sc;
            const y0 = cy + seg.y * sc;
            const w = seg.w * sc;
            const h = seg.h * sc;
            g.fillRect(x0, y0, w, h);
        }

        // Draw DP (dot)
        const dpOn = this.pins.length > 7 && this.volts[7] > 2.5;
        g.setColor(dpOn ? '#FF0000' : '#331111');
        const dpSize = 3;
        g.drawOval(cx + 10 * sc - dpSize / 2, cy + 12 * sc - dpSize / 2, dpSize, dpSize);
    }

    override getDumpType(): number | string { return 157; }
}

registerComponent(157, 'SevenSegElm', SevenSegComponent);
