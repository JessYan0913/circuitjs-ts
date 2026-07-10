import type { ScopeConfig, ScopePlotConfig } from '@circuitjs/shared';
import { computeFFT, getFrequencyForBin } from './FFT.js';
import { useWhiteBackground } from './renderer.js';

const MINOR_GRID = '#404040';
const MAJOR_GRID = '#A0A0A0';
const LABEL_COLOR = '#888';

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
 * @param ctx - The canvas 2D context
 * @param scope - The ScopeConfig containing plot data and display settings
 * @param getVal - Callback(index, plotIndex) returning { max, min } voltage/value
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

    // If showFFT, render frequency domain instead of time domain
    if (scope.showFFT) {
        drawFFTView(ctx, x, y, width, height, scope, getVal);
        ctx.restore();
        return;
    }

    const midY = y + height / 2;
    const ts = maxTimeStep * scope.speed;
    const maxy = Math.floor(height / 2);

    // ---- Grid lines ----
    drawGridLines(ctx, x, y, width, height, midY, scope, maxy);

    // ---- Scale labels ----
    if (scope.showScale) {
        drawScaleLabels(ctx, x, y, width, height, scope, maxy);
    }

    // ---- Waveform curves ----
    const plotCount = scope.plots.length;
    for (let p = 0; p < plotCount; p++) {
        const plot = scope.plots[p];
        drawPlotCurve(ctx, x, y, width, height, scope, plot, getVal, p, ts, maxy);

        // Annotations for this plot
        if (scope.showMax || scope.showMin || scope.showFreq || scope.showRMS) {
            drawPlotAnnotations(ctx, x, y, width, height, scope, plot, getVal, p, ts, maxy);
        }
    }

    // ---- Zero markers ----
    drawZeroMarkers(ctx, x, y, width, midY, scope);

    ctx.restore();
}

/**
 * Draw FFT frequency spectrum view.
 */
function drawFFTView(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, width: number, height: number,
    scope: ScopeConfig,
    getVal: (bufIndex: number, plotIndex: number) => { max: number; min: number },
): void {
    const labelMargin = 50;
    const plotWidth = width - labelMargin;

    ctx.font = '10px monospace';
    ctx.fillStyle = LABEL_COLOR;

    for (let p = 0; p < scope.plots.length; p++) {
        const plot = scope.plots[p];
        const pointCount = plot.maxValues.length;
        const samples = new Float64Array(pointCount);

        // Read the circular buffer in order, averaging min and max (matching Java: 0.5 * (maxV + minV))
        for (let i = 0; i < pointCount; i++) {
            const bufIndex = (plot.ptr + i) & (pointCount - 1);
            const { max, min } = getVal(bufIndex, p);
            samples[i] = 0.5 * (max + min);
        }

        const { magnitude } = computeFFT(samples);
        const halfN = magnitude.length;

        // Draw spectrum bars
        const logScale = scope.logSpectrum;
        ctx.strokeStyle = plot.color;
        ctx.lineWidth = 1;

        ctx.beginPath();
        for (let i = 1; i < halfN; i++) {
            const sx = x + labelMargin + (i / halfN) * plotWidth;
            let mag = magnitude[i];
            if (logScale && mag > 0) {
                mag = Math.log10(1 + mag * 10) / Math.log10(11);
            }
            const sy = y + height - 10 - (mag / (magnitude[1] || 1)) * (height - 20);
            if (i === 1) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        }
        ctx.stroke();

        // Labels
        ctx.fillStyle = plot.color;
        ctx.fillText(`FFT (${scope.logSpectrum ? 'log' : 'lin'})`, x + labelMargin, y + 12);
        ctx.fillStyle = LABEL_COLOR;
        ctx.fillText('0Hz', x + labelMargin, y + height - 2);
        ctx.fillText(`${Math.round(getFrequencyForBin(halfN - 1, 100000, pointCount))}Hz`, x + width - 60, y + height - 2);
    }
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

/**
 * Draw Y-axis scale labels showing voltage values.
 */
function drawScaleLabels(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, width: number, height: number,
    scope: ScopeConfig, maxy: number,
): void {
    if (scope.plots.length === 0) return;
    const plot = scope.plots[0];
    if (plot.scale <= 0) return;

    ctx.font = '9px monospace';
    ctx.fillStyle = LABEL_COLOR;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const midY = y + height / 2;
    const gridMult = getGridMult(scope);
    const gridStepY = calcGridStep(plot.scale * 2, 6);
    const labelMargin = 36;

    for (let ll = -10; ll <= 10; ll++) {
        const yl = midY - Math.round(ll * gridStepY * gridMult);
        if (yl < y + 4 || yl >= y + height - 4) continue;
        const volts = ll * gridStepY;
        ctx.fillText(`${volts.toFixed(1)}V`, x + labelMargin - 4, yl);
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
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

    // Draw waveform
    ctx.beginPath();
    for (let i = 0; i < width; i++) {
        const bufIndex = (startPtr + i) & (pointCount - 1);
        const { max } = getVal(bufIndex, plotIndex);
        const vy = maxy - Math.round(gridMult * (max + plot.offset));
        if (i === 0) {
            ctx.moveTo(x + i, y + vy);
        } else {
            ctx.lineTo(x + i, y + vy);
        }
    }
    ctx.stroke();

    // Draw zero level dashed line for this plot
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

/**
 * Draw annotations (max, min, frequency) for a plot.
 */
function drawPlotAnnotations(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, width: number, height: number,
    scope: ScopeConfig,
    plot: ScopePlotConfig,
    getVal: (bufIndex: number, plotIndex: number) => { max: number; min: number },
    plotIndex: number,
    ts: number,
    maxy: number,
): void {
    const pointCount = plot.maxValues.length;
    if (pointCount === 0) return;

    // Find max and min values in the visible buffer
    let maxVal = -Infinity;
    let minVal = Infinity;
    for (let i = 0; i < width && i < pointCount; i++) {
        const bufIndex = (plot.ptr + i) & (pointCount - 1);
        const { max } = getVal(bufIndex, plotIndex);
        if (max > maxVal) maxVal = max;
        if (max < minVal) minVal = max;
    }

    const labelX = x + 8;
    let labelY = y + 14;

    ctx.font = '9px monospace';
    ctx.textAlign = 'left';

    if (scope.showMax && maxVal > -Infinity) {
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`Max: ${maxVal.toFixed(3)}V`, labelX, labelY);
        labelY += 12;
    }

    if (scope.showMin && minVal < Infinity) {
        ctx.fillStyle = '#88CCFF';
        ctx.fillText(`Min: ${minVal.toFixed(3)}V`, labelX, labelY);
        labelY += 12;
    }

    if (scope.showFreq) {
        // Simple zero-crossing rate frequency estimation
        const freq = estimateFrequency(plot, getVal, plotIndex, width, ts);
        if (freq > 0) {
            ctx.fillStyle = '#88FF88';
            ctx.fillText(`Freq: ${freq.toFixed(1)}Hz`, labelX, labelY);
        }
    }

    if (scope.showRMS) {
        // RMS calculation over visible buffer
        let sumSq = 0;
        let count = 0;
        for (let i = 0; i < width && i < pointCount; i++) {
            const bufIndex = (plot.ptr + i) & (pointCount - 1);
            const { max } = getVal(bufIndex, plotIndex);
            sumSq += max * max;
            count++;
        }
        if (count > 0) {
            const rms = Math.sqrt(sumSq / count);
            ctx.fillStyle = '#FFAA66';
            ctx.fillText(`RMS: ${rms.toFixed(3)}V`, labelX, labelY);
        }
    }
}

/**
 * Estimate frequency using zero-crossing rate.
 */
function estimateFrequency(
    plot: ScopePlotConfig,
    getVal: (bufIndex: number, plotIndex: number) => { max: number; min: number },
    plotIndex: number,
    visibleWidth: number,
    ts: number,
): number {
    const pointCount = plot.maxValues.length;
    let zeroCrossings = 0;
    let prevSign = 0;

    for (let i = 0; i < visibleWidth && i < pointCount; i++) {
        const bufIndex = (plot.ptr + i) & (pointCount - 1);
        const { max } = getVal(bufIndex, plotIndex);
        const sign = max >= 0 ? 1 : -1;
        if (prevSign !== 0 && sign !== prevSign) {
            zeroCrossings++;
        }
        prevSign = sign;
    }

    if (zeroCrossings < 2 || ts <= 0) return 0;
    const period = (visibleWidth * ts) / zeroCrossings;
    return period > 0 ? 1 / period : 0;
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
