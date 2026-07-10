import type { ColorObj, Graphics } from '@circuitjs/shared';

export class CanvasGraphics implements Graphics {
    private strokeColor = '#FFFFFF';

    constructor(public ctx: CanvasRenderingContext2D) {}

    setColor(color: string | ColorObj): void {
        if (typeof color === 'string') {
            this.strokeColor = color;
            this.ctx.strokeStyle = color;
            this.ctx.fillStyle = color;
        } else {
            const s = `#${color.r.toString(16).padStart(2, '0')}${color.g.toString(16).padStart(2, '0')}${color.b.toString(16).padStart(2, '0')}`;
            this.strokeColor = s;
            this.ctx.strokeStyle = s;
            this.ctx.fillStyle = s;
        }
    }

    getColor(): string {
        return this.strokeColor;
    }

    setLineWidth(w: number): void {
        this.ctx.lineWidth = w;
    }

    drawLine(x1: number, y1: number, x2: number, y2: number): void {
        this.ctx.beginPath();
        this.ctx.moveTo(Math.round(x1), Math.round(y1));
        this.ctx.lineTo(Math.round(x2), Math.round(y2));
        this.ctx.stroke();
    }

    /** Open polyline (not closed) */
    drawPolyline(xPoints: number[], yPoints: number[], n: number): void {
        this.ctx.beginPath();
        this.ctx.moveTo(Math.round(xPoints[0]), Math.round(yPoints[0]));
        for (let i = 1; i < n; i++) {
            this.ctx.lineTo(Math.round(xPoints[i]), Math.round(yPoints[i]));
        }
        this.ctx.stroke();
    }

    /** Closed polygon (stroked) */
    drawPolygon(xPoints: number[], yPoints: number[], n: number): void {
        this.ctx.beginPath();
        this.ctx.moveTo(Math.round(xPoints[0]), Math.round(yPoints[0]));
        for (let i = 1; i < n; i++) {
            this.ctx.lineTo(Math.round(xPoints[i]), Math.round(yPoints[i]));
        }
        this.ctx.closePath();
        this.ctx.stroke();
    }

    /** Filled polygon */
    fillPolygon(xPoints: number[], yPoints: number[], n: number): void {
        this.ctx.beginPath();
        this.ctx.moveTo(Math.round(xPoints[0]), Math.round(yPoints[0]));
        for (let i = 1; i < n; i++) {
            this.ctx.lineTo(Math.round(xPoints[i]), Math.round(yPoints[i]));
        }
        this.ctx.closePath();
        this.ctx.fill();
    }

    /** Oval/circle: x,y = top-left corner, w,h = bounding box size (Java AWT convention) */
    drawOval(x: number, y: number, w: number, h: number): void {
        this.ctx.beginPath();
        this.ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    /** Filled oval: x,y = top-left corner, w,h = bounding box size */
    fillOval(x: number, y: number, w: number, h: number): void {
        this.ctx.beginPath();
        this.ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        this.ctx.fill();
    }

    fillRect(x: number, y: number, w: number, h: number): void {
        this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    }

    drawString(s: string, x: number, y: number): void {
        this.ctx.fillText(s, Math.round(x), Math.round(y));
    }

    setFontSize(px: number): void {
        this.ctx.font = `${Math.round(px)}px sans-serif`;
    }

    /** Set font using Java Font convention ("SansSerif" → "sans-serif") */
    setFont(font: string, size: number): void {
        this.ctx.font = `${size}px sans-serif`;
    }

    /** Measure pixel width of a string */
    measureWidth(s: string): number {
        return this.ctx.measureText(s).width;
    }

    textAlign(align: 'left' | 'center' | 'right'): void {
        this.ctx.textAlign = align;
    }

    textBaseline(baseline: 'top' | 'middle' | 'bottom'): void {
        this.ctx.textBaseline = baseline;
    }

    /** Save canvas state */
    save(): void {
        this.ctx.save();
    }

    /** Restore canvas state */
    restore(): void {
        this.ctx.restore();
    }

    /** Get raw canvas context for advanced operations */
    getContext(): CanvasRenderingContext2D {
        return this.ctx;
    }
}
