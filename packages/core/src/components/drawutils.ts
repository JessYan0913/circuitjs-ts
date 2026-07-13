import type { Graphics, Point } from '@circuitjs/shared';

// ---- Voltage color scale (matches Java CircuitElm.java) ----

let voltageRange = 5;
const colorScaleCount = 32;
let colorScale: string[] = [];

export function setVoltageRange(vr: number): void {
    voltageRange = vr;
    rebuildColorScale();
}

function rebuildColorScale(): void {
    colorScale = [];
    for (let i = 0; i < colorScaleCount; i++) {
        const v = i * 2 / colorScaleCount - 1;
        let r = 128, g = 128, b = 128;
        if (v < 0) {
            const t = -v;
            r = Math.round(128 + (255 - 128) * t);
            g = Math.round(128 - 128 * t);
            b = Math.round(128 - 64 * t);
        } else {
            const t = v;
            r = Math.round(128 - 128 * t);
            g = Math.round(128 + (255 - 128) * t);
            b = Math.round(128 - 64 * t);
        }
        colorScale.push(rgbToHex(r, g, b));
    }
}

function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
}

export function getVoltageColor(g: Graphics, volts: number, c?: { _hovered?: boolean; selected?: boolean }): string {
    // If component is hovered or selected, use cyan (select color)
    if (c && (c._hovered || c.selected)) return '#00FFFF';
    const idx = Math.floor((volts + voltageRange) * (colorScaleCount - 1) / (voltageRange * 2));
    return colorScale[Math.max(0, Math.min(colorScaleCount - 1, idx))] || '#FFFFFF';
}

export function setVoltageColor(g: Graphics, volts: number, c?: { _hovered?: boolean; selected?: boolean }): void {
    g.setColor(getVoltageColor(g, volts, c));
}

// ---- Geometry (matches Java CircuitElm.java) ----

export function distance(p1: Point, p2: Point): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/** interpPoint(a, b, f) → Point at fraction f between a and b */
export function interpPoint(a: Point, b: Point, f: number): Point {
    const p: Point = { x: 0, y: 0 };
    interpPointOut(a, b, p, f);
    return p;
}

/** interpPoint(a, b, c, f) → store in c */
export function interpPointOut(a: Point, b: Point, c: Point, f: number): void {
    c.x = Math.floor(a.x * (1 - f) + b.x * f + 0.48);
    c.y = Math.floor(a.y * (1 - f) + b.y * f + 0.48);
}

/** interpPoint(a, b, f, g) → Point at fraction f with perpendicular offset g */
export function interpPointPerp(a: Point, b: Point, f: number, g: number): Point {
    const p: Point = { x: 0, y: 0 };
    interpPointPerpOut(a, b, p, f, g);
    return p;
}

/** interpPoint(a, b, c, f, g) → store in c */
export function interpPointPerpOut(a: Point, b: Point, c: Point, f: number, g: number): void {
    const gx = b.y - a.y;
    const gy = a.x - b.x;
    const len = Math.sqrt(gx * gx + gy * gy) || 1;
    const scale = g / len;
    c.x = Math.floor(a.x * (1 - f) + b.x * f + gx * scale + 0.48);
    c.y = Math.floor(a.y * (1 - f) + b.y * f + gy * scale + 0.48);
}

/** interpPoint2(a, b, c, d, f, g) → computes two points at +g and -g offset */
export function interpPoint2(a: Point, b: Point, c: Point, d: Point, f: number, g: number): void {
    interpPointPerpOut(a, b, c, f, g);
    interpPointPerpOut(a, b, d, f, -g);
}

/** calcLeads(len): set lead1/lead2 inset from point1/point2 by len/2 each side */
export function calcLeads(
    p1: Point, p2: Point, dn: number,
    lead1: Point, lead2: Point, len: number,
): void {
    if (dn < len || len === 0) {
        lead1.x = p1.x; lead1.y = p1.y;
        lead2.x = p2.x; lead2.y = p2.y;
        return;
    }
    interpPointOut(p1, p2, lead1, (dn - len) / (2 * dn));
    interpPointOut(p1, p2, lead2, (dn + len) / (2 * dn));
}

// ---- Drawing primitives (matches Java) ----

/** drawThickLine(g, x1, y1, x2, y2) */
export function drawThickLineXY(g: Graphics, x1: number, y1: number, x2: number, y2: number): void {
    g.setLineWidth(3);
    g.drawLine(x1, y1, x2, y2);
    g.setLineWidth(1);
}

/** drawThickLine(g, pa, pb) */
export function drawThickLinePt(g: Graphics, pa: Point, pb: Point): void {
    drawThickLineXY(g, pa.x, pa.y, pb.x, pb.y);
}

/** drawThickPolygon(g, xs, ys, c) */
export function drawThickPolygon(g: Graphics, xs: number[], ys: number[], c: number): void {
    g.setLineWidth(3);
    g.drawPolyline(xs, ys, c);
    g.setLineWidth(1);
}

/** drawThickCircle(g, cx, cy, r) */
export function drawThickCircle(g: Graphics, cx: number, cy: number, r: number): void {
    g.setLineWidth(3);
    g.drawOval(cx - r, cy - r, r * 2, r * 2);
    g.setLineWidth(1);
}

/** drawPost — intentionally no-op; all post dots are drawn centrally by CircuitRenderer using postCountMap */
export function drawPost(_g: Graphics, _pt: Point): void {}

// ---- Drawing utilities (matches Java) ----

/** drawCenteredText(g, s, x, y, cx) — cx=true means centered, false means left-aligned */
export function drawCenteredText(g: Graphics, s: string, x: number, y: number, cx: boolean): void {
    g.setFontSize(12);
    const w = g.measureWidth(s);
    if (cx) {
        g.drawString(s, x - Math.round(w / 2), y);
    } else {
        g.drawString(s, x, y);
    }
}

/** drawValues(g, s, hs) — draw component value label offset from center */
export function drawValues(g: Graphics, s: string, hs: number, p1: Point, p2: Point): void {
    if (s.length === 0) return;
    g.setFontSize(12);
    const cx = Math.round((p1.x + p2.x) / 2);
    const cy = Math.round((p1.y + p2.y) / 2);
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    // Position label perpendicular to the component, offset by hs
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const offX = Math.round(-dy / len * (hs + 2));
    const offY = Math.round(dx / len * (hs + 2));
    g.setColor('#AAAAAA');
    g.textAlign('center');
    g.textBaseline('middle');
    g.drawString(s, cx + offX, cy + offY);
}

/** drawCoil(g, hs, p1, p2, v1, v2) — draw inductor coil with voltage gradient */
export function drawCoil(
    g: Graphics,
    hs: number,
    p1: Point,
    p2: Point,
    v1: number,
    v2: number,
): void {
    const len = distance(p1, p2);
    const ctx = g.getContext();

    ctx.save();
    ctx.lineWidth = 3;
    ctx.translate(p1.x, p1.y);
    ctx.rotate(Math.atan2(p2.y - p1.y, p2.x - p1.x));

    // Voltage gradient
    const c1 = getVoltageColor(g, v1);
    const c2 = getVoltageColor(g, v2);
    const grad = ctx.createLinearGradient(0, 0, len, 0);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.strokeStyle = grad;

    const loopCt = Math.max(1, Math.ceil(len / 11));
    for (let loop = 0; loop < loopCt; loop++) {
        ctx.beginPath();
        const start = len * loop / loopCt;
        ctx.moveTo(start, 0);
        ctx.arc(len * (loop + 0.5) / loopCt, 0, len / (2 * loopCt), Math.PI, Math.PI * 2);
        ctx.lineTo(len * (loop + 1) / loopCt, 0);
        ctx.stroke();
    }

    ctx.restore();
    g.setLineWidth(1);
}

/** drawDots(g, pa, pb, pos) — draw animated current dots along a line */
export function drawDots(g: Graphics, pa: Point, pb: Point, pos: number): void {
    if (pos === 0) return;
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;
    g.setColor('#FFFF00');
    const spacing = 16;
    let p = ((pos % spacing) + spacing) % spacing;
    for (let d = p; d < len; d += spacing) {
        const x = Math.round(pa.x + d * dx / len);
        const y = Math.round(pa.y + d * dy / len);
        g.fillRect(x - 2, y - 2, 4, 4);
    }
}

rebuildColorScale();
