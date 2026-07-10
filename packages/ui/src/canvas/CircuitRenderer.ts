import type { CircuitComponent } from '@circuitjs/core';
import type { Graphics } from '@circuitjs/shared';
import {
    getBackground, getVoltageColor, drawCurrentDots,
    drawVoltageLine, useWhiteBackground,
} from './renderer.js';
import { CanvasGraphics } from './CanvasGraphics.js';

const GRID_DOT_SPACING = 8;

export interface RenderTransform {
    ox: number;
    oy: number;
    scale: number;
}

export class CircuitRenderer {
    private backbuffer: HTMLCanvasElement | null = null;
    private bctx: CanvasRenderingContext2D | null = null;

    transform: RenderTransform = { ox: 0, oy: 0, scale: 1 };
    showCurrent = true;
    showVoltageColors = true;
    running = false;
    /** Component ID that should show hover highlighting */
    hoveredComponentId: number | null = null;

    getNodeVoltage: (node: number) => number = () => 0;

    constructor(
        private components: () => CircuitComponent[],
    ) {}

    initComponents(): void {
        for (const c of this.components()) {
            if (c.dn === 0 && (c.x !== c.x2 || c.y !== c.y2)) {
                c.setPoints();
            }
        }
    }

    autoCenter(width: number, height: number): void {
        const comps = this.components();
        if (comps.length === 0) return;
        this.initComponents();
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const c of comps) {
            if (c.x < minX) minX = c.x;
            if (c.y < minY) minY = c.y;
            if (c.x2 > maxX) maxX = c.x2;
            if (c.y2 > maxY) maxY = c.y2;
        }
        const pad = 40;
        const cw = maxX - minX + pad * 2;
        const ch = maxY - minY + pad * 2;
        const s = Math.min(width / cw, height / ch, 2);
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        this.transform = { ox: width / 2 - cx * s, oy: height / 2 - cy * s, scale: s };
    }

    private ensureCtx(w: number, h: number): { ctx: CanvasRenderingContext2D; g: Graphics } {
        if (!this.backbuffer || this.backbuffer.width !== w || this.backbuffer.height !== h) {
            this.backbuffer = document.createElement('canvas');
            this.backbuffer.width = w;
            this.backbuffer.height = h;
        }
        this.bctx = this.backbuffer.getContext('2d')!;
        return { ctx: this.bctx, g: new CanvasGraphics(this.bctx) };
    }

    render(targetCtx: CanvasRenderingContext2D, width: number, height: number): void {
        const { ctx, g } = this.ensureCtx(width, height);
        const comps = this.components();

        // Disable anti-aliasing for pixel-precise circuit rendering
        targetCtx.imageSmoothingEnabled = false;

        // Reset hover flags
        for (const c of comps) c._hovered = false;

        // Set hovered component
        if (this.hoveredComponentId !== null) {
            for (const c of comps) {
                if (c.id === this.hoveredComponentId) {
                    c._hovered = true;
                    break;
                }
            }
        }

        this.initComponents();

        // 1. Fill background
        ctx.fillStyle = getBackground();
        ctx.fillRect(0, 0, width, height);

        // 2. Apply transform
        ctx.save();
        const { ox, oy, scale } = this.transform;
        ctx.translate(ox, oy);
        ctx.scale(scale, scale);

        // 3. Grid dots
        this.drawGrid(ctx, width, height);

        // 4. Voltage-colored wires
        this.drawWires(ctx, comps);

        // 4b. Wire current dots
        if (this.showCurrent && this.running) {
            this.drawWireDots(ctx, comps);
        }

        // 5. Draw all components (each handles its own voltage/highlight coloring)
        g.setLineWidth(2);
        for (const c of comps) {
            if (c.isWire()) continue;
            c.draw(g);
        }

        // 6. Draw junction posts for ALL unique component endpoints (matching Java postDrawList)
        const drawnPosts = new Set<string>();
        for (const c of comps) {
            for (let j = 0; j < c.getPostCount(); j++) {
                const pt = c.getPost(j);
                const key = `${pt.x},${pt.y}`;
                if (!drawnPosts.has(key)) {
                    drawnPosts.add(key);
                    drawPost(ctx, pt.x, pt.y);
                }
            }
        }

        // 7. Draw handles (cyan squares at endpoints - matching Java drawHandles)
        for (const c of comps) {
            if (!c._hovered && !c.selected) continue;
            g.setColor('#00FFFF');
            g.fillRect(c.x - 3, c.y - 3, 7, 7);
            if (c.getPostCount() > 1) {
                g.fillRect(c.x2 - 3, c.y2 - 3, 7, 7);
            }
        }

        // 7b. Selection highlight boxes (blue dashed rectangles around selected components)
        for (const c of comps) {
            if (c.isWire() || !c.selected) continue;
            const bb = c.boundingBox;
            if (bb.width === 0 && bb.height === 0) continue;
            ctx.strokeStyle = '#4488FF';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(bb.x - 4, bb.y - 4, bb.width + 8, bb.height + 8);
            ctx.setLineDash([]);
        }

        // 8. Labels
        this.drawLabels(ctx, comps);

        ctx.restore();

        // 9. Flush
        if (this.backbuffer) {
            targetCtx.drawImage(this.backbuffer, 0, 0);
        }
    }

    private drawWires(ctx: CanvasRenderingContext2D, comps: CircuitComponent[]): void {
        for (const c of comps) {
            if (!c.isWire()) continue;
            const n1 = c.nodes && c.nodes.length > 0 ? c.nodes[0] : 0;
            const n2 = c.nodes && c.nodes.length > 1 ? c.nodes[1] : 0;
            const v1 = n1 > 0 ? this.getNodeVoltage(n1) : 0;
            const v2 = n2 > 0 ? this.getNodeVoltage(n2) : 0;

            // Highlight check
            if (c._hovered || c.selected) {
                ctx.strokeStyle = '#00FFFF';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(c.x, c.y);
                ctx.lineTo(c.x2, c.y2);
                ctx.stroke();
            } else if (this.showVoltageColors && this.running) {
                drawVoltageLine(ctx, c.x, c.y, c.x2, c.y2, v1, v2, 3);
            } else {
                ctx.strokeStyle = useWhiteBackground ? '#404040' : '#808080';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(c.x, c.y);
                ctx.lineTo(c.x2, c.y2);
                ctx.stroke();
            }
        }
    }

    private drawWireDots(ctx: CanvasRenderingContext2D, comps: CircuitComponent[]): void {
        for (const c of comps) {
            if (!c.isWire()) continue;
            drawCurrentDots(ctx, c.x, c.y, c.x2, c.y2, c.curcount, true);
        }
    }

    private drawLabels(ctx: CanvasRenderingContext2D, comps: CircuitComponent[]): void {
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        for (const c of comps) {
            if (c.isWire() || c.isGraphicElm()) continue;
            const info = c.getInfo();
            if (!info.length) continue;
            const cx = (c.x + c.x2) / 2;
            const cy = (c.y + c.y2) / 2;
            const offY = (c.y2 - c.y) < 0 ? -16 : 16;
            ctx.fillStyle = '#888';
            ctx.fillText(info[0], cx, cy + offY);
        }
    }

    private drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number): void {
        const { ox, oy, scale } = this.transform;
        ctx.fillStyle = useWhiteBackground ? '#E0E0E0' : '#202020';
        const gs = GRID_DOT_SPACING * scale;
        if (gs < 4) return;
        const sx = ((-ox % gs) + gs) % gs;
        const sy = ((-oy % gs) + gs) % gs;
        for (let x = sx; x < width * 1.5; x += gs) {
            for (let y = sy; y < height * 1.5; y += gs) {
                ctx.fillRect(Math.round(x), Math.round(y), 1.5, 1.5);
            }
        }
    }
}

/** Draw a white post dot directly on canvas context */
export function drawPost(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
}
