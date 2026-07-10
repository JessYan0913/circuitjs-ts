import { COLOR_WHITE, COLOR_BLACK } from '@circuitjs/shared';

export const COLORS = {
    background: '#000000',
    backgroundWhite: '#FFFFFF',
    grid: '#202020',
    gridWhite: '#E0E0E0',
    wire: '#404040',
    wireDefault: '#00FF00',
    selected: '#FFFF00',
    text: '#FFFFFF',
    textWhite: '#000000',
    currentDot: '#FFFF00',
    // Component colors (original CircuitJS1 palette)
    resistor: '#FFE0B0',       // warm brown/tan
    resistorHl: '#FFD080',
    capacitor: '#C0E0FF',      // light blue
    inductor: '#C0FFC0',       // light green
    diode: '#FF4040',          // red
    diodeBar: '#C0C0C0',
    voltageSource: '#FFFF80',  // light yellow
    ground: '#00FF00',         // green
    output: '#80FF80',         // green
    transistor: '#FFD080',     // orange
    current: '#FFFFFF',
    // Voltage scale
    voltagePos: '#00FF00',     // green for positive
    voltageNeg: '#FF0000',     // red for negative
};

export let useWhiteBackground = false;

export function setWhiteBackground(wb: boolean): void {
    useWhiteBackground = wb;
}

export function getBackground(): string {
    return useWhiteBackground ? COLORS.backgroundWhite : COLORS.background;
}

export function getTextColor(): string {
    return useWhiteBackground ? COLORS.textWhite : COLORS.text;
}

/** Voltage color scale — maps voltage to a color gradient */
let voltageRange = 5;

export function setVoltageRange(vr: number): void {
    voltageRange = vr;
}

/**
 * Map a voltage to a color string.
 * Negative → red, zero → dark, positive → green.
 */
export function getVoltageColor(volts: number): string {
    if (Math.abs(volts) < 0.01) return useWhiteBackground ? '#000' : '#808080';
    const t = Math.max(-1, Math.min(1, volts / voltageRange));
    if (t < 0) {
        const nt = -t;
        const r = Math.round(128 + (255 - 128) * nt);
        const g = Math.round(128 - 128 * nt);
        return `rgb(${r},${g},${g})`;
    } else {
        const g = Math.round(128 + (255 - 128) * t);
        const r = Math.round(128 - 128 * t);
        return `rgb(${r},${g},${r * 0.3})`;
    }
}

/** Draw a line with voltage coloring */
export function drawVoltageLine(
    ctx: CanvasRenderingContext2D,
    x1: number, y1: number, x2: number, y2: number,
    v1: number, v2: number,
    width: number,
): void {
    const midVolts = (v1 + v2) / 2;
    const color = getVoltageColor(midVolts);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(Math.round(x1), Math.round(y1));
    ctx.lineTo(Math.round(x2), Math.round(y2));
    ctx.stroke();
}

/** Draw a thick line */
export function drawThickLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.lineWidth = 1;
}

/** Draw a thick circle */
export function drawThickCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.98, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
}

/** Draw a post (connection point) */
export function drawPost(ctx: CanvasRenderingContext2D, x: number, y: number, volts?: number): void {
    ctx.fillStyle = useWhiteBackground ? '#000' : '#FFF';
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
}

/** Draw current dots along a line */
export function drawCurrentDots(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, pos: number, running: boolean): void {
    if (!running || pos === 0) return;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    ctx.fillStyle = COLORS.currentDot;
    const spacing = 16;
    let p = ((pos % spacing) + spacing) % spacing;
    for (let d = p; d < len; d += spacing) {
        const x = Math.round(x1 + d * dx / len);
        const y = Math.round(y1 + d * dy / len);
        ctx.fillRect(x - 2, y - 2, 4, 4);
    }
}
