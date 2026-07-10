import type { ColorObj, Graphics } from '@circuitjs/shared';

export class CanvasGraphics implements Graphics {
    private strokeColor = '#FFFFFF';
    /** Last set color (Java Graphics.lastColor equivalent) */
    lastColor: string | ColorObj | null = null;
    /** Current font size (matches Java Graphics.currentFontSize) */
    currentFontSize = 12;
    /** Current font name (matches Java Graphics.currentFont) */
    currentFont: string | null = null;

    constructor(public ctx: CanvasRenderingContext2D) {
        ctx.imageSmoothingEnabled = false;
    }

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
        this.lastColor = color;
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

    drawThickLine(x1: number, y1: number, x2: number, y2: number): void {
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(Math.round(x1), Math.round(y1));
        this.ctx.lineTo(Math.round(x2), Math.round(y2));
        this.ctx.stroke();
        this.ctx.lineWidth = 1;
    }

    drawThickCircle(cx: number, cy: number, r: number): void {
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r * 0.98, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.lineWidth = 1;
    }

    drawCoil(x1: number, y1: number, x2: number, y2: number, segments: number, color: string | ColorObj): void {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) return;

        this.ctx.save();
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        this.ctx.translate(Math.round(x1), Math.round(y1));
        this.ctx.rotate(Math.atan2(dy, dx));

        if (typeof color === 'string' && color) {
            this.ctx.strokeStyle = color;
        }

        for (let i = 0; i < segments; i++) {
            this.ctx.beginPath();
            const start = len * i / segments;
            this.ctx.moveTo(start, 0);
            this.ctx.arc(len * (i + 0.5) / segments, 0, len / (2 * segments), Math.PI, Math.PI * 2);
            this.ctx.lineTo(len * (i + 1) / segments, 0);
            this.ctx.stroke();
        }

        this.ctx.restore();
        this.ctx.lineWidth = 1;
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

    /** Stroked rectangle — matches Java Graphics.drawRect */
    drawRect(x: number, y: number, w: number, h: number): void {
        this.ctx.strokeRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    }

    drawRoundRect(x: number, y: number, w: number, h: number, arc: number): void {
        const r = Math.min(arc, Math.min(w, h) / 2);
        this.ctx.beginPath();
        this.ctx.roundRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h), r);
        this.ctx.stroke();
    }

    fillRoundRect(x: number, y: number, w: number, h: number, arc: number): void {
        const r = Math.min(arc, Math.min(w, h) / 2);
        this.ctx.beginPath();
        this.ctx.roundRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h), r);
        this.ctx.fill();
    }

    fillRect(x: number, y: number, w: number, h: number): void {
        this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    }

    drawString(s: string, x: number, y: number): void {
        this.ctx.fillText(s, Math.round(x), Math.round(y));
    }

    setFontSize(px: number): void {
        this.currentFontSize = Math.round(px);
        this.ctx.font = `${this.currentFontSize}px sans-serif`;
    }

    /** Set font using Java Font convention ("SansSerif" → "sans-serif") */
    setFont(font: string, size: number): void {
        this.currentFontSize = size;
        this.currentFont = font;
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

    /** Clip rectangle — matches Java Graphics.clipRect */
    clipRect(x: number, y: number, w: number, h: number): void {
        this.ctx.beginPath();
        this.ctx.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
        this.ctx.clip();
    }

    /** Save canvas state */
    save(): void {
        this.ctx.save();
    }

    /** Restore canvas state */
    restore(): void {
        this.ctx.restore();
    }

    /** Set clipping rectangle (AWT convention: setClip(x, y, w, h)) */
    setClip(x: number, y: number, w: number, h: number): void {
        this.clipRect(x, y, w, h);
    }

    /** Get raw canvas context for advanced operations */
    getContext(): CanvasRenderingContext2D {
        return this.ctx;
    }
}
