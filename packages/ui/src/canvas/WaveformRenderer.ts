import type { ScopeConfig, ScopePlotConfig } from '@circuitjs/shared';
import { useWhiteBackground } from './renderer.js';

const MINOR_GRID = '#404040';
const MAJOR_GRID = '#A0A0A0';

/**
 * Calculate a "nice" grid step (matching Java calcGridStepX logic).
 * Produces human-readable step values like 1, 2, 5, 10, 20, 50, ...
 */
function calcGridStep(range: number, targetSteps: number): number {
    if (range <= 0) return 1;
    const rough = range / targetSteps;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const norm = rough / mag;
    let step: number;
    if (norm < 1.5) step = 1;
    else if (norm < 3.5) step = 2;
    else if (norm < 7.5) step = 5;
    else step = 10;
    return step * mag;
}

/**
 * Draw a scope waveform onto a canvas context.
 *
 * @param ctx - The canvas 2D context (already in screen coordinates, no circuit transform)
 * @param scope - The ScopeConfig containing plot data and display settings
 * @param getVal - Callback(index, plotIndex) returning { max, min } voltage/value at the given buffer index
 * @param timeMs - Current simulation time in milliseconds
 * @param maxTimeStep - Maximum simulation time step
 */
export function drawWaveform(
    ctx: CanvasRenderingContext2D,
    rect: { x: number; y: number; width: number; height: number },
    scope: ScopeConfig,
    getVal: (bufIndex: number, plotIndex: number) => { max: number; min: number },
    timeMs: number,
    maxTimeStep: number,
): void {
    const { x, y, width, height } = rect;
    if (width <= 0 || height <= 0) return;

    ctx.save();

    // Clip to scope rect
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    // Background
    ctx.fillStyle = useWhiteBackground ? '#F0F0F0' : '#1A1A2E';
    ctx.fillRect(x, y, width, height);

    // Border
    ctx.strokeStyle = MAJOR_GRID;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    const midY = y + height / 2;
    const ts = maxTimeStep * scope.speed;
    const maxy = Math.floor(height / 2);

    // ---- Grid lines ----
    drawGridLines(ctx, x, y, width, height, midY, scope, maxy);

    // ---- Waveform curves ----
    const plotCount = scope.plots.length;
    for (let p = 0; p < plotCount; p++) {
        const plot = scope.plots[p];
        drawPlotCurve(ctx, x, y, width, height, scope, plot, getVal, p, ts, maxy);
    }

    // ---- Zero markers ----
    drawZeroMarkers(ctx, x, y, width, midY, scope);

    ctx.restore();
}

function drawGridLines(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, width: number, height: number,
    midY: number, scope: ScopeConfig, maxy: number,
): void {
    ctx.lineWidth = 1;

    // Horizontal grid lines
    let gridStepY = 1;
    if (scope.plots.length > 0) {
        const plot = scope.plots[0];
        if (plot.scale > 0) {
            const manualScale = plot.scale;
            gridStepY = calcGridStep(manualScale * 2, 6);
        }
    }

    for (let ll = -100; ll <= 100; ll++) {
        if (ll === 0) {
            ctx.strokeStyle = MAJOR_GRID;
        } else {
            ctx.strokeStyle = MINOR_GRID;
        }
        const yl = midY - Math.round(ll * gridStepY * getGridMult(scope));
        if (yl < y || yl >= y + height - 1) continue;
        ctx.beginPath();
        ctx.moveTo(x, yl);
        ctx.lineTo(x + width - 1, yl);
        ctx.stroke();
    }
}

function getGridMult(scope: ScopeConfig): number {
    if (scope.plots.length === 0 || scope.plots[0].scale === 0) return 1;
    const maxy = 50; // half height in units
    return maxy / scope.plots[0].scale;
}

function drawPlotCurve(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, width: number, height: number,
    scope: ScopeConfig,
    plot: ScopePlotConfig,
    getVal: (bufIndex: number, plotIndex: number) => { max: number; min: number },
    plotIndex: number,
    ts: number,
    maxy: number,
): void {
    ctx.strokeStyle = plot.color;
    ctx.lineWidth = 1.5;

    const gridMult = getGridMult(scope);
    const pointCount = plot.maxValues.length;
    if (pointCount === 0) return;

    const startPtr = plot.ptr;

    // Draw min-max band as a filled area
    ctx.beginPath();
    let firstPoint = true;

    for (let i = 0; i < width; i++) {
        const bufIndex = (startPtr + i) & (pointCount - 1);
        const { max, min } = getVal(bufIndex, plotIndex);
        const vy = maxy - Math.round(gridMult * (max + plot.offset));
        if (i === 0) {
            ctx.moveTo(x + i, y + vy);
        } else {
            ctx.lineTo(x + i, y + vy);
        }
    }
    ctx.stroke();

    // Draw trigger marker at zero level
    const zeroY = maxy - Math.round(gridMult * plot.offset);
    ctx.strokeStyle = plot.color;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(x, y + zeroY);
    ctx.lineTo(x + width - 1, y + zeroY);
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawZeroMarkers(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, width: number, midY: number,
    scope: ScopeConfig,
): void {
    // Draw trigger marker at the center (zero reference)
    ctx.strokeStyle = '#FF4444';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, midY);
    ctx.lineTo(x + width - 1, midY);
    ctx.stroke();
    ctx.setLineDash([]);
}
